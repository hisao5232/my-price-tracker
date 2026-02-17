import os
import re
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from dotenv import load_dotenv

import models
import database
import scraper

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

# --- 削除機能を上に持ってくる（確実に認識させるため） ---
@app.delete("/items/{item_id}")
async def delete_item(
    item_id: int, 
    db: AsyncSession = Depends(database.get_db),
    api_key: str = Depends(verify_api_key)
):
    print(f"DEBUG: DELETE request for ID {item_id}")
    stmt = select(models.Item).where(models.Item.id == item_id)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    
    if item is None:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found in DB")
    
    await db.delete(item)
    await db.commit()
    return {"status": "success", "message": f"Item {item_id} deleted"}

# --- その他のルート ---
@app.get("/items")
async def get_items(db: AsyncSession = Depends(database.get_db)):
    stmt = select(models.Item).order_by(models.Item.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@app.get("/scrape")
async def scrape_and_save(
    url: str,
    db: AsyncSession = Depends(database.get_db),
    api_key: str = Depends(verify_api_key)
):
    # 1. サイトをスクレイピング
    result = await scraper.scrape_site(url)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    # 2. 該当アイテムがDBにあるか確認
    stmt = select(models.Item).where(models.Item.url == url)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    new_price = result["price"]

    # --- ここからロジック修正 ---
    if not item:
        # 新規アイテム登録
        m_match = re.search(r'item/(m\d{11})', url)
        s_match = re.search(r'shops/product/([a-zA-Z0-9]+)', url)
        site_id = m_match.group(1) if m_match else (s_match.group(1) if s_match else None)

        item = models.Item(
            name=result["name"],
            url=url,
            site_id=site_id,
            image_url=result.get("image_url")
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        
        # 初回登録時は必ず履歴を保存
        price_history = models.PriceHistory(item_id=item.id, price=new_price)
        db.add(price_history)
        await db.commit()
        return {"status": "success", "message": "New item added with price", "name": item.name}
    
    else:
        # 既存アイテムの場合：最新の価格履歴を1件取得して比較
        stmt_history = select(models.PriceHistory)\
            .where(models.PriceHistory.item_id == item.id)\
            .order_by(models.PriceHistory.created_at.desc())\
            .limit(1)
        res_history = await db.execute(stmt_history)
        latest_history = res_history.scalar_one_or_none()

        # 最新価格と異なる場合のみ保存（あるいは履歴が一件もない場合）
        if latest_history is None or latest_history.price != new_price:
            price_history = models.PriceHistory(item_id=item.id, price=new_price)
            db.add(price_history)
            await db.commit()
            print(f"DEBUG: Price updated for {item.name}: {new_price}")
            return {"status": "success", "message": "Price updated", "name": item.name}
        else:
            # 価格が変わっていない
            print(f"DEBUG: No price change for {item.name}: {new_price}")
            return {"status": "success", "message": "No price change", "name": item.name}

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
    