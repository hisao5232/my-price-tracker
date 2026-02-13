import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# .envやdocker-composeから渡される環境変数
DATABASE_URL = os.getenv("DATABASE_URL")

# エンジンの作成
engine = create_async_engine(DATABASE_URL, echo=True)

# セッション作成用のファクトリ
async_session = async_sessionmaker(
    engine, 
    expire_on_commit=False, 
    class_=AsyncSession
)

# モデルのベースクラス
class Base(DeclarativeBase):
    pass

# FastAPIで使うための依存性注入関数
async def get_db():
    async with async_session() as session:
        yield session
