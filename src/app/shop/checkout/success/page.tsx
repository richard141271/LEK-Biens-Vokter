'use client';

import Link from 'next/link';
import { CheckCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function OrderSuccessPage() {
  useEffect(() => {
    // Fire confetti on mount
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const random = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults, 
        particleCount,
        origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults, 
        particleCount,
        origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-lg w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Takk for din bestilling!</h1>
        <p className="text-gray-600 mb-8 text-lg">
            Ordren din er registrert og vi gjør den klar for sending. Du vil motta en bekreftelse på e-post straks.
        </p>

        <div className="bg-gray-50 rounded-xl p-6 mb-8 border border-gray-100">
            <p className="text-sm text-gray-500 mb-2">Ordrenummer</p>
            <p className="text-xl font-mono font-bold text-gray-900">#{Math.floor(100000 + Math.random() * 900000)}</p>
        </div>

        <div className="space-y-4">
            <Link 
                href="/shop"
                className="block w-full bg-orange-600 text-white font-bold py-4 rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200 flex items-center justify-center gap-2"
            >
                <ShoppingBag className="w-5 h-5" />
                Fortsett å handle
            </Link>
            
            <Link 
                href="/"
                className="block w-full text-gray-600 font-medium py-2 hover:text-orange-600 transition-colors flex items-center justify-center gap-1"
            >
                Gå til forsiden
                <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
      </div>
    </div>
  );
}
