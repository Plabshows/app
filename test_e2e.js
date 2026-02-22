const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env variables
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
    console.log("=== STARTING E2E SUPABASE TEST ===");
    const testEmail = `test_user_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // 1. SIGN UP (Tests the auth.users trigger)
    console.log(`\n1. Signing up new user: ${testEmail}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: {
                full_name: 'Test Artist E2E'
            }
        }
    });

    if (authError) {
        console.error("❌ Sign up failed:", authError);
        return;
    }

    const user = authData.user;
    console.log(`✅ User signed up successfully. ID: ${user.id}`);

    // Wait a moment for trigger
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. CHECK PROFILES TABLE (Tests the PL/pgSQL function)
    console.log("\n2. Checking public.profiles for trigger execution...");
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error("❌ Profile not found! Trigger might have failed.", profileError);
        return;
    }
    console.log(`✅ Profile created automatically by trigger! Name: ${profile.name}`);

    // 3. TEST STORAGE UPLOAD & RLS (Simulates frontend upload)
    console.log("\n3. Testing image upload to 'media' bucket with RLS...");
    const dummyFileContent = "dummy image data";
    const blob = new Blob([dummyFileContent], { type: 'text/plain' });
    const filePath = `${user.id}/test_avatar.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, blob, {
            contentType: 'text/plain',
            upsert: true
        });

    if (uploadError) {
        console.error("❌ Storage upload failed! RLS policy might be wrong.", uploadError);
        return;
    }
    console.log(`✅ Storage upload successful! Path: ${uploadData.path}`);

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);

    // 4. TEST PROFILE UPDATE (Simulates Edit Profile save)
    console.log("\n4. Testing profile UPDATE logic (Frontend simulation)...");
    const { error: updateProfError } = await supabase
        .from('profiles')
        .update({
            city: 'Madrid',
            avatar_url: publicUrl
        })
        .eq('id', user.id);

    if (updateProfError) {
        console.error("❌ Profile update failed:", updateProfError);
        return;
    }
    console.log("✅ Profile UPDATE successful (No duplicates created)");

    // 5. TEST ACTS UPSERT (Simulates Edit Profile save for Acts table)
    console.log("\n5. Testing acts UPSERT logic...");
    const { error: actError } = await supabase
        .from('acts')
        .upsert({
            owner_id: user.id,
            name: 'Test Artist Act',
            artist_type: 'Solo',
            price_guide: '1500',
            description: 'Programmatic test bio',
            photos_url: [publicUrl]
        }, { onConflict: 'owner_id' });

    if (actError) {
        console.error("❌ Acts upsert failed:", actError);
        return;
    }
    console.log("✅ Acts UPSERT successful");

    console.log("\n=== ALL E2E TESTS PASSED SUCCESSFULLY! ===");
}

runTest();
