// ─── New design system (Figma "Go-Homey" chef redesign) ──────────────────────

/** Colour tokens, named after their role in the Figma file. */
export const C = {
  primary: '#FC4100',          // Vermilion — buttons, active states
  primaryRing: '#FF5C05',      // Blaze Orange — upload links, progress
  amber: '#FBBC05',
  orangeMid: '#FB8122',
  softOrange: '#FFE5D8',       // selected chip
  uploadBg: '#F7E8E3',

  bg: '#F6F8FA',               // app background
  bgWarm: '#FFF9F8',
  surface: '#FFFFFF',

  text: '#17171A',             // Woodsmoke
  textStrong: '#171719',
  textInk: '#17171B',
  textMuted: '#6F7075',        // Storm Gray — labels / subtitles
  textMuted2: '#6B6B71',       // Mid Gray
  textMuted3: '#6B6B75',
  placeholder: '#6C7278',
  iconMuted: '#9A9A9F',        // Manatee
  inputText: '#1A1C1E',

  border: '#EDE4DF',           // Pearl Bush — field / card outlines
  borderInput: '#E6E6E9',      // Mischka
  borderAuth: '#EDF1F3',
  borderCard: '#E4E4E8',
  headerBorder: 'rgba(230,230,233,0.6)',
  backBtnBg: 'rgba(241,241,244,0.7)',
  searchBg: 'rgba(241,241,244,0.75)',
  searchBorder: 'rgba(230,230,233,0.7)',

  success: '#1E9E5A',
  successDeep: '#218B5B',      // Eucalyptus
  successBg: '#E8F6EE',
  successTint: 'rgba(33,139,91,0.1)',
  successHalo: 'rgba(30,158,90,0.12)',
  successHaloInner: 'rgba(30,158,90,0.18)',

  danger: '#D91E4B',           // Amaranth
  dangerBg: '#FDECF0',
  dangerHalo: 'rgba(217,30,75,0.12)',
  dangerHaloInner: 'rgba(217,30,75,0.18)',

  warning: '#CB7A00',          // Indochine
  warningTint: 'rgba(250,192,68,0.2)',

  otpActive: '#5A2FCB',
  otpActiveRing: '#F4F1FE',

  glass: 'rgba(255,255,255,0.5)',
  photoOverlay: 'rgba(0,0,0,0.2)',
  white: '#FFFFFF',
  black: '#000000',
};

/** Brand gradients (left → right). */
export const Gradients = {
  progress: ['#FF5C05', '#FBBC05', '#FB8122'] as const,
  progressSoft: ['#FC4100', '#FBBC05', '#FC4100'] as const,
  // Approximation of the radial "sunset" fill used on icon tiles.
  tile: ['#FBBC05', '#FB8122', '#FC6111', '#FC4100'] as const,
};

/** Font families — loaded in App.tsx via @expo-google-fonts. */
export const F = {
  interMedium: 'Inter_500Medium',
  interRegular: 'Inter_400Regular',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
  jakartaRegular: 'PlusJakartaSans_400Regular',
  jakartaMedium: 'PlusJakartaSans_500Medium',
  jakartaSemiBold: 'PlusJakartaSans_600SemiBold',
  jakartaBold: 'PlusJakartaSans_700Bold',
  jakartaExtraBold: 'PlusJakartaSans_800ExtraBold',
};

/** Text styles taken from the Figma frames (size / line-height / tracking). */
export const T = {
  authTitle: { fontFamily: F.interBold, fontSize: 32, lineHeight: 38.4, letterSpacing: -0.64, color: C.black },
  authSubtitle: { fontFamily: F.interMedium, fontSize: 12, lineHeight: 16.8, letterSpacing: -0.12, color: C.black },
  authInput: { fontFamily: F.interMedium, fontSize: 14, letterSpacing: -0.14, color: C.inputText },
  screenTitle: { fontFamily: F.jakartaBold, fontSize: 24, lineHeight: 36, color: C.textStrong },
  headerTitle: { fontFamily: F.jakartaBold, fontSize: 16, lineHeight: 24, color: C.text },
  subtitle: { fontFamily: F.jakartaRegular, fontSize: 12, lineHeight: 18, color: C.textMuted },
  label: { fontFamily: F.jakartaBold, fontSize: 11, lineHeight: 16.5, color: C.textMuted },
  fieldValue: { fontFamily: F.jakartaSemiBold, fontSize: 13, color: C.textStrong },
  chip: { fontFamily: F.jakartaSemiBold, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: F.jakartaBold, fontSize: 15, lineHeight: 22.5, color: C.white },
  statusTitle: { fontFamily: F.interBold, fontSize: 18, lineHeight: 27, letterSpacing: -0.36, color: C.textInk },
  statusBody: { fontFamily: F.interRegular, fontSize: 13, lineHeight: 19.5, color: C.textMuted3 },
};

export const Radius = {
  auth: 10,
  field: 15,
  chip: 14,
  tile: 18,
  button: 17,
  pill: 999,
};

/** Shadow presets (iOS shadow + Android elevation). */
export const Shadows = {
  button: {
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.22,
    shadowRadius: 11,
    elevation: 6,
  },
  card: {
    shadowColor: '#17171B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  input: {
    shadowColor: '#E4E5E7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 2,
    elevation: 1,
  },
};
