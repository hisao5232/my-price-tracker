"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Item {
  id: number;
  name: string;
  url: string;
  mercari_id: string;
  image_url?: string; // 追加
  created_at: string;
}

interface PriceHistory {
  price: number;
  created_at: string;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputUrl, setInputUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [selectedItemName, setSelectedItemName] = useState("");

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

  const openGraph = async (item: Item) => {
    setSelectedItemName(item.name);
    try {
      const response = await fetch(`${API_URL}/items/${item.id}/history`);
      const data = await response.json();
      const formattedData = data.history.map((h: any) => ({
        price: h.price,
        date: new Date(h.created_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      }));
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
        await fetchItems();
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
        headers: {
          "x-api-key": API_KEY || "",
        },
      });

      if (response.ok) {
        await fetchItems();
      } else {
        alert("削除に失敗しました");
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
          <p className="text-slate-500 font-medium">お気に入りアイテムの価格推移を自動監視</p>
        </header>

        <section className="mb-12 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
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
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all">
              
              {/* --- 商品画像セクション --- */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100 border-b border-slate-100">
                {item.image_url ? (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400 text-sm italic">
                    No Image Available
                  </div>
                )}
                {/* 削除ボタンを画像の上に配置 */}
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-slate-400 opacity-0 shadow-md transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  title="追跡を停止"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="p-5 flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                    {item.mercari_id}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    登録: {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="mb-4 line-clamp-2 text-lg font-bold leading-tight h-12">
                  {item.name}
                </h2>
                <div className="flex justify-end">
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center gap-1"
                  >
                    メルカリで見る
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              <button 
                onClick={() => openGraph(item)}
                className="w-full border-t border-slate-100 bg-slate-50 py-4 text-sm font-bold text-slate-600 hover:bg-blue-600 hover:text-white transition-all active:scale-[0.98]"
              >
                価格の推移を表示
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* --- グラフモーダル --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl relative overflow-hidden">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800 pr-8">{selectedItemName}</h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 transition-colors p-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#94a3b8' }}
                    tickFormatter={(value) => `¥${value.toLocaleString()}`} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
                    formatter={(value: number | undefined) => {
                      if (value === undefined) return ["-", "価格"];
                      return [`¥${value.toLocaleString()}`, "現在の価格"];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#2563eb" 
                    strokeWidth={4} 
                    dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
                    activeDot={{ r: 8, strokeWidth: 0 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-8 flex justify-center">
              <p className="text-[10px] text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                ※ 価格情報は定期スクレイピングの結果に基づいています
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
