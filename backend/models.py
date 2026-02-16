from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship  # ← これを追加！
from sqlalchemy.sql import func
from database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(String, unique=True, index=True)
    name = Column(String)
    url = Column(String)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 子テーブル（PriceHistory）との連携設定
    history = relationship(
        "PriceHistory", 
        back_populates="item", 
        cascade="all, delete-orphan" # 親を消すと子も消える設定
    )
    
class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    price = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 親テーブル（Item）への逆参照設定（これがないとエラーになる場合があります）
    item = relationship("Item", back_populates="history")
    