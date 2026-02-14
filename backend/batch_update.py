import asyncio
from sqlalchemy import select
from database import SessionLocal, get_db
import models
import scraper

async def update_all_prices():
    async with SessionLocal() as db:
        # 1. DBから全商品を取得
        stmt = select(models.Item)
        result = await db.execute(stmt)
        items = result.scalars().all()
        
        print(f"Starting batch update for {len(items)} items...")

        for item in items:
            print(f"Scraping: {item.name}")
            try:
                # 2. スクレイピング実行
                res = await scraper.scrape_site(item.url)
                if res["status"] == "success":
                    # 3. 価格履歴を保存
                    new_history = models.PriceHistory(
                        item_id=item.id,
                        price=res["price"]
                    )
                    db.add(new_history)
                    print(f"Successfully updated: {item.name} -> ¥{res['price']}")
            except Exception as e:
                print(f"Failed to scrape {item.name}: {e}")
            
            # サーバーに負荷をかけないよう、少し待機（重要！）
            await asyncio.sleep(5) 
            
        await db.commit()
        print("Batch update finished.")

if __name__ == "__main__":
    asyncio.run(update_all_prices())
    