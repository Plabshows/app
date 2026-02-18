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
  { id: 'magician', name: 'Magic', icon: Wand },
  { id: 'fire_flow', name: 'Fire & Flow', icon: Flame },
  { id: 'dancer', name: 'Dancer', icon: Users },
  { id: 'circus', name: 'Circus', icon: Ghost },
  { id: 'specialty_act', name: 'Specialty Act', icon: Star },
  { id: 'comedian', name: 'Comedian', icon: Mic },
  { id: 'roaming', name: 'Roaming', icon: Users },
];

const BOTTOM_CATEGORIES = [
  'Musician', 'DJ', 'Magic', 'Dancer', 'Circus', 'Specialty Act', 'Fire & Flow', 'Presenter', 'Comedian', 'Roaming'
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
  const { acts, loading } = useActs();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter acts for "Featured" - picking a diverse sample from different categories
  const featuredActs = React.useMemo(() => {
    const categoriesMap = new Map();
    acts.forEach(act => {
      if (!categoriesMap.has(act.category)) {
        categoriesMap.set(act.category, act);
      }
    });
    // Return values of the map, limited to 6 or 8 for variety
    return Array.from(categoriesMap.values()).slice(0, 8);
  }, [acts]);

  // Hero act (e.g., the first one with a video)
  const heroAct = acts.find(a => a.video_url) || acts[0];
  const heroTitle = heroAct?.name || 'Cyberpunk Shows';

  if (loading) {
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
          onSubmitEditing={() => {
            if (searchQuery.trim()) {
              router.push(`/(tabs)/search?query=${encodeURIComponent(searchQuery)}`);
            }
          }}
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
            style={styles.topNavItem}
            onPress={() => router.push(`/(tabs)/search?category=${cat.name}`)}
          >
            <cat.icon size={24} color={COLORS.textDim} strokeWidth={1.5} />
            <Text style={styles.topNavText}>{cat.name}</Text>
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
          ) : (
            <Image source={{ uri: heroAct?.image_url }} style={StyleSheet.absoluteFill} />
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
        <Text style={styles.sectionTitle}>Featured Artists</Text>
        <Pressable onPress={() => router.push('/(tabs)/search')}>
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      </View>
      <FlatList
        horizontal
        data={featuredActs}
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
              <Text style={styles.featuredTitle} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.featuredCategory}>{item.category}</Text>
              <Text style={styles.featuredLocation}>Dubai, UAE</Text>
            </View>
          </Pressable>
        )}
      />
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
              style={styles.categoryCard}
              onPress={() => router.push(`/(tabs)/search?category=${cat}`)}
            >
              <View style={styles.categoryIconContainer}>
                <IconComponent size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.categoryText}>{cat}</Text>
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
});
