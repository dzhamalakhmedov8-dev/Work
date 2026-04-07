import fs from 'node:fs';
import path from 'node:path';
import type { ExpoConfig } from 'expo/config';
import dotenv from 'dotenv';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const config: ExpoConfig = {
  name: 'Nutrition Planner',
  slug: 'nutrition-planner',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'nutrition-planner',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#f5f0e4',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.nutritionplanner.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#f5f0e4',
    },
    package: 'com.nutritionplanner.app',
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL?.trim() || undefined,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || undefined,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined,
  },
};

export default config;
