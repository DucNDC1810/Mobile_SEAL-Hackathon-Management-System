// Design tokens for SEAL Hackathon — dark mode premium theme
export const colors = {
  // Backgrounds
  bg: {
    primary: '#0A0F1E',
    secondary: '#111827',
    card: '#1A2235',
    elevated: '#1E2D45',
    modal: '#0D1526',
  },
  // Brand colors
  brand: {
    primary: '#4F8EF7',
    secondary: '#7C5CFC',
    accent: '#00D4AA',
    gradient: ['#4F8EF7', '#7C5CFC'],
    gradientHot: ['#FF6B6B', '#FF8E53'],
  },
  // Status colors
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  // Text
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    muted: '#64748B',
    inverse: '#0A0F1E',
  },
  // Borders
  border: {
    default: '#1E293B',
    focus: '#4F8EF7',
    strong: '#334155',
  },
  // Chat
  chat: {
    sent: '#4F8EF7',
    received: '#1E2D45',
    sentText: '#FFFFFF',
    receivedText: '#F1F5F9',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  h3: { fontSize: 18, fontWeight: '600', color: colors.text.primary },
  body: { fontSize: 15, fontWeight: '400', color: colors.text.primary },
  bodySmall: { fontSize: 13, fontWeight: '400', color: colors.text.secondary },
  caption: { fontSize: 11, fontWeight: '400', color: colors.text.muted },
  label: { fontSize: 12, fontWeight: '600', color: colors.text.secondary, letterSpacing: 0.8, textTransform: 'uppercase' },
};
