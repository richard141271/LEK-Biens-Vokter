'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function ensureMemberNumber() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('member_number')
        .eq('id', user.id)
        .single();

    if (profile?.member_number) {
        return profile.member_number;
    }

    try {
        const admin = createAdminClient();
        const { data: beekeeper } = await admin
            .from('lek_core_beekeepers')
            .select('beekeeper_id')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        const raw = String((beekeeper as any)?.beekeeper_id || '').trim();
        const numeric = raw.replace(/^BR-/i, '').trim();
        if (numeric && /^\d+$/.test(numeric)) {
            await admin
                .from('profiles')
                .update({ member_number: numeric })
                .eq('id', user.id);
            return numeric;
        }
    } catch {}

    try {
        const admin = createAdminClient();
        const { data: maxRow } = await admin
            .from('profiles')
            .select('member_number')
            .gte('member_number', '100001')
            .order('member_number', { ascending: false })
            .limit(1)
            .maybeSingle();

        const maxRaw = String((maxRow as any)?.member_number || '').trim();
        const maxNum = maxRaw && /^\d+$/.test(maxRaw) ? parseInt(maxRaw, 10) : 0;
        const next = Number.isFinite(maxNum) && maxNum >= 100001 ? maxNum + 1 : 100001;
        const nextStr = String(next);

        await admin
            .from('profiles')
            .update({ member_number: nextStr })
            .eq('id', user.id);
        return nextStr;
    } catch {}

    return null;
}
