import os
from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from database import engine, Base, get_db
import models

# ヘッダーの名前を定義（Next.js側でもこれを使います）
API_KEY_NAME = "X-API-KEY"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# .env から取得
API_KEY = os.getenv("API_KEY")

app = FastAPI(title="My Price Tracker API")

# --- セキュリティ用関数 ---
async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key == API_KEY:
        return api_key
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials"
    )

# 起動時にテーブルを作成（本番環境ではAlembic推奨ですが、まずはこれで）
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/db-test", dependencies=[Depends(get_api_key)])
async def db_test(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    return {"status": "connected", "result": result.scalar()}

@app.get("/")
def read_root():
    # ルートだけは生存確認用に公開しておいてもOK（お好みで）
    return {"message": "Hello Tracker API"}
