'use client';

import ProductForm from '@/components/shop/ProductForm';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Product } from '@/types/shop';

export default function EditProductPage() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.id) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        alert('Kunne ikke hente produktet.');
      } else {
        setProduct(data);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900">Produkt ikke funnet</h1>
        <Link href="/dashboard/admin/shop" className="text-green-600 hover:underline mt-4 inline-block">
          Gå tilbake til oversikt
        </Link>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Rediger produkt: {product.name}</h1>
      </div>

      <ProductForm initialData={product} isEdit={true} />
    </div>
  );
}
