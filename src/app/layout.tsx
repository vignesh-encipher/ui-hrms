import type { Metadata } from 'next';
import Providers from '@/components/Providers';
import '@/styles/globals.css';

import { AntdRegistry } from '@ant-design/nextjs-registry';

export const metadata: Metadata = {
  title: 'HRMS - Enterprise Human Resource Management System',
  description: 'Enterprise grade HRMS dashboard for attendance, leave, payroll, and employee records.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        <AntdRegistry>
          <Providers>{children}</Providers>
        </AntdRegistry>
      </body>
    </html>
  );
}
