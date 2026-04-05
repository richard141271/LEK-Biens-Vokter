import type { ReactNode } from 'react';

export const metadata = {
  title: 'AI Innovate AS – Aksjer',
  description: 'Kjøp og selg aksjer i AI Innovate AS',
};

export default function AksjerLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}

