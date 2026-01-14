'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Truck, ShieldCheck, Loader2 } from 'lucide-react';
import { PRODUCT_IMAGES } from '@/utils/shop-constants';

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Success!
    clearCart();
    router.push('/shop/checkout/success');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Handlekurven er tom</h1>
            <p className="text-gray-600 mb-8">Du må legge til noen varer før du kan gå til kassen.</p>
            <Link 
                href="/shop"
                className="inline-block bg-orange-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-orange-700 transition-colors"
            >
                Tilbake til butikken
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/shop" className="inline-flex items-center text-gray-600 hover:text-orange-600 mb-8 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Tilbake til butikken
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
            {/* Form Section */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Truck className="w-6 h-6 text-orange-600" />
                        Leveringsinformasjon
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Fullt navn</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                value={formData.name}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">E-post</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                value={formData.phone}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                value={formData.address}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">Postnummer</label>
                                <input
                                    type="text"
                                    id="postalCode"
                                    name="postalCode"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    value={formData.postalCode}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">Poststed</label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    required
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <CreditCard className="w-6 h-6 text-orange-600" />
                                Betaling
                            </h2>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                                <p className="text-sm text-gray-600 mb-2">Kortinformasjon (Demo)</p>
                                <div className="flex gap-2">
                                    <div className="h-8 w-12 bg-white border rounded flex items-center justify-center">Visa</div>
                                    <div className="h-8 w-12 bg-white border rounded flex items-center justify-center">MC</div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Behandler...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5" />
                                        Fullfør kjøp ({total},-)
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Order Summary */}
            <div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Ordreoversikt</h2>
                    <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
                        {items.map((item) => (
                            <div key={item.id} className="flex gap-4 items-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                    <img 
                                        src={item.image_url || PRODUCT_IMAGES.FALLBACK} 
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => e.currentTarget.src = PRODUCT_IMAGES.FALLBACK}
                                    />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
                                    <p className="text-sm text-gray-500">{item.quantity} x {item.price},-</p>
                                </div>
                                <div className="font-bold text-gray-900">
                                    {item.quantity * item.price},-
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4 space-y-2">
                        <div className="flex justify-between text-gray-600">
                            <span>Sum varer</span>
                            <span>{total},-</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Frakt</span>
                            <span>Gratis</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
                            <span>Totalt å betale</span>
                            <span>{total},-</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
