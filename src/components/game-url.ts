// The address of the game's page (public/grrr-care-game/play.html), shared by the web iframe and the phone's WebView

export interface GameViewProps {
  language: 'en' | 'fr';
  /** The account's own pets, by the kind of animal the game shows: { cat: 'Mimi', dog: 'Luna' } */
  names: Partial<Record<'cat' | 'dog' | 'parrot' | 'rabbit', string>>;
  /** The pet's real health score (0–100), where the game's gauge starts */
  health?: number | null;
  onEvent: (type: string, payload: any) => void;
}

export function gameUrl({ language, names, health }: Omit<GameViewProps, 'onEvent'>, site: string) {
  const query = new URLSearchParams({ lang: language });
  for (const [kind, name] of Object.entries(names)) if (name) query.set(kind, name);
  if (health != null) query.set('health', String(Math.round(health)));
  return `${site}/grrr-care-game/play.html?${query.toString()}`;
}
