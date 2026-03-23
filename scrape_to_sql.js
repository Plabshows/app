const fs = require('fs');

const html = fs.readFileSync('temp_characters.html', 'utf8');

// Regex to find character cards and extract data
// Note: The HTML is minified, so newlines might not be present.
// We'll look for the structure "character-card" ... "card-title" ... "card-description"

// Refined regex based on the viewed HTML structure:
// <a href="/characters/...">...<div class="card-image ... style="background-image:url(/images/...)">...<h3 class="card-title ...">Title</h3>...<p class="card-description ...">Desc</p>

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

if (characters.length > 0) {
    const sqlValues = characters.map(c => {
        // Escape single quotes in SQL
        const title = c.title.replace(/'/g, "''");
        const description = c.description.replace(/'/g, "''");
        const imageUrl = c.image_url.replace(/'/g, "''");

        return `('${title}', '${imageUrl}', '${description}', '${c.category}', '${c.price_range}')`;
    }).join(',\n');

    const sqlContent = `INSERT INTO acts (title, image_url, description, category, price_range) VALUES\n${sqlValues};`;

    fs.writeFileSync('seed_roaming.sql', sqlContent);
    console.log('seed_roaming.sql generated successfully.');
} else {
    console.log('No characters found via regex. Check the pattern.');
}
