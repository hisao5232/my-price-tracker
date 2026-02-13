from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import os

# 内部ファイルのインポート
from database import engine, Base, get_db
import models
from scraper import scrape_site  # 前回の修正で名前を合わせました

# --- ここが重要！ ---
app = FastAPI(title="My Price Tracker API")
# ------------------

# API Keyの設定
API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)
API_KEY = os.getenv("API_KEY")

async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key == API_KEY:
        return api_key
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials"
    )

# 起動時にテーブル作成
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/db-test", dependencies=[Depends(get_api_key)])
async def db_test(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    return {"status": "connected", "result": result.scalar()}

@app.get("/scrape", dependencies=[Depends(get_api_key)])
async def run_scraper(url: str):
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="Invalid URL")
    
    result = await scrape_site(url)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=500, detail=result.get("message"))
    
    return result

@app.get("/")
def read_root():
    return {"message": "Hello Tracker API"}
    