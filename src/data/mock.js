// Map of category names to representative cover images
export const CATEGORY_IMAGES = {
    'Musician': 'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?q=80&w=1000',
    'DJ': 'https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?q=80&w=1000',
    'Magician': 'https://images.unsplash.com/photo-1590483736732-4752b04d168e?q=80&w=1000',
    'Dancer': 'https://images.unsplash.com/photo-1541808462-8404eb58197e?q=80&w=1000',
    'Circus': 'https://images.unsplash.com/photo-1596765275822-4467c6999818?q=80&w=1000',
    'Specialty Act': 'https://images.unsplash.com/photo-1621570163539-715bd0526e03?q=80&w=1000',
    'Fire & Flow': 'https://images.unsplash.com/photo-1505236273191-1dce8aca7013?q=80&w=1000',
    'Presenter': 'https://images.unsplash.com/photo-1557930873-4530fc945d81?q=80&w=1000',
    'Comedian': 'https://images.unsplash.com/photo-1587588000490-67eb7a62df89?q=80&w=1000',
    'Photography': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000',
    'Roaming': 'https://euphonious-kelpie-cd0a27.netlify.app/images/char_tv_head_premium.png'
};

export const ACTS = [
    // Featured / existing
    {
        id: '1',
        name: 'Cyberpunk LED Crew',
        category: 'Dancer', // Reclassified
        price_guide: '$1,500 - $3,000',
        image_url: 'https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=1000&auto=format&fit=crop',
        video_url: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-neon-lights-and-structures-3269-large.mp4',
        description: 'High-energy LED dance crew with programmable suits synchronized to music.',
        technical_specs: 'Requires 10x10m stage, dark room, 3-phase power.',
    },
    {
        id: '2',
        name: 'Aerial Silk Virtuoso',
        category: 'Circus', // Reclassified
        price_guide: '$800 - $1,500',
        image_url: 'https://images.unsplash.com/photo-1519925610903-38106302d559?q=80&w=1000&auto=format&fit=crop',
        video_url: 'https://assets.mixkit.co/videos/preview/mixkit-woman-doing-aerial-silk-exercises-40337-large.mp4',
        description: 'Elegant aerial silk performance perfect for high-end corporate events.',
        technical_specs: 'Minimum 6m ceiling height, structural rigging point required.',
    },
    {
        id: '3',
        name: 'Laser Violinist',
        category: 'Musician', // Reclassified
        price_guide: '$2,000 - $4,000',
        image_url: 'https://images.unsplash.com/photo-1514525253440-b393452e8d03?q=80&w=1000&auto=format&fit=crop',
        video_url: 'https://assets.mixkit.co/videos/preview/mixkit-live-concert-with-lights-and-laser-beams-2826-large.mp4',
        description: 'Electric violin performance with synchronized laser show.',
        technical_specs: 'Sound system connection (XLR), haze machine permitted venue.',
    },
    {
        id: '4',
        name: 'Futuristic Fire Spinners',
        category: 'Fire & Flow', // Reclassified
        price_guide: '$1,200 - $2,500',
        image_url: 'https://images.unsplash.com/photo-1504705759706-c5ee7158f8bb?q=80&w=1000&auto=format&fit=crop',
        video_url: 'https://assets.mixkit.co/videos/preview/mixkit-fire-dancer-making-circles-with-fire-2849-large.mp4',
        description: 'Advanced fire manipulation with futuristic costumes and pyrotechnics.',
        technical_specs: 'Outdoor or high-ceiling indoor venue with fire permit.',
    },

    // Roaming Characters (IDs 100-124)
    { "id": "100", "title": "TV Heads", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_tv_head_premium.png", "video_url": "", "description": "A sentient fusion of analog tech and high-energy dance. Features functional monitor helmets with custom branding screens.", "specs": "Standard roaming requirements." },
    { "id": "101", "title": "LED Champagne Skirts", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_led_champagne_hero_final.png", "video_url": "", "description": "Elegant hostesses in illuminated skirts serving champagne.", "specs": "Standard roaming requirements." },
    { "id": "102", "title": "Teddy Monster", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_teddy_monster_hero_final.jpg", "video_url": "", "description": "A chaotic, tactile explosion of hundreds of real plush toys. Designed for maximum guest engagement and high-energy movement.", "specs": "Standard roaming requirements." },
    { "id": "103", "title": "Cosmic Girls", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_cosmic_girls_premium_v2.png", "video_url": "", "description": "High-fashion extraterrestrial aesthetics featuring iridescent sequin bodysuits and holographic helmets.", "specs": "Standard roaming requirements." },
    { "id": "104", "title": "Boombox Heads", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_boombox_heads_premium_retry.png", "video_url": "", "description": "Walking sound systems with integrated speakers and urban dance choreography.", "specs": "Standard roaming requirements." },
    { "id": "105", "title": "The Faces", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_the_faces_hero_v2.png", "video_url": "", "description": "Interactive digital characters featuring high-resolution screen faces for personalized messaging.", "specs": "Standard roaming requirements." },
    { "id": "106", "title": "LED Skaters", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_led_skaters_premium.png", "video_url": "", "description": "High-speed light performers on illuminated skates, creating light-trails through the venue.", "specs": "Standard roaming requirements." },
    { "id": "107", "title": "AI Humanoids", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_ai_humanoids_premium.png", "video_url": "", "description": "Hyper-realistic robotic performers with precision mechanical movement and metallic detailing.", "specs": "Standard roaming requirements." },
    { "id": "108", "title": "Pom Pom Monsters", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_pompom_monsters_uploaded.jpg", "video_url": "", "description": "Vibrant, tactile explosions of color and texture designed for festive engagement.", "specs": "Standard roaming requirements." },
    { "id": "109", "title": "Inflatable Characters", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_inflatables_premium.png", "video_url": "", "description": "Bespoke architectural inflatable costumes that change shape and size in real-time.", "specs": "Standard roaming requirements." },
    { "id": "110", "title": "The Slinky Man", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_slinky_man_premium.png", "video_url": "", "description": "A surreal, gravity-defying creature that stretches and coils through the environment.", "specs": "Standard roaming requirements." },
    { "id": "111", "title": "Golden Mirror Dancers", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_golden_mirror_premium.png", "video_url": "", "description": "The gold-standard in luxury roaming, featuring hand-cut 24k-effect mirror facets.", "specs": "Standard roaming requirements." },
    { "id": "112", "title": "Disco Ball Heads", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_disco_heads_premium.png", "video_url": "", "description": "Walking disco balls that turn any room into a 360-degree light show.", "specs": "Standard roaming requirements." },
    { "id": "113", "title": "Breaking Monkeys", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_breaking_monkeys_1.jpg", "video_url": "", "description": "High-energy breakdancing monkeys bringing an urban jungle vibe to the party.", "specs": "Standard roaming requirements." },
    { "id": "114", "title": "Mirror Family", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_mirror_family_fix_final.jpg", "video_url": "", "description": "The original interdimensional reflective group, creating silent, mesmerizing performance art.", "specs": "Standard roaming requirements." },
    { "id": "115", "title": "Mirror Animals", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_mirror_family_premium.png", "video_url": "", "description": "Geometric mirror variations featuring animal masks including Unicorns.", "specs": "Standard roaming requirements." },
    { "id": "116", "title": "Colorful Pompoms Woman", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_pompom_monsters_uploaded.jpg", "video_url": "", "description": "A stylized, feminine version of the fringe monsters.", "specs": "Standard roaming requirements." },
    { "id": "117", "title": "Inflatable Gorilla", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_gorilla_1.jpg", "video_url": "", "description": "Giant inflatable characters for maximum attention.", "specs": "Standard roaming requirements." },
    { "id": "118", "title": "The Shamans", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_shamans_1.jpg", "video_url": "", "description": "Mystical and tribal aesthetic with hypnotic performances.", "specs": "Standard roaming requirements." },
    { "id": "119", "title": "Hedge Men", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_hedge_men.png", "video_url": "", "description": "Living topiary that surprisingly comes to life, perfect for garden parties and grand entrances.", "specs": "Standard roaming requirements." },
    { "id": "120", "title": "Football Head", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_disco_heads_premium.png", "video_url": "", "description": "The perfect ball-head character for sporting events.", "specs": "Standard roaming requirements." },
    { "id": "121", "title": "Smiley Heads", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_disco_heads_premium.png", "video_url": "", "description": "Giant emoji heads paired with elegant black suits.", "specs": "Standard roaming requirements." },
    { "id": "122", "title": "Breakdance Crew", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/act_breakdance_premium_v2.png", "video_url": "", "description": "Human dancers with a retro Adidas (Old School) aesthetic.", "specs": "Standard roaming requirements." },
    { "id": "123", "title": "Roller Skaters", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_led_skaters_premium.png", "video_url": "", "description": "Themed skaters including LED/Neon, Teddy Skaters, and Barbie Orange Camo.", "specs": "Standard roaming requirements." },
    { "id": "124", "title": "LED Dancers", "category": "Roaming", "price_range": "$1,500 - $3,000", "image_url": "https://euphonious-kelpie-cd0a27.netlify.app/images/char_led_skaters_premium.png", "video_url": "", "description": "Choreographed light-up suits designed for dark environments.", "specs": "Standard roaming requirements." },

    // Musicians (200-202) - Renamed category
    { "id": "200", "title": "Neon Violinist", "category": "Musician", "price_range": "$2,000 - $4,000", "image_url": "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?q=80&w=1000", "video_url": "", "description": "Classically trained violinist performing contemporary hits in a custom light-up gown.", "specs": "Standard audio output." },
    { "id": "201", "title": "Cyber Sax", "category": "Musician", "price_range": "$2,000 - $3,500", "image_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000", "video_url": "", "description": "High-energy saxophone performances with LED instrument handling.", "specs": "Wireless mic system." },
    { "id": "202", "title": "Electric Cellist", "category": "Musician", "price_range": "$2,500 - $4,500", "image_url": "https://images.unsplash.com/photo-1514117445516-2ecfc9c4ec90?q=80&w=1000", "video_url": "", "description": "Dramatic electric cello performances with a futuristic edge.", "specs": "Standard audio output." },

    // Dancers (203-205) - Renamed category
    { "id": "203", "title": "Holographic Dancers", "category": "Dancer", "price_range": "$3,000 - $5,000", "image_url": "https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?q=80&w=1000", "video_url": "", "description": "Dancers interacting with projection mapping for a surreal visual experience.", "specs": "Projector and dark environment." },
    { "id": "204", "title": "Cyberpunk Ballet", "category": "Dancer", "price_range": "$2,500 - $4,000", "image_url": "https://images.unsplash.com/photo-1541808462-8404eb58197e?q=80&w=1000", "video_url": "", "description": "Classical ballet technique meets futuristic fashion and electronic beats.", "specs": "Marley floor required." },
    { "id": "205", "title": "Urban Glitch Crew", "category": "Dancer", "price_range": "$2,000 - $3,500", "image_url": "https://images.unsplash.com/photo-1535525153412-5a42439a210d?q=80&w=1000", "video_url": "", "description": "Street dance crew with glitch-art inspired costumes and makeup.", "specs": "Standard dance floor." },

    // Aerialists -> Circus (Reclassified)
    { "id": "206", "title": "Neon Silk Aerialist", "category": "Circus", "price_range": "$2,000 - $3,000", "image_url": "https://images.unsplash.com/photo-1595181755353-73130d243033?q=80&w=1000", "video_url": "", "description": "Aerial silk performance using UV-reactive fabrics and blacklight.", "specs": "Rigging point requires 500kg load rating." },
    { "id": "207", "title": "Laser Hoop Acrobat", "category": "Circus", "price_range": "$2,200 - $3,500", "image_url": "https://images.unsplash.com/photo-1496337537330-7cb57579da2b?q=80&w=1000", "video_url": "", "description": "Aerial hoop performance integrated with a laser light show.", "specs": "Rigging point requires 500kg load rating." },
    { "id": "208", "title": "Cyber Trapeze", "category": "Circus", "price_range": "$2,500 - $4,000", "image_url": "https://images.unsplash.com/photo-1527606307133-7b44766c1e5c?q=80&w=1000", "video_url": "", "description": "Static trapeze act with geometric, futuristic shapes.", "specs": "Rigging point requires 500kg load rating." },

    // Tech -> Specialty Act (Reclassified)
    { "id": "209", "title": "VR Art Performance", "category": "Specialty Act", "price_range": "$3,500 - $6,000", "image_url": "https://images.unsplash.com/photo-1617802690992-8278d57d5c3d?q=80&w=1000", "video_url": "", "description": "Live painting in Virtual Reality, projected on a large screen for guests.", "specs": "Large screen connectivity." },
    { "id": "210", "title": "Drone Light Show", "category": "Specialty Act", "price_range": "$10,000 - $25,000", "image_url": "https://images.unsplash.com/photo-1506863530036-1ef841663f35?q=80&w=1000", "video_url": "", "description": "Indoor coordinated drone swarm performance.", "specs": "High ceiling, no interference." },
    { "id": "211", "title": "Laser Man", "category": "Specialty Act", "price_range": "$1,500 - $3,000", "image_url": "https://images.unsplash.com/photo-1563297775-47029c29cc3a?q=80&w=1000", "video_url": "", "description": "Manipulation of laser beams with hands and body.", "specs": "Total darkness required." },

    // LED Shows -> Fire & Flow, Dancer, Musician (Reclassified)
    { "id": "212", "title": "Tron Dancers", "category": "Dancer", "price_range": "$2,500 - $4,500", "image_url": "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?q=80&w=1000", "video_url": "", "description": "Dance crew in full-body wire-frame LED suits.", "specs": "Dark environment." },
    { "id": "213", "title": "Pixel Poi Spinners", "category": "Fire & Flow", "price_range": "$1,500 - $2,500", "image_url": "https://images.unsplash.com/photo-1505307223071-7da3442654ef?q=80&w=1000", "video_url": "", "description": "Spinning poi that display logos and images in the air.", "specs": "Clearance space of 3x3m per spinner." },
    { "id": "214", "title": "LED Drummers", "category": "Musician", "price_range": "$3,000 - $5,000", "image_url": "https://images.unsplash.com/photo-1519808945620-8025255476d0?q=80&w=1000", "video_url": "", "description": "High-impact drumming with water and light effects.", "specs": "Waterproof stage covering." },

    // Magicians (215-217) - Renamed category
    { "id": "215", "title": "Digital Illusionist", "category": "Magician", "price_range": "$3,000 - $6,000", "image_url": "https://images.unsplash.com/photo-1590483736732-4752b04d168e?q=80&w=1000", "video_url": "", "description": "Magic performed with iPads and digital screens.", "specs": "Screen HDMI input." },
    { "id": "216", "title": "Cyber Mentalist", "category": "Magician", "price_range": "$2,500 - $5,000", "image_url": "https://images.unsplash.com/photo-1587588000490-67eb7a62df89?q=80&w=1000", "video_url": "", "description": "Mind reading act with a futuristic hacking theme.", "specs": "Wireless mic." },
    { "id": "217", "title": "Tech Magician", "category": "Magician", "price_range": "$2,000 - $4,000", "image_url": "https://images.unsplash.com/photo-1585675043868-b76543b59df5?q=80&w=1000", "video_url": "", "description": "Close-up magic involving phones and modern tech objects.", "specs": "Roaming or stage." },

    // Fire -> Fire & Flow
    { "id": "218", "title": "Future Fire Spinners", "category": "Fire & Flow", "price_range": "$1,800 - $3,000", "image_url": "https://images.unsplash.com/photo-1505236273191-1dce8aca7013?q=80&w=1000", "video_url": "", "description": "Fire performance with silver futuristic costumes.", "specs": "Outdoor or fire-permitted indoor." },
    { "id": "219", "title": "Pyro Grid", "category": "Fire & Flow", "price_range": "$2,500 - $4,500", "image_url": "https://images.unsplash.com/photo-1481141740623-28f0df681023?q=80&w=1000", "video_url": "", "description": "Synchronized fire show with pyrotechnic grid backdrop.", "specs": "Large outdoor clear area." },
    { "id": "220", "title": "Flame Thrower Guitars", "category": "Fire & Flow", "price_range": "$3,000 - $5,000", "image_url": "https://images.unsplash.com/photo-1603525545292-9a0082729792?q=80&w=1000", "video_url": "", "description": "Mad Max style guitarist shooting flames.", "specs": "Strict fire safety zone." },

    // DJs (221-223) - Renamed category
    { "id": "221", "title": "Hologram DJ", "category": "DJ", "price_range": "$3,000 - $6,000", "image_url": "https://images.unsplash.com/photo-1571266028243-3716f02d2d2e?q=80&w=1000", "video_url": "", "description": "DJ performing behind a transparent holographic screen.", "specs": "Special screen setup included." },
    { "id": "222", "title": "Masked DJ", "category": "DJ", "price_range": "$2,000 - $4,000", "image_url": "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?q=80&w=1000", "video_url": "", "description": "Anonymous DJ with a custom LED helmet.", "specs": "DJ gear (CDJs, Mixer)." },
    { "id": "223", "title": "Retro Wave DJ", "category": "DJ", "price_range": "$1,500 - $3,000", "image_url": "https://images.unsplash.com/photo-1574163393740-49666c88686d?q=80&w=1000", "video_url": "", "description": "Specialist in Synthwave and 80s futuristic beats.", "specs": "DJ gear." },

    // Comedians (224-226) - Renamed category
    { "id": "224", "title": "AI Comedy Host", "category": "Comedian", "price_range": "$1,500 - $3,000", "image_url": "https://images.unsplash.com/photo-1557930873-4530fc945d81?q=80&w=1000", "video_url": "", "description": "Comedian interacting with an 'AI' sidekick on screen.", "specs": "Mic and Screen." },
    { "id": "225", "title": "Tech Satirist", "category": "Comedian", "price_range": "$2,000 - $4,000", "image_url": "https://images.unsplash.com/photo-1615569436329-87c10b2f5431?q=80&w=1000", "video_url": "", "description": "Stand-up comedy focused on technology and future trends.", "specs": "Mic." },
    { "id": "226", "title": "Improv Glitch", "category": "Comedian", "price_range": "$1,800 - $3,500", "image_url": "https://images.unsplash.com/photo-1522036725225-72534e3518a0?q=80&w=1000", "video_url": "", "description": "Improv group using audience phone suggestions.", "specs": "Mics and Wifi." },

    // Specialty Acts (227-229) - Renamed category
    { "id": "227", "title": "Mirror Ball Man", "category": "Specialty Act", "price_range": "$1,500 - $2,500", "image_url": "https://images.unsplash.com/photo-1621570163539-715bd0526e03?q=80&w=1000", "video_url": "", "description": "Living statue covered in mirror tiles.", "specs": "Roaming." },
    { "id": "228", "title": "Laser Harp", "category": "Specialty Act", "price_range": "$2,500 - $4,000", "image_url": "https://images.unsplash.com/photo-1563297775-47029c29cc3a?q=80&w=1000", "video_url": "", "description": "Musician playing beams of light.", "specs": "Haze machine required." },
    { "id": "229", "title": "Robot Bartender", "category": "Specialty Act", "price_range": "$5,000 - $10,000", "image_url": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1000", "video_url": "", "description": "Animatronic robot serving drinks.", "specs": "Power and bar setup." },

    // Circus (230-232) - Renamed category
    { "id": "230", "title": "Cyber Clowns", "category": "Circus", "price_range": "$1,500 - $2,500", "image_url": "https://images.unsplash.com/photo-1596765275822-4467c6999818?q=80&w=1000", "video_url": "", "description": "Traditional clowning with a neon punk twist.", "specs": "Roaming or stage." },
    { "id": "231", "title": "Futuristic Jugglers", "category": "Circus", "price_range": "$1,500 - $2,500", "image_url": "https://images.unsplash.com/photo-1517457210348-703079e57d4b?q=80&w=1000", "video_url": "", "description": "Juggling with LED programmable clubs.", "specs": "High ceiling." },
    { "id": "232", "title": "Neon Contortionist", "category": "Circus", "price_range": "$1,800 - $3,000", "image_url": "https://images.unsplash.com/photo-1533470192328-118833075b9f?q=80&w=1000", "video_url": "", "description": "Flexible acrobatics in a UV-reactive bodysuit.", "specs": "Small platform." },

    // Photography (233-235) - Renamed category
    { "id": "233", "title": "Event Photographer", "category": "Photography", "price_range": "$1,000 - $2,000", "image_url": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1000", "video_url": "", "description": "Professional event coverage.", "specs": "N/A" },
    { "id": "234", "title": "Drone Videography", "category": "Photography", "price_range": "$1,500 - $3,000", "image_url": "https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=1000", "video_url": "", "description": "Aerial video coverage of your event.", "specs": "Flight permit." },
    { "id": "235", "title": "360 Booth", "category": "Photography", "price_range": "$1,500 - $2,500", "image_url": "https://images.unsplash.com/photo-1622675363311-ac22f5a903c9?q=80&w=1000", "video_url": "", "description": "Slow motion 360 video booth for guests.", "specs": "3x3m space." },

    // Presenter (236-238) - NEW CATEGORY
    { "id": "236", "title": "Gala Host", "category": "Presenter", "price_range": "$2,000 - $4,000", "image_url": "https://images.unsplash.com/photo-1557930873-4530fc945d81?q=80&w=1000", "video_url": "", "description": "Professional MC for award ceremonies and galas.", "specs": "Mic." },
    { "id": "237", "title": "Tech Moderator", "category": "Presenter", "price_range": "$2,500 - $5,000", "image_url": "https://images.unsplash.com/photo-1544168190-79c17527004f?q=80&w=1000", "video_url": "", "description": "Experienced moderator for tech panels and conferences.", "specs": "Mic and monitors." },
    { "id": "238", "title": "Hype Man", "category": "Presenter", "price_range": "$1,500 - $3,000", "image_url": "https://images.unsplash.com/photo-1525268323814-e87563884816?q=80&w=1000", "video_url": "", "description": "High-energy crowd motivator for parties and concerts.", "specs": "Wireless mic." }
];

export const FEATURED_ACTS = [
    ACTS.find(a => a.id === '100'), // TV Heads
    ACTS.find(a => a.id === '200'), // Neon Violinist
    ACTS.find(a => a.id === '218'), // Fire
    ACTS.find(a => a.id === '209'), // VR Art
    ACTS.find(a => a.id === '221'), // Hologram DJ
];