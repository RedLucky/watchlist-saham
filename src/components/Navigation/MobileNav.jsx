import React from 'react';
import { NAVIGATION_MENU } from './Sidebar';

export default function MobileNav({ activeTab, setActiveTab }) {
  // Flatten the navigation menu for mobile horizontal scroll
  const allItems = NAVIGATION_MENU.flatMap(group => group.items);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 pb-safe pt-2 shadow-lg">
      <div className="flex px-2 pb-2 overflow-x-auto gap-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x">
        {allItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`snap-center flex flex-col items-center justify-center min-w-[78px] py-2 px-1.5 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-indigo-700 dark:text-cyan-300 bg-indigo-50 dark:bg-cyan-950/40 border border-indigo-200/80 dark:border-cyan-500/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
              }`}
            >
              <span className={`text-xl mb-1 ${isActive ? 'scale-110 drop-shadow-xs' : 'scale-100'} transition-transform`}>
                {item.icon}
              </span>
              <span className={`text-[10px] font-bold text-center leading-tight tracking-tight ${isActive ? 'text-indigo-800 dark:text-cyan-200 font-extrabold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
