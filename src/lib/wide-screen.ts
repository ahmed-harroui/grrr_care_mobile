import { Platform } from 'react-native';

/** The widest the app is drawn. Its screens are laid out for a phone: stretched across a desktop, buttons and cards become unreadable bands. */
export const APP_MAX_WIDTH = 560;

/**
 * On tablets and computers (web), the app becomes a centred column on a plain backdrop.
 * Done on the page itself rather than around the screens, so that modals follow: they are fixed to the window,
 * and a transformed <body> is what "the window" means to them.
 */
export function installWideScreenFrame(backdrop: { light: string; dark: string }) {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById('wide-screen-frame')) return;
  const style = document.createElement('style');
  style.id = 'wide-screen-frame';
  style.textContent = `
@media (min-width: 700px) {
  html { background: ${backdrop.light}; }
  body {
    max-width: ${APP_MAX_WIDTH}px; margin: 0 auto !important; height: 100vh; overflow: hidden;
    transform: translateZ(0);
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .08), 0 30px 90px rgba(0, 0, 0, .18);
  }
}
@media (min-width: 700px) and (prefers-color-scheme: dark) {
  html { background: ${backdrop.dark}; }
  body { box-shadow: 0 0 0 1px rgba(255, 255, 255, .08), 0 30px 90px rgba(0, 0, 0, .6); }
}`;
  document.head.appendChild(style);
}
