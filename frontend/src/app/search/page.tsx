"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SavedKeyword {
  id: number;
  keyword: string;
}

export default function SearchPage() {
  const [keyword, setKeyword] = useState("");
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // 保存済みキーワードの読み込み
  const fetchKeywords = async () => {
    try {
      const res = await fetch(`${API_URL}/keywords`);
      if (!res.ok) throw new Error("取得失敗");
      const data = await res.json();
      setSavedKeywords(data);
    } catch (err) {
      console.error("キーワードの取得に失敗しました:", err);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, [API_URL]);

  // キーワード登録処理
  const handleRegister = async () => {
    if (!keyword.trim() || isRegistering) return;
    
    setIsRegistering(true);
    try {
      const res = await fetch(`${API_URL}/keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      
      if (res.ok) {
        setKeyword("");
        await fetchKeywords(); // リストを最新に更新
      }
    } catch (err) {
      alert("登録に失敗しました");
    } finally {
      setIsRegistering(false);
    }
  };

  // キーワード削除処理（利便性のために追加）
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault(); // Linkの遷移を防止
    if (!confirm("このキーワードを削除しますか？")) return;

    try {
      await fetch(`${API_URL}/keywords/${id}`, { method: "DELETE" });
      fetchKeywords();
    } catch (err) {
      alert("削除に失敗しました");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto">
        
        {/* ヘッダーエリア */}
        <header className="mb-12">
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 mb-2">
            MONITORING <span className="text-blue-600">BOARD</span>
          </h1>
          <p className="text-slate-500 font-medium">監視するキーワードを登録して、最新価格を一撃でチェック。</p>
        </header>

        {/* 入力エリア */}
        <div className="bg-white p-2 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-16 flex flex-col md:flex-row gap-2 transition-all focus-within:ring-4 focus-within:ring-blue-100">
          <input 
            type="text" 
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
            placeholder="例: DSライト 27.5"
            className="flex-1 bg-transparent border-none rounded-2xl px-6 py-4 outline-none font-bold text-lg placeholder:text-slate-300"
          />
          <button 
            onClick={handleRegister}
            disabled={isRegistering || !keyword}
            className={`px-10 py-4 rounded-2xl font-black text-white transition-all active:scale-95 flex items-center justify-center gap-2
              ${isRegistering || !keyword ? 'bg-slate-300' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'}
            `}
          >
            {isRegistering ? (
              <span className="animate-pulse">登録中...</span>
            ) : (
              <>登録</>
            )}
          </button>
        </div>

        {/* キーワードカード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedKeywords.map((k) => (
            <div key={k.id} className="relative group">
              <Link 
                href={`/items/keyword/${encodeURIComponent(k.keyword)}`}
                className="block h-full bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden"
              >
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Monitoring</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 leading-tight break-all">{k.keyword}</h2>
                  </div>
                  
                  <div className="mt-8 flex items-center text-blue-600 font-bold text-sm">
                    VIEW ITEMS 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* 背景の装飾的なサーチアイコン */}
                <div className="absolute -right-6 -bottom-6 text-slate-50 group-hover:text-blue-50/50 transition-colors duration-500">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M10 18a7.952 7.952 0 0 0 4.897-1.688l4.396 4.396 1.414-1.414-4.396-4.396A7.952 7.952 0 0 0 18 10c0-4.411-3.589-8-8-8s-8 3.589-8 8 3.589 8 8 8zm0-14c3.309 0 6 2.691 6 6s-2.691 6-6 6-6-2.691-6-6 2.691-6 6-6z"/>
                   </svg>
                </div>
              </Link>
              
              {/* 削除ボタン（カードの右上に浮かせる） */}
              <button 
                onClick={(e) => handleDelete(e, k.id)}
                className="absolute top-4 right-4 z-20 p-2 bg-slate-100 text-slate-400 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500 transition-all duration-300"
                title="削除"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {savedKeywords.length === 0 && !isRegistering && (
          <div className="text-center py-20 bg-slate-100 rounded-[3rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">まだ登録されているキーワードがありません。<br/>上のフォームから登録してみましょう！</p>
          </div>
        )}
      </div>
    </main>
  );
}
