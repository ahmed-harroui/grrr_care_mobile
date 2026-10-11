import { createElement, useEffect, useRef } from 'react';
import { gameUrl, type GameViewProps } from './game-url';

/** The game "help your pets" on the web: its page in an iframe, its events read from postMessage. */
export function GameView({ onEvent, ...options }: GameViewProps) {
  // The latest handler, without reloading the game when the screen draws again
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data;
      if (message?.source === 'grrr-care-game') handler.current(message.type, message.payload ?? {});
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  return createElement('iframe', {
    src: gameUrl(options, ''),
    title: 'GRRR Care — le jeu',
    allow: 'autoplay',
    style: { flex: 1, width: '100%', height: '100%', border: 0, display: 'block', background: '#5fbcff' },
  });
}
