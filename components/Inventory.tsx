import React, { useMemo, useState } from 'react';
import { Product, SaleRecord, InventoryState, AppSettings } from '../types';

interface InventoryProps {
  products: Product[];
  salesData: SaleRecord[];
  inventoryState: InventoryState;
  settings: AppSettings;
  onUpdateInventory: (sku: string, field: string, value: any) => void;
  onUpdateSettings: (field: string, value: number) => void;
  onSave: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({ 
  products, salesData, inventoryState, settings, onUpdateInventory, onUpdateSettings, onSave 
}) => {
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const now = new Date();
    
    // 1. Calculate All Data First
    const calculatedList = products.map(p => {
      const s = inventoryState[p.sku] || { baseQty: 0, baseDate: '', inbound: 0, daily: 0 };
      
      // Snapshot Calibration (Current Stock)
      let salesSince = 0;
      if (s.baseDate) {
        const baseD = new Date(s.baseDate);
        salesData.forEach(order => {
          if (order.sku === p.sku && order.type === 'Sale' && new Date(order.date) > baseD) {
            salesSince += 1;
          }
        });
      }
      const currentStock = Math.max(0, (s.baseQty || 0) - salesSince);

      // Dual-Track Velocity Logic
      const d7 = new Date(); d7.setDate(now.getDate() - 7);
      const count7 = salesData.filter(x => x.sku === p.sku && x.type === 'Sale' && new Date(x.date) >= d7).length;
      const avg7 = count7 / 7;

      const d30 = new Date(); d30.setDate(now.getDate() - 30);
      const count30 = salesData.filter(x => x.sku === p.sku && x.type === 'Sale' && new Date(x.date) >= d30).length;
      const avg30 = count30 / 30;

      const algoDaily = (avg7 * 0.6) + (avg30 * 0.4);
      
      const manualDaily = s.daily || 0;
      const isManual = manualDaily > 0;
      const finalDaily = isManual ? manualDaily : (algoDaily > 0 ? algoDaily : 0.001); 
      
      const trend = avg7 > (avg30 * 1.1) ? 'up' : (avg7 < (avg30 * 0.9) ? 'down' : 'flat');

      // Gap Analysis & Timeline
      const daysLeft = currentStock / finalDaily;
      const runOutDate = new Date();
      runOutDate.setDate(now.getDate() + Math.floor(daysLeft));

      const eta = s.inboundDate ? new Date(s.inboundDate) : null;
      
      let gapQty = 0;
      let gapDays = 0;
      
      if (eta && eta > runOutDate) {
        const diffTime = Math.abs(eta.getTime() - runOutDate.getTime());
        gapDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        gapQty = Math.ceil(gapDays * finalDaily);
      }

      // Decision Logic
      const totalInventory = currentStock + (s.inbound || 0);
      const dos = finalDaily > 0.01 ? Math.round(totalInventory / finalDaily) : 999;
      
      const targetQty = Math.ceil(finalDaily * (settings.leadTime + settings.safetyStock));
      const totalRestockNeeded = Math.max(0, targetQty - totalInventory);
      
      const airRestock = gapQty > 0 ? gapQty : 0;
      const seaRestock = Math.max(0, totalRestockNeeded - airRestock);

      // Financials
      const deadQty = Math.max(0, totalInventory - (finalDaily * settings.deadStockThreshold));
      const unitCost = (p.cost_cny + p.ship_cny) / settings.exchangeRate;
      const deadValue = deadQty * unitCost;
      const bleedingCost = deadQty * (p.storage_usd || 0);

      return { 
        sku: p.sku, 
        parent_sku: p.parent_sku, // Ensure parent_sku is passed
        name: p.name, 
        inv: s, 
        currentStock, 
        salesSince,
        avg7: avg7.toFixed(1),
        avg30: avg30.toFixed(1),
        algoDaily: algoDaily.toFixed(1),
        finalDaily: finalDaily.toFixed(1),
        isManual,
        trend,
        runOutDate: runOutDate.toISOString().split('T')[0],
        gapDays,
        dos,
        airRestock,
        seaRestock,
        deadValue, 
        bleedingCost
      };
    });

    // 2. Apply Filter (Fuzzy Search)
    if (!search.trim()) return calculatedList;
    
    const terms = search.toLowerCase().split(/\s+/).filter(t => t);
    return calculatedList.filter(item => {
      const searchString = `${item.sku} ${item.parent_sku} ${item.name}`.toLowerCase();
      // "Search Parent -> Show Children" is handled naturally here because item.parent_sku is part of the search string
      return terms.every(term => searchString.includes(term));
    });

  }, [products, salesData, inventoryState, settings, search]);

  const formatCurrency = (val: number) => '$' + (val || 0).toFixed(2);
  const formatDate = () => new Date().toISOString().split('T')[0];

  return (
    <div className="p-8 space-y-6 h-full flex flex-col max-w-[1600px] mx-auto w-full animate-fade-in">
      {/* Global Settings Bar */}
      <div className="bg-indigo-900 text-indigo-100 p-4 rounded-xl flex space-x-6 text-sm items-end shadow-lg flex-shrink-0">
          <div>
            <label className="text-xs text-indigo-300 block mb-1">备货周期 (Lead Time)</label>
            <input type="number" value={settings.leadTime} onChange={e => onUpdateSettings('leadTime', +e.target.value)} className="w-20 bg-indigo-800 border-none rounded px-2 py-1 text-center" />
          </div>
          <div>
            <label className="text-xs text-indigo-300 block mb-1">安全库存 (Safety)</label>
            <input type="number" value={settings.safetyStock} onChange={e => onUpdateSettings('safetyStock', +e.target.value)} className="w-20 bg-indigo-800 border-none rounded px-2 py-1 text-center" />
          </div>
          <div>
            <label className="text-xs text-indigo-300 block mb-1">滞销阈值 (Dead Stock)</label>
            <input type="number" value={settings.deadStockThreshold} onChange={e => onUpdateSettings('deadStockThreshold', +e.target.value)} className="w-20 bg-indigo-800 border-none rounded px-2 py-1 text-center" />
          </div>
          <button onClick={onSave} className="ml-auto bg-green-600 hover:bg-green-500 text-white px-4 py-1 rounded font-bold transition-colors">
            <i className="fas fa-save mr-1"></i> 保存数据
          </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
          
          {/* Toolbar & Search */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
             <div className="flex items-center gap-4">
                <h3 className="font-bold text-slate-700 text-lg flex items-center gap-2">
                   <i className="fas fa-calculator text-indigo-500"></i> 库存预算
                </h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold">
                   {list.length} 条记录
                </span>
             </div>
             
             <div className="relative group">
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-xs group-focus-within:text-indigo-500 transition-colors"></i>
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="搜索 SKU / 父体 / 名称..." 
                  className="pl-8 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all" 
                />
             </div>
          </div>

          <div className="overflow-auto flex-1">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 text-xs text-slate-500 uppercase sticky top-0 z-10 shadow-sm">
                      <tr>
                          <th className="px-4 py-3 min-w-[140px] bg-slate-100">SKU</th>
                          <th className="px-4 py-3 bg-slate-100 w-32">父体 SKU</th>
                          
                          {/* Logic 1: Snapshot */}
                          <th className="px-2 py-3 bg-blue-50 text-blue-800 border-l border-blue-100 w-24 text-center">盘点基数</th>
                          <th className="px-2 py-3 bg-blue-50 text-blue-800 w-28 text-center">盘点日期</th>
                          <th className="px-2 py-3 bg-green-50 text-green-900 border-l border-green-100 font-bold w-20 text-center">现货</th>
                          
                          {/* Logic 2: Velocity */}
                          <th className="px-2 py-3 w-32 text-center bg-yellow-50/50 border-l border-yellow-100">
                            智能日销
                            <span className="block text-[9px] text-gray-400 normal-case font-normal">(730加权算法)</span>
                          </th>

                          {/* Logic 3: Timeline & Gap */}
                          <th className="px-2 py-3 w-32 bg-slate-50 border-l border-slate-200 text-center">在途 (Inbound)</th>
                          
                          {/* Decision */}
                          <th className="px-2 py-3 text-center w-16 bg-slate-100">DOS</th>
                          <th className="px-2 py-3 text-right bg-slate-100">补货决策 (Qty)</th>
                          <th className="px-2 py-3 text-right text-red-600 w-24 bg-slate-100">滞销风险</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {list.map(item => (
                        <tr key={item.sku} className="hover:bg-indigo-50 transition-colors group">
                            {/* SKU Info */}
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {item.sku}
                              <div className="text-[10px] text-gray-400 font-normal truncate max-w-[120px]">{item.name}</div>
                            </td>
                            {/* Parent SKU Column (New) */}
                            <td className="px-4 py-3 text-xs font-mono text-indigo-500 font-medium">
                              {item.parent_sku}
                            </td>

                            {/* Logic 1: Snapshot Calibration - Auto Date Update */}
                            <td className="px-2 py-3 bg-blue-50/30 border-l border-blue-50">
                              <input 
                                type="number" 
                                value={item.inv.baseQty || 0} 
                                onChange={e => {
                                    onUpdateInventory(item.sku, 'baseQty', +e.target.value);
                                    // Logic 1: Auto-update date to today when qty changes
                                    onUpdateInventory(item.sku, 'baseDate', formatDate());
                                }} 
                                className="w-full bg-white border border-blue-200 rounded px-1 text-center text-blue-700 focus:ring-2 focus:ring-blue-400 outline-none" 
                              />
                            </td>
                            <td className="px-2 py-3 bg-blue-50/30">
                              <input 
                                 type="date" 
                                 value={item.inv.baseDate || ''} 
                                 onChange={e => onUpdateInventory(item.sku, 'baseDate', e.target.value)} 
                                 className="w-full bg-transparent border-none text-xs text-blue-500 text-center cursor-pointer" 
                              />
                            </td>
                            <td className="px-2 py-3 bg-green-50/30 border-l border-green-50 text-center font-bold text-lg text-green-700 relative group/stock">
                                {item.currentStock}
                                <div className="hidden group-hover/stock:block absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                                    基数 {item.inv.baseQty} - 销量 {item.salesSince}
                                </div>
                            </td>

                            {/* Logic 2: Dual-Track Velocity */}
                            <td className="px-2 py-3 bg-yellow-50/30 border-l border-yellow-50 relative">
                               <div className={`relative flex items-center justify-center ${item.isManual ? 'ring-2 ring-yellow-400 rounded bg-yellow-50' : ''}`}>
                                 {item.isManual && (
                                    <i className="fas fa-lock text-[8px] text-yellow-600 absolute left-1 top-1/2 -translate-y-1/2" title="人工锁定值"></i>
                                 )}
                                 <input 
                                    type="number" 
                                    step="0.1" 
                                    value={item.inv.daily || ''} 
                                    placeholder={item.algoDaily}
                                    onChange={e => onUpdateInventory(item.sku, 'daily', +e.target.value)} 
                                    className={`w-20 text-center font-bold outline-none rounded py-1 ${item.isManual ? 'bg-transparent text-slate-800' : 'bg-transparent text-slate-400 placeholder-slate-400'}`} 
                                 />
                               </div>
                               
                               {/* Trend Arrow */}
                               {!item.isManual && (
                                   <div className="flex justify-center items-center gap-1 mt-1">
                                       <span className="text-[9px] text-slate-400">7天:{item.avg7}</span>
                                       {item.trend === 'up' && <i className="fas fa-arrow-trend-up text-red-500 text-xs animate-pulse"></i>}
                                       {item.trend === 'down' && <i className="fas fa-arrow-trend-down text-emerald-500 text-xs"></i>}
                                   </div>
                               )}
                               {item.isManual && <div className="text-[9px] text-center text-yellow-600 mt-1 font-bold">人工干预</div>}
                            </td>

                            {/* Logic 3: Inbound Gap & Timeline */}
                            <td className="px-2 py-3 border-l border-slate-200">
                               <div className="flex flex-col gap-1">
                                   <input 
                                      type="number" 
                                      placeholder="数量"
                                      value={item.inv.inbound || ''} 
                                      onChange={e => onUpdateInventory(item.sku, 'inbound', +e.target.value)} 
                                      className="w-full border border-slate-300 rounded px-1 text-center text-sm" 
                                   />
                                   <div className="relative">
                                      <i className="fas fa-calendar-alt absolute left-1 top-1/2 -translate-y-1/2 text-slate-300 text-[9px]"></i>
                                      <input 
                                        type="date" 
                                        value={item.inv.inboundDate || ''} 
                                        onChange={e => onUpdateInventory(item.sku, 'inboundDate', e.target.value)} 
                                        className="w-full border border-slate-300 rounded pl-4 pr-1 text-[10px] text-slate-500 h-6"
                                      />
                                   </div>
                                   {/* Gap Indicator */}
                                   {item.gapDays > 0 && (
                                       <div className="text-[9px] text-red-500 font-bold text-center bg-red-50 rounded px-1">
                                           断货预警: {item.gapDays}天
                                       </div>
                                   )}
                               </div>
                            </td>

                            {/* Decision Output */}
                            <td className="px-2 py-3 text-center">
                              <div className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${item.dos < 30 ? 'bg-red-500' : item.dos > 120 ? 'bg-slate-700' : 'bg-emerald-500'}`}>
                                  {item.dos}
                              </div>
                              <div className="text-[9px] text-slate-400 mt-1">天可售</div>
                            </td>

                            {/* Restock Split */}
                            <td className="px-2 py-3 text-right">
                               {item.airRestock > 0 && (
                                   <div className="flex justify-between items-center bg-red-50 text-red-600 px-2 py-1 rounded mb-1 border border-red-100">
                                       <i className="fas fa-plane text-xs"></i>
                                       <span className="font-bold">{item.airRestock}</span>
                                   </div>
                               )}
                               <div className="flex justify-between items-center bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">
                                   <i className="fas fa-ship text-xs"></i>
                                   <span className="font-bold">{item.seaRestock}</span>
                               </div>
                            </td>

                            {/* Financials */}
                            <td className="px-2 py-3 text-right">
                               <div className="text-xs text-gray-500">{formatCurrency(item.deadValue)}</div>
                               {item.bleedingCost > 0 && (
                                   <div className="text-[10px] text-red-500 flex items-center justify-end gap-1">
                                       <i className="fas fa-tint"></i> {formatCurrency(item.bleedingCost)}
                                   </div>
                               )}
                            </td>
                        </tr>
                      ))}
                      {list.length === 0 && (
                         <tr>
                             <td colSpan={10} className="py-12 text-center text-slate-400">
                                没有找到匹配的 SKU 或 父体
                             </td>
                         </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};