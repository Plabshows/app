import { createClient } from '@supabase/supabase-js';

// Hardcoding for diagnostic purposes since .env loading was flaky in MJS
const supabaseUrl = 'https://nwxepstpedmxslbznejv.supabase.co';
const supabaseKey = 'sb_publishable_C8P40iLGFC423o_5Q0Gt0A_qqLFSesa';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  console.log("Checking for messages before:", fifteenMinsAgo);

  const { data: messages, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      status,
      created_at,
      sender_id
    `)
    .eq('status', 'unread')
    .lt('created_at', fifteenMinsAgo);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${messages?.length || 0} unread messages older than 15 mins.`);
  
  if (messages && messages.length > 0) {
    for (const m of messages) {
       const { data: profile } = await supabase
         .from('profiles')
         .select('id, role, name')
         .eq('id', m.sender_id)
         .single();
         
       console.log(`- [${m.id}] from ${profile?.name || 'Unknown'} (Role: ${profile?.role}). Content: "${m.content.substring(0, 30)}..."`);
    }
  }
}

inspect();
