'use client';

import { usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Pages without sidebar (full width)
  const isFullWidth = pathname === '/login' || pathname === '/register' || pathname === '/' || pathname === '/about';

  return (
    <div className={`${isFullWidth ? 'md:pl-0' : 'md:pl-64'} min-h-screen`}>
      {children}
    </div>
  );
}
