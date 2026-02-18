export const COLORS = {
  background: '#050505', // Deep Black
  primary: '#CCFF00',    // Neon Lime (Approximate)
  secondary: '#333333',  // Dark Gray
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
