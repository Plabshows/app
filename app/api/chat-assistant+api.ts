import { createClient } from '@supabase/supabase-js';

// Expo Server API Handler
export async function POST(req: Request) {
  try {
    const { prompt, userId } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    // Use local env vars or defaults
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
...
`;

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

    // 3. Persistence
    if (userId) {
        await supabase
          .from('messages')
          .insert({
            content: botResponse,
            sender_id: '00000000-0000-0000-0000-000000000000',
            receiver_id: userId,
            status: 'unread',
            type: 'text',
            metadata: { source: 'AI_ASSISTANT_LOCAL' }
          });
    }

    return new Response(JSON.stringify({ response: botResponse }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
