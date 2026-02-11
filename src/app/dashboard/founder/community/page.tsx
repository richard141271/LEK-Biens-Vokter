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
    
    const isVip = user.email === 'richard141271@gmail.com';
    const isCourseFriendMeta = authUser?.user_metadata?.is_course_friend;

    const { data: profile } = await adminVerifier
        .from('profiles')
        .select('role, is_founder, is_course_friend')
        .eq('id', user.id)
        .single();
    
    const isAdmin = profile?.role === 'admin';
    const isFounder = profile?.is_founder;
    const isCourseFriend = profile?.is_course_friend || isCourseFriendMeta;

    if (!isAdmin && !isVip && !isFounder && !isCourseFriend) {
        redirect('/dashboard');
    }

    return (
        <WarRoomDashboard 
            backLink="/dashboard/founder"
            backText="Tilbake"
        />
    );
}
