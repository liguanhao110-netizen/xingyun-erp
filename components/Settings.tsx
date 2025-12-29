import React from 'react';
import { AppSettings } from '../types';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (field: string, value: number) => void;
  onClearData: () => void;
  onSave: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings, onClearData, onSave }) => {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
       {/* 1. Global Parameter Settings */}
       <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-slate-800 mb-6 border-b pb-2 text-lg flex items-center gap-2">
            <i className="fas fa-sliders-h text-indigo-500"></i>
            基础参数设置 (Global Parameters)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">全局汇率 (USD/CNY)</label>
               <div className="flex gap-3 items-center">
                 <input 
                   type="number" 
                   value={settings.exchangeRate} 
                   onChange={e => onUpdateSettings('exchangeRate', +e.target.value)} 
                   className="border border-gray-300 p-2 rounded w-32 text-center text-lg font-mono focus:border-indigo-500 outline-none"
                 />
                 <span className="text-xs text-gray-400">修改后实时重算所有成本</span>
               </div>
             </div>
             
             <div>
                <label className="block text-sm font-bold text-red-600 mb-2">危险区域 (Danger Zone)</label>
                <button 
                  onClick={() => { if(confirm('🚨 确定要清空所有本地数据吗？此操作无法撤销！')) onClearData(); }} 
                  className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded hover:bg-red-100 transition flex items-center"
                >
                  <i className="fas fa-trash-alt mr-2"></i> 清空所有数据
                </button>
             </div>
          </div>
          <div className="mt-8 flex justify-end">
             <button onClick={onSave} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold shadow-md hover:bg-indigo-700">
               保存设置
             </button>
          </div>
       </div>

       {/* 2. System Glossary & Logic Manual (New Section) */}
       <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-slate-800 mb-6 border-b pb-2 text-lg flex items-center gap-2">
            <i className="fas fa-book-open text-emerald-600"></i>
            业务逻辑说明书 (Business Logic Guide)
            <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">新员工必读</span>
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* Left Column: Financial Logic */}
            <div className="space-y-6">
               <h4 className="font-bold text-slate-700 text-sm bg-slate-50 p-2 rounded border-l-4 border-indigo-500">
                 💰 财务与利润 (Financials)
               </h4>
               
               <GlossaryItem 
                 term="净利润 (Net Profit)" 
                 desc="真正落袋的钱。计算公式：销售额 - 采购成本 - 头程运费 - 平台佣金 - FBA配送费 - 广告费 - 退款损失。" 
               />
               <GlossaryItem 
                 term="毛利率 (Margin)" 
                 desc="衡量产品盈利能力的指标。计算公式：(净利润 ÷ 销售额) × 100%。如果低于 15%，说明该产品可能在给平台打工。" 
               />
               <GlossaryItem 
                 term="ROI (投资回报率)" 
                 desc="投入产出比。计算公式：净利润 ÷ 总投入成本。如果 ROI 是 100%，意味着你投1块钱，赚回了1块钱利润（本金也回来了）。" 
               />
               <GlossaryItem 
                 term="ACOS" 
                 desc="广告费占销售额的比例。计算公式：广告花费 ÷ 总销售额。ACOS 越低，广告效率越高。" 
               />
            </div>

            {/* Right Column: Inventory Logic */}
            <div className="space-y-6">
               <h4 className="font-bold text-slate-700 text-sm bg-slate-50 p-2 rounded border-l-4 border-emerald-500">
                 📦 库存与补货 (Inventory)
               </h4>

               <GlossaryItem 
                 term="730 智能日销 (Algo Daily)" 
                 desc="系统计算销量的核心算法。权重分配：最近7天销量占 60% + 最近30天销量占 40%。这种算法既能快速响应近期的爆单，又不会因为一两天的波动导致误判。" 
               />
               <GlossaryItem 
                 term="DOS (可售天数)" 
                 desc="手里的货还能卖几天。计算公式：(现货 + 在途) ÷ 日销量。如果 DOS 小于 30天，系统会标红预警。" 
               />
               <GlossaryItem 
                 term="断货缺口 (Gap Analysis)" 
                 desc="如果【预计到货时间】晚于【断货时间】，中间产生的空档期就是缺口。这部分缺口系统会建议用空运（飞机）紧急补货。" 
               />
               
               <div className="border-t border-dashed border-gray-200 pt-4 mt-4">
                  <h5 className="font-bold text-rose-600 text-xs mb-3">🚨 滞销风控 (Dead Stock Risk)</h5>
                  <GlossaryItem 
                    term="滞销阈值 (Threshold)" 
                    desc="您设定的心理红线（默认120天）。如果库存卖完需要的时间超过这个天数，多余的货就被判定为滞销。" 
                  />
                  <GlossaryItem 
                    term="资金占用 (Capital Tied)" 
                    desc="表格中的灰色数字。代表那些卖不掉的死库存，占用了多少本金（采购价+头程费）。" 
                  />
                  <GlossaryItem 
                    term="仓储失血 (Bleeding Cost)" 
                    desc="表格中的红色数字。代表那些卖不掉的死库存，每个月还要额外产生多少仓储费。如果不处理，它会持续吞噬利润。" 
                  />
               </div>
            </div>

          </div>
       </div>
    </div>
  );
};

// Helper Component for Glossary Items
const GlossaryItem = ({ term, desc }: { term: string, desc: string }) => (
  <div className="group">
    <dt className="font-bold text-slate-800 text-sm mb-1 flex items-center">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-500 mr-2 transition-colors"></span>
      {term}
    </dt>
    <dd className="text-xs text-slate-500 leading-relaxed pl-3.5 border-l border-slate-100 group-hover:border-indigo-100 transition-colors">
      {desc}
    </dd>
  </div>
);