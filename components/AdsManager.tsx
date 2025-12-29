import React, { useState, useMemo } from 'react';
import { AdRecord } from '../types';

interface AdsManagerProps {
  adsData: AdRecord[];
  onUpdateAd: (index: number, field: string, value: any) => void;
  onDeleteAd: (index: number) => void;
  onSave: () => void;
}

export const AdsManager: React.FC<AdsManagerProps> = ({ adsData, onUpdateAd, onDeleteAd, onSave }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 100;
  
  // Fuzzy Search
  const filteredIndices = useMemo(() => {
    if (!search.trim()) return adsData.map((a, i) => ({ a, i }));
    
    const terms = search.toLowerCase().split(/\s+/).filter(t => t);
    
    return adsData.map((a, i) => ({ a, i })).filter(({ a }) => {
      const searchString = `${a.parent_sku} ${a.date}`.toLowerCase();
      return terms.every(term => searchString.includes(term));
    });
  }, [adsData, search]);

  const totalPages = Math.ceil(filteredIndices.length / pageSize) || 1;
  const paginatedItems = filteredIndices.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="p-8 h-full flex flex-col max-w-[1600px] mx-auto w-full animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm flex flex-col h-full border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-700 text-lg">广告管理 (Ads Spend)</h3>
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-mono font-bold">{filteredIndices.length}</span>
          </div>
          <div className="flex gap-3">
             <div className="relative group">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs group-focus-within:text-purple-500 transition-colors"></i>
                <input 
                  value={search} 
                  onChange={e => { setSearch(e.target.value); setPage(1); }} 
                  placeholder="搜索父体SKU..." 
                  className="pl-8 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all" 
                />
             </div>
             <button onClick={onSave} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
               <i className="fas fa-save"></i> 保存更改
             </button>
          </div>
        </div>
        
        {/* Table */}
        <div className="flex-1 overflow-auto border rounded border-slate-200 relative">
          <table className="w-full text-sm text-left border-collapse">
             <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 text-slate-500 uppercase font-semibold text-xs">
               <tr>
                 <th className="px-4 py-3 border-b">日期</th>
                 <th className="px-4 py-3 border-b">父体 SKU (Parent)</th>
                 <th className="px-4 py-3 border-b">总花费 ($)</th>
                 <th className="px-4 py-3 border-b text-center">操作</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {paginatedItems.map(({ a, i }) => (
                 <tr key={i} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-2">
                      <input 
                        type="date" 
                        value={a.date} 
                        onChange={e => onUpdateAd(i, 'date', e.target.value)} 
                        className="bg-transparent border border-transparent hover:border-slate-300 focus:border-purple-500 focus:bg-white rounded px-2 py-1 text-xs text-slate-600 outline-none transition-all font-mono"
                      />
                    </td>
                    <td className="px-4 py-2 font-bold text-indigo-700 font-mono text-xs">
                      {a.parent_sku}
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        value={a.total_spend} 
                        onChange={e => onUpdateAd(i, 'total_spend', +e.target.value)} 
                        className="bg-transparent border-b border-dashed border-slate-300 hover:border-solid hover:border-purple-500 focus:border-purple-500 w-32 text-slate-700 font-mono focus:bg-white outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => onDeleteAd(i)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors">
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                 </tr>
               ))}
               {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-400">
                    无匹配广告数据
                  </td>
                </tr>
              )}
             </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex-shrink-0">
           <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 border border-slate-300 bg-white rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">上一页</button>
           <span className="font-medium font-mono">Page {page} of {totalPages}</span>
           <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 border border-slate-300 bg-white rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">下一页</button>
        </div>
      </div>
    </div>
  );
};