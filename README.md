# Performance Lab Clone (Mobile)

A high-end, futuristic mobile application for "Performance Lab" built with React Native (Expo) and Supabase.

## Features
- **Dark Mode Aesthetic**: Deep black backgrounds with neon lime accents (`#CCFF00`).
- **Discover Feed**: TikTok-style vertical video feed for browsing acts.
- **Marketplace Search**: Filter acts by category (Musicians, Aerialists, etc.).
- **Supabase Integration**: Ready to fetch data from Supabase, with automatic fallback to mock data.
- **Instant Quote**: Modal form for booking inquiries.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run the App**:
   ```bash
   npx expo start
   ```
   - Press `a` for Android Emulator.
   - Press `i` for iOS Simulator.
   - Scan QR code with Expo Go app on physical device.

## Supabase Setup (Optional)

The app currently runs with **Mock Data** by default. To connect your real database:

1. **Create Project**: Go to [Supabase](https://supabase.com) and create a new project.
2. **Run Schema**: Copy the contents of `supabase/schema.sql` and run it in the Supabase SQL Editor.
3. **Get Credentials**: Go to Project Settings -> API.
4. **Configure Environment**:
   - Rename `.env.example` to `.env`.
   - specific your `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

**Note**: The app detects if keys are missing or invalid and automatically falls back to the internal mock data so you can test the UI immediately.

## Project Structure
- `app/`: Expo Router screens (`(tabs)`, `act/[id]`, etc.).
- `src/components/`: Reusable UI components.
- `src/constants/`: Theme tokens (`theme.js`).
- `src/data/`: Mock data (`mock.js`).
- `src/hooks/`: Custom hooks (`useActs.js`).
- `src/lib/`: Supabase client (`supabase.js`).
