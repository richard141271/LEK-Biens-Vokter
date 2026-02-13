import WarRoomDashboard from '@/components/WarRoomDashboard';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { redirect } from 'next/navigation';

export default async function WarRoomPage() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        redirect('/login');
    }

    // Check access
    const adminVerifier = createAdminClient();
    
    // Check auth metadata
    const { data: { user: authUser } } = await adminVerifier.auth.admin.getUserById(user.id);
    
    const isVip = user.email === 'richard141271@gmail.com' || user.email === 'richard141271@gmail.no' || user.email === 'test_beekeeper_5@demo.no';
    const isCourseFriendMeta = authUser?.user_metadata?.is_course_friend;
    const isFounderMeta = authUser?.user_metadata?.is_founder;

    // Note: is_founder and is_course_friend columns might be missing in profiles table in some envs
    const { data: profile } = await adminVerifier
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    const isAdmin = profile?.role === 'admin';
    const isFounder = isFounderMeta; // Fallback to metadata only if column missing
    const isCourseFriend = isCourseFriendMeta; // Fallback to metadata only if column missing

    if (!isAdmin && !isVip && !isFounder && !isCourseFriend) {
        redirect('/dashboard');
    }

    const backLink = (isFounder || isAdmin || isVip) ? "/dashboard/founder" : "/dashboard";

    return (
        <WarRoomDashboard 
            title="LEK – Kursvennenes Operative Samlingspunkt"
            subtitle="Første kull – sammen bygger vi fremtidens birøkterverktøy"
            backLink={backLink}
            backText="Tilbake"
        />
    );
}
