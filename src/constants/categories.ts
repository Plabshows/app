import { 
  Music, 
  Users, 
  Wand, 
  Disc, 
  Ghost, 
  Star, 
  Flame, 
  Mic, 
  Cloud, 
  Palette, 
  MoreHorizontal,
  Monitor,
  Zap,
  Ticket
} from 'lucide-react-native';

export const APP_CATEGORIES = [
  { id: 'musician', name: 'Musician', icon: Music, db_id: '636d2dcd-3e1d-4b1e-b111-a6400ca1b025' },
  { id: 'dancer', name: 'Dancer', icon: Users, db_id: 'bf451e54-4edb-4453-8ff7-f74a3882e89c' },
  { id: 'magic', name: 'Magic', icon: Wand, db_id: 'f26b86db-2ef5-476b-bf53-3a09d4ecba17' },
  { id: 'roaming', name: 'Roaming', icon: Users, db_id: '42f050db-aa72-4a8f-97ba-8521b4c1ec03' },
  { id: 'fire_flow', name: 'Fire & Flow', icon: Flame, db_id: '95585a4e-1cc1-417e-a064-7f210b9c2996' },
  { id: 'circus', name: 'Circus', icon: Ghost, db_id: '6e2eba1a-54ee-4360-95b1-932089633089' },
  { id: 'dj', name: 'DJ', icon: Disc, db_id: 'bff4df18-b95f-4f7e-821b-ab303b030c9a' },
  { id: 'specialty_act', name: 'Specialty Act', icon: Star, db_id: '7dc05cb1-fa8a-4317-9c17-d2682831d73c' },
  { id: 'presenter', name: 'Presenter', icon: Mic, db_id: 'd2a26c3d-cae5-44be-b93d-69dff6d8413b' },
  { id: 'comedian', name: 'Comedian', icon: Mic, db_id: '0213d374-c4f2-48b7-bfe8-da15cfd79ed9' },
  { id: 'singer', name: 'Singer', icon: Mic, db_id: '0ca60f4f-2c8b-421c-9711-88f1e9327cb8' },
  { id: 'art', name: 'Art', icon: Palette, db_id: '8a662c88-7702-4ec7-bd70-671d707a0774' },
  { id: 'others', name: 'Others', icon: MoreHorizontal, db_id: '3f2c5fde-a1b9-4e10-a653-8f851a34b678' },
];

export const CATEGORY_MAP: Record<string, string> = APP_CATEGORIES.reduce((acc, cat) => {
  acc[cat.db_id] = cat.name;
  return acc;
}, {} as Record<string, string>);

export const CATEGORY_ICONS: Record<string, any> = APP_CATEGORIES.reduce((acc, cat) => {
  acc[cat.name] = cat.icon;
  return acc;
}, {} as Record<string, any>);

// Legacy mappings for backward compatibility
CATEGORY_ICONS['Musicians'] = Music;
CATEGORY_ICONS['Dancers'] = Users;
CATEGORY_ICONS['Aerialists'] = Cloud;
CATEGORY_ICONS['Tech'] = Monitor;
CATEGORY_ICONS['LED Shows'] = Zap;
CATEGORY_ICONS['Magicians'] = Wand;
CATEGORY_ICONS['Fire'] = Flame;
CATEGORY_ICONS['DJs'] = Disc;
CATEGORY_ICONS['Comedians'] = Mic;
CATEGORY_ICONS['Specialty Acts'] = Star;
