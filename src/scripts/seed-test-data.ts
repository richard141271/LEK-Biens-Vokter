import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

// Prefer Service Key for Admin operations, fallback to Anon Key for public operations
const isAdmin = !!supabaseServiceKey;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseKey) {
  console.error('Missing both SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const FIRST_NAMES = ['Olav', 'Ingrid', 'Hans', 'Marit', 'Per', 'Anne', 'Lars', 'Eva', 'Knut', 'Nina', 'Arne', 'Lise', 'Tor', 'Hanne', 'Erik', 'Mona', 'Leif', 'Tone', 'Jan', 'Siri', 'Odd', 'Gry', 'Bjørn', 'Unni', 'Svein', 'Hege', 'Geir', 'Turid', 'Nils', 'Kari', 'Jens', 'Berit', 'Rolf', 'Elin', 'Terje', 'Tove', 'Einar', 'Wenche', 'Frode', 'Anita'];
const LAST_NAMES = ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen', 'Johnsen', 'Pettersen', 'Eriksen', 'Berg', 'Haugen', 'Hagen', 'Johannessen', 'Andreassen', 'Jacobsen', 'Halvorsen'];

function getRandomName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

async function createUser(email: string, password: string, name: string) {
  if (isAdmin) {
    // Admin API - Bypasses email verification, no rate limits
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });
    return { user: data.user, error };
  } else {
    // Client API - Subject to rate limits, requires email verification flow usually
    // But for seeding, we just need the user in auth.users
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });
    return { user: data.user, error };
  }
}

async function seedData() {
  console.log(`🌱 Starter seeding av testdata... (Modus: ${isAdmin ? 'ADMIN' : 'CLIENT/ANON'})`);
  if (!isAdmin) {
    console.warn('⚠️  ADVARSEL: Kjører uten Service Role Key. Dette kan feile pga rate limits eller e-postbekreftelse.');
  }

  // 1. Create Beekeepers
  console.log('🐝 Oppretter 20 birøktere...');
  for (let i = 1; i <= 20; i++) {
    const email = `test_beekeeper_${i}@demo.no`;
    const password = 'password123';
    const name = getRandomName();
    const alias = `test.${i}@kias.no`;

    const { user, error: authError } = await createUser(email, password, name);

    if (authError) {
      console.error(`Feil ved oppretting av auth bruker ${email}:`, authError.message);
      continue;
    }

    if (!user) {
      console.error(`Ingen bruker returnert for ${email}`);
      continue;
    }

    const userId = user.id;

    // Upsert Profile (Safest if trigger exists or not)
    // Note: With Anon key, we might not have permission to update 'role' or 'email_alias' directly 
    // depending on RLS. But 'tester' role usually requires admin.
    // We will try anyway.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: name,
        role: 'tester',
        beekeeping_type: 'hobby',
        email_alias: alias,
        email_enabled: true,
        is_active: true,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error(`Feil ved oppdatering av profil for ${email}:`, profileError.message);
    }

    // Insert Survey Responses
    // Anon users can usually insert survey responses if RLS allows
    const responses = [
      { question_id: 'years_experience', answer_value: ['0-2 år', '3-5 år', '6-10 år', 'Over 10 år'][Math.floor(Math.random() * 4)] },
      { question_id: 'hive_count', answer_value: (Math.floor(Math.random() * 50) + 1).toString() },
      { question_id: 'disease_experience', answer_value: Math.random() > 0.5 ? 'Ja' : 'Nei' },
      { question_id: 'challenges', answer_value: 'Varroa,Vintertap' },
      { question_id: 'interest_level', answer_value: (Math.floor(Math.random() * 5) + 1).toString() }
    ];

    for (const resp of responses) {
      await supabase.from('survey_responses').insert({
        user_id: userId,
        survey_type: 'BEEKEEPER',
        question_id: resp.question_id,
        answer_value: resp.answer_value
      });
    }
    
    // Small delay to avoid hammering the API if using Client mode
    if (!isAdmin) await new Promise(r => setTimeout(r, 500));
  }

  // 2. Create Non-Beekeepers
  console.log('👤 Oppretter 20 ikke-birøktere...');
  for (let i = 1; i <= 20; i++) {
    const email = `test_non_beekeeper_${i}@demo.no`;
    const password = 'password123';
    const name = getRandomName();

    const { user, error: authError } = await createUser(email, password, name);

    if (authError) {
      console.error(`Feil ved oppretting av auth bruker ${email}:`, authError.message);
      continue;
    }

    if (!user) continue;

    const userId = user.id;

    // Upsert Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: name,
        role: 'tester',
        beekeeping_type: null,
        is_active: true,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error(`Feil ved oppdatering av profil for ${email}:`, profileError.message);
    }

    // Insert Survey Responses
    const responses = [
      { question_id: 'interest_reason', answer_value: ['Miljøvern', 'Lære mer', 'Vurdere å starte', 'Støtte lokalt'][Math.floor(Math.random() * 4)] },
      { question_id: 'knows_beekeeper', answer_value: Math.random() > 0.5 ? 'Ja' : 'Nei' },
      { question_id: 'rental_interest', answer_value: (Math.floor(Math.random() * 5) + 1).toString() }
    ];

    for (const resp of responses) {
      await supabase.from('survey_responses').insert({
        user_id: userId,
        survey_type: 'NON_BEEKEEPER',
        question_id: resp.question_id,
        answer_value: resp.answer_value
      });
    }

    if (!isAdmin) await new Promise(r => setTimeout(r, 500));
  }

  console.log('✅ Ferdig! Testdata er forsøkt opprettet.');
}

seedData().catch(console.error);
