'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Product } from '@/types/shop';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      alert('Kunne ikke hente produkter.');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette dette produktet?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      alert('Kunne ikke slette produktet.');
    } else {
      fetchProducts();
    }
  };

  const handleAddStandardProducts = async () => {
    setLoading(true);
    const standardProducts = [
      {
        name: 'Sommerhonning',
        price: 149,
        category: 'Honning',
        image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description: 'Deilig, lys sommerhonning fra lokale bigårder. Mild og fin smak.',
        stock: 10,
        is_active: true
      },
      {
        name: 'Lynghonning',
        price: 189,
        category: 'Honning',
        image_url: 'https://images.unsplash.com/photo-1587049352851-8d4e8918d119?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description: 'Kraftig og aromatisk lynghonning. Perfekt til ostefatet.',
        stock: 5,
        is_active: true
      },
      {
        name: 'Håndlaget Bivoks-såpe',
        price: 89,
        category: 'Såpe',
        image_url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description: 'Naturlig såpe laget med bivoks og honning. Skånsom for huden.',
        stock: 20,
        is_active: true
      },
      {
        name: 'Ren Bivoks (200g)',
        price: 129,
        category: 'Bivoks',
        image_url: 'https://images.unsplash.com/photo-1605651202724-1306bf1dc80c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description: '100% ren bivoks. Perfekt til lysstøping eller egen hudpleie.',
        stock: 15,
        is_active: true
      },
      {
        name: 'Tavlehonning',
        price: 249,
        category: 'Tavlehonning',
        image_url: 'https://images.unsplash.com/photo-1555447405-bd6145d279cf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description: 'Hele stykker av vokstavle fylt med honning. En eksklusiv delikatesse.',
        stock: 3,
        is_active: true
      },
      {
        name: 'Gavepakke "Biens Beste"',
        price: 499,
        category: 'Gavepakker',
        image_url: 'https://images.unsplash.com/photo-1541530777-50580a6c6d7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
        description: 'En flott gaveeske med honning, såpe og et bivokslys.',
        stock: 8,
        is_active: true
      }
    ];

    const { error } = await supabase
      .from('products')
      .insert(standardProducts);

    if (error) {
      console.error('Error adding standard products:', error);
      alert('Kunne ikke legge til standardvarer.');
    } else {
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nettbutikk Administrasjon</h1>
          <p className="text-gray-500">Administrer dine produkter og varelager</p>
        </div>
        <Link
          href="/dashboard/admin/shop/new"
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nytt Produkt
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Søk etter produkt..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Produkt</th>
                <th className="px-6 py-3 font-medium">Kategori</th>
                <th className="px-6 py-3 font-medium">Pris</th>
                <th className="px-6 py-3 font-medium">Lager</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Laster produkter...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <p className="mb-4">Ingen produkter funnet.</p>
                    {products.length === 0 && (
                      <button
                        onClick={handleAddStandardProducts}
                        className="text-green-600 hover:underline font-medium"
                      >
                        Legg til standardvarer (Demo)
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 relative overflow-hidden flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-gray-400', 'text-xs');
                                if (e.currentTarget.parentElement) e.currentTarget.parentElement.innerText = 'Feil';
                              }}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-xs">
                              Ingen bilde
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {product.price},-
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${product.stock < 5 ? 'text-red-600' : 'text-gray-600'}`}>
                        {product.stock} stk
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.is_active 
                          ? 'bg-green-50 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${product.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {product.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/admin/shop/${product.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
