import { COLORS } from '@/src/constants/theme';
import { useActs } from '@/src/hooks/useActs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const CATEGORIES = ['All', 'Musician', 'DJ', 'Magic', 'Dancer', 'Circus', 'Specialty Act', 'Fire & Flow', 'Presenter', 'Comedian'];

import { Act } from '@/src/hooks/useActs';

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { acts, loading } = useActs();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    if (params.query) {
      setSearchQuery(params.query as string);
    }
    if (params.category) {
      const paramCat = params.category as string;
      // Precise selection for official categories
      const cat = CATEGORIES.find(c => c === paramCat);
      if (cat) setSelectedCategory(cat);
    }
  }, [params.category, params.query]);

  const filteredActs = (acts as Act[]).filter(act => {
    const matchesSearch = (act.name || act.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' ||
      act.category === selectedCategory ||
      (act.category && act.category.includes(selectedCategory));
    return matchesSearch && matchesCategory;
  });

  const renderItem = ({ item }: { item: Act }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/act/${item.id}`)}
    >
      <Image source={{ uri: item.image_url || 'https://via.placeholder.com/150' }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardCategory}>{item.category}</Text>
        <Text style={styles.cardTitle}>{item.name || item.title}</Text>
        <Text style={styles.cardPrice}>{item.price_guide || item.price_range || 'Contact for price'}</Text>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search color={COLORS.textDim} size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search artists..."
          placeholderTextColor={COLORS.textDim}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.categoryContainer}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.categoryChip, selectedCategory === item && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text style={[styles.categoryText, selectedCategory === item && styles.categoryTextActive]}>
                {item}
              </Text>
            </Pressable>
          )}
          keyExtractor={item => item}
        />
      </View>

      <FlatList
        data={filteredActs}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={{ gap: 15 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
  },
  categoryContainer: {
    marginBottom: 20,
    height: 40,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: 'transparent',
    borderColor: COLORS.primary,
  },
  categoryText: {
    color: COLORS.textDim,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardContent: {
    padding: 12,
  },
  cardCategory: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardPrice: {
    color: COLORS.textDim,
    fontSize: 12,
  },
});
