import asyncio
from playwright.async_api import async_playwright
import re
import random

async def scrape_site(url: str):
    async with async_playwright() as p:
        # ブラウザの起動（ボット検知を避けるため headless=True でも人間味を出す）
        browser = await p.chromium.launch(headless=True)
        
        # ユーザーエージェントなどの設定
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 800}
        )
        page = await context.new_page()

        # 高速化と検知回避：画像、フォント、広告スクリプトの読み込みを拒否
        await page.route("**/*.{png,jpg,jpeg,svg,webp,gif,woff,woff2}", lambda route: route.abort())
        await page.route(re.compile(r"(google-analytics|googletagmanager|tiktok|facebook|bing|yahoo)"), lambda route: route.abort())

        try:
            # 1. ページ読み込み（まずはHTML構造が整うまで）
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # 2. JavaScriptによる価格の描画を待つ（3〜5秒のランダム待機で人間らしさを模倣）
            await asyncio.sleep(random.uniform(3, 5)) 

            # --- 価格抽出ロジック（優先順位順） ---
            price = 0
            
            # 【優先1】画面上の「price」テストIDを持つ要素から取得（表側の最新表示）
            price_element = await page.query_selector('[data-testid="price"]')
            if price_element:
                price_text = await price_element.inner_text()
                digits = re.sub(r'\D', '', price_text)
                if digits:
                    price = int(digits)

            # 【優先2】見つからない場合、メタタグから取得（裏側のデータ）
            if price == 0:
                price_meta = await page.get_attribute('meta[property="product:price:amount"]', "content")
                if price_meta and price_meta.isdigit():
                    price = int(price_meta)

            # 【優先3】最終手段、JSON-LD構造化データから正規表現で抜く
            if price == 0:
                content = await page.content()
                match = re.search(r'"price":\s?(\d+)', content)
                if match:
                    price = int(match.group(1))

            # --- タイトル・商品名の整形 ---
            title = await page.title()
            # 「- メルカリ」や「by メルカリ」を削除してクリーンな名前に
            clean_name = re.sub(r'\s-\sメルカリ|\sby\sメルカリ', '', title).strip()

            return {
                "status": "success",
                "name": clean_name,
                "price": price,
                "url": url
            }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Scraping failed: {str(e)}"
            }
        finally:
            await browser.close()
            