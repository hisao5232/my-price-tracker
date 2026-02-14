"use client";

import { useEffect, useState } from "react";

interface Item {
  id: number;
  name: string;
  url: string;
  mercari_id: string;
  created_at: string;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputUrl, setInputUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 環境変数から取得
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/items`);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("データの取得に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // 型を React.FormEvent<HTMLFormElement> に修正
  const handleScrape = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputUrl) return;

    setIsSubmitting(true);
    try {
      // URLも環境変数を使用するように修正
      const response = await fetch(
        `${API_URL}/scrape?url=${encodeURIComponent(inputUrl)}`,
        {
          method: "GET",
          headers: {
            "x-api-key": API_KEY || "",
            "accept": "application/json",
          },
        }
      );

      if (response.ok) {
        setInputUrl("");
        await fetchItems();
        alert("追跡を開始しました！");
      } else {
        alert("スクレイピングに失敗しました。");
      }
    } catch (error) {
      console.error("エラー:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-sans">データを読み込み中...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 pb-20 font-sans">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="mb-2 text-4xl font-black tracking-tight text-slate-900">Price Tracker</h1>
          <p className="text-slate-500">メルカリ商品の価格推移を自動で追跡します</p>
        </header>

        {/* 新規登録フォーム */}
        <section className="mb-12 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="mb-4 text-lg font-bold text-slate-800">新しい商品を追跡する</h2>
          <form onSubmit={handleScrape} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              placeholder="https://jp.mercari.com/item/m..."
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              required
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition-all hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed min-w-[140px]"
            >
              {isSubmitting ? "解析中..." : "追跡を開始"}
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-400 italic">※Shops商品、通常商品のどちらのURLでもOKです</p>
        </section>

        {/* カードリスト */}
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
              <div className="p-5 flex-1">
                <div className="mb-2 text-[10px] font-bold tracking-widest text-blue-500 uppercase">
                  {item.mercari_id}
                </div>
                <h2 className="mb-4 line-clamp-2 text-lg font-bold leading-snug text-slate-800">
                  {item.name}
                </h2>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>登録: {new Date(item.created_at).toLocaleDateString()}</span>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-600 hover:underline">
                    商品ページ ↗
                  </a>
                </div>
              </div>
              <button className="w-full border-t border-slate-100 bg-slate-50 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                グラフを見る
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
