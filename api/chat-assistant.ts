import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  console.log("Chat Assistant API v2.4 (Node.js) Initialized");
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const prompt = body?.prompt;
    const userId = body?.userId;

    if (!prompt) {
      console.error('Petición cancelada porque falta el query/body');
      return res.status(400).json({ error: 'Falta el mensaje del usuario' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    // Server-side: prefer NEXT_PUBLIC_ (Vercel web), fallback to EXPO_PUBLIC_ (local dev)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL!;
    // Use SERVICE_ROLE_KEY to bypass RLS on backend
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
 
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Configuración: Falta GEMINI_API_KEY' });
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
        return res.status(500).json({ error: `Error DB Artistas: ${artistError.message}` });
    }
 
    const artistContext = (artists || []).map(a => `- ${a.name}: ${a.description}`).join('\n');
 
    const systemPromptPath = path.join(process.cwd(), 'performance_lab_full_system.md');
    let performanceLabKnowledge = '';
    try {
        performanceLabKnowledge = fs.readFileSync(systemPromptPath, 'utf8');
    } catch (err) {
        console.error("Error leyendo performance_lab_full_system.md:", err);
    }

    const systemInstruction = `Eres la Inteligencia Artificial de Soporte Concierge VIP de Performance Lab.
Tu misión es proporcionar una experiencia de lujo, rápida y eficiente a nuestros clientes y artistas.

SOPORTE CONCIERGE:
- Tono EXTREMADAMENTE PROFESIONAL y refinado (VIP).
- LISTA DE ARTISTAS DISPONIBLES:
${artistContext}

CONOCIMIENTO Y REGLAS DE NEGOCIO DEL SISTEMA:
${performanceLabKnowledge}

INSTRUCCIONES:
1. RECOMENDACIONES: Usa la lista y el conocimiento del sistema anterior.
2. SOPORTE: Responde dudas técnicas o comerciales usando las reglas dadas.
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
        return res.status(500).json({ 
            error: 'Lo siento, no puedo procesar tu solicitud en este momento por un problema técnico. Inténtalo de nuevo pronto.' 
        });
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

    return res.status(200).json({ 
        response: botResponse, 
        message: insertedMessage || {
            id: 'temp-' + Date.now(),
            content: botResponse,
            sender_id: '00000000-0000-0000-0000-000000000000',
            receiver_id: userId,
            created_at: new Date().toISOString(),
            status: 'unread'
        }
    });

  } catch (error: any) {
    console.error("Chat Assistant Global Error:", error);
    return res.status(500).json({ error: error.message });
  }
}

