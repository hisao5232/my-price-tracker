import json
from playwright.async_api import async_playwright

async def scrape_site(url: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        try:
            # タイムアウト設定
            page.set_default_timeout(60000)
            await page.goto(url, wait_until="domcontentloaded")
            
            # 描画を少し待つ
            await page.wait_for_timeout(2000)

            scripts = await page.locator('script[type="application/ld+json"]').all_inner_texts()
            name, price, image_url = None, None, None

            for s in scripts:
                try:
                    data = json.loads(s)
                    items = data.get("@graph", [data]) if isinstance(data, dict) else []
                    for item in items:
                        if item.get("@type") == "Product":
                            name = item.get("name")
                            # 画像URLの取得
                            image_url = item.get("image")
                            if isinstance(image_url, list) and len(image_url) > 0:
                                image_url = image_url[0]
                                
                            offers = item.get("offers", {})
                            if isinstance(offers, list):
                                price = offers[0].get("price")
                            else:
                                price = offers.get("price")
                            break
                except:
                    continue

            # JSONで見つからない場合の予備（メタタグから取得）
            if not name:
                name = await page.get_attribute('meta[property="og:title"]', "content")
            
            if not price:
                price_str = await page.get_attribute('meta[property="product:price:amount"]', "content")
                if price_str:
                    price = int(price_str)
            
            if not image_url:
                image_url = await page.get_attribute('meta[property="og:image"]', "content")

            if name and price:
                return {
                    "status": "success", 
                    "name": name, 
                    "price": int(price), 
                    "image_url": image_url # これを返すように追加
                }
            else:
                return {"status": "error", "message": "Could not find name or price"}

        except Exception as e:
            return {"status": "error", "message": f"Scraping failed: {str(e)}"}
        finally:
            await browser.close()
