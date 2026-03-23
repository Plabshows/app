import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import ImpersonationBanner from '../src/components/Admin/ImpersonationBanner';
import PersistentBottomNav from '../src/components/PersistentBottomNav';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // We can add custom fonts here later if needed
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

function RootLayoutNav() {
  const { user, profile, realUser, realProfile, loading, isImpersonating } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Use REAL user/profile for security/redirect logic to avoid impersonation loops
    const effectiveUser = realUser || user;
    const effectiveProfile = realProfile || profile;

    const inAuthGroup = segments[0] as string === 'login' || segments[0] as string === 'signup';
    const inTabsGroup = segments[0] as string === '(tabs)';

    console.log('[Auth Guard]', {
      segments,
      inAuthGroup,
      user: effectiveUser?.id,
      isImpersonating,
      loading
    });

    // If impersonating, we generally want to stay where we are (e.g., in the artist dashboard)
    if (isImpersonating) return;

    if (!loading && effectiveUser) {
      const isAdmin = effectiveProfile?.is_admin || effectiveUser.email === 'hizesupremos@gmail.com';
      const isArtist = effectiveProfile?.role === 'artist';
      const isClient = effectiveProfile?.role === 'client';

      // Redirect from auth pages to the correct destination
      if (inAuthGroup) {
        if (isAdmin) {
          router.replace('/admin' as any);
        } else {
          // Both artists and clients go to /profile — it renders per role
          router.replace('/(tabs)/profile' as any);
        }
      }

      // Artists redirect from auth pages to their dashboard
      // Clients can freely browse /(tabs) to discover artists
    } else if (!loading && !effectiveUser && segments[0] === 'admin') {
      console.log('Middleware: Intento de acceso a /admin SIN SESIÓN');
      router.replace('/login');
    }
  }, [user, realUser, loading, segments, isImpersonating]);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <ImpersonationBanner />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="artist-onboarding/index" options={{ headerShown: false, title: 'Join as Artist' }} />
        <Stack.Screen name="artist-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="client-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="act/[id]" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      <PersistentBottomNav />
      <Toast />
    </ThemeProvider>
  );
}
