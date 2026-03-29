import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMessages() {
  console.log('--- Messages Table Info ---');
  
  // Try to get a single message to see its structure
  const { data: cols, error: colError } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  if (colError) {
    console.error("Error fetching messages:", colError);
  } else {
    console.log("Sample Message: ", cols?.[0]);
  }
}

checkMessages();
