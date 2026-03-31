import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

export async function POST(req: Request) {
  console.log("Chat Assistant API v2.2 (Edge) Initialized");
  try {
    let prompt, userId;
    try {
      const body = await req.json();
      prompt = body.prompt;
      userId = body.userId;
    } catch (e) {
      console.error("Error parseando JSON del Request:", e);
    }

    if (!prompt) {
      console.error('Petición cancelada porque falta el query/body');
      return new Response(JSON.stringify({ error: 'Falta el mensaje del usuario' }), { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    // Server-side: prefer NEXT_PUBLIC_ (Vercel web), fallback to EXPO_PUBLIC_ (local dev)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL!;
    // Use SERVICE_ROLE_KEY to bypass RLS on backend
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
 
    if (!GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'Configuración: Falta GEMINI_API_KEY' }), { status: 500 });
    }
 
    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
 
    // 1. Fetch Context
    const { data: artists, error: artistError } = await supabase
      .from('profiles')
      .select('name, description, role')
      .eq('is_published', true)
      .or('role.eq.artist,role.eq.talent');
 
    if (artistError) {
        return new Response(JSON.stringify({ error: `Error DB Artistas: ${artistError.message}` }), { status: 500 });
    }
 
    const artistContext = (artists || []).map(a => `- ${a.name}: ${a.description}`).join('\n');
 
    const systemInstruction = `Eres la Inteligencia Artificial de Soporte Concierge VIP de Performance Lab.
Tu misión es proporcionar una experiencia de lujo, rápida y eficiente a nuestros clientes y artistas.

SOPORTE CONCIERGE:
- Tono EXTREMADAMENTE PROFESIONAL y refinado (VIP).
- LISTA DE ARTISTAS DISPONIBLES:
${artistContext}

INSTRUCCIONES:
1. RECOMENDACIONES: Usa la lista anterior.
2. SOPORTE: Responde dudas técnicas o comerciales.
3. IDIOMA: Responde en el mismo idioma que el usuario.
`;
 
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\nUsuario: ${prompt}` }] }]
        })
    });

    if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.error("Gemini Chat API Error:", geminiRes.status, errBody);
        return new Response(JSON.stringify({ 
            error: 'Lo siento, no puedo procesar tu solicitud en este momento por un problema técnico. Inténtalo de nuevo pronto.' 
        }), { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const botResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no pude generar una respuesta. ¿Puedes intentarlo de nuevo?";

    // 3. Persistence
    let insertedMessage = null;
    if (userId) {
        const { data: msg, error: insError } = await supabase
            .from('messages')
            .insert({
                content: botResponse,
                sender_id: '00000000-0000-0000-0000-000000000000',
                receiver_id: userId,
                status: 'unread',
                type: 'text',
                metadata: { source: 'AI_ASSISTANT_LOCAL' }
            })
            .select()
            .single();
        
        if (insError) {
            console.warn("Error insertando mensaje AI:", insError);
        }
        insertedMessage = msg;
    }

    return new Response(JSON.stringify({ 
        response: botResponse, 
        message: insertedMessage || {
            id: 'temp-' + Date.now(),
            content: botResponse,
            sender_id: '00000000-0000-0000-0000-000000000000',
            receiver_id: userId,
            created_at: new Date().toISOString(),
            status: 'unread'
        }
    }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Chat Assistant Global Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
