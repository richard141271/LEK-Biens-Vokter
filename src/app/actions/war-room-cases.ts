'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

type CaseType = 'IDEA' | 'PLAN' | 'CASE';
type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';

interface CreateCaseInput {
    type: CaseType;
    title: string;
    description: string;
}

export async function createCase(input: CreateCaseInput) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();

    const { data: created, error } = await adminClient
        .from('cases')
        .insert({
            title: input.title.trim(),
            description: input.description.trim(),
            type: input.type,
            status: 'OPEN',
            created_by: user.id,
            assigned_to: user.id
        })
        .select()
        .single();

    if (error || !created) return { error: error?.message || 'Kunne ikke opprette sak' };

    await adminClient
        .from('case_updates')
        .insert({
            case_id: created.id,
            user_id: user.id,
            message: 'Sak opprettet',
            type: 'SYSTEM'
        });

    revalidatePath('/dashboard/war-room');
    revalidatePath('/dashboard/founder/community');

    return { success: true, id: created.id };
}

export async function getCasesForFeed() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();

    const { data: cases, error } = await adminClient
        .from('cases')
        .select('*, creator:profiles!cases_created_by_fkey(full_name), assigned:profiles!cases_assigned_to_fkey(full_name)')
        .in('status', ['OPEN', 'IN_PROGRESS'])
        .order('updated_at', { ascending: false })
        .limit(100);

    if (error) return { error: error.message };

    const { data: resolved } = await adminClient
        .from('cases')
        .select('*, creator:profiles!cases_created_by_fkey(full_name), assigned:profiles!cases_assigned_to_fkey(full_name)')
        .eq('status', 'RESOLVED')
        .order('resolved_at', { ascending: false })
        .limit(5);

    // Count total resolved for header
    const { count: resolvedCount } = await adminClient
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'RESOLVED');

    return { cases: cases || [], recentResolved: resolved || [], resolvedCount: resolvedCount || 0 };
}

export async function getCaseById(id: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();

    const { data: item, error } = await adminClient
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !item) return { error: 'Not found' };

    const { data: updates } = await adminClient
        .from('case_updates')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: true });

    const { data: attachments } = await adminClient
        .from('case_attachments')
        .select('*')
        .eq('case_id', id)
        .order('created_at', { ascending: true });

    return { item, updates: updates || [], attachments: attachments || [] };
}

export async function addCaseComment(caseId: string, message: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    if (!message.trim()) return { error: 'Tom kommentar' };

    const adminClient = createAdminClient();

    const { error } = await adminClient
        .from('case_updates')
        .insert({
            case_id: caseId,
            user_id: user.id,
            message: message.trim(),
            type: 'COMMENT'
        });

    if (error) return { error: error.message };

    await adminClient
        .from('cases')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', caseId);

    revalidatePath('/dashboard/war-room');
    revalidatePath('/dashboard/founder/community');

    return { success: true };
}

export async function updateCaseStatus(caseId: string, status: CaseStatus) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin' || user.email === 'richard141271@gmail.com';

    // Kursvenn kan endre mellom ÅPEN <-> PÅGÅR. Admin kan sette LØST og ARKIV.
    if (!isAdmin && !['IN_PROGRESS', 'OPEN'].includes(status)) {
        return { error: 'Kun admin kan sette til Løst eller Arkivert' };
    }

    const payload: any = {
        status,
        updated_at: new Date().toISOString()
    };

    if (status === 'RESOLVED') {
        payload.resolved_at = new Date().toISOString();
    }
    if (status === 'IN_PROGRESS') {
        payload.assigned_to = user.id;
    }
    if (status === 'OPEN') {
        payload.assigned_to = null;
    }

    const { error } = await adminClient
        .from('cases')
        .update(payload)
        .eq('id', caseId);

    if (error) return { error: error.message };

    await adminClient
        .from('case_updates')
        .insert({
            case_id: caseId,
            user_id: user.id,
            message: `Status → ${status}`,
            type: 'STATUS_CHANGE'
        });

    revalidatePath('/dashboard/war-room');
    revalidatePath('/dashboard/founder/community');

    return { success: true };
}

export async function getArchivedCases() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();

    const { data: archived, error } = await adminClient
        .from('cases')
        .select('*')
        .eq('status', 'ARCHIVED')
        .order('updated_at', { ascending: false })
        .limit(100);

    if (error) return { error: error.message };
    return { archived: archived || [] };
}
