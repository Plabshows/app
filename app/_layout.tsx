import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';


export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

import { useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';


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
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] as string === 'login' || segments[0] as string === 'signup';

    console.log('[Auth Guard]', {
      segments,
      inAuthGroup,
      user: user?.id,
      loading
    });

    // Only redirect if user is logged in but tries to access login/signup pages
    if (!loading && user && inAuthGroup) {
      console.log('Middleware: Usuario detectado:', user.email);
      console.log('Middleware: ¿Tiene sesión?: Sí');
      console.log('Middleware: is_admin:', profile?.is_admin);

      // TEMPORAL: Allow any logged in user to pass if they are an admin or we are testing
      if (profile?.is_admin || user.email === 'hizesupremos@gmail.com') {
        console.log('[Auth Guard] Redirecting admin to /admin');
        router.replace('/admin' as any);
      } else if (profile?.role === 'artist') {
        console.log('[Auth Guard] Redirecting artist to /artist-dashboard');
        router.replace('/artist-dashboard' as any);
      } else {
        console.log('[Auth Guard] Redirecting authenticated user to /(tabs)/profile');
        router.replace('/(tabs)/profile');
      }
    } else if (!loading && !user && segments[0] === 'admin') {
      console.log('Middleware: Intento de acceso a /admin SIN SESIÓN');
      router.replace('/login');
    }
  }, [user, loading, segments]);

  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="artist-onboarding/index" options={{ headerShown: false, title: 'Join as Artist' }} />
        <Stack.Screen name="artist-dashboard" options={{ headerShown: false }} />
        <Stack.Screen name="act/[id]" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
