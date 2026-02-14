import asyncio
from playwright.async_api import async_playwright

async def scrape_full_html(url: str):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # コンテキストを作成してタイムアウトを個別に設定
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = await context.new_page()
        
        # タイムアウトを無制限にするか、もっと長くする
        page.set_default_timeout(90000) 

        print(f"Accessing: {url}")
        try:
            # wait_until を 'domcontentloaded'（最低限のHTMLが読めたらOK）に変更
            await page.goto(url, wait_until="domcontentloaded", timeout=90000)
            
            # 少しだけ待機（JavaScriptが動く時間を稼ぐ）
            await asyncio.sleep(5)
            
            content = await page.content()
            
            print("--- HTML CONTENT START ---")
            print(content)
            print("--- HTML CONTENT END ---")
            
        except Exception as e:
            print(f"Error occurred: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    import sys
    target_url = sys.argv[1] if len(sys.argv) > 1 else "https://jp.mercari.com/shops/product/EgbWH9BSP56omQ8APursXf"
    asyncio.run(scrape_full_html(target_url))
    