import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL || 'http://127.0.0.1:54321', // Use local dev URL or your hosted URL
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function createTestUser() {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: 'test@performrs.com',
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { full_name: 'Test Client QA' }
    });

    if (error) {
        console.error('Error creating user:', error);
    } else {
        console.log('User created successfully:', data.user.id);
    }
}

createTestUser();
