
import { useRouter } from 'expo-router';
import { CheckCircle, ChevronRight, Search, Shield, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../src/constants/theme';
import { supabase } from '../../../src/lib/supabase';

type UserProfile = {
    id: string;
    name: string;
    email: string;
    role: string;
    city: string;
    is_published: boolean;
    avatar_url: string;
    created_at: string;
};

export default function AdminUsersList() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'artist' | 'client' | 'admin'>('all');

    useEffect(() => {
        fetchUsers();
    }, [filter]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('role', filter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setUsers(data || []);
        } catch (e) {
            console.error('Error fetching users:', e);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );

    const renderUserItem = ({ item }: { item: UserProfile }) => (
        <Pressable
            style={styles.userCard}
            onPress={() => router.push(`/admin/users/${item.id}`)}
        >
            <View style={styles.avatarContainer}>
                {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <User size={20} color={COLORS.textDim} />
                    </View>
                )}
                {item.role === 'admin' && (
                    <View style={styles.adminBadge}>
                        <Shield size={10} color="#000" />
                    </View>
                )}
            </View>

            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name || 'No Name'}</Text>
                <Text style={styles.userEmail}>{item.email || 'No Email'}</Text>
                <View style={styles.row}>
                    <Text style={[styles.roleLabel, { color: item.role === 'artist' ? COLORS.primary : COLORS.textDim }]}>
                        {item.role?.toUpperCase() || 'USER'}
                    </Text>
                    {item.is_published && (
                        <View style={styles.verifiedBadge}>
                            <CheckCircle size={10} color={COLORS.primary} />
                            <Text style={styles.verifiedText}>Published</Text>
                        </View>
                    )}
                </View>
            </View>

            <ChevronRight size={20} color={COLORS.textDim} />
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Manage Users</Text>
                <Text style={styles.subtitle}>{users.length} total members</Text>
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color={COLORS.textDim} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or email..."
                    placeholderTextColor={COLORS.textDim}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.filterBar}>
                {(['all', 'artist', 'client', 'admin'] as const).map((f) => (
                    <Pressable
                        key={f}
                        style={[styles.filterChip, filter === f && styles.activeFilterChip]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                            {f.toUpperCase()}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            ) : (
                <FlatList
                    data={filteredUsers}
                    renderItem={renderUserItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No users found.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { padding: SPACING.l, paddingTop: SPACING.m },
    title: { fontSize: 24, fontWeight: 'bold', color: COLORS.text },
    subtitle: { fontSize: 14, color: COLORS.textDim, marginTop: 4 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        marginHorizontal: SPACING.l,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: '#333'
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 48, color: COLORS.text, fontSize: 16 },
    filterBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.l,
        gap: 8,
        marginBottom: SPACING.m
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#333'
    },
    activeFilterChip: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary
    },
    filterText: { color: COLORS.textDim, fontSize: 10, fontWeight: 'bold' },
    activeFilterText: { color: COLORS.background },
    listContent: { paddingHorizontal: SPACING.l, paddingBottom: 40 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#141414',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222'
    },
    avatarContainer: { position: 'relative' },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#333' },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    adminBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: COLORS.primary,
        width: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#000'
    },
    userInfo: { flex: 1, marginLeft: 12 },
    userName: { color: COLORS.text, fontSize: 16, fontWeight: 'bold' },
    userEmail: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
    roleLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    verifiedText: { color: COLORS.primary, fontSize: 9, fontWeight: 'bold' },
    loader: { marginTop: 50 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: COLORS.textDim, fontSize: 16 }
});
