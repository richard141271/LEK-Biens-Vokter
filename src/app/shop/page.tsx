'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft, Star, Search, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Product } from '@/types/shop';

// Mock Data for fallback
const MOCK_PRODUCTS = [
  {
    id: '1',
    name: 'Sommerhonning',
    price: 149,
    category: 'Honning',
    image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    description: 'Deilig, lys sommerhonning fra lokale bigårder. Mild og fin smak.',
    rating: 4.8,
    stock: 10,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Lynghonning',
    price: 189,
    category: 'Honning',
    image_url: 'https://images.unsplash.com/photo-1587049352851-8d4e8918d119?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    description: 'Kraftig og aromatisk lynghonning. Perfekt til ostefatet.',
    rating: 5.0,
    stock: 5,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Håndlaget Bivoks-såpe',
    price: 89,
    category: 'Såpe',
    image_url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    description: 'Naturlig såpe laget med bivoks og honning. Skånsom for huden.',
    rating: 4.7,
    stock: 20,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    name: 'Ren Bivoks (200g)',
    price: 129,
    category: 'Bivoks',
    image_url: 'https://images.unsplash.com/photo-1605651202724-1306bf1dc80c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    description: '100% ren bivoks. Perfekt til lysstøping eller egen hudpleie.',
    rating: 4.9,
    stock: 15,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Tavlehonning',
    price: 249,
    category: 'Tavlehonning',
    image_url: 'https://images.unsplash.com/photo-1555447405-bd6145d279cf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    description: 'Hele stykker av vokstavle fylt med honning. En eksklusiv delikatesse.',
    rating: 4.9,
    stock: 3,
    is_active: true,
    created_at: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Gavepakke "Biens Beste"',
    price: 499,
    category: 'Gavepakker',
    image_url: 'https://images.unsplash.com/photo-1541530777-50580a6c6d7d?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    description: 'En flott gaveeske med honning, såpe og et bivokslys.',
    rating: 5.0,
    stock: 8,
    is_active: true,
    created_at: new Date().toISOString()
  },
];

const CATEGORIES = ['Alle', 'Honning', 'Såpe', 'Bivoks', 'Tavlehonning', 'Gavepakker'];

export default function ShopPage() {
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        // Fallback to mock data if DB is empty or error
        setProducts(MOCK_PRODUCTS);
      } else {
        if (data && data.length > 0) {
            setProducts(data);
        } else {
            setProducts(MOCK_PRODUCTS);
        }
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'Alle' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </Link>
            <div className="flex items-center gap-2">
                <ShoppingBag className="w-8 h-8 text-orange-500" />
                <h1 className="text-2xl font-bold text-gray-900">Nettbutikk</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Simple cart placeholder */}
             <button className="p-2 relative hover:bg-gray-100 rounded-full transition-colors">
                <ShoppingBag className="w-6 h-6 text-gray-600" />
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">0</span>
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 md:p-12 mb-12 text-white relative overflow-hidden shadow-lg">
            <div className="relative z-10 max-w-2xl">
                <h2 className="text-4xl font-bold mb-4">Naturlige skatter fra bikuben</h2>
                <p className="text-lg opacity-90 mb-8">Utforsk vårt utvalg av lokalprodusert honning, håndlagde såper og rene naturprodukter.</p>
                <button className="bg-white text-orange-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-md">
                    Se ukens tilbud
                </button>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/10 skew-x-12 transform translate-x-12"></div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 justify-between items-center sticky top-24 z-20 bg-gray-50/95 backdrop-blur-sm p-4 -mx-4 rounded-xl">
            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                            selectedCategory === cat 
                            ? 'bg-gray-900 text-white shadow-md' 
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Søk etter produkter..." 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>

        {/* Product Grid */}
        {loading ? (
             <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
             </div>
        ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col group">
                    <div className="h-48 relative overflow-hidden bg-gray-100">
                        <img 
                            src={product.image_url || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-medium shadow-sm">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            4.9
                        </div>
                        {product.stock < 5 && product.stock > 0 && (
                            <div className="absolute bottom-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                                Få igjen!
                            </div>
                        )}
                         {product.stock === 0 && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                <span className="bg-gray-900 text-white px-3 py-1 rounded-lg font-bold">Utsolgt</span>
                            </div>
                        )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <div className="text-xs font-medium text-orange-600 mb-2 uppercase tracking-wide">{product.category}</div>
                        <h3 className="font-bold text-gray-900 mb-2 text-lg">{product.name}</h3>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{product.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                            <span className="font-bold text-xl text-gray-900">{product.price},-</span>
                            <button 
                                disabled={product.stock === 0}
                                onClick={() => alert(`La til ${product.name} i handlekurven!`)}
                                className="bg-orange-100 hover:bg-orange-200 text-orange-700 p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-orange-500 group-hover:text-white"
                            >
                                <ShoppingBag className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        ) : (
            <div className="text-center py-20 text-gray-500">
                <p className="text-xl">Ingen produkter funnet.</p>
                <button 
                    onClick={() => {setSelectedCategory('Alle'); setSearchQuery('');}}
                    className="text-orange-600 hover:underline mt-2"
                >
                    Nullstill filter
                </button>
            </div>
        )}

      </main>
    </div>
  );
}
