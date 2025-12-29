import { LucideIcon } from 'lucide-react';

export enum ModuleType {
  DASHBOARD = 'dashboard',
  PRODUCTS = 'products',
  ORDERS = 'orderManager',
  INVENTORY = 'inventory',
  ADS = 'adsManager',
  DATACENTER = 'dataCenter',
  SETTINGS = 'settings',
  PARENT_DETAIL = 'parentDetail' // Virtual view
}

export interface NavItem {
  id: ModuleType;
  label: string;
  iconClass: string; // Using FontAwesome class string instead of Lucide component for now to match UI
}

// Nebula Data Models
export interface Product {
  sku: string;
  parent_sku: string;
  name: string;
  cost_cny: number;
  ship_cny: number;
  storage_usd?: number;
  last_mile_usd?: number;
}

export interface SaleRecord {
  order_id: string;
  date: string;
  sku: string;
  type: 'Sale' | 'Refund';
  amount: number;
  shipping_fee: number;
  storage_fee?: number;
}

export interface AdRecord {
  date: string;
  parent_sku: string;
  total_spend: number;
  // Potentially add ad_sales or clicks here later
}

export interface InventoryState {
  [sku: string]: {
    baseQty: number;      // Snapshot Quantity
    baseDate: string;     // Snapshot Date (Calibration Point)
    inbound: number;      // Quantity En Route
    inboundDate?: string; // ETA for Inbound (New in V14.0)
    daily: number;        // Manual Daily Sales Override (If 0, use Algo)
  }
}

export interface AppSettings {
  exchangeRate: number;
  leadTime: number;
  safetyStock: number;
  deadStockThreshold: number;
}

// Full DB Structure
export interface NebulaDatabase {
  p: Product[];
  s: SaleRecord[];
  a: AdRecord[];
  i: InventoryState;
  st: AppSettings;
}

// Dashboard Computed Types
export interface KPI {
  revenue: number;
  netProfit: number;
  roi: string;
  margin: string;
  acos: string;
  netUnits: number;
  totalRefundQty: number;
  totalRefundAmt: number;
}

export interface ParentStat {
  sku: string;
  revenue: number;
  netProfit: number;
  margin: string;
  acos: string;
  refundQty: number;
  sparkline: string; // SVG points
  children: any[]; // Simplified for display
}