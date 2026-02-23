export const COLORS = {
  background: '#050505', // Deep Black
  primary: '#F97316',    // Primary Orange (shadcn/tailwind style)
  orange: '#F97316',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    500: '#6B7280',
  },
  secondary: '#333333',  // Dark Gray
  white: '#FFFFFF',
  black: '#000000',
  text: '#FFFFFF',       // White
  textDim: '#888888',
  surface: '#121212',    // Slightly lighter black for cards
  error: '#FF453A',
  success: '#32D74B',
};

export const FONTS = {
  regular: 'Inter-Regular',
  bold: 'Inter-Bold',
  light: 'Inter-Light',
};

export const SPACING = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

export const SHADOWS = {
  light: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  neon: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
};
