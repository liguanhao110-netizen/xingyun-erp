import React, { useState, useMemo, useDeferredValue } from 'react';
import { SaleRecord } from '../types';

interface OrderManagerProps {
  salesData: SaleRecord[];
  onUpdateOrder: (index: number, field: string, value: any) => void;
  onDeleteOrder: (index: number) => void;
  onSave: () => void;
}

export const OrderManager: React.FC<OrderManagerProps> = ({ salesData, onUpdateOrder, onDeleteOrder, onSave }) => {
  const [search, setSearch] = useState('');
  // 1. 性能优化：使用 useDeferredValue 让搜索计算在后台进行，优先保证输入框响应
  const deferredSearch = useDeferredValue(search);
  
  const [page, setPage] = useState(1);
  const pageSize = 100;

  // Intelligent Fuzzy Search
  const filteredIndices = useMemo(() => {
    // 使用延迟后的搜索词进行过滤
    if (!deferredSearch.trim()) return salesData.map((s, i) => ({ s, i }));
    
    const terms = deferredSearch.toLowerCase().split(/\s+/).filter(t => t); // Split by space
    
    return salesData.map((s, i) => ({ s, i })).filter(({ s }) => {
      // Create a searchable string from relevant fields
      const searchString = `${s.order_id} ${s.sku} ${s.type} ${s.amount}`.toLowerCase();
      // Check if ALL terms are present in the record (AND logic for refinement)
      return terms.every(term => searchString.includes(term));
    });
  }, [salesData, deferredSearch]); // 依赖项改为 deferredSearch

  // Then Paginate
  const totalPages = Math.ceil(filteredIndices.length / pageSize) || 1;
  const paginatedItems = filteredIndices.slice((page - 1) * pageSize, page * pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  return (
    <div className="p-8 h-full flex flex-col max-w-[1600px] mx-auto w-full animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm flex flex-col h-full border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-slate-700 text-lg">订单管理</h3>
            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">{filteredIndices.length}</span>
          </div>
          <div className="flex gap-3">
             <div className="relative group">
               <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs group-focus-within:text-brand-500 transition-colors"></i>
               {/* 输入框绑定原始 search 状态，保证实时响应 */}
               <input 
                 value={search} 
                 onChange={e => { setSearch(e.target.value); setPage(1); }} 
                 placeholder="输入订单号、SKU 或 类型..." 
                 className="pl-8 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm transition-all" 
               />
             </div>
             <button onClick={onSave} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
               <i className="fas fa-save"></i> 保存更改
             </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto relative">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 text-slate-500 uppercase font-semibold text-xs">
              <tr>
                <th className="px-4 py-3 border-b">订单号</th>
                <th className="px-4 py-3 border-b">日期</th>
                <th className="px-4 py-3 border-b">SKU</th>
                <th className="px-4 py-3 border-b">类型</th>
                <th className="px-4 py-3 border-b text-right">金额 ($)</th>
                <th className="px-4 py-3 border-b text-right">运费 ($)</th>
                <th className="px-4 py-3 border-b text-right">仓储费 ($)</th>
                <th className="px-4 py-3 border-b text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map(({ s, i }) => (
                <tr key={`${s.order_id}-${i}`} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-2 font-mono text-brand-700 font-medium text-xs">{s.order_id}</td>
                  <td className="px-4 py-2">
                    <input 
                      type="date" 
                      value={s.date} 
                      onChange={e => onUpdateOrder(i, 'date', e.target.value)} 
                      className="bg-transparent border border-transparent hover:border-slate-300 focus:border-brand-500 focus:bg-white rounded px-2 py-1 w-32 text-xs text-slate-600 outline-none transition-all font-mono"
                    />
                  </td>
                  <td className="px-4 py-2 font-bold text-slate-700 text-xs font-mono">{s.sku}</td>
                  <td className="px-4 py-2">
                    <div className="relative">
                      <select 
                        value={s.type} 
                        onChange={e => onUpdateOrder(i, 'type', e.target.value)}
                        className={`appearance-none bg-transparent pl-2 pr-6 py-1 rounded text-xs font-bold border border-transparent hover:border-slate-300 cursor-pointer outline-none focus:ring-2 focus:ring-brand-500 ${
                          s.type === 'Refund' ? 'text-rose-600 bg-rose-50/50' : 'text-emerald-600 bg-emerald-50/50'
                        }`}
                      >
                        <option value="Sale">销售 (Sale)</option>
                        <option value="Refund">退款 (Refund)</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input 
                      type="number" 
                      value={s.amount} 
                      onChange={e => onUpdateOrder(i, 'amount', +e.target.value)} 
                      className="bg-transparent border-b border-dashed border-slate-300 hover:border-solid hover:border-brand-500 focus:border-brand-500 w-20 text-right font-mono text-slate-700 focus:bg-white outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input 
                      type="number" 
                      value={s.shipping_fee} 
                      onChange={e => onUpdateOrder(i, 'shipping_fee', +e.target.value)} 
                      className="bg-transparent border-b border-dashed border-slate-200 hover:border-slate-400 focus:border-brand-500 w-16 text-right font-mono text-slate-500 text-xs focus:bg-white outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input 
                      type="number" 
                      value={s.storage_fee || 0} 
                      onChange={e => onUpdateOrder(i, 'storage_fee', +e.target.value)} 
                      className="bg-transparent border-b border-dashed border-slate-200 hover:border-slate-400 focus:border-brand-500 w-16 text-right font-mono text-slate-500 text-xs focus:bg-white outline-none"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => onDeleteOrder(i)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors">
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    没有找到匹配的订单
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex-shrink-0">
           <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="px-3 py-1.5 border border-slate-300 bg-white rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">上一页</button>
           <span className="font-medium font-mono">Page {page} of {totalPages}</span>
           <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 border border-slate-300 bg-white rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition">下一页</button>
        </div>
      </div>
    </div>
  );
};