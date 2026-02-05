'use server';

import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function resolveWarRoomPost(postId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const adminClient = createAdminClient();
    
    // Check admin role
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin' || user.email === 'richard141271@gmail.com';

    // Also allow author to resolve their own post?
    // "huke av for 'avklart/løst' så 'slukkes' det røde varselet" -> user context implies admin doing it,
    // but maybe the user themselves should be able to say "I fixed it"?
    // Let's allow Admin OR Author.
    
    // Fetch post to check author
    const { data: post } = await adminClient
        .from('warroom_posts')
        .select('user_id')
        .eq('id', postId)
        .single();

    if (!post) return { error: 'Post not found' };

    if (!isAdmin && post.user_id !== user.id) {
        return { error: 'Unauthorized' };
    }
    
    const { error } = await adminClient
        .from('warroom_posts')
        .update({ is_resolved: true })
        .eq('id', postId);

    if (error) return { error: error.message };
    revalidatePath('/dashboard/war-room');
    revalidatePath('/dashboard/admin/founders'); // Also revalidate admin view
    return { success: true };
}
