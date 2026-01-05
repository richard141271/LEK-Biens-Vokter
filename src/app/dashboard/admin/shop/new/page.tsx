'use client';

import ProductForm from '@/components/shop/ProductForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <Link 
          href="/dashboard/admin/shop"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tilbake til oversikt
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Legg til nytt produkt</h1>
      </div>

      <ProductForm />
    </div>
  );
}
