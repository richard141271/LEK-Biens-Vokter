import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
  const supabase = createAdminClient();
  
  // Henter alle bigårder med service_role (bypasser RLS)
  const { data: apiaries, error } = await supabase
    .from('apiaries')
    .select('*');

  return (
    <div className="p-8 font-mono text-sm bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4 border-b pb-2">DEBUG: RAW APIARIES DATA (Service Role)</h1>
      
      <div className="mb-8">
        <h2 className="font-bold text-lg mb-2">Status</h2>
        <div className="p-4 bg-gray-100 rounded">
            <div><strong>Antall funnet:</strong> {apiaries?.length ?? 0}</div>
            <div><strong>Error:</strong> {error ? JSON.stringify(error) : 'Ingen feil'}</div>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-lg mb-2">Data Dump</h2>
        <pre className="bg-slate-900 text-green-400 p-4 rounded overflow-auto max-w-full">
          {JSON.stringify(apiaries, null, 2)}
        </pre>
      </div>
    </div>
  );
}
