import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'nodejs',
};

// Map categories to UUIDs for reference if needed, 
// but here we primarily use the name and description.
const CATEGORY_MAP: Record<string, string> = {
    'Musicians': '636d2dcd-3e1d-4b1e-b111-a6400ca1b025',
    'Dancers': 'bf451e54-4edb-4453-8ff7-f74a3882e89c',
    'Magic': 'f26b86db-2ef5-476b-bf53-3a09d4ecba17',
    'Roaming': '42f050db-aa72-4a8f-97ba-8521b4c1ec03',
    'Fire & Flow': '95585a4e-1cc1-417e-a064-7f210b9c2996',
    'Circus': '6e2eba1a-54ee-4360-95b1-932089633089',
    'DJ': 'bff4df18-b95f-4f7e-821b-ab303b030c9a',
    'Specialty Acts': '7dc05cb1-fa8a-4317-9c17-d2682831d73c',
    'Singer': '0ca60f4f-2c8b-421c-9711-88f1e9327cb8',
    'Art': '8a662c88-7702-4ec7-bd70-671d707a0774',
    'Water Acts': '347f8d09-522b-44a7-8453-3950f907ce9f',
    'Actors': '95a06893-94ff-4500-9fbf-b32efce7026f',
    'Drags': '6a48f266-d4a5-4e8b-babe-e58fb204645d',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { prompt, userId, conversationId } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!GEMINI_API_KEY || !supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Server context missing' }), { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch Dynamic Context: All published artists
    const { data: artists, error: artistError } = await supabase
      .from('profiles')
      .select('name, description, role')
      .eq('is_published', true)
      .or('role.eq.artist,role.eq.talent');

    if (artistError) throw artistError;

    const artistContext = (artists || []).map(a => `- ${a.name}: ${a.description}`).join('\n');

    // 2. Prepare Gemini Prompt
    const systemInstruction = `Eres el Asistente Virtual oficial de la aplicación Performance Lab.
Tu misión principal es asistir a los usuarios respondiendo dudas, dando ideas sobre los artistas disponibles en la plataforma y dando indicaciones claras sobre cómo usar la app para hacer reservas (bookings) o cualquier otra funcionalidad.

LISTA DE ARTISTAS DISPONIBLES:
${artistContext}

REGLAS CRÍTICAS:
1. Usa solo la información de la lista de artistas proporcionada para dar recomendaciones.
2. REGLA DE SEGURIDAD ESTRICTA: Si el usuario te hace una pregunta cuya respuesta no conoces, no estás seguro o se trata de una negociación compleja, PROHIBIDO INVENTAR INFORMACIÓN. En su lugar, debes responder amablemente diciendo que no tienes la respuesta exacta y que vas a enviar esa consulta directamente al Administrador para que se ponga en contacto con ellos lo antes posible.
3. Responde siempre de forma VIP, profesional y amable en español.
4. Tu nombre es 'Asistente de Performance Lab'.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemInstruction}\n\nPregunta del usuario: ${prompt}` }] }]
      })
    });

    const geminiData = await geminiRes.json();
    const botResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Lo siento, no puedo procesar tu solicitud en este momento.";

    // 3. Persistence: Save to messages table
    // userId is the client. conversationId is optional if use direct sender/receiver system
    if (userId) {
        const { error: insertError } = await supabase
          .from('messages')
          .insert({
            content: botResponse,
            sender_id: '00000000-0000-0000-0000-000000000000', // Unique Bot ID placeholder
            receiver_id: userId,
            status: 'unread',
            type: 'text',
            metadata: { 
                source: 'AI_ASSISTANT',
                original_prompt: prompt.substring(0, 100)
            }
          });
          
        if (insertError) {
          console.error("Error persisting bot message:", insertError);
          // We still return the response to the user even if persistence fails, 
          // but we log it for the developer.
        }
    }

    return new Response(JSON.stringify({ response: botResponse }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error: any) {
    console.error("Chat Assistant Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
