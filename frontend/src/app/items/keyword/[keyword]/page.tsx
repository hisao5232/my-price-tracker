"use client";
export const runtime = "edge";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// Route Segment Config
export const dynamic = "force-dynamic";

interface Item {
  id: number;
  name: string;
  url: string;
  price?: number;
  image_url?: string;
  created_at: string;
}

export default function KeywordItemsPage() {
  const params = useParams();
  // params.keyword が存在するかチェック
  const keyword = params?.keyword ? decodeURIComponent(params.keyword as string) : "";
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!keyword) return;

    const fetchKeywordItems = async () => {
      try {
        const response = await fetch(`${API_URL}/items/keyword/${encodeURIComponent(keyword)}`);
        if (!response.ok) throw new Error('Fetch failed');
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error("データ取得失敗:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchKeywordItems();
  }, [keyword, API_URL]);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-slate-400 hover:text-blue-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-black text-slate-800">
              「{keyword}」の結果
            </h1>
          </div>
          <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            {items.length} Items
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-slate-400 font-bold">データを読み込み中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <a 
                key={item.id} 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 italic text-xs">No Image</div>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h4 className="text-[11px] font-bold text-slate-700 line-clamp-2 leading-tight mb-2">{item.name}</h4>
                  <div className="flex items-center justify-between mt-auto">
                    <p className="text-sm font-black text-blue-600 italic">{item.price ? `¥${item.price.toLocaleString()}` : '---'}</p>
                    <span className="text-[9px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
