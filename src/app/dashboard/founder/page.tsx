import { getFounderStatus, getFounderLogs } from '@/app/actions/founder';
import FounderClient from './FounderClient';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function FounderPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        redirect('/login');
    }

    // Get user details for name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

    const status = await getFounderStatus();
    
    if ('error' in status) {
        // Likely not authenticated
        redirect('/login');
    }

    if (!status.profile) {
        // User has access but no founder profile? 
        // This might happen if is_founder is true but founder_profiles entry missing.
        // Or if they are not is_founder at all (but RLS might block reading founder_profiles anyway).
        // Let's redirect to dashboard if no profile found.
        redirect('/dashboard');
    }

    const logs = await getFounderLogs();

    return (
        <FounderClient 
            profile={status.profile} 
            checks={status.checks} 
            ambitions={status.ambitions}
            logs={logs}
            userName={profile?.full_name || user.email || 'Deltaker'}
        />
    );
}
