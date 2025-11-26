'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export function ThemeSwitch() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1 w-[180px] h-12">
        <div className="flex-1 h-full rounded-full flex items-center justify-center">
          <Sun className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 h-full rounded-full flex items-center justify-center">
          <Moon className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className="relative flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full p-1 w-[180px] h-12">
      {/* Sliding background */}
      <div
        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-full shadow-md transition-all duration-300 ease-in-out ${
          isDark ? 'left-[calc(50%+2px)]' : 'left-1'
        }`}
      />

      {/* Light mode button */}
      <button
        onClick={() => setTheme('light')}
        className={`relative z-10 flex-1 h-full rounded-full flex items-center justify-center gap-2 transition-colors duration-300 ${
          !isDark ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        <Sun className="w-5 h-5" />
        <span className="text-sm font-medium">Light</span>
      </button>

      {/* Dark mode button */}
      <button
        onClick={() => setTheme('dark')}
        className={`relative z-10 flex-1 h-full rounded-full flex items-center justify-center gap-2 transition-colors duration-300 ${
          isDark ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500'
        }`}
      >
        <Moon className="w-5 h-5" />
        <span className="text-sm font-medium">Dark</span>
      </button>
    </div>
  );
}
