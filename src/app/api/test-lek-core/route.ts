import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const admin = createAdminClient();

        const { data: beekeeper, error: beekeeperError } = await admin
            .schema('lek_core')
            .from('beekeepers')
            .insert({
                full_name: 'Test Birøkter',
                email: 'test.birokter@example.com',
                phone_number: '+4712345678',
                address: 'Testveien 1',
                postal_code: '0001',
                city: 'Testby',
                is_active: true
            })
            .select('*')
            .single();

        if (beekeeperError || !beekeeper) {
            return NextResponse.json(
                { error: beekeeperError?.message || 'Kunne ikke opprette beekeeper' },
                { status: 500 }
            );
        }

        const { data: apiary, error: apiaryError } = await admin
            .schema('lek_core')
            .from('apiaries')
            .insert({
                beekeeper_id: beekeeper.beekeeper_id,
                name: 'Testbigård'
            })
            .select('*')
            .single();

        if (apiaryError || !apiary) {
            return NextResponse.json(
                { error: apiaryError?.message || 'Kunne ikke opprette apiary' },
                { status: 500 }
            );
        }

        const { data: hive, error: hiveError } = await admin
            .schema('lek_core')
            .from('hives')
            .insert({
                apiary_id: apiary.apiary_id
            })
            .select('*')
            .single();

        if (hiveError || !hive) {
            return NextResponse.json(
                { error: hiveError?.message || 'Kunne ikke opprette hive' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                beekeeper,
                apiary,
                hive
            },
            { status: 200 }
        );
    } catch (e: any) {
        return NextResponse.json(
            { error: e?.message || 'Ukjent feil i /api/test-lek-core' },
            { status: 500 }
        );
    }
}
