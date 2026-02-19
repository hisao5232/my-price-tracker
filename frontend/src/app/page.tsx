"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; // 追加
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Item {
  id: number;
  name: string;
  url: string;
  mercari_id: string;
  image_url?: string;
  created_at: string;
}

// 監視キーワード用の型定義
interface SearchQuery {
  id: number;
  keyword: string;
  last_seen_ids: string[];
  created_at: string;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [queries, setQueries] = useState<SearchQuery[]>([]); // 追加
  const [loading, setLoading] = useState(true);
  const [inputUrl, setInputUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [selectedItemName, setSelectedItemName] = useState("");

  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // 既存のアイテム取得 + キーワード一覧取得
  const fetchData = async () => {
    try {
      const [itemsRes, queriesRes] = await Promise.all([
        fetch(`${API_URL}/items`),
        fetch(`${API_URL}/queries`) // バックエンドに追加したエンドポイント
      ]);
      const itemsData = await itemsRes.json();
      const queriesData = await queriesRes.json();
      
      setItems(itemsData);
      setQueries(queriesData);
    } catch (error) {
      console.error("データの取得に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- 既存の関数 (openGraph, handleScrape, deleteItem) はそのまま維持 ---
  const openGraph = async (item: Item) => {
    setSelectedItemName(item.name);
    try {
      const response = await fetch(`${API_URL}/items/${item.id}/history`);
      const data = await response.json();
      const formattedData = data.history.map((h: any) => {
        const dateObj = new Date(h.created_at);
        return {
          price: h.price,
          fullDate: dateObj.toLocaleString('ja-JP', { 
            month: 'numeric', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        };
      });
      setHistoryData(formattedData);
      setShowModal(true);
    } catch (error) {
      alert("履歴の取得に失敗しました");
    }
  };

  const handleScrape = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputUrl) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/scrape?url=${encodeURIComponent(inputUrl)}`, {
        headers: { "x-api-key": API_KEY || "" }
      });
      if (response.ok) {
        setInputUrl("");
        await fetchData();
        alert("追跡を開始しました！");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!confirm("この商品の追跡を停止（削除）してよろしいですか？")) return;
    try {
      const response = await fetch(`${API_URL}/items/${itemId}`, {
        method: "DELETE",
        headers: { "x-api-key": API_KEY || "" },
      });
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("削除エラー:", error);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 font-sans">データを読み込み中...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 pb-20 font-sans text-slate-900">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="mb-2 text-4xl font-black tracking-tight text-blue-600">Price Tracker</h1>
          <p className="text-slate-500 font-medium italic">Monitoring your favorite gear with precision</p>
        </header>

        {/* --- 1. キーワード監視セクション (新規追加) --- */}
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800">キーワード監視</h2>
            <Link href="/search" className="text-sm font-bold text-blue-600 hover:underline">
              ＋ 新規登録
            </Link>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {queries.map((query) => (
              <Link 
                key={query.id} 
                href={`/items/keyword/${encodeURIComponent(query.keyword)}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                <div>
                  <div className="mb-3 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                    Active
                  </div>
                  <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {query.keyword}
                  </h3>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Stored: {query.last_seen_ids?.length || 0} items
                  </span>
                  <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
            {queries.length === 0 && (
              <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-bold">
                監視中のキーワードはありません
              </div>
            )}
          </div>
        </section>

        <hr className="mb-12 border-slate-200" />

        {/* --- 2. 個別商品登録セクション --- */}
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-black text-slate-800">個別商品ピンポイント追跡</h2>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <form onSubmit={handleScrape} className="flex flex-col gap-3 sm:flex-row">
              <input
                type="url"
                placeholder="メルカリの商品URLを入力"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200 transition-all"
              />
              <button type="submit" disabled={isSubmitting} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-slate-300 transition-colors">
                {isSubmitting ? "解析中..." : "追跡開始"}
              </button>
            </form>
          </div>
        </section>

        {/* --- 3. 個別商品リストセクション --- */}
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
              {/* 画像セクション（既存のまま） */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100 border-b border-slate-100">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm italic">No Image</div>
                )}
                <button onClick={() => deleteItem(item.id)} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-slate-400 opacity-0 shadow-md transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* コンテンツセクション（既存のまま） */}
              <div className="p-5 flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">{item.mercari_id}</span>
                  <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <h2 className="mb-4 line-clamp-2 text-lg font-bold leading-tight h-12">{item.name}</h2>
                <div className="flex justify-end">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    メルカリで見る <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
              </div>

              <button onClick={() => openGraph(item)} className="w-full border-t border-slate-100 bg-slate-50 py-4 text-sm font-bold text-slate-600 hover:bg-blue-600 hover:text-white transition-all">
                価格の推移を表示
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* モーダル（既存のまま） */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          {/* ... 既存のモーダル内容 ... */}
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl relative">
             <button onClick={() => setShowModal(false)} className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
             <h3 className="text-xl font-bold mb-8 pr-8">{selectedItemName}</h3>
             <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="fullDate" fontSize={10} tick={{ fill: '#94a3b8' }} />
                      <YAxis fontSize={11} tickFormatter={(v) => `¥${v.toLocaleString()}`} tick={{ fill: '#94a3b8' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={4} />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}
    </main>
  );
}
