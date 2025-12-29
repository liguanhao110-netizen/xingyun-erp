import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { OrderManager } from './components/OrderManager';
import { AdsManager } from './components/AdsManager';
import { ProductManager } from './components/ProductManager';
import { Settings } from './components/Settings';
import { DataCenter } from './components/DataCenter';
import { ParentDetail } from './components/ParentDetail';
import { Toast, ToastType } from './components/Toast';
import { NAV_ITEMS, DEFAULT_SETTINGS } from './constants';
import { ModuleType, NebulaDatabase, Product, SaleRecord, AdRecord, InventoryState, AppSettings, ParentStat } from './types';

// Local Storage Key
const DB_KEY = 'nebula_v14_db';

// Helper to handle Excel Date
const excelDateToJS = (serial: any) => {
  if (!serial) return "";
  if (typeof serial === 'string') return serial;
  const date_info = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date_info.toISOString().split('T')[0];
};

function App() {
  const [currentView, setCurrentView] = useState<ModuleType>(ModuleType.DASHBOARD);
  
  // Notification State
  const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);
  
  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [adsData, setAdsData] = useState<AdRecord[]>([]);
  const [inventoryState, setInventoryState] = useState<InventoryState>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  const [selectedParent, setSelectedParent] = useState<ParentStat | null>(null);

  const [filters, setFilters] = useState({
    year: 2025,
    month: 0,
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const db: NebulaDatabase = JSON.parse(raw);
        if (db.p) setProducts(db.p);
        if (db.s) setSalesData(db.s);
        if (db.a) setAdsData(db.a);
        if (db.i) setInventoryState(db.i);
        if (db.st) setSettings(prev => ({ ...prev, ...db.st }));
      }
    } catch (e) {
      console.error("Failed to load Nebula DB", e);
    }
  }, []);

  const saveData = () => {
    const db: NebulaDatabase = {
      p: products,
      s: salesData,
      a: adsData,
      i: inventoryState,
      st: settings
    };
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  };

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  };

  // Handlers
  const quickDateSelect = (year: number, month: number) => {
    let start = '', end = '';
    if (month === 0) {
      start = `${year}-01-01`;
      end = `${year}-12-31`;
    } else {
      const mStr = month.toString().padStart(2, '0');
      const lastDay = new Date(year, month, 0).getDate();
      start = `${year}-${mStr}-01`;
      end = `${year}-${mStr}-${lastDay}`;
    }
    setFilters({ year, month, startDate: start, endDate: end });
  };

  const handleUpdateInventory = (sku: string, field: string, value: any) => {
    setInventoryState(prev => ({
      ...prev,
      [sku]: { ...prev[sku], [field]: value }
    }));
  };

  const handleUpdateSettings = (field: string, value: number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateOrder = (index: number, field: string, value: any) => {
    const newData = [...salesData];
    newData[index] = { ...newData[index], [field]: value };
    setSalesData(newData);
  };

  const handleDeleteOrder = (index: number) => {
    const newData = [...salesData];
    newData.splice(index, 1);
    setSalesData(newData);
  };

  const handleUpdateAd = (index: number, field: string, value: any) => {
    const newData = [...adsData];
    newData[index] = { ...newData[index], [field]: value };
    setAdsData(newData);
  };

  const handleDeleteAd = (index: number) => {
    const newData = [...adsData];
    newData.splice(index, 1);
    setAdsData(newData);
  };

  const handleUpdateProduct = (sku: string, p: Product) => {
    const idx = products.findIndex(x => x.sku === sku);
    if (idx >= 0) {
      const newP = [...products];
      newP[idx] = p;
      setProducts(newP);
    }
  };

  const handleAddProduct = (p: Product) => {
    setProducts([...products, p]);
    showToast(`产品 ${p.sku} 添加成功`);
  };

  const handleDeleteProduct = (sku: string) => {
    setProducts(products.filter(p => p.sku !== sku));
    showToast(`产品 ${sku} 已删除`, 'info');
  };

  const handleImportSales = (data: any[]) => {
    const mapped = data.map(r => ({
      order_id: r['订单号'],
      date: excelDateToJS(r['日期']),
      sku: r['子体SKU'],
      type: r['类型'],
      amount: Number(r['金额(USD)']),
      shipping_fee: Number(r['实际尾程运费(USD)']),
      storage_fee: Number(r['订单仓储费(USD)'] || 0)
    }));
    setSalesData(prev => [...prev, ...mapped]);
    saveData();
  };

  const handleImportAds = (data: any[]) => {
    const mapped = data.map(r => ({
      date: excelDateToJS(r['日期']),
      parent_sku: r['父体SKU'],
      total_spend: Number(r['总花费(USD)'])
    }));
    setAdsData(prev => [...prev, ...mapped]);
    saveData();
  };

  const handleImportInventory = (data: any[]) => {
    const newState = { ...inventoryState };
    data.forEach(r => {
      const s = r['子体SKU'];
      if (!newState[s]) newState[s] = { baseQty: 0, baseDate: '', inbound: 0, daily: 0 };
      newState[s].baseQty = r['盘点基数'];
      newState[s].baseDate = excelDateToJS(r['盘点日期']);
      newState[s].inbound = r['在途库存'];
      newState[s].inboundDate = excelDateToJS(r['预计到货日'] || '');
      newState[s].daily = r['预估日销量'] || r['人工日销'] || 0;
    });
    setInventoryState(newState);
    saveData();
  };

  const handleImportProducts = (data: any[]) => {
    const mapped = data.map(r => ({
      sku: r['子体SKU'],
      parent_sku: r['父体SKU'],
      name: r['中文名称'],
      cost_cny: r['采购成本(CNY)'],
      ship_cny: r['头程运费(CNY)'],
      storage_usd: r['单件月度仓储费(USD)'],
      last_mile_usd: r['默认尾程运费(USD)']
    }));
    const newSkus = new Set(mapped.map(p => p.sku));
    const filteredCurrent = products.filter(p => !newSkus.has(p.sku));
    setProducts([...filteredCurrent, ...mapped]);
    saveData();
  };

  const handleExportBackup = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      showToast("XLSX组件未加载", 'error');
      return;
    }
    const wb = XLSX.utils.book_new();
    const pSheet = products.map(x => ({ "子体SKU":x.sku, "父体SKU":x.parent_sku, "中文名称":x.name, "采购成本(CNY)":x.cost_cny, "头程运费(CNY)":x.ship_cny, "单件月度仓储费(USD)":x.storage_usd, "默认尾程运费(USD)":x.last_mile_usd }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pSheet), "Products");
    const sSheet = salesData.map(x => ({ "订单号":x.order_id, "日期":x.date, "子体SKU":x.sku, "类型":x.type, "金额(USD)":x.amount, "实际尾程运费(USD)":x.shipping_fee, "订单仓储费(USD)":x.storage_fee }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sSheet), "Sales");
    const aSheet = adsData.map(x => ({ "日期":x.date, "父体SKU":x.parent_sku, "总花费(USD)":x.total_spend }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(aSheet), "Ads");
    
    // Inventory Backup includes new fields
    const iSheet = Object.keys(inventoryState).map(k => ({
      "子体SKU": k,
      "盘点基数": inventoryState[k].baseQty,
      "盘点日期": inventoryState[k].baseDate,
      "在途库存": inventoryState[k].inbound,
      "预计到货日": inventoryState[k].inboundDate || '',
      "人工日销": inventoryState[k].daily
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(iSheet), "Inventory");

    XLSX.writeFile(wb, `Nebula_Backup_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("备份文件已生成下载", 'success');
  };

  const handleImportBackup = (file: File) => {
    const XLSX = (window as any).XLSX;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, {type:'binary'});
        if (wb.Sheets['Products']) {
          const d = XLSX.utils.sheet_to_json(wb.Sheets['Products']);
          const mapped = d.map((r:any) => ({ sku:r['子体SKU'], parent_sku:r['父体SKU'], name:r['中文名称'], cost_cny:r['采购成本(CNY)'], ship_cny:r['头程运费(CNY)'], storage_usd:r['单件月度仓储费(USD)'], last_mile_usd:r['默认尾程运费(USD)'] }));
          setProducts(mapped);
        }
        if (wb.Sheets['Sales']) {
          const d = XLSX.utils.sheet_to_json(wb.Sheets['Sales']);
          const mapped = d.map((r:any) => ({ order_id:r['订单号'], date:excelDateToJS(r['日期']), sku:r['子体SKU'], type:r['类型'], amount:r['金额(USD)'], shipping_fee:r['实际尾程运费(USD)'], storage_fee:r['订单仓储费(USD)'] }));
          setSalesData(mapped);
        }
        if (wb.Sheets['Ads']) {
          const d = XLSX.utils.sheet_to_json(wb.Sheets['Ads']);
          const mapped = d.map((r:any) => ({ date:excelDateToJS(r['日期']), parent_sku:r['父体SKU'], total_spend:r['总花费(USD)'] }));
          setAdsData(mapped);
        }
        if (wb.Sheets['Inventory']) {
           const d = XLSX.utils.sheet_to_json(wb.Sheets['Inventory']);
           const newState: InventoryState = {};
           d.forEach((r: any) => {
              newState[r['子体SKU']] = {
                 baseQty: r['盘点基数'],
                 baseDate: excelDateToJS(r['盘点日期']),
                 inbound: r['在途库存'],
                 inboundDate: excelDateToJS(r['预计到货日']),
                 daily: r['人工日销'] || 0
              };
           });
           setInventoryState(newState);
        }
        saveData();
        showToast("数据恢复成功！系统已更新", 'success');
      } catch(e) {
        showToast("备份文件解析失败", 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const renderContent = () => {
    switch (currentView) {
      case ModuleType.DASHBOARD:
        return <Dashboard products={products} salesData={salesData} adsData={adsData} settings={settings} filters={filters} onViewParent={(p) => { setSelectedParent(p); setCurrentView(ModuleType.PARENT_DETAIL); }} />;
      case ModuleType.INVENTORY:
        return <Inventory products={products} salesData={salesData} inventoryState={inventoryState} settings={settings} onUpdateInventory={handleUpdateInventory} onUpdateSettings={handleUpdateSettings} onSave={() => { saveData(); showToast("库存设置已保存"); }} />;
      case ModuleType.ORDERS:
        return <OrderManager salesData={salesData} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} onSave={() => { saveData(); showToast("订单更改已保存"); }} />;
      case ModuleType.ADS:
        return <AdsManager adsData={adsData} onUpdateAd={handleUpdateAd} onDeleteAd={handleDeleteAd} onSave={() => { saveData(); showToast("广告数据已保存"); }} />;
      case ModuleType.PRODUCTS:
        return <ProductManager products={products} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onSave={saveData} />;
      case ModuleType.SETTINGS:
        return <Settings settings={settings} onUpdateSettings={handleUpdateSettings} onClearData={() => { localStorage.removeItem(DB_KEY); window.location.reload(); }} onSave={() => { saveData(); showToast("系统设置已保存"); }} />;
      case ModuleType.DATACENTER:
        return <DataCenter onImportSales={handleImportSales} onImportAds={handleImportAds} onImportProducts={handleImportProducts} onImportInventory={handleImportInventory} onExportBackup={handleExportBackup} onImportBackup={handleImportBackup} onNotify={showToast} />;
      case ModuleType.PARENT_DETAIL:
        return selectedParent ? (
          <ParentDetail 
             parentSku={selectedParent.sku}
             products={products}
             salesData={salesData}
             adsData={adsData}
             settings={settings}
             filters={filters}
             onBack={() => setCurrentView(ModuleType.DASHBOARD)}
          />
        ) : (
           <div className="p-8 text-center text-slate-500">Error: No Parent Selected</div>
        );
      default:
        return <Dashboard products={products} salesData={salesData} adsData={adsData} settings={settings} filters={filters} onViewParent={(p) => { setSelectedParent(p); setCurrentView(ModuleType.PARENT_DETAIL); }} />;
    }
  };

  const navLabel = NAV_ITEMS.find(n => n.id === currentView)?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Global Notification */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <Sidebar navItems={NAV_ITEMS} activeTab={currentView} onTabChange={setCurrentView} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white px-8 py-3 flex justify-between items-center z-10 flex-shrink-0 border-b border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {navLabel}
            </h2>
            <div className="bg-blue-50 text-brand-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center">
              <i className="fas fa-exchange-alt mr-1"></i> 汇率: {settings.exchangeRate}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <select 
                value={filters.year} 
                onChange={(e) => quickDateSelect(Number(e.target.value), filters.month)}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer px-2 py-1 hover:bg-white rounded transition"
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <div className="w-px bg-slate-300 my-1"></div>
              <select 
                value={filters.month}
                onChange={(e) => quickDateSelect(filters.year, Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer px-2 py-1 hover:bg-white rounded transition w-20"
              >
                <option value={0}>全年</option>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
              <i className="fas fa-calendar-alt text-slate-400 text-xs"></i>
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="text-xs text-slate-600 outline-none font-mono bg-transparent w-24"
              />
              <span className="text-slate-300">-</span>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="text-xs text-slate-600 outline-none font-mono bg-transparent w-24"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;