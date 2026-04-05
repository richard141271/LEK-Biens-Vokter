'use client';

import { useState } from 'react';
import { adminInitSetup } from '@/app/aksjer/actions';

export default function DangerInitResetForm(props: { defaultTotalShares: number; dangerPasswordConfigured: boolean }) {
  const [primed, setPrimed] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <details className="mt-4">
      <summary className="cursor-pointer select-none text-sm font-bold text-red-700">
        Avansert: Hard reset
      </summary>

      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Dette er en katastrofe-knapp. Den sletter ordre/transaksjoner/annonser/aksjenummer-logs og nuller aksjer (utenom holding) og setter nytt totalantall i holding.
      </div>

      {!props.dangerPasswordConfigured ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Admin-passord er ikke konfigurert på server. Sett miljøvariabel <span className="font-bold">STOCK_ADMIN_DANGER_PASSWORD</span>.
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          Hvis du får feilen “Could not find the function … in the schema cache”, kjør migrasjonen i Supabase og “Reload schema cache”.
        </div>
      )}

      <form
        action={adminInitSetup}
        className="mt-3 space-y-3"
        onSubmit={() => {
          setOpen(false);
          setPrimed(false);
        }}
      >
        <input
          name="totalShares"
          type="number"
          min={0}
          defaultValue={props.defaultTotalShares}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
        />

        <label className="flex items-start gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={primed}
            onChange={(e) => setPrimed(e.target.checked)}
            className="mt-1"
          />
          <span>Jeg forstår at dette kan ødelegge data og at operasjonen ikke kan angres.</span>
        </label>

        <button
          type="button"
          disabled={!primed || !props.dangerPasswordConfigured}
          onClick={() => {
            if (!primed) return;
            if (!props.dangerPasswordConfigured) return;
            const ok = window.confirm('Er du sikker? Dette kan ikke angres.');
            if (!ok) return;
            setOpen(true);
          }}
          className={`px-4 py-3 rounded-xl font-bold ${primed ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'}`}
        >
          Hard reset
        </button>

        {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <div className="text-lg font-black text-gray-900">Bekreft reset</div>
              <div className="mt-2 text-sm text-gray-700">
                Skriv <span className="font-bold">RESET</span> og admin-passordet for å fortsette.
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bekreftelsestekst</label>
                  <input
                    name="confirmPhrase"
                    required
                    placeholder="RESET"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Admin-passord</label>
                  <input
                    name="adminPassword"
                    type="password"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gray-900 outline-none"
                  />
                </div>

                <label className="flex items-start gap-2 text-sm text-gray-800">
                  <input name="confirmReset" type="checkbox" required className="mt-1" />
                  <span>Jeg bekrefter at jeg vil utføre reset nå.</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-bold"
                  >
                    Avbryt
                  </button>
                  <button type="submit" className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold">
                    Utfør reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </details>
  );
}
