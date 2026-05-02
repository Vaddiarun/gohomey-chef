export const Colors = {
  background: '#121212',
  surface: '#1E1E1E',
  card: '#1A2E1A',
  primary: '#4ADE80',       // neon green
  primaryDark: '#22C55E',
  cyan: '#22D3EE',
  warning: '#FACC15',       // yellow for COOKING
  danger: '#EF4444',        // red for Logout
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#2D2D2D',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Typography = {
  h1: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  h2: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: '#FFFFFF',
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  body: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  caption: {
    fontSize: 12,
    color: '#9CA3AF',
  },
};
