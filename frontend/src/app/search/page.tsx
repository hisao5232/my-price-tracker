"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // 追加
import Link from "next/link";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter(); // 追加

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword) return;

    setIsSearching(true);
    try {
      // バックエンドの /search はスクレイピング + DB保存まで行う
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(keyword)}`, {
        headers: { "x-api-key": API_KEY || "" }
      });
      
      if (response.ok) {
        alert("キーワードを登録し、初回スクレイピングを完了しました！");
        router.push("/"); // 保存されたカードを確認するためにホームへ戻る
      }
    } catch (error) {
      alert("検索・保存に失敗しました");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* ナビゲーション */}
      <nav className="bg-white border-b border-slate-200 p-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-black text-blue-600">Price Tracker</Link>
          <div className="flex gap-4">
            <Link href="/" className="text-sm font-bold text-slate-500">ホーム</Link>
            <Link href="/search" className="text-sm font-bold text-blue-600">キーワード登録</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl p-6">
        <header className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800">新しい監視ワードを登録</h2>
          <p className="text-slate-500 text-sm">登録するとメルカリから116件を取得し、監視を開始します</p>
        </header>

        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <form onSubmit={handleSearch} className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 ml-1">検索キーワード</label>
              <input
                type="text"
                placeholder="例: アシックス DSライト 27.5"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-5 py-4 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all text-lg"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearching}
              className="w-full rounded-2xl bg-blue-600 py-4 font-black text-white hover:bg-blue-700 disabled:bg-slate-300 shadow-lg shadow-blue-200 transition-all"
            >
              {isSearching ? "116件を解析中..." : "このワードを監視登録する"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
