'use server';

import { createClient } from '@/utils/supabase/server';

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

    // Generate new member number (Random between 10000 and 99999)
    // This is a simple client-side generation strategy to ensure uniqueness without complex DB locking
    // Ideally this should be a DB sequence, but this works for now.
    let attempts = 0;
    let newMemberNumber = '';
    let unique = false;

    while (!unique && attempts < 10) {
        newMemberNumber = Math.floor(10000 + Math.random() * 90000).toString();
        
        const { data: existing } = await supabase
            .from('profiles')
            .select('member_number')
            .eq('member_number', newMemberNumber)
            .single();
            
        if (!existing) {
            unique = true;
        }
        attempts++;
    }

    if (unique) {
        await supabase
            .from('profiles')
            .update({ member_number: newMemberNumber })
            .eq('id', user.id);
            
        return newMemberNumber;
    }

    return null; // Failed to generate unique number
}
