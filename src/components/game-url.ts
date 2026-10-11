// The address of the game's page (public/grrr-care-game/play.html), shared by the web iframe and the phone's WebView

export type GameKind = 'cat' | 'dog' | 'parrot' | 'rabbit';

export interface GameViewProps {
  language: 'en' | 'fr';
  /**
   * The account's own pets, by the kind of animal the game shows: { cat: 'Mimi', dog: 'Luna' }.
   * Only these animals are on the planet, and only their worries are asked (none: the four of the game).
   */
  names: Partial<Record<GameKind, string>>;
  /** Their age, for the worries of a young or a senior animal */
  stages?: Partial<Record<GameKind, 'young' | 'senior'>>;
  /** The pet's real health score (0–100), where the game's gauge starts */
  health?: number | null;
  onEvent: (type: string, payload: any) => void;
}

export function gameUrl({ language, names, stages = {}, health }: Omit<GameViewProps, 'onEvent'>, site: string) {
  const query = new URLSearchParams({ lang: language });
  for (const [kind, name] of Object.entries(names)) if (name) query.set(kind, name);
  for (const stage of ['young', 'senior'] as const) {
    const kinds = Object.entries(stages).filter(([, value]) => value === stage).map(([kind]) => kind);
    if (kinds.length) query.set(stage, kinds.join(','));
  }
  if (health != null) query.set('health', String(Math.round(health)));
  return `${site}/grrr-care-game/play.html?${query.toString()}`;
}
