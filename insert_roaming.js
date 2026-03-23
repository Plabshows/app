require('dotenv').config();
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const html = fs.readFileSync('temp_characters.html', 'utf8');

// Regex to find character cards and extract data
const regex = /<a href="\/characters\/[^"]+">.*?style="background-image:url\(([^)]+)\)".*?<h3 class="card-title[^>]*>([^<]+)<\/h3>.*?<p class="card-description[^>]*>([^<]+)<\/p>/g;

let match;
const characters = [];

while ((match = regex.exec(html)) !== null) {
    const imageUrl = match[1];
    const title = match[2];
    const description = match[3];

    // Clean up image URL if it's relative
    const fullImageUrl = imageUrl.startsWith('/') ? `https://euphonious-kelpie-cd0a27.netlify.app${imageUrl}` : imageUrl;

    characters.push({
        title,
        image_url: fullImageUrl,
        description,
        category: 'Roaming',
        price_range: '1500' // Example price
    });
}

console.log(`Found ${characters.length} characters.`);

async function insertData() {
    if (characters.length === 0) {
        console.log('No characters found via regex.');
        return;
    }

    const { data, error } = await supabase
        .from('acts')
        .insert(characters)
        .select();

    if (error) {
        console.error('Error inserting data:', error);
    } else {
        console.log(`Successfully inserted ${data.length} records into 'acts' table.`);
    }
}

insertData();
