# My Price Tracker

特定のECサイトの価格推移を追跡し、ダッシュボードで視覚化するためのフルスタック・アプリケーションです。

## 🛠 Tech Stack

- **Backend:** FastAPI (Python), Playwright
- **Database:** PostgreSQL
- **Frontend:** Next.js (Tailwind CSS v4)
- **Infrastructure:** Docker, Traefik, Ubuntu 24.04 (VPS)
- **Deployment:** Cloudflare Pages (Frontend)

## 🚀 Features

- **Asynchronous Scraping:** Playwrightを使用した高速なデータ取得
- **Secure API:** API Keyによるアクセス制限の実装
- **Database Integration:** SQLAlchemy(Async)による価格履歴の保存
- **Modern UI:** Tailwind CSS v4 を使用したレスポンシブデザイン（構築中）

## 📦 Getting Started

### Prerequisites
- Docker / Docker Compose

### Installation
1. リポジトリをクローン:
```bash
git clone https://github.com/hisao5232/my-price-tracker.git
   cd my-price-tracker
```
2. 環境変数の設定:
.env ファイルを作成し、必要な情報を入力してください。
```
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
DATABASE_URL=postgresql+asyncpg://user:pass@tracker-db:5432/db_name
API_KEY=...
```
3. コンテナの起動:
```bash
docker compose up -d --build
```

## ⚖️ License & Disclaimer
本プロジェクトは技術学習を目的とした教育的サンプルです。
対象サイトの利用規約を遵守し、過度なリクエストを避ける設計を行っています。
商用利用や不正なデータ収集を目的とした利用は禁止します。
