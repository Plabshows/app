import { 
  Music, 
  Disc, 
  Mic, 
  Wand, 
  Users, 
  Ghost, 
  Flame, 
  Waves, 
  Palette, 
  Theater, 
  Sparkles, 
  Star,
  Footprints
} from 'lucide-react-native';

export const OFFICIAL_CATEGORIES = [
  { id: 'musicians', name: 'Musicians', slug: 'musicians', icon: Music },
  { id: 'dj', name: 'DJ', slug: 'dj', icon: Disc },
  { id: 'singer', name: 'Singer', slug: 'singer', icon: Mic },
  { id: 'magic', name: 'Magic', slug: 'magic', icon: Wand },
  { id: 'dancers', name: 'Dancers', slug: 'dancers', icon: Users },
  { id: 'roaming', name: 'Roaming', slug: 'roaming', icon: Footprints },
  { id: 'circus', name: 'Circus', slug: 'circus', icon: Ghost },
  { id: 'fire_flow', name: 'Fire & Flow', slug: 'fire-flow', icon: Flame },
  { id: 'water_acts', name: 'Water Acts', slug: 'water-acts', icon: Waves },
  { id: 'art', name: 'Art', slug: 'art', icon: Palette },
  { id: 'actors', name: 'Actors', slug: 'actors', icon: Theater },
  { id: 'drags', name: 'Drags', slug: 'drags', icon: Sparkles },
  { id: 'specialty_acts', name: 'Specialty Acts', slug: 'specialty-acts', icon: Star },
];

export const CATEGORY_NAMES = OFFICIAL_CATEGORIES.map(c => c.name);

export const CATEGORY_ICONS: Record<string, any> = OFFICIAL_CATEGORIES.reduce((acc, cat) => {
  acc[cat.name] = cat.icon;
  return acc;
}, {} as Record<string, any>);

// Helper for mapping legacy or singular names to the new official list
export const normalizeCategory = (name: string): string => {
  const mapping: Record<string, string> = {
    'Musician': 'Musicians',
    'Dancer': 'Dancers',
    'Specialty Act': 'Specialty Acts',
    'Magician': 'Magic',
    'Aerialist': 'Circus',
    'Fire': 'Fire & Flow',
    'Presenter': 'Specialty Acts', // Fallback for removed categories
    'Comedian': 'Specialty Acts',
    'Others': 'Specialty Acts'
  };
  return mapping[name] || name;
};
