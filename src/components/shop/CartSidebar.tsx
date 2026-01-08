'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PRODUCT_IMAGES } from '@/utils/shop-constants';

export default function CartSidebar() {
  const { items, removeItem, updateQuantity, isOpen, setIsOpen, total, clearCart } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-600" />
              Din Handlekurv
            </h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ShoppingBag className="w-16 h-16 text-gray-200 mb-4" />
                <p>Handlekurven er tom</p>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="mt-4 text-orange-600 font-bold hover:underline"
                >
                  Begynn å handle
                </button>
              </div>
            ) : (
              items.map(item => (
                <div key={item.id} className="flex gap-4 bg-white border border-gray-100 p-3 rounded-xl shadow-sm">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    <img 
                      src={item.image_url || PRODUCT_IMAGES.FALLBACK} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => e.currentTarget.src = PRODUCT_IMAGES.FALLBACK}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                      <p className="text-sm text-gray-500">{item.price},-</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-white rounded-md transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-white rounded-md transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 space-y-4">
              <div className="flex items-center justify-between text-lg font-bold text-gray-900">
                <span>Totalt</span>
                <span>{total},-</span>
              </div>
              <Link 
                href="/shop/checkout"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center bg-orange-600 text-white font-bold py-4 rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200"
              >
                Gå til Kassen
              </Link>
              <button 
                onClick={clearCart}
                className="w-full text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                Tøm handlekurv
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
