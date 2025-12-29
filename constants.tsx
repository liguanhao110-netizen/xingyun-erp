import { NavItem, ModuleType } from './types';

// Matching the FontAwesome icons from the Vue app
export const NAV_ITEMS: NavItem[] = [
  { id: ModuleType.DASHBOARD, label: '销售看板', iconClass: 'fas fa-chart-pie' },
  { id: ModuleType.INVENTORY, label: '库存预算', iconClass: 'fas fa-warehouse' },
  { id: ModuleType.ORDERS, label: '订单管理', iconClass: 'fas fa-receipt' },
  { id: ModuleType.ADS, label: '广告管理', iconClass: 'fas fa-ad' },
  { id: ModuleType.PRODUCTS, label: '产品档案', iconClass: 'fas fa-box' },
  { id: ModuleType.DATACENTER, label: '数据中心', iconClass: 'fas fa-database' },
  { id: ModuleType.SETTINGS, label: '系统设置', iconClass: 'fas fa-cog' },
];

export const DEFAULT_SETTINGS = {
  exchangeRate: 7.2,
  leadTime: 60,
  safetyStock: 30,
  deadStockThreshold: 120
};