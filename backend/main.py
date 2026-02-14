import os
import re
from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from dotenv import load_dotenv

import models
import database
import scraper

# .envファイルを読み込む
load_dotenv()
API_KEY = os.getenv("API_KEY")

app = FastAPI()

# 起動時にテーブルを作成（非同期対応）
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

@app.get("/scrape")
async def scrape_and_save(
    url: str,
    db: AsyncSession = Depends(database.get_db),
    api_key: str = Depends(verify_api_key)
):
    # 1. スクレイピング実行
    result = await scraper.scrape_site(url)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    # 2. Item（商品）が既にDBにあるか確認
    stmt = select(models.Item).where(models.Item.url == url)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()

    if not item:
        # --- ID抽出ロジックの強化 ---
        # 通常商品: /item/m12345678901
        # Shops商品: /shops/product/英数字
        m_match = re.search(r'item/(m\d{11})', url)
        s_match = re.search(r'shops/product/([a-zA-Z0-9]+)', url)
        
        mercari_id = None
        if m_match:
            mercari_id = m_match.group(1)
        elif s_match:
            mercari_id = s_match.group(1)

        # 新規商品ならItemテーブルに保存
        item = models.Item(
            name=result["name"],
            url=url,
            mercari_id=mercari_id
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)

    # 3. PriceHistory（価格履歴）を保存
    price_history = models.PriceHistory(
        item_id=item.id,
        price=result["price"]
    )
    db.add(price_history)
    await db.commit()

    return {
        "status": "success",
        "item_id": item.id,
        "mercari_id": item.mercari_id,
        "name": item.name,
        "current_price": result["price"],
        "message": "Data saved successfully"
    }

@app.get("/items")
async def get_items(db: AsyncSession = Depends(database.get_db)):
    """監視中の商品一覧を取得する"""
    stmt = select(models.Item).order_by(models.Item.created_at.desc())
    result = await db.execute(stmt)
    items = result.scalars().all()
    return items

@app.get("/items/{item_id}/history")
async def get_item_history(item_id: int, db: AsyncSession = Depends(database.get_db)):
    """特定商品の価格推移を取得する"""
    stmt_item = select(models.Item).where(models.Item.id == item_id)
    res_item = await db.execute(stmt_item)
    item = res_item.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    stmt_history = select(models.PriceHistory)\
        .where(models.PriceHistory.item_id == item_id)\
        .order_by(models.PriceHistory.created_at.asc())
    
    res_history = await db.execute(stmt_history)
    history = res_history.scalars().all()
    
    return {
        "item": item,
        "history": history
    }
