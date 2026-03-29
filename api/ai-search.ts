import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORY_MAP: Record<string, string> = {
    '636d2dcd-3e1d-4b1e-b111-a6400ca1b025': 'Musicians',
    'bf451e54-4edb-4453-8ff7-f74a3882e89c': 'Dancers',
    'f26b86db-2ef5-476b-bf53-3a09d4ecba17': 'Magic',
    '42f050db-aa72-4a8f-97ba-8521b4c1ec03': 'Roaming',
    '95585a4e-1cc1-417e-a064-7f210b9c2996': 'Fire & Flow',
    '6e2eba1a-54ee-4360-95b1-932089633089': 'Circus',
    'bff4df18-b95f-4f7e-821b-ab303b030c9a': 'DJ',
    '7dc05cb1-fa8a-4317-9c17-d2682831d73c': 'Specialty Acts',
    '0ca60f4f-2c8b-421c-9711-88f1e9327cb8': 'Singer',
    '8a662c88-7702-4ec7-bd70-671d707a0774': 'Art',
    '95a06893-94ff-4500-9fbf-b32efce7026f': 'Actors',
    '6a48f266-d4a5-4e8b-babe-e58fb204645d': 'Drags',
    '347f8d09-522b-44a7-8453-3950f907ce9f': 'Water Acts',
};

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Falta el requerimiento del cliente' }), { status: 400 });
    }

    // 1. Fetch ALL published artists to give Gemini context
    const { data: allArtists, error: fetchError } = await supabase
        .from('profiles')
        .select('id, name, description, category_id, categories')
        .eq('is_published', true)
        .or('role.eq.artist,role.eq.talent');

    if (fetchError) {
        console.error("Supabase Fetch Error:", fetchError);
        return new Response(JSON.stringify({ error: `Error DB: ${fetchError.message}` }), { status: 500 });
    }

    // 2. Prepare context for Gemini
    const artistContext = (allArtists || []).map(a => 
        `ID: ${a.id} | Name: ${a.name} | Description: ${a.description} | Categories: ${(a.categories || []).join(', ')}`
    ).join('\n');

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
       console.error("AI Search Error: GEMINI_API_KEY is missing");
       return new Response(JSON.stringify({ error: 'Configuración de Servidor: Falta GEMINI_API_KEY' }), { status: 500 });
    }

    // Using v1 endpoint which seems more stable for these models
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const systemPrompt = `You are the Expert Matchmaker for 'Performrs'.
Your job is to read a user's event requirement and find the most suitable artists from our catalog.

CATALOG OF ARTISTS:
${artistContext}

USER REQUIREMENT:
"${prompt}"

GOAL:
1. Understand the vibe, theme, and type of entertainment requested.
2. Match the user's request with up to 10 artists from the catalog.
3. Provide a tailored 'Match Reason' for each artist in Spanish.

RESPONSE FORMAT (Strict JSON):
Return ONLY a valid JSON array of objects: [{"id": "UUID", "reason": "Reason in Spanish"}].
If no matches exist, return [].`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }]
      })
    });

    if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error("Gemini API Error:", geminiRes.status, errText);
        return new Response(JSON.stringify({ 
            error: `API IA Error (${geminiRes.status}): ${errText.slice(0, 150)}...`,
            debug: { artistCount: allArtists?.length || 0 }
        }), { status: 500 });
    }

    const geminiData = await geminiRes.json();
    let textResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Clean markdown
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

    let matches: { id: string, reason: string }[] = [];
    try {
        const jsonMatch = textResult.match(/\[.*\]/s);
        matches = JSON.parse(jsonMatch ? jsonMatch[0] : textResult);
    } catch (e) {
        console.error("AI Parse Error:", textResult);
        return new Response(JSON.stringify({ error: 'Error al procesar la respuesta de la IA' }), { status: 500 });
    }

    if (!Array.isArray(matches) || matches.length === 0) {
        return new Response(JSON.stringify({ results: [], categories: [] }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    const matchedIds = matches.map(m => m.id);
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', matchedIds);

    if (profileError) throw profileError;

    const results = (profiles || []).map(p => {
        const matchInfo = matches.find(m => m.id === p.id);
        return {
            ...p,
            match_reason: matchInfo?.reason || 'Recomendado por nuestra IA',
            category: CATEGORY_MAP[p.category_id] || (p.categories?.[0]) || 'Artist',
            image_url: p.avatar_url || p.banner_url || (Array.isArray(p.gallery_urls) ? p.gallery_urls[0] : null) || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-banner.png',
            location_base: p.city || 'Ibiza',
        };
    });

    const sortedResults = matchedIds.map(id => results.find(r => r.id === id)).filter(Boolean);

    return new Response(JSON.stringify({ results: sortedResults, categories: [] }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    });

  } catch (error: any) {
    console.error("AI Search Global Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
