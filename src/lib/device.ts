import { Platform, useWindowDimensions } from 'react-native';

// The app takes the shape of the device it is opened on:
//   phone   one column, the floating bar at the bottom
//   tablet  the same navigation, wider grids, text that doesn't run from edge to edge
//   laptop  a sidebar on the left, the page beside it in two columns where it helps
export type DeviceKind = 'phone' | 'tablet' | 'laptop';

const TABLET_FROM = 700;
const LAPTOP_FROM = 1024;

/** Width of the sidebar that replaces the bottom bar on a laptop */
export const SIDEBAR_WIDTH = 248;
/** The widest a page's content grows: past it, lines are too long to read and cards too wide to scan */
export const PAGE_MAX_WIDTH = 1180;

/**
 * Sheets and full-screen editors are written for a phone: on a wider window they open as a centred panel,
 * the rest of the window dimmed, instead of a band across the whole screen (web only).
 */
export function installWideModals() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById('wide-modals')) return;
  const style = document.createElement('style');
  style.id = 'wide-modals';
  style.textContent = `@media (min-width: ${TABLET_FROM}px) {
  [aria-modal="true"] { max-width: 640px; margin: 0 auto; left: 0 !important; right: 0 !important; box-shadow: 0 0 0 100vmax rgba(0, 0, 0, .45); }
}`;
  document.head.appendChild(style);
}

export function useDevice() {
  const { width, height } = useWindowDimensions();
  const kind: DeviceKind = width >= LAPTOP_FROM ? 'laptop' : width >= TABLET_FROM ? 'tablet' : 'phone';
  const isLaptop = kind === 'laptop';
  const isWide = kind !== 'phone';
  return {
    kind,
    isLaptop,
    isWide,
    width,
    height,
    /** Style for a page's scrolling content: centred, never wider than PAGE_MAX_WIDTH */
    page: isWide ? ({ width: '100%', maxWidth: PAGE_MAX_WIDTH, alignSelf: 'center', paddingHorizontal: isLaptop ? 16 : 8 } as const) : undefined,
    /** Style for lists of rows, a conversation, a long form: a comfortable line length, centred */
    medium: isWide ? ({ width: '100%', maxWidth: 820, alignSelf: 'center' } as const) : undefined,
    /** Style for a short form (sign-in): a card's width, centred */
    narrow: isWide ? ({ width: '100%', maxWidth: 480, alignSelf: 'center' } as const) : undefined,
    /** How many cards fit side by side in a grid that shows 2 on a phone */
    columns: isLaptop ? 4 : isWide ? 3 : 2,
  };
}
