'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Edit } from 'lucide-react';

const AVAILABLE_PAGES = [
  { slug: 'kids-beekeeper', title: 'Barnas Birøkter', description: 'Rediger tekster for barnas birøkter side' },
  { slug: 'franchise', title: 'Franchise', description: 'Rediger tekster for franchise side' },
];

export default function AdminPagesList() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/dashboard/admin" className="flex items-center text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Tilbake til Admin Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-100 p-3 rounded-xl">
            <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Rediger Nettsider</h1>
            <p className="text-gray-500">Velg hvilken side du ønsker å redigere innholdet på.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AVAILABLE_PAGES.map((page) => (
          <Link 
            key={page.slug} 
            href={`/dashboard/admin/pages/${page.slug}`}
            className="group block bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-gray-100 p-3 rounded-lg group-hover:bg-blue-50 transition-colors">
                <FileText className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
              </div>
              <Edit className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-700">{page.title}</h3>
            <p className="text-gray-500 text-sm">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
