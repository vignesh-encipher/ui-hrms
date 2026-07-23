'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumb() {
  const pathname = usePathname() ?? "";
  const paths = pathname.split('/').filter(Boolean);

  if (paths.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-6">
      <Link href="/dashboard" className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {paths.map((path, index) => {
        const url = `/${paths.slice(0, index + 1).join('/')}`;
        const isLast = index === paths.length - 1;
        const name = path.charAt(0).toUpperCase() + path.slice(1);

        return (
          <React.Fragment key={url}>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-700 dark:text-slate-200">{name}</span>
            ) : (
              <Link href={url} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
