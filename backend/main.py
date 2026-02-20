import os
import re
from fastapi import FastAPI, Depends, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert # 一括保存(UPSERT)用
from dotenv import load_dotenv

import models
import database
import scraper
import asyncio

load_dotenv()
API_KEY = os.getenv("API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 起動時のテーブル作成
@app.on_event("startup")
async def startup():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

# APIキー認証
def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    return x_api_key

@app.get("/")
def read_root():
    return {"message": "Price Tracker API is running"}

# --- アイテム削除 ---
@app.delete("/items/{item_id}")
async def delete_item(
    item_id: int, 
    db: AsyncSession = Depends(database.get_db),
    api_key: str = Depends(verify_api_key)
):
    stmt = select(models.Item).where(models.Item.id == item_id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
    
    await db.delete(item)
    await db.commit()
    return {"status": "success", "message": f"Item {item_id} deleted"}

# --- アイテム一覧 ---
@app.get("/items")
async def get_items(db: AsyncSession = Depends(database.get_db)):
    stmt = select(models.Item).order_by(models.Item.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

# --- 単体URLのスクレイピングと価格更新 ---
@app.get("/scrape")
async def scrape_and_save(
    url: str,
    db: AsyncSession = Depends(database.get_db),
    api_key: str = Depends(verify_api_key)
):
    # scraper.py の個別スクレイピング関数（既存）を呼び出し
    # ※検索用とは別に scrape_site 関数がある前提です
    result = await scraper.scrape_site(url)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    stmt = select(models.Item).where(models.Item.url == url)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    new_price = result["price"]

    if not item:
        # 新規登録
        m_match = re.search(r'item/(m\d{11})', url)
        site_id = m_match.group(1) if m_match else None

        item = models.Item(
            name=result["name"],
            url=url,
            site_id=site_id,
            image_url=result.get("image_url")
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        
        price_history = models.PriceHistory(item_id=item.id, price=new_price)
        db.add(price_history)
        await db.commit()
        return {"status": "success", "message": "New item added", "item": item}
    
    else:
        # 価格更新チェック
        stmt_history = select(models.PriceHistory)\
            .where(models.PriceHistory.item_id == item.id)\
            .order_by(models.PriceHistory.created_at.desc())\
            .limit(1)
        res_history = await db.execute(stmt_history)
        latest_history = res_history.scalar_one_or_none()

        if latest_history is None or latest_history.price != new_price:
            price_history = models.PriceHistory(item_id=item.id, price=new_price)
            db.add(price_history)
            await db.commit()
            return {"status": "success", "message": "Price updated", "new_price": new_price}
        
        return {"status": "success", "message": "No price change"}

# --- キーワード検索 & DB一括登録 (116件対応版) ---
@app.get("/search")
async def search_and_register(
    q: str, 
    db: AsyncSession = Depends(database.get_db),
    api_key: str = Depends(verify_api_key)
):
    # 1. 最強のスクレイピング・エンジンで全件取得
    scraped_items = await scraper.search_items(q)
    
    registered_items = []
    
    for item_data in scraped_items:
        # DBに既にあるかURLでチェック
        stmt = select(models.Item).where(models.Item.url == item_data['url'])
        res = await db.execute(stmt)
        item = res.scalar_one_or_none()
        
        if not item:
            # 新規アイテムとして保存
            item = models.Item(
                name=item_data['name'],
                url=item_data['url'],
                site_id=item_data['id'],
                image_url=item_data.get('image_url') # サムネイルも保存！
            )
            db.add(item)
            await db.flush() # ID確定のためにflush
            
            # 初回価格履歴
            price_history = models.PriceHistory(item_id=item.id, price=item_data['price'])
            db.add(price_history)
            
            registered_items.append(item)
    
    await db.commit()

    # 2. 検索クエリの履歴管理
    stmt_q = select(models.SearchQuery).where(models.SearchQuery.keyword == q)
    res_q = await db.execute(stmt_q)
    query = res_q.scalar_one_or_none()
    
    current_ids = [it['id'] for it in scraped_items]
    if not query:
        query = models.SearchQuery(keyword=q, last_seen_ids=current_ids)
        db.add(query)
    else:
        query.last_seen_ids = current_ids # 最新の状態に更新
    
    await db.commit()

    return {
        "status": "success", 
        "total_scraped": len(scraped_items),
        "new_registered": len(registered_items),
        "items": scraped_items # フロントエンド表示用
    }

@app.get("/items/{item_id}/history")
async def get_item_history(item_id: int, db: AsyncSession = Depends(database.get_db)):
    stmt_item = select(models.Item).where(models.Item.id == item_id)
    res_item = await db.execute(stmt_item)
    item = res_item.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    stmt_history = select(models.PriceHistory).where(models.PriceHistory.item_id == item_id).order_by(models.PriceHistory.created_at.asc())
    res_history = await db.execute(stmt_history)
    return {"item": item, "history": res_history.scalars().all()}

@app.get("/queries")
async def get_queries(db: AsyncSession = Depends(database.get_db)):
    # 登録されたキーワードを新しい順に取得
    stmt = select(models.SearchQuery).order_by(models.SearchQuery.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@app.get("/items/keyword/{keyword}")
async def get_items_by_keyword(keyword: str, db: AsyncSession = Depends(database.get_db)):
    # キーワードを部分一致（LIKE）で検索して、紐づく商品を取得
    # もしくは SearchQuery の last_seen_ids に基づく設計も可能ですが、
    # シンプルに商品名の部分一致で取得するのが確実です
    stmt = select(models.Item).where(models.Item.name.ilike(f"%{keyword}%")).order_by(models.Item.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

# キーワード一覧を取得
@app.get("/keywords")
async def get_keywords(db: AsyncSession = Depends(database.get_db)):
    stmt = select(models.SearchQuery).order_by(models.SearchQuery.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

# キーワード登録 + 即時スクレイピング開始
@app.post("/keywords")
async def add_keyword(
    data: dict, 
    background_tasks: BackgroundTasks, # ここでBackgroundTasksを受け取る
    db: AsyncSession = Depends(database.get_db)
):
    keyword = data["keyword"]
    
    # 1. まずはDBにキーワードを保存
    new_query = models.SearchQuery(keyword=keyword)
    db.add(new_query)
    await db.commit()
    
    # 2. スクレイピングをバックグラウンドで開始
    # ユーザーへのレスポンスを待たせずに裏で処理を開始させる
    background_tasks.add_task(run_scraping_logic, keyword)
    
    return {"message": f"Keyword '{keyword}' added and scraping started."}

# --- バックグラウンドで実行される実際の処理 ---
async def run_scraping_logic(keyword: str): # string ではなく str
    print(f"Starting scraping for: {keyword}")
    
    # データベースセッションを新しく作成して処理を行う必要があります
    # (BackgroundTasksはリクエストが終わった後に動くため、元のdbセッションは使えない場合があるため)
    async with database.async_session() as session:
        try:
            # すでに定義されているスクレイピングロジックを再利用
            # ここでは search_and_register と同等の処理を関数化して呼び出すのが理想です
            scraped_items = await scraper.search_items(keyword)
            
            for item_data in scraped_items:
                stmt = select(models.Item).where(models.Item.url == item_data['url'])
                res = await session.execute(stmt)
                item = res.scalar_one_or_none()
                
                if not item:
                    item = models.Item(
                        name=item_data['name'],
                        url=item_data['url'],
                        site_id=item_data['id'],
                        image_url=item_data.get('image_url')
                    )
                    session.add(item)
                    await session.flush()
                    
                    price_history = models.PriceHistory(item_id=item.id, price=item_data['price'])
                    session.add(price_history)
            
            # SearchQuery側の last_seen_ids も更新
            stmt_q = select(models.SearchQuery).where(models.SearchQuery.keyword == keyword)
            res_q = await session.execute(stmt_q)
            query = res_q.scalar_one_or_none()
            
            current_ids = [it['id'] for it in scraped_items]
            if query:
                query.last_seen_ids = current_ids
            
            await session.commit()
            print(f"Finished scraping for: {keyword}. {len(scraped_items)} items processed.")
            
        except Exception as e:
            print(f"Error during background scraping: {e}")
            await session.rollback()

@app.delete("/keywords/{id}")
async def delete_keyword(id: int, db: AsyncSession = Depends(database.get_db)):
    stmt = select(models.SearchQuery).where(models.SearchQuery.id == id)
    result = await db.execute(stmt)
    query = result.scalar_one_or_none()
    if not query:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(query)
    await db.commit()
    return {"message": "Deleted"}

