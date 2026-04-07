'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { createEmissionOrder } from '@/app/aksjer/actions';

const BANK_ACCOUNT = '3606 26 47110';
const USDT_TRC20_ADDRESS = 'TJ64DHa2zLRntt2PpghTm3jMWVjv6fLvG1';

export default function BuyClient(props: {
  userEmail: string;
  defaultFullName: string;
  pricePerShare: number;
  availableShares: number;
  active: boolean;
  feeRate: number;
}) {
  const [shareCount, setShareCount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'usdt_trc20'>('bank');
  const buyerName = (props.defaultFullName || '').trim() || props.userEmail;
  const shareCountNumber = useMemo(() => {
    const n = Number(shareCount);
    if (!Number.isFinite(n) || shareCount === '') return 0;
    return Math.max(0, Math.floor(n));
  }, [shareCount]);
  const total = useMemo(
    () => Number((shareCountNumber * props.pricePerShare).toFixed(2)),
    [shareCountNumber, props.pricePerShare]
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/aksjer/dashboard" className="text-sm font-semibold text-gray-700 hover:underline">
            ← Dashboard
          </Link>
          <div className="text-sm text-gray-500">Kjøp aksjer</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-gray-500">Aktiv emisjon</div>
              <div className="text-lg font-black text-gray-900">{props.active ? 'Åpen' : 'Stengt'}</div>
              <div className="text-sm text-gray-600">Tilgjengelig: {props.availableShares}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Pris per aksje</div>
              <div className="text-lg font-black text-gray-900">{props.pricePerShare.toFixed(2)}</div>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Bestilling</h2>
          {!props.active ? (
            <div className="mt-3 text-sm text-gray-600">Emisjon er ikke aktiv akkurat nå.</div>
          ) : (
            <form action={createEmissionOrder} className="mt-4 space-y-4">
              <input type="hidden" name="paymentMethod" value={paymentMethod} />

              <div>
                <div className="text-sm text-gray-500">Kjøper</div>
                <div className="mt-1 font-bold text-gray-900">{buyerName}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Oppdater navn/identitet i <Link href="/aksjer/profile" className="font-semibold hover:underline">profil</Link>.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Antall aksjer</label>
                  <input
                    name="shareCount"
                    type="number"
                    min={1}
                    step={1}
                    max={Math.max(1, props.availableShares)}
                    value={shareCount}
                    onChange={(e) => setShareCount(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Totalpris</label>
                  <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 font-black text-gray-900">
                    {total.toFixed(2)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Betalingsmetode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank')}
                    className={`rounded-xl border px-4 py-3 text-left ${paymentMethod === 'bank' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white'}`}
                  >
                    Bank
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('usdt_trc20')}
                    className={`rounded-xl border px-4 py-3 text-left ${paymentMethod === 'usdt_trc20' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white'}`}
                  >
                    Krypto (USDT)
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 bg-gray-50 text-sm text-gray-700 space-y-2">
                <div className="font-bold text-gray-900">Avtale</div>
                <div>Kjøpet registreres når betaling er godkjent og ført i aksjeeierboken.</div>
                <label className="flex items-start gap-2">
                  <input name="agreed" type="checkbox" required className="mt-1" />
                  <span>Jeg godtar avtalen og bekrefter bestillingen.</span>
                </label>
                <div className="text-xs text-gray-500">
                  Gebyr: {Number((total * props.feeRate).toFixed(2)).toFixed(2)} (trekkes ved videresalg)
                </div>
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold">
                Fortsett til betaling
              </button>
            </form>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Betaling</h2>
          <div className="mt-2 text-sm text-gray-700">
            Betal til: <span className="font-bold text-gray-900">Selskapets konto</span>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Bank</div>
              <div className="text-lg font-black text-gray-900 mt-1">{BANK_ACCOUNT}</div>
              <div className="text-sm text-gray-600 mt-2">
                Bruk unik referanse-ID som systemet genererer (AI-XXXXX). Etter betaling trykker du “Jeg har betalt”.
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Krypto (USDT – TRC20)</div>
              <div className="text-sm font-bold text-gray-900 mt-1 break-all">{USDT_TRC20_ADDRESS}</div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-2">
                  <QRCodeSVG value={USDT_TRC20_ADDRESS} size={120} />
                </div>
                <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                  Kun USDT (TRC20). Andre kryptovalutaer vil gå tapt.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
