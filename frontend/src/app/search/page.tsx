"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [savedKeywords, setSavedKeywords] = useState<{id: number, keyword: string}[]>([]);
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // 保存済みキーワードの読み込み
  const fetchKeywords = async () => {
    const res = await fetch(`${API_URL}/keywords`);
    const data = await res.json();
    setSavedKeywords(data);
  };

  useEffect(() => { fetchKeywords(); }, []);

  // キーワード登録処理
  const handleRegister = async () => {
    if (!keyword) return;
    await fetch(`${API_URL}/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword }),
    });
    setKeyword("");
    fetchKeywords(); // リストを更新
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 italic">MONITORING BOARD</h1>

        {/* 入力エリア */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-12 flex gap-4">
          <input 
            type="text" 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="例: DSライト 27.5"
            className="flex-1 bg-slate-100 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
          />
          <button 
            onClick={handleRegister}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all active:scale-95"
          >
            登録
          </button>
        </div>

        {/* キーワードカード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedKeywords.map((k) => (
            <Link 
              key={k.id} 
              href={`/items/keyword/${encodeURIComponent(k.keyword)}`}
              className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              <div className="relative z-10">
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Monitoring</span>
                <h2 className="text-2xl font-black text-slate-800 mt-2">{k.keyword}</h2>
              </div>
              {/* 背景の装飾的なアイコン */}
              <div className="absolute -right-4 -bottom-4 text-slate-50 group-hover:text-blue-50 transition-colors">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24" fill="currentColor" viewBox="0 0 24 24">
                   <path d="M10 18a7.952 7.952 0 0 0 4.897-1.688l4.396 4.396 1.414-1.414-4.396-4.396A7.952 7.952 0 0 0 18 10c0-4.411-3.589-8-8-8s-8 3.589-8 8 3.589 8 8 8zm0-14c3.309 0 6 2.691 6 6s-2.691 6-6 6-6-2.691-6-6 2.691-6 6-6z"/>
                 </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
