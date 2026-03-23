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

export const ACTS = [];

export const FEATURED_ACTS = [
    ACTS.find(a => a.id === '100'), // TV Heads
    ACTS.find(a => a.id === '200'), // Neon Violinist
    ACTS.find(a => a.id === '218'), // Fire
    ACTS.find(a => a.id === '209'), // VR Art
    ACTS.find(a => a.id === '221'), // Hologram DJ
];