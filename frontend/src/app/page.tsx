"use client";

import { useEffect, useState } from "react";
// グラフ用のコンポーネントをインポート
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Item {
  id: number;
  name: string;
  url: string;
  mercari_id: string;
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

  // --- モーダル管理用の状態 ---
  const [showModal, setShowModal] = useState(false);
  const [historyData, setHistoryData] = useState<PriceHistory[]>([]);
  const [selectedItemName, setSelectedItemName] = useState("");

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

  // グラフデータを取得してモーダルを開く関数
  const openGraph = async (item: Item) => {
    setSelectedItemName(item.name);
    try {
      const response = await fetch(`${API_URL}/items/${item.id}/history`);
      const data = await response.json();
      // Recharts用に日付フォーマットを整形
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

  // 型を React.FormEvent<HTMLFormElement> に修正
  const handleScrape = async (e: React.SubmitEvent<HTMLFormElement>) => {
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

  if (loading) return <div className="p-8 text-center text-slate-500 font-sans">データを読み込み中...</div>;

  return (
    <main className="min-h-screen bg-slate-50 p-6 pb-20 font-sans text-slate-900">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="mb-2 text-4xl font-black tracking-tight">Price Tracker</h1>
          <p className="text-slate-500">価格推移をビジュアルで確認</p>
        </header>

        {/* 登録フォーム (以前と同じ) */}
        <section className="mb-12 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <form onSubmit={handleScrape} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              placeholder="メルカリ商品URL"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-slate-300">
              {isSubmitting ? "解析中..." : "追跡開始"}
            </button>
          </form>
        </section>

        {/* カードリスト */}
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5 flex-1">
                <div className="mb-2 text-[10px] font-bold text-blue-500">{item.mercari_id}</div>
                <h2 className="mb-4 line-clamp-2 text-lg font-bold leading-tight">{item.name}</h2>
              </div>
              <button 
                onClick={() => openGraph(item)}
                className="w-full border-t border-slate-100 bg-slate-50 py-3 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                グラフを見る
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* --- グラフモーダル --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-bold line-clamp-1">{selectedItemName}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `¥${value.toLocaleString()}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    // value を (number | undefined) として受け取り、存在を確認してから処理する
                    formatter={(value: number | undefined) => {
                      if (value === undefined) return ["-", "価格"];
                      return [`¥${value.toLocaleString()}`, "価格"];
                    }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 text-center text-xs text-slate-400">
              ※データはスクレイピング実行時のものです
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
