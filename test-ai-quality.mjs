const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
import { createClient } from '@supabase/supabase-js';

// Configuration
const GEMINI_API_KEY = 'AIzaSyCSwFgLf1IIqzrS7mVyWpMdjOog-bbv2zI';
const SUPABASE_URL = 'https://nwxepstpedmxslbznejv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_C8P40iLGFC423o_5Q0Gt0A_qqLFSesa';

// A valid user UUID from the profiles we fetched earlier
const VALID_USER_ID = 'ea5378b5-9d92-48e8-a03e-45f2d1378cb6'; 

async function testAI(prompt) {
    console.log(`\n--- Testing Prompt: "${prompt}" ---`);
    
    const { default: handler } = await import('./api/chat-assistant.ts');
    
    // Mocking the request object
    const req = {
        method: 'POST',
        json: async () => ({ prompt, userId: VALID_USER_ID })
    };

    process.env.GEMINI_API_KEY = GEMINI_API_KEY;
    process.env.SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_ANON_KEY = SUPABASE_KEY;

    try {
        const response = await handler(req);
        const data = await response.json();
        if (data.error) {
            console.error("API Error:", data.error);
        } else {
            console.log("AI Response:", data.response);
        }
        return data.response;
    } catch (e) {
        console.error("Test Failed:", e.message);
    }
}

async function runTests() {
    // Scenario 1: Direct Artist Inquiry
    await testAI("¿Qué tienes de magia?");

    // Scenario 2: Platform Feature
    await testAI("¿Cómo contacto con un administrador?");

    // Scenario 3: Complex Negotiation / Hallucination Check
    await testAI("¿Puedo pagar 200€ por el violinista mañana?");
}

runTests();
