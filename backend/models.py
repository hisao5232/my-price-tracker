from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import database

Base = database.Base

class Item(Base):
    """監視対象の商品本体"""
    __tablename__ = "items"
    
    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(String, unique=True, index=True)  # メルカリの 'm123456789' 形式のID
    name = Column(String, nullable=False)
    url = Column(String, unique=True, nullable=False)
    image_url = Column(String, nullable=True)         # 今回取得に成功したサムネイルURL
    created_at = Column(DateTime, default=datetime.utcnow)

    # 履歴とのリレーション（Itemを消すと関連する履歴も消える設定）
    price_histories = relationship("PriceHistory", back_populates="item", cascade="all, delete-orphan")

class PriceHistory(Base):
    """商品の価格変動履歴"""
    __tablename__ = "price_history"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"))
    price = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("Item", back_populates="price_histories")

class SearchQuery(Base):
    """検索キーワードとその検索状態の保存用"""
    __tablename__ = "search_queries"

    id = Column(Integer, primary_key=True, index=True)
    keyword = Column(String, nullable=False, index=True) # 検索ワード
    
    # 検索条件（将来的に価格上限/下限などを保存できるようにJSON化）
    conditions = Column(JSON, nullable=True) 
    
    # 前回取得した全ID（116件分など）をリストで保存
    # これと比較することで「新しく出品されたお宝」を特定できます
    last_seen_ids = Column(JSON, default=list) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
    