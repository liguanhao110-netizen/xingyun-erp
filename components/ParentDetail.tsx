import React, { useMemo, useState } from 'react';
import { Product, SaleRecord, AdRecord, AppSettings, ParentStat } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';

interface ParentDetailProps {
  parentSku: string;
  products: Product[];
  salesData: SaleRecord[];
  adsData: AdRecord[];
  settings: AppSettings;
  filters: { startDate: string; endDate: string };
  onBack: () => void;
}

// Helper to get Monday of the week for a given date string
const getWeekStart = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

// --- DYNAMIC COLOR GENERATOR (HSL ALGORITHM) ---
// Solves the issue of having too many children for a fixed palette.
// Distributes colors evenly across the 360-degree hue spectrum.
const generateDynamicColors = (count: number) => {
  return Array.from({ length: count }, (_, i) => {
    // Hue: 0 to 360, evenly spaced
    // Saturation: 70% (Vibrant but not neon)
    // Lightness: 45% (Readable on white background)
    const hue = Math.floor((i * 360) / count); 
    return `hsl(${hue}, 70%, 45%)`;
  });
};

export const ParentDetail: React.FC<ParentDetailProps> = ({ 
  parentSku, products, salesData, adsData, settings, filters, onBack 
}) => {
  
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  
  // State to manage which lines are hidden via Legend click
  // We use a Set to store "hidden" SKUs for O(1) lookup
  const [hiddenSkus, setHiddenSkus] = useState<Set<string>>(new Set());

  const handleLegendClick = (e: any) => {
    const sku = e.dataKey;
    setHiddenSkus(prev => {
        const next = new Set(prev);
        if (next.has(sku)) {
            next.delete(sku); // If hidden, show it
        } else {
            next.add(sku); // If visible, hide it
        }
        return next;
    });
  };

  // --- Core Calculation Logic ---
  const data = useMemo(() => {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    
    // 1. Filter raw data for this parent and date range
    const childProducts = products.filter(p => p.parent_sku === parentSku);
    const childSkus = new Set(childProducts.map(p => p.sku));
    
    const relevantSales = salesData.filter(s => {
      const d = new Date(s.date);
      return childSkus.has(s.sku) && d >= start && d <= end;
    });

    const relevantAds = adsData.filter(a => {
      const d = new Date(a.date);
      return a.parent_sku === parentSku && d >= start && d <= end;
    });

    // --- LOGIC FOR WEEKLY TREND CHART ---
    const weeklyMap: Record<string, any> = {};
    const activeChildSkus = new Set<string>();

    relevantSales.forEach(s => {
      if (s.type !== 'Sale') return; // Analyze Demand Trend (Sales only)

      const weekKey = getWeekStart(s.date);
      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = { name: weekKey };
      }
      
      // Initialize SKU slot if not exists
      if (!weeklyMap[weekKey][s.sku]) weeklyMap[weekKey][s.sku] = 0;
      
      weeklyMap[weekKey][s.sku] += s.amount;
      activeChildSkus.add(s.sku);
    });

    const weeklyChartData = Object.values(weeklyMap).sort((a, b) => a.name.localeCompare(b.name));
    const childSkuList = Array.from(activeChildSkus);

    // Generate colors based on the exact number of active children
    const dynamicColors = generateDynamicColors(childSkuList.length);

    // ------------------------------------

    // 2. Calculate Totals
    const totalAdsSpend = relevantAds.reduce((acc, curr) => acc + curr.total_spend, 0);
    const totalRevenue = relevantSales.filter(s => s.type === 'Sale').reduce((acc, curr) => acc + curr.amount, 0);

    // 3. Build Child Breakdown
    const breakdown = childProducts.map(product => {
        const pSales = relevantSales.filter(s => s.sku === product.sku);
        const revenue = pSales.filter(s => s.type === 'Sale').reduce((acc, s) => acc + s.amount, 0);
        const unitsSold = pSales.filter(s => s.type === 'Sale').length;
        const refundQty = pSales.filter(s => s.type === 'Refund').length;
        const refundAmt = pSales.filter(s => s.type === 'Refund').reduce((acc, s) => acc + s.amount, 0);

        const unitBaseCost = (product.cost_cny + product.ship_cny) / settings.exchangeRate;
        const totalCogs = unitsSold * unitBaseCost;
        const fbaFees = pSales.reduce((acc, s) => acc + s.shipping_fee + (s.storage_fee || 0), 0);
        const commission = revenue * 0.15;
        
        const revShare = totalRevenue > 0 ? (revenue / totalRevenue) : 0;
        const allocatedAds = totalAdsSpend * revShare;

        const netProfit = revenue + refundAmt - totalCogs - fbaFees - commission - allocatedAds;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return {
            sku: product.sku,
            name: product.name,
            revenue,
            unitsSold,
            refundQty,
            cogs: totalCogs,
            fees: fbaFees + commission,
            ads: allocatedAds,
            netProfit,
            margin
        };
    }).sort((a, b) => b.revenue - a.revenue);

    // 4. Parent Aggregates
    const parentStats = {
        revenue: totalRevenue,
        netProfit: breakdown.reduce((acc, b) => acc + b.netProfit, 0),
        ads: totalAdsSpend,
        acos: totalRevenue > 0 ? (totalAdsSpend / totalRevenue) * 100 : 0,
        refunds: breakdown.reduce((acc, b) => acc + b.refundQty, 0),
        units: breakdown.reduce((acc, b) => acc + b.unitsSold, 0) - breakdown.reduce((acc, b) => acc + b.refundQty, 0)
    };
    
    parentStats.netProfit = parseFloat(parentStats.netProfit.toFixed(2));

    return { parentStats, breakdown, weeklyChartData, childSkuList, dynamicColors };

  }, [parentSku, products, salesData, adsData, settings, filters]);

  const formatCurrency = (val: number) => '$' + (val || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-fade-in relative">
      {/* Header & Nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="group flex items-center text-slate-500 hover:text-brand-600 transition font-medium">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center mr-2 group-hover:border-brand-500 shadow-sm">
                <i className="fas fa-arrow-left text-sm group-hover:-translate-x-0.5 transition-transform"></i>
            </div>
            返回看板 (Back)
        </button>
        <div className="text-right">
             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 justify-end">
                <i className="fas fa-layer-group text-brand-600"></i>
                {parentSku}
             </h2>
             <p className="text-slate-400 text-xs font-mono mt-1">
                Data Range: {filters.startDate} ~ {filters.endDate}
             </p>
        </div>
      </div>

      {/* 1. Parent KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
         <DetailCard title="总营收 (Revenue)" value={formatCurrency(data.parentStats.revenue)} icon="fas fa-dollar-sign" color="blue" />
         <DetailCard title="总净利 (Net Profit)" value={formatCurrency(data.parentStats.netProfit)} icon="fas fa-wallet" color={data.parentStats.netProfit >= 0 ? 'green' : 'red'} />
         <DetailCard title="利润率 (Margin)" value={`${data.parentStats.netProfit > 0 && data.parentStats.revenue > 0 ? ((data.parentStats.netProfit/data.parentStats.revenue)*100).toFixed(1) : 0}%`} icon="fas fa-percent" color="indigo" />
         <DetailCard title="ACOS" value={`${data.parentStats.acos.toFixed(1)}%`} icon="fas fa-bullhorn" color="orange" />
         <DetailCard title="退货量 (Refunds)" value={data.parentStats.refunds.toString()} icon="fas fa-undo" color="pink" />
      </div>

      {/* 2. Weekly Trend Chart (Line Chart Version) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 h-[450px]">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
            <span className="flex items-center">
               <span className="w-1 h-4 bg-indigo-500 rounded-full mr-2"></span>
               周度销售走势对比 (Weekly Sales Trend)
            </span>
            <div className="text-xs text-slate-400 font-normal flex items-center gap-2">
               <i className="fas fa-mouse-pointer"></i>
               <span>点击下方图例可隐藏/显示特定子体</span>
            </div>
          </h3>
          <div className="h-[90%] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <LineChart data={data.weeklyChartData} margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} />
                  <YAxis tick={{fontSize: 10, fill: '#64748b'}} />
                  <Tooltip 
                     cursor={{stroke: '#cbd5e1', strokeDasharray: '3 3'}}
                     contentStyle={{backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                     formatter={(value: any, name: any) => ['$'+value.toFixed(2), name]}
                  />
                  <Legend 
                    onClick={handleLegendClick}
                    iconType="plainline" 
                    wrapperStyle={{fontSize: '11px', paddingTop: '15px', cursor: 'pointer'}} 
                  />
                  
                  {/* Generate a Line for each Child SKU with DYNAMIC Colors */}
                  {data.childSkuList.map((sku, index) => (
                     <Line 
                       key={sku} 
                       type="monotone" 
                       dataKey={sku} 
                       name={sku}
                       stroke={data.dynamicColors[index]} 
                       strokeWidth={2}
                       dot={false}
                       activeDot={{ r: 5 }}
                       hide={hiddenSkus.has(sku)} // Interactive Toggle
                       animationDuration={500}
                     />
                  ))}
               </LineChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* 3. Visual Profit Distribution & Cost Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="font-bold text-slate-700 mb-4 flex items-center">
                <span className="w-1 h-4 bg-brand-600 rounded-full mr-2"></span>
                子体利润贡献排行 (Profit Contribution)
             </h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.breakdown} layout="vertical" margin={{top:5, right:30, left:40, bottom:5}}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="sku" type="category" width={100} tick={{fontSize: 10, fill: '#64748b'}} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Bar dataKey="netProfit" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.breakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.netProfit >= 0 ? '#10b981' : '#f43f5e'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-center">
             <h3 className="font-bold text-slate-700 mb-6 text-center">系列成本结构 (Series Level)</h3>
             <div className="space-y-4">
                 <CostBar label="采购与头程 (COGS)" value={data.breakdown.reduce((a,b)=>a+b.cogs,0)} total={data.parentStats.revenue} color="bg-slate-500" />
                 <CostBar label="平台与物流 (FBA/Comm)" value={data.breakdown.reduce((a,b)=>a+b.fees,0)} total={data.parentStats.revenue} color="bg-blue-500" />
                 <CostBar label="广告营销 (Marketing)" value={data.parentStats.ads} total={data.parentStats.revenue} color="bg-purple-500" />
                 <div className="border-t pt-3 mt-2">
                    <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-emerald-700">净利润 (Net)</span>
                        <span className="text-emerald-600">{formatCurrency(data.parentStats.netProfit)}</span>
                    </div>
                 </div>
             </div>
          </div>
      </div>

      {/* 4. Table (Unchanged logic, just keeping structure) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <i className="fas fa-table text-slate-400"></i> 子体全成本透视 (Full Cost Breakdown)
            </h3>
            <span className="text-xs text-slate-500 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full font-bold animate-pulse">
                💡 点击行查看单品利润模型
            </span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-xs text-slate-500 uppercase font-semibold">
                    <tr>
                        <th className="px-4 py-3 pl-6">子体 SKU</th>
                        <th className="px-4 py-3 text-right">销量</th>
                        <th className="px-4 py-3 text-right">销售额</th>
                        <th className="px-4 py-3 text-right text-slate-400">采购/头程</th>
                        <th className="px-4 py-3 text-right text-blue-400">佣金/FBA</th>
                        <th className="px-4 py-3 text-right text-purple-400">分摊广告</th>
                        <th className="px-4 py-3 text-right text-rose-400">退货损益</th>
                        <th className="px-4 py-3 text-right font-bold bg-emerald-50 text-emerald-700 border-l border-emerald-100">净利润 ($)</th>
                        <th className="px-4 py-3 text-right font-bold bg-emerald-50 text-emerald-700">利润率</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.breakdown.map((row) => (
                        <tr 
                          key={row.sku} 
                          onClick={() => setSelectedChild(row)}
                          className="hover:bg-blue-50 cursor-pointer transition-colors border-l-4 border-transparent hover:border-blue-500 group"
                        >
                            <td className="px-4 py-3 pl-6">
                                <div className="font-bold text-slate-700 font-mono text-xs flex items-center gap-2">
                                  {row.sku}
                                  <i className="fas fa-search-plus text-slate-300 group-hover:text-blue-500 text-[10px]"></i>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{row.name}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">{row.unitsSold}</td>
                            <td className="px-4 py-3 text-right font-mono font-medium">{formatCurrency(row.revenue)}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">-{formatCurrency(row.cogs)}</td>
                            <td className="px-4 py-3 text-right font-mono text-blue-600 text-xs">-{formatCurrency(row.fees)}</td>
                            <td className="px-4 py-3 text-right font-mono text-purple-600 text-xs">-{formatCurrency(row.ads)}</td>
                            <td className="px-4 py-3 text-right font-mono text-rose-500 text-xs">
                                {row.refundQty > 0 ? `-${formatCurrency(Math.abs(row.revenue/row.unitsSold * row.refundQty))}` : '-'}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold font-mono border-l ${row.netProfit >= 0 ? 'bg-emerald-50/50 text-emerald-600' : 'bg-rose-50/50 text-rose-600'}`}>
                                {formatCurrency(row.netProfit)}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold font-mono ${row.margin >= 0 ? 'bg-emerald-50/50 text-emerald-600' : 'bg-rose-50/50 text-rose-600'}`}>
                                {row.margin.toFixed(1)}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* Child Detail Modal */}
      {selectedChild && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
               <div>
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <i className="fas fa-box-open text-brand-600"></i>
                    {selectedChild.sku}
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-[300px]">{selectedChild.name}</p>
               </div>
               <button onClick={() => setSelectedChild(null)} className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition">
                 <i className="fas fa-times"></i>
               </button>
            </div>
            
            <div className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <div className="text-xs text-blue-500 font-bold uppercase mb-1">销售额 (Revenue)</div>
                    <div className="text-xl font-bold text-blue-700 font-mono">{formatCurrency(selectedChild.revenue)}</div>
                 </div>
                 <div className={`rounded-xl p-4 text-center ${selectedChild.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <div className={`text-xs font-bold uppercase mb-1 ${selectedChild.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>净利润 (Net)</div>
                    <div className={`text-xl font-bold font-mono ${selectedChild.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatCurrency(selectedChild.netProfit)}</div>
                 </div>
               </div>

               <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                  <h4 className="font-bold text-slate-700 mb-4 text-center text-sm border-b pb-2">单品成本模型 (Unit Economics)</h4>
                  <div className="space-y-4">
                      <CostBar label="采购与头程 (Product Cost)" value={selectedChild.cogs} total={selectedChild.revenue} color="bg-slate-500" />
                      <CostBar label="平台佣金与配送 (FBA Fees)" value={selectedChild.fees} total={selectedChild.revenue} color="bg-blue-500" />
                      <CostBar label="分摊广告费 (Allocated Ads)" value={selectedChild.ads} total={selectedChild.revenue} color="bg-purple-500" />
                      {selectedChild.revenue > 0 && (
                        <div className="pt-2">
                          <div className="flex justify-between text-xs mb-1">
                              <span className="text-rose-500">退款损益 (Refund Loss)</span>
                              <span className="font-mono text-rose-600">{(Math.abs((selectedChild.revenue/selectedChild.unitsSold * selectedChild.refundQty) / selectedChild.revenue) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className="h-full rounded-full bg-rose-400" style={{width: `${Math.min((Math.abs(selectedChild.revenue/selectedChild.unitsSold * selectedChild.refundQty) / selectedChild.revenue) * 100, 100)}%`}}></div>
                          </div>
                        </div>
                      )}
                  </div>
               </div>
            </div>
            
            <div className="bg-slate-50 px-6 py-4 text-center">
              <span className="text-xs text-slate-400">
                利润率: <span className={`font-bold ${selectedChild.margin >=0 ? 'text-emerald-600':'text-rose-600'}`}>{selectedChild.margin.toFixed(1)}%</span> 
                {' '}| 销量: {selectedChild.unitsSold}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// UI Helper Components
const DetailCard = ({ title, value, icon, color }: any) => {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        red: 'bg-rose-50 text-rose-600 border-rose-200',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        orange: 'bg-orange-50 text-orange-600 border-orange-200',
        pink: 'bg-pink-50 text-pink-600 border-pink-200',
    };
    return (
        <div className={`p-4 rounded-xl border ${colors[color]} flex flex-col justify-between shadow-sm`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{title}</span>
                <i className={`${icon} opacity-50`}></i>
            </div>
            <div className="text-2xl font-bold font-mono">{value}</div>
        </div>
    );
};

const CostBar = ({ label, value, total, color }: any) => {
    const percent = total > 0 ? (value / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">{label}</span>
                <span className="font-mono text-slate-700">{percent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{width: `${Math.min(percent, 100)}%`}}></div>
            </div>
        </div>
    );
};