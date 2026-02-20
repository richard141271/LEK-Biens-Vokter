'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

type CaseType = 'IDEA' | 'PLAN' | 'CASE';
type CaseStatus = 'OPEN' | 'IN_PROGRESS' | 'PAUSED' | 'RESOLVED' | 'ARCHIVED';

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
    const adminClient = createAdminClient();

    const { data: cases, error } = await adminClient
        .from('cases')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

    if (error) return { error: error.message };

    const { data: resolved } = await adminClient
        .from('cases')
        .select('*')
        .eq('status', 'RESOLVED')
        .order('resolved_at', { ascending: false })
        .limit(5);

    const { count: resolvedCount } = await adminClient
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'RESOLVED');

    const profileIds = Array.from(new Set([
        ...(cases || []).map((c: any) => c.assigned_to).filter(Boolean),
        ...(cases || []).map((c: any) => c.created_by).filter(Boolean),
        ...(resolved || []).map((c: any) => c.assigned_to).filter(Boolean),
        ...(resolved || []).map((c: any) => c.created_by).filter(Boolean)
    ]));

    let profilesById: Record<string, string> = {};
    if (profileIds.length > 0) {
        const { data: profiles } = await adminClient
            .from('profiles')
            .select('id, full_name')
            .in('id', profileIds as string[]);
        profilesById = Object.fromEntries(
            (profiles || []).map((p: any) => [p.id, p.full_name as string])
        );

        const missingIds = profileIds.filter(id => !profilesById[id]);
        if (missingIds.length > 0) {
            console.error('War Room cases: missing profiles for user IDs', missingIds);
        }
    }

    const mapCaseList = (list: any[] | null) =>
        (list || []).map((c: any) => {
            const hasAssigned = !!c.assigned_to;
            const assignedName = hasAssigned ? profilesById[c.assigned_to] : undefined;
            return {
                ...c,
                assigned: hasAssigned
                    ? {
                        full_name: assignedName || null,
                        missing_profile: !assignedName
                    }
                    : null,
                created_by_name: c.created_by ? profilesById[c.created_by] : null
            };
        });

    return { 
        cases: mapCaseList(cases || []), 
        recentResolved: mapCaseList(resolved || []), 
        resolvedCount: resolvedCount || 0 
    };
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

export async function getCaseUpdates(caseId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('case_updates')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });
    if (error) return { error: error.message };
    return { updates: data || [] };
}

export async function getCaseAttachments(caseId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('case_attachments')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });
    if (error) return { error: error.message };
    return { attachments: data || [] };
}

export async function getCaseSignedUploadUrl(fileName: string) {
    const adminClient = createAdminClient();
    // Ensure bucket exists
    const { error: bucketError } = await adminClient.storage.createBucket('case-attachments', {
        public: true,
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
    });
    if (bucketError && !bucketError.message.includes('already exists')) {
        console.error('Bucket ensure error (case-attachments):', bucketError);
    }

    const { data, error } = await adminClient.storage
        .from('case-attachments')
        .createSignedUploadUrl(fileName);
    if (error) return { error: error.message };
    return { signedUrl: data!.signedUrl, token: data!.token, path: data!.path };
}

export async function addCaseAttachment(caseId: string, filePath: string, fileType: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const adminClient = createAdminClient();

    const { data: { publicUrl } } = adminClient.storage
        .from('case-attachments')
        .getPublicUrl(filePath);

    const { error } = await adminClient
        .from('case_attachments')
        .insert({
            case_id: caseId,
            uploaded_by: user.id,
            file_url: publicUrl,
            file_type: fileType
        });
    if (error) return { error: error.message };

    // Touch case updated_at and add history
    await adminClient.from('cases').update({ updated_at: new Date().toISOString() }).eq('id', caseId);
    await adminClient.from('case_updates').insert({
        case_id: caseId,
        user_id: user.id,
        message: 'La til vedlegg',
        type: 'SYSTEM'
    });

    revalidatePath('/dashboard/war-room');
    return { success: true, publicUrl };
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

    // Kursvenn kan endre mellom ÅPEN <-> PÅGÅR og PAUSE. Admin kan sette LØST og ARKIV.
    if (!isAdmin && !['IN_PROGRESS', 'OPEN', 'PAUSED'].includes(status)) {
        return { error: 'Kun admin kan sette til Løst, Pause eller Arkivert' };
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
    const adminClient = createAdminClient();

    const { data: archived, error } = await adminClient
        .from('cases')
        .select('*')
        .in('status', ['RESOLVED', 'ARCHIVED'])
        .order('updated_at', { ascending: false })
        .limit(200);

    if (error) return { error: error.message };
    return { archived: archived || [] };
}
