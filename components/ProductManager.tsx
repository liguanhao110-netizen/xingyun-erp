import React, { useState, useMemo } from 'react';
import { Product } from '../types';

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (sku: string, p: Product) => void;
  onDeleteProduct: (sku: string) => void;
  onSave: () => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ products, onAddProduct, onUpdateProduct, onDeleteProduct, onSave }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempProd, setTempProd] = useState<Partial<Product>>({});
  const [search, setSearch] = useState('');

  // Fuzzy Search for Products
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    
    const terms = search.toLowerCase().split(/\s+/).filter(t => t);
    
    return products.filter(p => {
      const searchString = `${p.sku} ${p.parent_sku} ${p.name}`.toLowerCase();
      return terms.every(term => searchString.includes(term));
    });
  }, [products, search]);

  const openModal = (p?: Product) => {
    if (p) {
      setIsEditing(true);
      setTempProd({ ...p });
    } else {
      setIsEditing(false);
      setTempProd({});
    }
    setShowModal(true);
  };

  const handleSaveModal = () => {
    if (isEditing && tempProd.sku) {
      onUpdateProduct(tempProd.sku, tempProd as Product);
    } else if (tempProd.sku) {
      onAddProduct(tempProd as Product);
    }
    setShowModal(false);
    onSave(); // Auto save to LS
  };

  return (
    <div className="p-8 h-full flex flex-col max-w-[1600px] mx-auto w-full animate-fade-in">
       <div className="bg-white rounded-xl shadow-sm flex flex-col h-full border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-slate-700 text-lg">产品档案 (Product Catalog)</h3>
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-mono font-bold">{filteredProducts.length}</span>
            </div>
            <div className="flex gap-3">
               <div className="relative group">
                 <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs group-focus-within:text-blue-500 transition-colors"></i>
                 <input 
                   value={search} 
                   onChange={e => setSearch(e.target.value)} 
                   placeholder="搜索SKU、名称..." 
                   className="pl-8 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all" 
                 />
               </div>
               <button onClick={() => openModal()} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                 <i className="fas fa-plus"></i> 添加产品
               </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto relative">
             <table className="w-full text-sm text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 shadow-sm z-10 text-slate-500 uppercase font-semibold text-xs">
                  <tr>
                    <th className="px-4 py-3 border-b">SKU</th>
                    <th className="px-4 py-3 border-b">父体 SKU</th>
                    <th className="px-4 py-3 border-b">中文名称</th>
                    <th className="px-4 py-3 border-b text-right">采购成本 (¥)</th>
                    <th className="px-4 py-3 border-b text-right">头程运费 (¥)</th>
                    <th className="px-4 py-3 border-b text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredProducts.map(p => (
                     <tr key={p.sku} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 font-bold text-slate-700 font-mono text-xs">{p.sku}</td>
                        <td className="px-4 py-3 text-brand-600 font-mono text-xs">{p.parent_sku}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{p.cost_cny}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{p.ship_cny}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => openModal(p)} className="text-blue-500 hover:text-blue-700 mr-3 font-medium text-xs">编辑</button>
                          <button onClick={() => { if(confirm('确认删除?')) { onDeleteProduct(p.sku); onSave(); } }} className="text-red-400 hover:text-red-600 font-medium text-xs">删除</button>
                        </td>
                     </tr>
                   ))}
                   {filteredProducts.length === 0 && (
                     <tr>
                       <td colSpan={6} className="text-center py-12 text-slate-400">
                         未找到产品
                       </td>
                     </tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* Modal */}
       {showModal && (
         <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-96 animate-fade-in border border-slate-200">
               <h3 className="font-bold text-lg mb-4 border-b border-slate-100 pb-3 text-slate-800 flex justify-between items-center">
                 <span>{isEditing ? '编辑产品' : '添加新产品'}</span>
                 <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
               </h3>
               <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">SKU</label>
                    <input placeholder="例如: SKU-001" value={tempProd.sku || ''} onChange={e => setTempProd({...tempProd, sku: e.target.value})} disabled={isEditing} className="w-full border border-slate-300 p-2 rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono disabled:bg-slate-50 disabled:text-slate-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">父体 SKU</label>
                    <input placeholder="例如: Parent-A" value={tempProd.parent_sku || ''} onChange={e => setTempProd({...tempProd, parent_sku: e.target.value})} className="w-full border border-slate-300 p-2 rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">中文名称</label>
                    <input placeholder="例如: 红色连衣裙" value={tempProd.name || ''} onChange={e => setTempProd({...tempProd, name: e.target.value})} className="w-full border border-slate-300 p-2 rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">采购成本 (¥)</label>
                        <input type="number" placeholder="0.00" value={tempProd.cost_cny || ''} onChange={e => setTempProd({...tempProd, cost_cny: +e.target.value})} className="w-full border border-slate-300 p-2 rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono text-right" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">头程运费 (¥)</label>
                        <input type="number" placeholder="0.00" value={tempProd.ship_cny || ''} onChange={e => setTempProd({...tempProd, ship_cny: +e.target.value})} className="w-full border border-slate-300 p-2 rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono text-right" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">月仓储费 ($)</label>
                        <input type="number" placeholder="0.00" value={tempProd.storage_usd || ''} onChange={e => setTempProd({...tempProd, storage_usd: +e.target.value})} className="w-full border border-slate-300 p-2 rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono text-right" />
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">尾程运费 ($)</label>
                        <input type="number" placeholder="0.00" value={tempProd.last_mile_usd || ''} onChange={e => setTempProd({...tempProd, last_mile_usd: +e.target.value})} className="w-full border border-slate-300 p-2 rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono text-right" />
                    </div>
                  </div>
               </div>
               <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                 <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">取消</button>
                 <button onClick={handleSaveModal} className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 shadow-md transition-colors">保存</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};