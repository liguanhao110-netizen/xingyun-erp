import React from 'react';

interface DataCenterProps {
  onImportSales: (data: any[]) => void;
  onImportAds: (data: any[]) => void;
  onImportProducts: (data: any[]) => void;
  onImportInventory: (data: any[]) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onNotify: (msg: string, type: 'success' | 'error') => void;
}

export const DataCenter: React.FC<DataCenterProps> = ({ 
  onImportSales, onImportAds, onImportProducts, onImportInventory, onExportBackup, onImportBackup, onNotify
}) => {

  // Helper to trigger file input
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, callback: (data: any[]) => void, successMsg: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if XLSX is available globally
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      onNotify("XLSX library not loaded. Please check network.", 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        callback(data);
        onNotify(successMsg, 'success');
      } catch (err) {
        console.error(err);
        onNotify("文件解析失败，请检查Excel格式", 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (file) onImportBackup(file);
     e.target.value = '';
  };

  const dlTemplate = (type: string) => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      onNotify("XLSX library not ready.", 'error');
      return;
    }
    
    let data: any[] = [];
    if(type === 'sales') data = [{ "订单号":"ORD-01", "日期":"2025-01-01", "子体SKU":"Sku-A", "类型":"Sale", "金额(USD)":100, "实际尾程运费(USD)":10, "订单仓储费(USD)":1 }];
    else if(type === 'ads') data = [{ "日期":"2025-01-01", "父体SKU":"Parent-A", "总花费(USD)":50 }];
    else if(type === 'product') data = [{ "子体SKU":"Sku-A", "父体SKU":"Parent-A", "中文名称":"椅子", "采购成本(CNY)":100, "头程运费(CNY)":50, "单件月度仓储费(USD)":2, "默认尾程运费(USD)":10 }];
    else if(type === 'inventory') data = [{ "子体SKU":"Sku-A", "盘点基数":100, "盘点日期":"2025-01-01", "在途库存":50, "预估日销量":2.0 }];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${type}_template.xlsx`);
    onNotify("模版下载已开始", 'success');
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-[1200px] mx-auto">
       {/* 1. Daily Business */}
       <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
         <h3 className="font-bold text-slate-700 mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm"><i className="fas fa-calendar-check"></i></span>
            1. 日常业务导入 (Daily Business)
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImportCard 
              title="销售流水 (Sales)" 
              color="indigo" 
              icon="fas fa-file-invoice-dollar" 
              onDownload={() => dlTemplate('sales')} 
              onUpload={(e) => handleFile(e, onImportSales, "销售数据导入成功！")} 
            />
            <ImportCard 
              title="广告花费 (Ads)" 
              color="purple" 
              icon="fas fa-ad" 
              onDownload={() => dlTemplate('ads')} 
              onUpload={(e) => handleFile(e, onImportAds, "广告数据导入成功！")} 
            />
         </div>
       </div>

       {/* 2. Inventory & Product */}
       <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
         <h3 className="font-bold text-slate-700 mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-sm"><i className="fas fa-boxes"></i></span>
            2. 库存与产品 (Inventory & Catalog)
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImportCard 
              title="库存批量更新 (Stock)" 
              color="emerald" 
              icon="fas fa-warehouse" 
              onDownload={() => dlTemplate('inventory')} 
              onUpload={(e) => handleFile(e, onImportInventory, "库存盘点更新成功！")} 
            />
            <ImportCard 
              title="产品档案 (Catalog)" 
              color="slate" 
              icon="fas fa-tag" 
              onDownload={() => dlTemplate('product')} 
              onUpload={(e) => handleFile(e, onImportProducts, "产品档案更新成功！")} 
            />
         </div>
       </div>

       {/* 3. System Backup */}
       <div className="bg-amber-50/50 rounded-xl shadow-sm p-6 border border-amber-200">
         <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
            <i className="fas fa-shield-alt"></i> 3. 系统备份 (System Backup)
         </h3>
         <div className="flex gap-4">
           <button onClick={onExportBackup} className="bg-amber-600 text-white px-6 py-2.5 rounded-lg font-bold shadow hover:bg-amber-700 transition flex items-center gap-2">
             <i className="fas fa-download"></i> 导出全站备份
           </button>
           <label className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-bold shadow cursor-pointer hover:bg-emerald-700 transition flex items-center gap-2">
             <i className="fas fa-upload"></i> 导入恢复备份
             <input type="file" className="hidden" accept=".xlsx" onChange={handleBackupImport} />
           </label>
         </div>
       </div>
    </div>
  );
};

// Helper Component for UI consistency
const ImportCard = ({ title, color, icon, onDownload, onUpload }: any) => {
  const colors: any = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300',
    purple: 'text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-300',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:border-emerald-300',
    slate: 'text-slate-700 bg-slate-50 border-slate-200 hover:border-slate-300',
  };
  const btnColor = colors[color] || colors.slate;

  return (
    <div className={`p-5 border rounded-xl transition-all duration-200 hover:shadow-md ${btnColor}`}>
       <div className="flex items-center gap-3 mb-4">
          <i className={`${icon} text-xl`}></i>
          <h4 className="font-bold text-sm">{title}</h4>
       </div>
       <div className="flex gap-3">
         <button onClick={onDownload} className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition">
           <i className="fas fa-file-download mr-1"></i> 下载模版
         </button>
         <label className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition text-center relative overflow-hidden group">
           <span className="relative z-10"><i className="fas fa-file-upload mr-1"></i> 上传数据</span>
           <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${color === 'slate' ? 'bg-slate-900' : `bg-${color}-600`}`}></div>
           <input type="file" className="hidden" accept=".xlsx" onChange={onUpload} />
         </label>
       </div>
    </div>
  );
};