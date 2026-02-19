import { COLORS, SPACING } from '@/src/constants/theme';
import { useActs } from '@/src/hooks/useActs';
import { ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Cloud,
  Disc,
  Flame,
  Ghost,
  Mic,
  Monitor,
  Music,
  Search,
  Sparkles,
  Star,
  Users,
  Wand,
  Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const TOP_CATEGORIES = [
  { id: 'musician', name: 'Musician', icon: Music },
  { id: 'dj', name: 'DJ', icon: Disc },
  { id: 'magic', name: 'Magic', icon: Wand },
  { id: 'dancer', name: 'Dancer', icon: Users },
  { id: 'circus', name: 'Circus', icon: Ghost },
  { id: 'specialty_act', name: 'Specialty Act', icon: Star },
  { id: 'fire_flow', name: 'Fire & Flow', icon: Flame },
  { id: 'presenter', name: 'Presenter', icon: Mic },
  { id: 'comedian', name: 'Comedian', icon: Mic },
];

const BOTTOM_CATEGORIES = [
  'Musician', 'DJ', 'Magic', 'Dancer', 'Circus', 'Specialty Act', 'Fire & Flow', 'Presenter', 'Comedian'
];

const CATEGORY_ICONS = {
  'Musician': Music,
  'DJ': Disc,
  'Magic': Wand,
  'Dancer': Users,
  'Circus': Ghost,
  'Specialty Act': Star,
  'Fire & Flow': Flame,
  'Presenter': Mic,
  'Comedian': Mic,
  'Roaming': Users,

  // Legacy mappings for safety
  'Musicians': Music,
  'Dancers': Users,
  'Aerialists': Cloud,
  'Tech': Monitor,
  'LED Shows': Zap,
  'Magicians': Wand,
  'Fire': Flame,
  'DJs': Disc,
  'Comedians': Mic,
  'Specialty Acts': Star,
};

export default function DiscoverScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { acts, loading, refetch } = useActs();

  // --- REAL-TIME SEARCH & FILTER LOGIC ---
  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      refetch({ query: searchQuery, category: activeCategory || undefined });
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeCategory]);

  // Filter acts for "Featured" - picking a diverse sample from different categories
  const featuredActs = React.useMemo(() => {
    if (!acts) return [];
    const categoriesMap = new Map();
    acts.forEach(act => {
      if (!categoriesMap.has(act.category)) {
        categoriesMap.set(act.category, act);
      }
    });
    return Array.from(categoriesMap.values()).slice(0, 8);
  }, [acts]);

  // Hero act (e.g., the first one with a video)
  const heroAct = acts?.find(a => a.video_url) || acts?.[0];
  const heroTitle = heroAct?.name || 'Cyberpunk Shows';

  if (loading && !acts.length) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.fixedHeader}>
      <View style={styles.headerTopRow}>
        <Text style={styles.locationText}>Showing artist in <Text style={styles.locationHighlight}>Ibiza</Text></Text>
      </View>

      <View style={styles.searchContainer}>
        <Search color={COLORS.textDim} size={20} style={styles.searchIcon} />
        <TextInput
          placeholder="What kind of artist are you looking for?"
          placeholderTextColor={COLORS.textDim}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
      </View>

      <Pressable style={styles.aiButton}>
        <Sparkles size={16} color={COLORS.primary} style={{ marginRight: 8 }} />
        <Text style={styles.aiButtonText}>Search with AI</Text>
      </Pressable>

      <View style={styles.divider} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topNavScroll} contentContainerStyle={{ paddingRight: SPACING.m }}>
        {TOP_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[styles.topNavItem, activeCategory === cat.name && styles.activeTopNavItem]}
            onPress={() => router.push(`/(tabs)/search?category=${encodeURIComponent(cat.name)}`)}
          >
            <cat.icon size={24} color={activeCategory === cat.name ? COLORS.primary : COLORS.textDim} strokeWidth={1.5} />
            <Text style={[styles.topNavText, activeCategory === cat.name && styles.activeTopNavText]}>{cat.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  const renderHero = () => (
    <View style={styles.section}>
      <Pressable onPress={() => heroAct && router.push(`/act/${heroAct.id}`)}>
        <View style={styles.heroCard}>
          {heroAct?.video_url ? (
            <Video
              source={{ uri: heroAct.video_url }}
              style={StyleSheet.absoluteFill}
              resizeMode={ResizeMode.COVER}
              isLooping
              shouldPlay
              isMuted={true}
            />
          ) : heroAct?.image_url ? (
            <Image source={{ uri: heroAct.image_url }} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: '#111' }]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroSubtitle}>Showstoppers your event needs</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );

  const renderFeatured = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {searchQuery || activeCategory ? 'Search Results' : 'Featured Artists'}
        </Text>
      </View>

      {!acts.length && !loading ? (
        <View style={styles.emptyContainer}>
          <Ghost size={48} color={COLORS.textDim} />
          <Text style={styles.emptyText}>No artists available in this category</Text>
          <Pressable onPress={() => { setSearchQuery(''); setActiveCategory(null); }}>
            <Text style={styles.clearText}>Clear filters</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          horizontal
          data={acts}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.m }}
          renderItem={({ item }) => (
            <Pressable style={styles.featuredCard} onPress={() => router.push(`/act/${item.id}`)}>
              <Image source={{ uri: item.image_url }} style={styles.featuredImage} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
                style={styles.featuredGradient}
              />
              <View style={styles.featuredContent}>
                <View style={styles.featuredTopRow}>
                  <View style={styles.ratingBadge}>
                    <Sparkles size={10} color={COLORS.background} />
                    <Text style={styles.ratingText}>5.0</Text>
                  </View>
                </View>
                <Text style={styles.featuredTitle} numberOfLines={1}>{(item as any).name || (item as any).title}</Text>
                <Text style={styles.featuredCategory}>{item.category}</Text>
                <Text style={styles.featuredLocation}>{(item as any).location || 'Dubai, UAE'}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );

  const renderCategories = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { marginHorizontal: SPACING.m, marginBottom: SPACING.m }]}>Browse by Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.m }}>
        {BOTTOM_CATEGORIES.map((cat, index) => {
          const IconComponent = (CATEGORY_ICONS as any)[cat] || Sparkles;
          return (
            <Pressable
              key={index}
              style={[styles.categoryCard, activeCategory === cat && styles.activeCategoryCard]}
              onPress={() => router.push(`/(tabs)/search?category=${encodeURIComponent(cat)}`)}
            >
              <View style={[styles.categoryIconContainer, activeCategory === cat && styles.activeCategoryIconContainer]}>
                <IconComponent size={24} color={activeCategory === cat ? COLORS.background : COLORS.primary} />
              </View>
              <Text style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );



  const renderRoaming = () => {
    const roamingActs = acts.filter(act => act.category === 'Roaming');
    if (roamingActs.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Roaming Artists</Text>
          <Pressable onPress={() => router.push('/(tabs)/search?category=Roaming')}>
            <Text style={styles.seeAll}>See All</Text>
          </Pressable>
        </View>
        <FlatList
          horizontal
          data={roamingActs}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.m }}
          renderItem={({ item }) => (
            <Pressable style={styles.featuredCard} onPress={() => router.push(`/act/${item.id}`)}>
              <Image source={{ uri: item.image_url }} style={styles.featuredImage} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
                style={styles.featuredGradient}
              />
              <View style={styles.featuredContent}>
                <Text style={styles.featuredTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.featuredCategory}>{item.category}</Text>
                <Text style={styles.featuredLocation}>International</Text>
              </View>
            </Pressable>
          )}
        />
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: SPACING.s }}
      >
        {renderHero()}
        {renderFeatured()}
        {renderRoaming()}
        {renderCategories()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  fixedHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.s,
    paddingBottom: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    zIndex: 100,
  },
  headerTopRow: {
    marginBottom: SPACING.s,
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: SPACING.m,
  },
  locationText: {
    color: COLORS.textDim,
    fontSize: 14,
    marginBottom: SPACING.s,
  },
  locationHighlight: {
    color: COLORS.primary, // Originally Orange, now Neon Lime or similar
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    paddingHorizontal: SPACING.s,
    paddingVertical: 10,
    marginBottom: SPACING.m,
  },
  searchIcon: {
    marginRight: SPACING.s,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(204, 255, 0, 0.1)', // Low opacity neon lime
    paddingVertical: 10,
    paddingHorizontal: SPACING.m,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: SPACING.l,
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.3)',
  },
  aiButtonText: {
    color: COLORS.primary, // Neon Lime
    fontWeight: '600',
    fontSize: 14,
  },
  topNavScroll: {
    marginBottom: SPACING.s,
  },
  topNavItem: {
    alignItems: 'center',
    marginRight: SPACING.l,
  },
  topNavText: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  heroCard: {
    height: 220,
    marginHorizontal: SPACING.m,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#333',
  },
  heroContent: {
    position: 'absolute',
    bottom: SPACING.m,
    left: SPACING.m,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: COLORS.textDim,
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    marginBottom: SPACING.m,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAll: {
    color: COLORS.primary, // Neon or Orange
    fontSize: 14,
  },
  featuredCard: {
    width: 200, // Wider for more content
    height: 250,
    marginRight: SPACING.m,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  featuredContent: {
    position: 'absolute',
    bottom: SPACING.m,
    left: SPACING.m,
    right: SPACING.m,
  },
  featuredTopRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 2,
  },
  featuredTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  featuredCategory: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  featuredLocation: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: SPACING.l,
    width: 80,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.3)',
  },
  categoryText: {
    color: COLORS.textDim,
    fontSize: 12,
    textAlign: 'center',
  },
  activeTopNavItem: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 4,
  },
  activeTopNavText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: '#111',
    marginHorizontal: SPACING.m,
    borderRadius: 16,
    gap: 12,
    height: 200,
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textDim,
    fontSize: 16,
    textAlign: 'center',
  },
  clearText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 10,
  },
  activeCategoryCard: {
    opacity: 1,
  },
  activeCategoryIconContainer: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  activeCategoryText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});
