import React, { useMemo } from 'react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Product, SaleRecord, AdRecord, AppSettings, KPI, ParentStat } from '../types';

interface DashboardProps {
  products: Product[];
  salesData: SaleRecord[];
  adsData: AdRecord[];
  settings: AppSettings;
  filters: { startDate: string; endDate: string };
  onViewParent: (parent: ParentStat) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ products, salesData, adsData, settings, filters, onViewParent }) => {

  const stats = useMemo(() => {
    // 1. Filter Data
    let start = new Date(filters.startDate);
    let end = new Date(filters.endDate);
    
    // Fallback if invalid dates
    if (isNaN(start.getTime())) start = new Date('2025-01-01');
    if (isNaN(end.getTime())) end = new Date('2025-12-31');

    const dateRangeFilter = (dStr: string) => {
      const d = new Date(dStr);
      return d >= start && d <= end;
    };

    const fSales = salesData.filter(s => dateRangeFilter(s.date));
    const fAds = adsData.filter(a => dateRangeFilter(a.date));

    // --- 性能优化核心：预建立 Product 索引 (O(1) lookup) ---
    // 避免在 fSales 循环中每次都执行 products.find() (O(N))
    const productMap = new Map<string, Product>();
    products.forEach(p => productMap.set(p.sku, p));
    // -----------------------------------------------------

    // 2. Build Tree & Calculate
    const tree: Record<string, any> = {};
    const kpi: KPI = { revenue: 0, netProfit: 0, roi: '0', margin: '0', acos: '0', netUnits: 0, totalRefundQty: 0, totalRefundAmt: 0 };
    let adsTotalAll = 0;

    // Initialize Parents
    products.forEach(p => {
      if (!tree[p.parent_sku]) {
        tree[p.parent_sku] = { 
          sku: p.parent_sku, revenue: 0, netProfit: 0, netUnits: 0, 
          refundAmt: 0, refundQty: 0, adsTotal: 0, children: {} 
        };
      }
      tree[p.parent_sku].children[p.sku] = { 
        sku: p.sku, revenue: 0, netProfit: 0, salesQty: 0, 
        refundQty: 0, refundAmt: 0 
      };
    });

    // Process Sales
    fSales.forEach(s => {
      // 优化：使用 Map 获取，速度提升显著
      const p = productMap.get(s.sku);
      if (!p) return;
      const parent = tree[p.parent_sku];
      if (!parent) return; 
      const child = parent.children[s.sku];
      if (!child) return;

      const unitCost = (p.cost_cny + p.ship_cny) / settings.exchangeRate;

      if (s.type === 'Sale') {
        child.revenue += s.amount;
        child.salesQty += 1;
        const comm = s.amount * 0.15;
        const profit = s.amount - unitCost - s.shipping_fee - (s.storage_fee || 0) - comm;
        child.netProfit += profit;
      } else {
        // Refund
        child.refundQty += 1;
        child.refundAmt += Math.abs(s.amount);
        child.netProfit += s.amount; // Add back the negative amount usually
      }
    });

    // Process Ads & Aggregates
    Object.values(tree).forEach((parent: any) => {
      let parentRev = 0;
      Object.values(parent.children).forEach((c: any) => {
        parentRev += c.revenue;
      });

      // Ads filtering is usually smaller volume, filter is ok here
      const adsTotal = fAds.filter(a => a.parent_sku === parent.sku).reduce((sum, a) => sum + a.total_spend, 0);
      parent.adsTotal = adsTotal;
      adsTotalAll += adsTotal;

      Object.values(parent.children).forEach((c: any) => {
        parent.revenue += c.revenue;
        parent.netProfit += c.netProfit;
        parent.netUnits += (c.salesQty - c.refundQty);
        parent.refundAmt += c.refundAmt;
        parent.refundQty += c.refundQty;
      });

      // Deduct Ads from Parent Profit
      parent.netProfit -= adsTotal;

      parent.margin = parent.revenue > 0 ? ((parent.netProfit / parent.revenue) * 100).toFixed(1) : '0.0';
      parent.acos = parent.revenue > 0 ? ((parent.adsTotal / parent.revenue) * 100).toFixed(1) : '0.0';
      
      kpi.revenue += parent.revenue;
      kpi.netProfit += parent.netProfit;
      kpi.netUnits += parent.netUnits;
      kpi.totalRefundAmt += parent.refundAmt;
      kpi.totalRefundQty += parent.refundQty;
    });

    kpi.margin = kpi.revenue > 0 ? ((kpi.netProfit / kpi.revenue) * 100).toFixed(1) : '0.0';
    kpi.acos = kpi.revenue > 0 ? ((adsTotalAll / kpi.revenue) * 100).toFixed(1) : '0.0';
    const totalExp = kpi.revenue - kpi.netProfit;
    kpi.roi = totalExp > 0 ? ((kpi.netProfit / totalExp) * 100).toFixed(1) : '0.0';

    return { kpi, parents: Object.values(tree) as ParentStat[], fSales, fAds, start, end, productMap };
  }, [salesData, adsData, products, settings, filters]);

  // --- Chart Data Granularity ---
  const { chartData, granularityText } = useMemo(() => {
    const { start, end, fSales, fAds, productMap } = stats;
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const isMonthly = diffDays > 62;
    const granularityText = isMonthly ? '月视图' : '日视图';

    const map: Record<string, { rev: number, profit: number, ads: number }> = {};
    const labels: string[] = [];

    // Initialize labels
    let curr = new Date(start);
    while (curr <= end) {
      const k = isMonthly ? curr.toISOString().slice(0, 7) : curr.toISOString().slice(0, 10);
      if (!map[k]) {
        map[k] = { rev: 0, profit: 0, ads: 0 };
        labels.push(k);
      }
      if (isMonthly) {
        curr.setMonth(curr.getMonth() + 1);
      } else {
        curr.setDate(curr.getDate() + 1);
      }
    }

    fSales.forEach(s => {
       const k = isMonthly ? s.date.slice(0, 7) : s.date;
       if (map[k]) {
         // 优化：使用预构建的 Map
         const p = productMap.get(s.sku);
         const unitCost = p ? (p.cost_cny + p.ship_cny) / settings.exchangeRate : 0;
         if (s.type === 'Sale') {
           map[k].rev += s.amount;
           const comm = s.amount * 0.15;
           map[k].profit += (s.amount - unitCost - s.shipping_fee - (s.storage_fee || 0) - comm);
         } else {
           map[k].profit += s.amount;
         }
       }
    });

    fAds.forEach(a => {
      const k = isMonthly ? a.date.slice(0, 7) : a.date;
      if (map[k]) {
        map[k].ads += a.total_spend;
        map[k].profit -= a.total_spend;
      }
    });

    const data = labels.map(k => ({
      name: k,
      sales: map[k].rev,
      profit: map[k].profit,
      ads: map[k].ads,
      acos: map[k].rev > 0 ? (map[k].ads / map[k].rev) * 100 : 0
    }));

    return { chartData: data, granularityText };

  }, [stats, settings.exchangeRate]);

  const formatCurrency = (val: number) => '$' + (val || 0).toFixed(2);

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard title="总销售额 (Revenue)" value={formatCurrency(stats.kpi.revenue)} color="blue" />
        <KPICard title="净利润 (Net Profit)" value={formatCurrency(stats.kpi.netProfit)} color={stats.kpi.netProfit >= 0 ? 'green' : 'red'} />
        <KPICard title="投资回报率 (ROI)" value={`${stats.kpi.roi}%`} color="purple" />
        <KPICard title="毛利率 (Margin)" value={`${stats.kpi.margin}%`} color="indigo" />
        <KPICard title="ACOS" value={`${stats.kpi.acos}%`} color="orange" />
        <KPICard title="净销量 (Units)" value={stats.kpi.netUnits.toString()} color="cyan" />
        <KPICard title="退款数量" value={stats.kpi.totalRefundQty.toString()} color="pink" />
        <KPICard title="退款金额" value={formatCurrency(stats.kpi.totalRefundAmt)} color="red" />
      </div>

      {/* Main Chart */}
      <div className="mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm h-[500px] border border-gray-100 relative">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-slate-700 border-l-4 border-blue-500 pl-2">
                全维度经营趋势 ({granularityText})
             </h3>
             <div className="flex gap-4 text-xs font-normal bg-gray-50 px-3 py-1 rounded text-gray-500">
                <span className="flex items-center"><span className="w-3 h-3 bg-blue-500 mr-1"></span>销售额</span>
                <span className="flex items-center"><span className="w-3 h-3 bg-purple-400 mr-1"></span>广告费</span>
                <span className="flex items-center"><span className="w-3 h-1 bg-green-500 mr-1"></span>净利润</span>
                <span className="flex items-center"><span className="w-3 h-1 bg-orange-500 mr-1"></span>ACOS</span>
             </div>
          </div>
          <div className="h-[90%] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10}} />
                <YAxis yAxisId="left" orientation="left" stroke="#64748b" />
                <YAxis yAxisId="right" orientation="right" stroke="#f97316" unit="%" />
                <Tooltip 
                  contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}}
                  formatter={(value: any, name: string) => {
                    // 修复 ACOS 显示为 $ 的 Bug
                    if (name === 'ACOS') {
                        return [value.toFixed(2) + '%', name];
                    }
                    return ['$' + value.toFixed(2), name];
                  }}
                />
                <Bar yAxisId="left" dataKey="sales" fill="#3b82f6" name="销售额" />
                <Bar yAxisId="left" dataKey="ads" fill="#a855f7" name="广告费" />
                <Line yAxisId="left" type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} name="净利润" />
                <Line yAxisId="right" type="monotone" dataKey="acos" stroke="#f97316" strokeDasharray="5 5" dot={false} name="ACOS" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Parent Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="px-6 py-4 bg-gray-50 border-b font-bold text-slate-700 flex items-center">
            <i className="fas fa-list-ul mr-2 text-indigo-500"></i> 各系列表现
        </div>
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-xs text-slate-500 uppercase">
                <tr>
                    <th className="px-6 py-3">父体系列</th>
                    <th className="px-2 py-3 text-right">销售额</th>
                    <th className="px-2 py-3 text-right">净利润</th>
                    <th className="px-2 py-3 text-right">利润率</th>
                    <th className="px-2 py-3 text-right">ACOS</th>
                    <th className="px-2 py-3 text-right text-red-500">退款数</th>
                    <th className="px-6 py-3 text-center">操作</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {stats.parents.map(p => (
                   <tr key={p.sku} className="hover:bg-indigo-50 cursor-pointer transition-colors group" onClick={() => onViewParent(p)}>
                      <td className="px-6 py-4 font-bold text-indigo-700 flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                              <i className="fas fa-folder"></i>
                          </div>
                          {p.sku}
                      </td>
                      <td className="px-2 py-4 text-right font-medium">{formatCurrency(p.revenue)}</td>
                      <td className={`px-2 py-4 text-right font-bold ${p.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(p.netProfit)}
                      </td>
                      <td className="px-2 py-4 text-right text-slate-600">{p.margin}%</td>
                      <td className="px-2 py-4 text-right text-orange-600 font-bold">{p.acos}%</td>
                      <td className="px-2 py-4 text-right text-red-500">{p.refundQty}</td>
                      <td className="px-6 py-4 text-center text-gray-300 group-hover:text-indigo-500"><i className="fas fa-chevron-right"></i></td>
                   </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, color }: { title: string, value: string, color: string }) => {
  const borderColors: any = {
    blue: 'border-blue-500',
    green: 'border-green-500', 
    purple: 'border-purple-500',
    indigo: 'border-indigo-500',
    orange: 'border-orange-500',
    cyan: 'border-cyan-500',
    pink: 'border-pink-500',
    red: 'border-red-500'
  };
  
  const textColors: any = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600',
    orange: 'text-orange-600',
    cyan: 'text-slate-800',
    pink: 'text-pink-600',
    red: 'text-red-600'
  };

  return (
    <div className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 border-l-4 ${borderColors[color] || 'border-gray-500'} hover:shadow-md transition`}>
        <div className="text-xs text-slate-400 uppercase font-bold mb-1">{title}</div>
        <div className={`text-2xl font-bold ${textColors[color] || 'text-slate-800'}`}>{value}</div>
    </div>
  );
};