// Primitive ramps. Components must NOT import these directly — use semantic
// tokens from light.ts / dark.ts. Values sourced from design-system.md §5.
export const palette = {
  violet: { 100: '#E7DFFB', 500: '#7C5CF0', 600: '#6A47DB', 700: '#5533B0', 300: '#B09BFF' },
  coral:  { 500: '#FF7355', 700: '#C4472C', 300: '#FF9A82' },
  mint:   { 500: '#16BE99', 700: '#0E7A63' },
  sun:    { 500: '#F5A623', 700: '#B9740A' },
  blue:   { 500: '#2E93DE', 700: '#1C6BB0', 300: '#7FBEF0' },
  danger: { 500: '#E5484D', 700: '#C0323A', 300: '#FF6B6E' },

  // Light neutrals
  paper: '#FBF8F3', white: '#FFFFFF', sand: '#F4EFE7', border: '#EAE3D7',
  ink: '#241F31', ink2: '#5B5568', ink3: '#8E8799',

  // Dark neutrals
  night: '#131019', nightSurface: '#1C1826', nightSurface2: '#241F30', nightBorder: '#322B42',
  moon: '#F4F1FA', moon2: '#C2BBD4', moon3: '#8B8399',
} as const
