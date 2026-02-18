const fs = require('fs');
const path = require('path');

const mockPath = path.join(__dirname, 'src', 'data', 'mock.js');
const htmlPath = path.join(__dirname, 'temp_characters.html');

// Read existing mock data
let mockContent = fs.readFileSync(mockPath, 'utf8');

// Read HTML
const html = fs.readFileSync(htmlPath, 'utf8');

// Regex to extract characters (same as before)
const regex = /<a href="\/characters\/[^"]+">.*?style="background-image:url\(([^)]+)\)".*?<h3 class="card-title[^>]*>([^<]+)<\/h3>.*?<p class="card-description[^>]*>([^<]+)<\/p>/g;

let match;
const newCharacters = [];
let idCounter = 100; // Start IDs from 100 to avoid conflicts

while ((match = regex.exec(html)) !== null) {
    const imageUrl = match[1];
    const title = match[2];
    const description = match[3];

    // Clean up image URL if it's relative
    const fullImageUrl = imageUrl.startsWith('/') ? `https://euphonious-kelpie-cd0a27.netlify.app${imageUrl}` : imageUrl;

    newCharacters.push({
        id: String(idCounter++),
        title,
        category: 'Roaming',
        price_range: '$1,500 - $3,000', // Matches format of existing mock data
        image_url: fullImageUrl,
        video_url: '', // No video for these scraped items
        description,
        specs: 'Standard roaming requirements.',
    });
}

console.log(`Found ${newCharacters.length} new characters.`);

// Locate the end of the array to inject new items
// We assume mock.js ends with "];" or similar.
// We'll replace the last "];" with the new items + "];"

const insertionPoint = mockContent.lastIndexOf('];');

if (insertionPoint !== -1) {
    const newItemsString = newCharacters.map(c => `    ${JSON.stringify(c)},`).join('\n');

    const newContent = mockContent.slice(0, insertionPoint) +
        ',\n' +
        newItemsString +
        '\n];';

    fs.writeFileSync(mockPath, newContent);
    console.log('Successfully added characters to src/data/mock.js');
} else {
    console.error('Could not find the end of the ACTS array in mock.js');
}
