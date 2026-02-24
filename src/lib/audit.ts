import { supabase } from './supabase';

export type AdminAction = 'toggle_admin' | 'toggle_published' | 'impersonate' | 'delete_user' | 'edit_user';

export async function logAdminAction(
    adminId: string,
    targetUserId: string,
    action: AdminAction,
    details: any = {}
) {
    try {
        const { error } = await supabase
            .from('admin_audit_logs')
            .insert({
                admin_id: adminId,
                target_user_id: targetUserId,
                action,
                details
            });

        if (error) {
            console.error('[Audit] Failed to log action:', error);
        }
    } catch (err) {
        console.error('[Audit] Unexpected error logging action:', err);
    }
}
