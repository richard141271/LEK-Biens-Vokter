-- Reset/Cleanup (Kjør dette først for å fjerne gammel tabell med feil datatype)
-- ADVARSEL: Dette sletter all data i 'profiles' tabellen.
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP TABLE IF EXISTS profiles;

-- Opprett profiles tabell på nytt med korrekte typer
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  phone_number TEXT,
  
  -- Medlemskap info
  is_norges_birokterlag_member BOOLEAN DEFAULT FALSE,
  member_number TEXT,
  local_association TEXT,
  is_lek_honning_member BOOLEAN DEFAULT FALSE,
  
  -- Interesser (lagres som liste)
  interests TEXT[],
  
  -- Type birøkt
  beekeeping_type TEXT CHECK (beekeeping_type IN ('hobby', 'business')),
  
  -- Firma detaljer (kun hvis beekeeping_type = 'business')
  company_name TEXT,
  org_number TEXT,
  company_bank_account TEXT,
  company_address TEXT,
  
  -- Økonomi
  private_bank_account TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktiver sikkerhet (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Tillat brukere å se sin egen profil
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- Tillat brukere å oppdatere sin egen profil
CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Tillat brukere å opprette sin egen profil ved registrering
CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);
