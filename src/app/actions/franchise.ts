'use server';

import { createAdminClient } from "@/utils/supabase/admin";

export async function getFranchiseUnitById(id: string) {
    const supabase = createAdminClient();
    
    try {
        const { data, error } = await supabase
            .from('franchise_units')
            .select(`
                *,
                owner:profiles(full_name, email)
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching franchise unit (admin):', error);
            return { error: error.message };
        }

        return { data };
    } catch (error: any) {
        console.error('Unexpected error fetching franchise unit:', error);
        return { error: error.message };
    }
}

export async function getFranchiseMessages(unitId: string) {
    const supabase = createAdminClient();
    
    try {
        const { data, error } = await supabase
            .from('franchise_messages')
            .select(`
                *,
                sender:profiles(full_name, email)
            `)
            .eq('franchise_id', unitId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching franchise messages (admin):', error);
            return { error: error.message };
        }

        return { data };
    } catch (error: any) {
        console.error('Unexpected error fetching franchise messages:', error);
        return { error: error.message };
    }
}
