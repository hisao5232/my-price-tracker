import os
from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from dotenv import load_dotenv

import models
import database  # database.py をインポート
import scraper

# .envファイルを読み込む
load_dotenv()
API_KEY = os.getenv("API_KEY")

app = FastAPI()

# 非同期エンジンでのテーブル作成
@app.on_event("startup")
async def startup():
    async with database.engine.begin() as conn:
        await conn.run_sync(models.Base.metadata.create_all)

# APIキー認証のチェック
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
    # database.py の get_db を直接使う
    db: AsyncSession = Depends(database.get_db), 
    api_key: str = Depends(verify_api_key)
):
    # 1. スクレイピング実行
    result = await scraper.scrape_site(url)
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    # 2. 非同期でのクエリ実行 (select文)
    stmt = select(models.Item).where(models.Item.url == url)
    res = await db.execute(stmt)
    item = res.scalar_one_or_none()
    
    if not item:
        # 新規商品ならItemテーブルに保存
        item = models.Item(
            name=result["name"],
            url=url
        )
        db.add(item)
        await db.commit() # 非同期なので await が必須
        await db.refresh(item)

    # 3. PriceHistory（価格履歴）を保存
    price_history = models.PriceHistory(
        item_id=item.id,
        price=result["price"]
        # fetched_at がエラーの原因なので、一旦削除するか created_at に変える
        # もし models.py でカラムを定義していないなら、この2つだけでOK
    )
    db.add(price_history)
    await db.commit() # 非同期なので await が必須

    return {
        "status": "success",
        "item_id": item.id,
        "name": item.name,
        "current_price": result["price"],
        "message": "Data saved successfully"
    }
    