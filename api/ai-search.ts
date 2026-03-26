import { createClient } from '@supabase/supabase-js';

// Define the UUID mapping identical to the frontend
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

// Standard Node.js runtime for better compatibility with Supabase-js
export const config = {
  runtime: 'nodejs', 
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), { status: 400 });
    }

    // Call Gemini API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
       return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    console.log("Calling Gemini at:", geminiUrl.split('?')[0]);
    
    // Exact instructions to force JSON array output
    const systemPrompt = `You are an AI matchmaker for an event entertainment platform called Performrs. 
Based on the user's event description, identify the best matching artist categories from this EXACT list:
["Musicians", "Dancers", "Magic", "Roaming", "Fire & Flow", "Circus", "DJ", "Specialty Acts", "Singer", "Art", "Water Acts", "Actors", "Drags"]
Respond ONLY with a valid JSON array of strings containing the matched categories. Do not include any markdown formatting, backticks, or other text.`;

    const geminiBody = {
      contents: [{ parts: [{ text: `${systemPrompt}\n\nUser request: ${prompt}` }] }]
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    const geminiData = await geminiRes.json();
    let textResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Clean up any potential markdown formatting (e.g. ```json \n [... ] \n ```)
    textResult = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

    let matchedCategories: string[] = [];
    try {
        const jsonMatch = textResult.match(/\[.*\]/s);
        const jsonToParse = jsonMatch ? jsonMatch[0] : textResult;
        matchedCategories = JSON.parse(jsonToParse);
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Parse failed' }), { status: 500 });
    }

    // Connect to Supabase
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase credentials in Vercel. URL:", !!supabaseUrl, "Key:", !!supabaseKey);
        throw new Error("Missing Supabase credentials");
    }

    console.log("Supabase Client initialized for URL:", supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If no categories matched, we could just return nothing or a generic response
    if (!matchedCategories || matchedCategories.length === 0) {
        return new Response(JSON.stringify({ results: [], categories: [], v: 'ROOT_API_V1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Map categories to UUIDs
    const categoryIds = matchedCategories
        .map(cat => CATEGORY_MAP[cat])
        .filter(Boolean); // remove undefined

    if (categoryIds.length === 0) {
        return new Response(JSON.stringify({ results: [], categories: matchedCategories }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Query published profiles
    let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_published', true)
        .or('role.eq.artist,role.eq.talent')
        .order('created_at', { ascending: false })
        .limit(20);

    if (categoryIds.length > 0) {
        // Only use category_id since 'category' column doesn't exist
        query = query.in('category_id', categoryIds);
    } else if (matchedCategories.length > 0) {
        // Fallback: search for category names in the bio/name if no ID match
        const searchOr = matchedCategories.map(c => `name.ilike.%${c}%,bio.ilike.%${c}%`).join(',');
        query = query.or(searchOr);
    }

    console.log("Matched Category IDs:", categoryIds);
    const { data: profiles, error } = await query;
    console.log("Supabase Profiles Found:", profiles?.length || 0);

    if (error) {
        console.error("Supabase Error:", error);
        throw error;
    }

    // Map the results immediately so the frontend has them formatted
    const mappedProfiles = (profiles || []).map((item: any) => ({
        ...item,
        category: CATEGORY_MAP[item.category_id] || item.category || 'Artist',
        image_url: item.avatar_url || item.banner_url || (Array.isArray(item.gallery_urls) ? item.gallery_urls[0] : null) || 'https://euphonious-kelpie-cd0a27.netlify.app/images/default-banner.png',
        location_base: item.city || 'International',
    }));

    return new Response(JSON.stringify({ results: mappedProfiles, categories: matchedCategories }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
