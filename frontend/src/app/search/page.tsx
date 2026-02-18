"use client";

import { useState } from "react";
import Link from "next/link";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]); // 後ほど型定義

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;

    setIsSearching(true);
    try {
      // バックエンドに検索リクエストを送る想定
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(keyword)}`, {
        headers: { "x-api-key": API_KEY || "" }
      });
      const data = await response.json();
      setResults(data.items || []);
    } catch (error) {
      alert("検索に失敗しました");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* ヘッダーコンポーネント */}
      <nav className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-black text-blue-600">Price Tracker</Link>
          <div className="flex gap-4">
            <Link href="/" className="text-sm font-bold text-slate-500 hover:text-blue-600">ホーム</Link>
            <Link href="/search" className="text-sm font-bold text-blue-600">キーワード検索</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl p-6">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">キーワードで新着商品を検索</h2>
          <p className="text-slate-500">条件を保存すると、毎日Discordへ通知します</p>
        </header>

        {/* 検索フォーム */}
        <section className="mb-12 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="例: ASICS スパイク 27cm"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button 
              type="submit" 
              disabled={isSearching}
              className="rounded-xl bg-blue-600 px-8 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-slate-300 transition-all"
            >
              {isSearching ? "検索中..." : "検索"}
            </button>
          </form>
        </section>

        {/* 検索結果（仮） */}
        <div className="grid gap-6 sm:grid-cols-2">
          {results.map((res, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <img src={res.image_url} alt="" className="w-full aspect-square object-cover rounded-xl mb-3" />
              <h4 className="font-bold text-sm line-clamp-2">{res.name}</h4>
              <p className="text-blue-600 font-black mt-2">¥{res.price.toLocaleString()}</p>
              <button className="w-full mt-3 py-2 bg-slate-100 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition-all">
                この条件を保存して毎日監視
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
