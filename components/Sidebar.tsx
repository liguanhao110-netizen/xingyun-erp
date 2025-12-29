import React from 'react';
import { NavItem, ModuleType } from '../types';

interface SidebarProps {
  navItems: NavItem[];
  activeTab: ModuleType;
  onTabChange: (id: ModuleType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  navItems, 
  activeTab, 
  onTabChange
}) => {
  return (
    <aside className="w-64 sidebar-bg text-indigo-100 flex flex-col shadow-2xl flex-shrink-0 z-20 h-screen">
      {/* Brand Header */}
      <div className="p-6 border-b border-indigo-900/50">
        <h1 className="text-xl font-bold tracking-wider flex items-center gap-2 text-white">
          <i className="fas fa-meteor text-indigo-400"></i> 星云项目
        </h1>
        <p className="text-[10px] text-indigo-300 mt-1 pl-8 uppercase tracking-widest">V14.0 Performance</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 space-y-1">
        <div className="px-6 text-[10px] font-bold text-indigo-400 uppercase mb-2 mt-2 tracking-wider">经营概览</div>
        {navItems.slice(0, 2).map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center px-6 py-3 transition-all ${
              activeTab === item.id 
                ? 'bg-indigo-500/20 border-l-4 border-indigo-400 text-white' 
                : 'hover:bg-white/5 text-indigo-200 border-l-4 border-transparent'
            }`}
          >
            <i className={`${item.iconClass} w-5 text-center mr-3`}></i>
            {item.label}
          </button>
        ))}

        <div className="px-6 text-[10px] font-bold text-indigo-400 uppercase mb-2 mt-8 tracking-wider">核心数据</div>
        {navItems.slice(2, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center px-6 py-3 transition-all ${
              activeTab === item.id 
                ? 'bg-indigo-500/20 border-l-4 border-indigo-400 text-white' 
                : 'hover:bg-white/5 text-indigo-200 border-l-4 border-transparent'
            }`}
          >
            <i className={`${item.iconClass} w-5 text-center mr-3`}></i>
            {item.label}
          </button>
        ))}

        <div className="px-6 text-[10px] font-bold text-indigo-400 uppercase mb-2 mt-8 tracking-wider">系统与设置</div>
        {navItems.slice(5).map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center px-6 py-3 transition-all ${
              activeTab === item.id 
                ? 'bg-indigo-500/20 border-l-4 border-indigo-400 text-white' 
                : 'hover:bg-white/5 text-indigo-200 border-l-4 border-transparent'
            }`}
          >
            <i className={`${item.iconClass} w-5 text-center mr-3`}></i>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
};