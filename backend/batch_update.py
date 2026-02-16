import os
import asyncio
import requests
from sqlalchemy import select, desc
from database import async_session
import models
import scraper

# 環境変数からDiscord Webhook URLを取得
DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL")

def send_discord_notification(item_name, old_price, new_price, item_url, image_url=None):
    """Discordに価格変動を画像付きで通知する"""
    if not DISCORD_WEBHOOK_URL:
        print("Discord Webhook URL is not set. Skipping notification.")
        return

    # 値下がりか値上がりか判定
    diff = new_price - old_price
    emoji = "📉" if diff < 0 else "📈"
    status_text = "値下がりしました！" if diff < 0 else "価格が変動しました。"

    # メインのメッセージ
    content = (
        f"{emoji} **{status_text}**\n"
        f"**商品名:** {item_name}\n"
        f"**価格:** ¥{old_price:,} → **¥{new_price:,}** (差額: {diff:+,}円)\n"
        f"**URL:** {item_url}"
    )
    
    # Discordの「埋め込み(Embed)」機能を使って画像を表示
    payload = {
        "content": content,
        "embeds": []
    }

    if image_url:
        payload["embeds"].append({
            "image": {"url": image_url}
        })
    
    try:
        response = requests.post(DISCORD_WEBHOOK_URL, json=payload)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to send Discord notification: {e}")

async def update_all_prices():
    async with async_session() as db:
        # 1. DBから全商品を取得
        stmt = select(models.Item)
        result = await db.execute(stmt)
        items = result.scalars().all()
        
        print(f"Starting batch update for {len(items)} items...")

        for item in items:
            print(f"--- Scraping: {item.name} ---")
            try:
                # 2. 直前の価格履歴を取得（最新の1件）
                hist_stmt = (
                    select(models.PriceHistory)
                    .where(models.PriceHistory.item_id == item.id)
                    .order_by(desc(models.PriceHistory.created_at))
                    .limit(1)
                )
                hist_result = await db.execute(hist_stmt)
                last_record = hist_result.scalar_one_or_none()

                # 3. スクレイピング実行
                res = await scraper.scrape_site(item.url)
                
                if res["status"] == "success":
                    new_price = res["price"]
                    current_image = res.get("image_url")
                    
                    # DBに画像URLがない場合はついでに更新しておく（既存データ救済用）
                    if not item.image_url and current_image:
                        item.image_url = current_image
                    
                    # 4. 通知判定（前回の価格が存在し、かつ価格が異なる場合）
                    if last_record and last_record.price != new_price:
                        print(f"Price change detected! ¥{last_record.price} -> ¥{new_price}")
                        send_discord_notification(
                            item.name, 
                            last_record.price, 
                            new_price, 
                            item.url, 
                            item.image_url or current_image
                        )
                    
                    # 5. 価格履歴を保存
                    new_history = models.PriceHistory(
                        item_id=item.id,
                        price=new_price
                    )
                    db.add(new_history)
                    print(f"Successfully updated: ¥{new_price}")
                else:
                    print(f"Scrape failed for {item.name}: {res.get('message')}")

            except Exception as e:
                print(f"Error processing {item.name}: {e}")
            
            # サーバーに負荷をかけないよう待機
            await asyncio.sleep(5) 
            
        await db.commit()
        print("Batch update finished.")

if __name__ == "__main__":
    asyncio.run(update_all_prices())
    