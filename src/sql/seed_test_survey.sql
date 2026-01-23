-- TESTDATA FOR SURVEY – KAN SLETTES
-- Formål: Fylle databasen med 20 birøktere og 20 ikke-birøktere med ferdig utfylte svar for testing.
-- Bruk: Kopier alt innholdet og kjør i Supabase SQL Editor.

DO $$
DECLARE
    i INT;
    new_user_id UUID;
    user_email TEXT;
    user_role TEXT;
    random_name TEXT;
    survey_id TEXT;
    -- Array med fornavn
    first_names TEXT[] := ARRAY['Olav', 'Ingrid', 'Hans', 'Marit', 'Per', 'Anne', 'Lars', 'Eva', 'Knut', 'Nina', 'Arne', 'Lise', 'Tor', 'Hanne', 'Erik', 'Mona', 'Leif', 'Tone', 'Jan', 'Siri', 'Odd', 'Gry', 'Bjørn', 'Unni', 'Svein', 'Hege', 'Geir', 'Turid', 'Nils', 'Kari', 'Jens', 'Berit', 'Rolf', 'Elin', 'Terje', 'Tove', 'Einar', 'Wenche', 'Frode', 'Anita'];
    -- Array med etternavn
    last_names TEXT[] := ARRAY['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen', 'Johnsen', 'Pettersen', 'Eriksen', 'Berg', 'Haugen', 'Hagen', 'Johannessen', 'Andreassen', 'Jacobsen', 'Halvorsen'];
BEGIN
    -- 1. Opprett 20 BIRØKTERE (role = 'tester')
    FOR i IN 1..20 LOOP
        new_user_id := gen_random_uuid();
        random_name := first_names[1 + floor(random() * 40)::int] || ' ' || last_names[1 + floor(random() * 20)::int];
        user_email := 'test_beekeeper_' || i || '@demo.no';
        
        -- A. Sett inn i auth.users (OBS: Dette virker kun hvis du har tilgang til auth schema direkte, ellers må du opprette via API. 
        -- For seed-formål i Supabase SQL editor må vi ofte fake det ved å sette inn i public.profiles og late som om auth-koblingen finnes, 
        -- ELLER bruke Supabase sin `auth.sign_up` funksjon hvis tilgjengelig.
        -- Her setter vi inn direkte i profiles siden det er det rapporteringen bruker. 
        -- Auth-innlogging vil IKKE fungere for disse brukerne uten at de finnes i auth.users, men rapportene vil vise dem.)
        
        INSERT INTO public.profiles (
            id, 
            full_name, 
            email, 
            role, 
            beekeeping_type, 
            created_at, 
            updated_at,
            email_alias,
            email_enabled,
            is_active
        ) VALUES (
            new_user_id,
            random_name,
            user_email,
            'tester', -- Egen rolle for å lett kunne filtrere/slette
            'hobby',
            NOW(),
            NOW(),
            'test.' || i || '@kias.no',
            true,
            true
        );

        -- B. Legg til svar i survey_responses (BEEKEEPER)
        -- Spørsmål 1: Hvor lenge har du drevet med birøkt? (years_experience)
        INSERT INTO public.survey_responses (user_id, survey_type, question_id, answer_value)
        VALUES (new_user_id, 'BEEKEEPER', 'years_experience', 
            (ARRAY['0-2 år', '3-5 år', '6-10 år', 'Over 10 år'])[1 + floor(random() * 4)::int]
        );

        -- Spørsmål 2: Hvor mange kuber har du? (hive_count)
        INSERT INTO public.survey_responses (user_id, survey_type, question_id, answer_value)
        VALUES (new_user_id, 'BEEKEEPER', 'hive_count', 
            (floor(random() * 50) + 1)::text
        );

        -- Spørsmål 3: Har du opplevd sykdom? (disease_experience)
        INSERT INTO public.survey_responses (user_id, survey_type, question_id, answer_value)
        VALUES (new_user_id, 'BEEKEEPER', 'disease_experience', 
            CASE WHEN random() > 0.5 THEN 'Ja' ELSE 'Nei' END
        );

        -- Spørsmål 4: Utfordringer (challenges) - Multi-select simulert
        INSERT INTO public.survey_responses (user_id, survey_type, question_id, answer_value)
        VALUES (new_user_id, 'BEEKEEPER', 'challenges', 
            'Varroa,Vintertap' -- Forenklet for demo
        );
        
        -- Spørsmål 5: Interesse for smittevern (interest_level)
        INSERT INTO public.survey_responses (user_id, survey_type, question_id, answer_value)
        VALUES (new_user_id, 'BEEKEEPER', 'interest_level', 
            (floor(random() * 5) + 1)::text -- Skala 1-5
        );

    END LOOP;

    -- 2. Opprett 20 IKKE-BIRØKTERE (role = 'tester')
    FOR i IN 1..20 LOOP
        new_user_id := gen_random_uuid();
        random_name := first_names[1 + floor(random() * 40)::int] || ' ' || last_names[1 + floor(random() * 20)::int];
        user_email := 'test_non_beekeeper_' || i || '@demo.no';
        
        INSERT INTO public.profiles (
            id, 
            full_name, 
            email, 
            role, 
            beekeeping_type, 
            created_at, 
            updated_at,
            is_active
        ) VALUES (
            new_user_id,
            random_name,
            user_email,
            'tester',
            NULL, -- Ikke birøkter
            NOW(),
            NOW(),
            true
        );

        -- B. Legg til svar i survey_responses (NON_BEEKEEPER)
        -- Spørsmål 1: Hvorfor er du interessert? (interest_reason)
        INSERT INTO public.survey_responses (user_id, survey_type, question_id, answer_value)
        VALUES (new_user_id, 'NON_BEEKEEPER', 'interest_reason', 
            (ARRAY['Miljøvern', 'Lære mer', 'Vurdere å starte', 'Støtte lokalt'])[1 + floor(random() * 4)::int]
        );

        -- Spørsmål 2: Kjenner du noen birøktere? (knows_beekeeper)
        INSERT INTO public.survey_responses (user_id, survey_type, question_id, answer_value)
        VALUES (new_user_id, 'NON_BEEKEEPER', 'knows_beekeeper', 
            CASE WHEN random() > 0.5 THEN 'Ja' ELSE 'Nei' END
        );

         -- Spørsmål 3: Interesse for leie av kube? (rental_interest)
        INSERT INTO public.survey_responses (user_id, survey_type, question_id, answer_value)
        VALUES (new_user_id, 'NON_BEEKEEPER', 'rental_interest', 
             (floor(random() * 5) + 1)::text -- Skala 1-5
        );

    END LOOP;

END $$;


-- KOMMANDO FOR Å SLETTE ALL TESTDATA (Kjør denne separat når du vil rydde opp)
/*
DELETE FROM public.survey_responses 
WHERE user_id IN (SELECT id FROM public.profiles WHERE role = 'tester');

DELETE FROM public.profiles 
WHERE role = 'tester';
*/
