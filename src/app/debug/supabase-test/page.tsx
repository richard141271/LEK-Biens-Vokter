import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = 'force-dynamic';

type KeyInfo = {
  present: boolean;
  trimmedLength: number | null;
  kind: 'jwt' | 'sb_secret' | 'unknown' | 'missing';
  jwtSegments: number | null;
  jwtRef: string | null;
  jwtRole: string | null;
  jwtIss: string | null;
};

function parseSupabaseRefFromUrl(url: string | null) {
  if (!url) return null;
  const m = url.match(/^https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

function base64UrlToUtf8(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64').toString('utf8');
}

function getKeyInfo(value: string | null | undefined): KeyInfo {
  const raw = value ?? null;
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return {
      present: false,
      trimmedLength: null,
      kind: 'missing',
      jwtSegments: null,
      jwtRef: null,
      jwtRole: null,
      jwtIss: null,
    };
  }

  if (trimmed.startsWith('sb_secret_')) {
    return {
      present: true,
      trimmedLength: trimmed.length,
      kind: 'sb_secret',
      jwtSegments: null,
      jwtRef: null,
      jwtRole: null,
      jwtIss: null,
    };
  }

  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = base64UrlToUtf8(parts[1] ?? '');
      const payload = JSON.parse(payloadJson);
      return {
        present: true,
        trimmedLength: trimmed.length,
        kind: 'jwt',
        jwtSegments: 3,
        jwtRef: typeof payload?.ref === 'string' ? payload.ref : null,
        jwtRole: typeof payload?.role === 'string' ? payload.role : null,
        jwtIss: typeof payload?.iss === 'string' ? payload.iss : null,
      };
    } catch {
      return {
        present: true,
        trimmedLength: trimmed.length,
        kind: 'jwt',
        jwtSegments: 3,
        jwtRef: null,
        jwtRole: null,
        jwtIss: null,
      };
    }
  }

  return {
    present: true,
    trimmedLength: trimmed.length,
    kind: 'unknown',
    jwtSegments: parts.length,
    jwtRef: null,
    jwtRole: null,
    jwtIss: null,
  };
}

function getEnvInfo() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? null;
  const supabaseRefFromUrl = parseSupabaseRefFromUrl(supabaseUrl);
  const anon = getKeyInfo(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const service = getKeyInfo(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return {
    vercelEnv: process.env.VERCEL_ENV ?? null,
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    vercelUrl: process.env.VERCEL_URL ?? null,
    nextPublicSupabaseUrl: supabaseUrl,
    supabaseRefFromUrl,
    anonKey: anon,
    serviceRoleKey: service,
  };
}

export default async function DebugPage() {
  const envInfo = getEnvInfo();
  const supabase = createAdminClient();
  
  // Henter alle bigårder med service_role (bypasser RLS)
  const { data: apiaries, error } = await supabase
    .from('apiaries')
    .select('*');

  return (
    <div className="p-8 font-mono text-sm bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4 border-b pb-2">DEBUG: RAW APIARIES DATA (Service Role)</h1>
      
      <div className="mb-8">
        <h2 className="font-bold text-lg mb-2">Env</h2>
        <pre className="bg-slate-900 text-green-400 p-4 rounded overflow-auto max-w-full">
          {JSON.stringify(envInfo, null, 2)}
        </pre>
      </div>

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
