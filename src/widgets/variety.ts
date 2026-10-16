// What keeps the Care widgets alive: they refresh every 30 minutes, and each refresh shows the next
// item of a pool instead of the same line all day. The order starts somewhere else each day, so
// nothing comes back the same day until the pool has gone round. Texts are [English, French];
// {n} is the pet's name.

type Text = [en: string, fr: string];

const SLOT_MS = 30 * 60 * 1000;

/** The item of `pool` for this half-hour (`salt` keeps two pools of the same size out of step). */
export function rotate<T>(pool: readonly T[], now: Date, salt = 0): T {
  const slot = Math.floor(now.getTime() / SLOT_MS);
  const day = Math.floor(now.getTime() / 864e5);
  const start = Math.abs(Math.imul(day + salt * 7919, 2654435761)) % pool.length;
  return pool[(start + slot) % pool.length];
}

const say = (text: Text, language: 'en' | 'fr', name: string) => (language === 'fr' ? text[1] : text[0]).replace(/\{n\}/g, name);

/** When the record is up to date: small checks that keep it that way */
const UP_TO_DATE: Text[] = [
  ['Everything is up to date 🎉', 'Tout est à jour 🎉'],
  ['Weigh {n} this month: it helps spot issues early ⚖️', 'Pèse {n} ce mois-ci : ça aide à repérer tôt les soucis ⚖️'],
  ["A look at {n}'s teeth: pink gums, fresh breath? 🦷", 'Un œil sur les dents de {n} : gencives roses, haleine fraîche ? 🦷'],
  ['Fresh water changed today? 💧', 'Eau fraîche changée aujourd’hui ? 💧'],
  ['Claws: when was the last trim? ✂️', 'Les griffes : dernière coupe quand ? ✂️'],
  ["Brushing = a cuddle and a skin check 🪮", 'Brossage = câlin + contrôle de la peau 🪮'],
  ['Ears clean and odour-free? 👂', 'Oreilles propres et sans odeur ? 👂'],
];

/** When nothing is due today: one idea for the day */
const IDEAS: Text[] = [
  ['10 minutes of sniffing games 👃', '10 minutes de jeu de flair 👃'],
  ['A new walk, new smells 🌿', 'Une nouvelle balade, de nouvelles odeurs 🌿'],
  ['A cuddle and a brushing session 🪮', 'Un câlin et une séance de brossage 🪮'],
  ['Check the paw pads after the walk 🐾', 'Vérifie ses coussinets après la balade 🐾'],
  ['An old toy out of the cupboard = a new toy 🧸', 'Un jouet oublié ressorti du placard = un jouet neuf 🧸'],
  ['Ask the assistant one question about {n} 💬', 'Pose une question sur {n} à l’assistant 💬'],
  ['A photo of {n} for the album 📸', 'Une photo de {n} pour l’album 📸'],
];

/** The advice line: the record's tips by turns, or a small check when all is well */
export function adviceLine(tips: string[], language: 'en' | 'fr', name: string, now: Date) {
  return tips.length ? rotate(tips, now, 1) : say(rotate(UP_TO_DATE, now, 2), language, name);
}

/** The "today" widget when nothing is due: said so, with an idea for the day */
export function quietDay(language: 'en' | 'fr', name: string, now: Date) {
  return `${language === 'fr' ? 'Rien de prévu aujourd’hui ✨' : 'Nothing due today ✨'}\n${say(rotate(IDEAS, now, 3), language, name)}`;
}
