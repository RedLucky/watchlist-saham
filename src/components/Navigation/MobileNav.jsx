import React from 'react';
import { NAVIGATION_MENU } from './Sidebar';

export default function MobileNav({ activeTab, setActiveTab }) {
  // Flatten the navigation menu for mobile horizontal scroll
  const allItems = NAVIGATION_MENU.flatMap(group => group.items);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-[#0a0f1a]/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/60 pb-safe pt-2">
      <div className="flex px-2 pb-2 overflow-x-auto gap-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x">
        {allItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`snap-center flex flex-col items-center justify-center min-w-[76px] p-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <span className={`text-xl mb-1 ${isActive ? 'scale-110' : 'scale-100'} transition-transform`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-bold text-center leading-tight ${isActive ? 'text-indigo-700 dark:text-indigo-300' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
