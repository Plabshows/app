import { supabase } from '../lib/supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

// IMPORTANT: Edge functions might need different supabase init if lib assumes browser, 
// but we can use the simple REST approach or standard supabase-js if it's a standard Node runtime.
// If deployed to Vercel, it runs in Node.js by default for /api unless `export const config` says edge.
// We will use standard Serverless Function (Node.js).

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
// We need a stable admin ID to send the message from
const SYSTEM_ADMIN_ID = 'cbc605d5-518d-4fab-94e4-3d3cda8cf833'; 

export default async function handler(req: any, res: any) {
  try {
    // 1. Validate Cron Secret
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && req.query.secret !== process.env.CRON_SECRET) {
      console.warn("Unauthorized access attempt to AI Concierge cron");
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    console.log("AI Concierge Job Started...");

    // 2. Fetch Unread Messages older than 15 minutes written by a client
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    // We join messages with profiles to check if sender_role is client, or simply check if sender is not admin
    // Or simpler: fetch all unread messages older than 15m.
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        profiles!sender_id(id, role, name)
      `)
      .eq('status', 'unread')
      .lt('created_at', fifteenMinsAgo)
      // Usually type 'chat' or 'text' implies a normal text message
      .in('type', ['text', 'chat']);

    if (messagesError) {
      console.error("Supabase Error:", messagesError);
      throw messagesError;
    }

    if (!messages || messages.length === 0) {
      console.log("No pending client messages older than 15 mins. Exiting cleanly.");
      return res.status(200).json({ success: true, processed: 0 });
    }

    // Filter to ensure sender is a client (or at least not an admin responding)
    const clientMessages = messages.filter(msg => {
      // It's possible the `profiles` join returns a single object or an array depending on foreign keys
      const senderProfile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
      return senderProfile && senderProfile.role === 'client';
    });
    
    console.log(`Found ${clientMessages.length} unread client messages needing response.`);

    let processedCount = 0;

    // 3. Process each message with Gemini
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: "You are the automated VIP Concierge for Performance Lab (Performrs). Your tone is elegant, professional, and helpful. A client has sent a message and we are currently unavailable. Confirm receipt of their request and reassure them that an administrator will be in contact shortly to handle the details. Keep it very short, 1 or 2 sentences max. Do not ask them questions, just confirm receipt gracefully." 
    });

    for (const msg of clientMessages) {
      try {
        console.log(`Processing message ${msg.id} from ${msg.sender_id}...`);
        // We prompt gemini with the client's original message for context (optional, but good)
        const prompt = `The client wrote: "${msg.content}". Generate a polite auto-response.`;
        
        const result = await model.generateContent(prompt);
        const autoReplyText = result.response.text();

        // 4. Insert response into messages table
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            sender_id: SYSTEM_ADMIN_ID,
            receiver_id: msg.sender_id, // Sent back to the client
            booking_id: msg.booking_id, // Keep the same booking context if any
            type: 'text',
            content: autoReplyText,
            status: 'unread', // Client hasn't read this new auto-reply yet
            metadata: {
              ...msg.metadata,
              is_auto_reply: true
            }
          });

        if (insertError) {
          console.error(`Failed to insert reply for msg ${msg.id}:`, insertError);
          continue; // Skip updating status if reply failed
        }

        // 5. Update original message status so we don't process it again
        const { error: updateError } = await supabase
          .from('messages')
          .update({ status: 'responded' })
          .eq('id', msg.id);
          
        if (updateError) {
          console.error(`Failed to update status for msg ${msg.id}:`, updateError);
        } else {
          processedCount++;
        }

      } catch (geminiError) {
        console.error(`Error processing msg ${msg.id} with Gemini:`, geminiError);
      }
    }

    return res.status(200).json({ success: true, processed: processedCount });

  } catch (error: any) {
    console.error("AI Concierge Fatal Error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
