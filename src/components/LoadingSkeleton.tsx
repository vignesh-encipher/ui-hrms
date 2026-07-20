import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="w-full space-y-4 animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-full"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-5/6"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-2/3"></div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
        <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
        <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      </div>
    </div>
  );
}
