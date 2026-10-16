// Small things to do with the pet, one a day (the home screen's "Today's challenge"). Texts are
// [English, French]; {n} is the pet's name. The same ideas, shorter, come as Wednesday's
// notification (migration 025) and in the GRRRR app's widgets.

export type Challenge = { id: string; icon: string; text: [string, string] };

const DOG: Challenge[] = [
  { id: 'dog-hide', icon: '🔎', text: ['Hide 3 treats in the room and let {n} find them.', 'Cache 3 croquettes dans la pièce et laisse {n} les trouver.'] },
  { id: 'dog-route', icon: '🌿', text: ['Take a new route on the walk: new smells, happy brain.', "Change l'itinéraire de la balade : nouvelles odeurs, cerveau ravi."] },
  { id: 'dog-touch', icon: '✋', text: ['Teach "touch": nose in your hand, then a reward.', 'Apprends-lui « touche » : son museau dans ta main, puis une récompense.'] },
  { id: 'dog-tug', icon: '🪢', text: ['Tug of war, then "drop it" for a treat.', 'Tir à la corde, puis « lâche » contre une friandise.'] },
  { id: 'dog-brush', icon: '🪮', text: ['5 minutes of brushing: it is a cuddle too.', "5 minutes de brossage : c'est aussi un câlin."] },
  { id: 'dog-photo', icon: '📸', text: ['Photo of the day: {n} in the funniest pose.', 'Photo du jour : {n} dans sa position la plus drôle.'] },
  { id: 'dog-snuffle', icon: '👃', text: ['Serve the kibble on a towel rolled up: a longer, calmer meal.', 'Sers les croquettes dans une serviette roulée : repas plus long, chien plus calme.'] },
  { id: 'dog-pads', icon: '🐾', text: ['Check the paw pads after the walk.', 'Vérifie ses coussinets au retour de balade.'] },
  { id: 'dog-calm', icon: '🧘', text: ['Two minutes of "sit, wait" before the bowl.', 'Deux minutes de « assis, attends » avant la gamelle.'] },
  { id: 'dog-friend', icon: '🐕', text: ['A walk with another dog: plan an outing in GRRRR.', 'Une balade avec un autre chien : propose une sortie dans GRRRR.'] },
];

const CAT: Challenge[] = [
  { id: 'cat-feather', icon: '🪶', text: ['A feather on a string: 10 minutes of hunting.', "Une plume au bout d'une ficelle : 10 minutes de chasse."] },
  { id: 'cat-box', icon: '📦', text: ['An empty box in the living room. Watch.', 'Un carton vide dans le salon. Observe.'] },
  { id: 'cat-cup', icon: '🥤', text: ['Hide a treat under a cup: {n} has to find it.', 'Cache une friandise sous un gobelet : à {n} de la trouver.'] },
  { id: 'cat-window', icon: '🪟', text: ['Clear a windowsill: the best TV in the world.', 'Dégage un rebord de fenêtre : la meilleure télé du monde.'] },
  { id: 'cat-brush', icon: '🪮', text: ['5 minutes of brushing, at its own pace.', '5 minutes de brossage, à son rythme.'] },
  { id: 'cat-photo', icon: '📸', text: ["Photo of the day: {n}'s most unlikely nap.", 'Photo du jour : {n} dans sa sieste la plus improbable.'] },
  { id: 'cat-water', icon: '💧', text: ['Fresh water in the fountain: cats like it fresh.', "De l'eau fraîche dans la fontaine : les chats l'aiment fraîche."] },
  { id: 'cat-hunt', icon: '🎣', text: ['Play before dinner, then the meal: like a real hunt.', 'Une séance de jeu avant le dîner, puis le repas : comme une vraie chasse.'] },
  { id: 'cat-blink', icon: '😌', text: ['Blink slowly at {n}: it means "I trust you".', 'Cligne lentement des yeux vers {n} : ça veut dire « j’ai confiance ».'] },
];

const RABBIT: Challenge[] = [
  { id: 'rabbit-run', icon: '🐇', text: ['An hour of free running in a safe room.', "Une heure de course libre dans une pièce sécurisée."] },
  { id: 'rabbit-hay', icon: '🌾', text: ['Hide herbs in the hay: foraging time.', 'Cache des herbes dans le foin : à lui de fouiller.'] },
  { id: 'rabbit-tunnel', icon: '🕳️', text: ['A cardboard tunnel to explore and chew.', 'Un tunnel en carton à explorer et à ronger.'] },
  { id: 'rabbit-teeth', icon: '🦷', text: ["A look at {n}'s teeth: even and not too long?", 'Un œil sur les dents de {n} : bien alignées, pas trop longues ?'] },
  { id: 'rabbit-photo', icon: '📸', text: ['Photo of the day: {n} mid-binky.', 'Photo du jour : {n} en plein saut de joie.'] },
];

const BIRD: Challenge[] = [
  { id: 'bird-forage', icon: '🌰', text: ['Wrap a treat in paper: {n} unwraps it.', 'Emballe une friandise dans du papier : {n} la déballe.'] },
  { id: 'bird-flight', icon: '🕊️', text: ['A supervised flight time, windows shut.', 'Un moment de vol surveillé, fenêtres fermées.'] },
  { id: 'bird-mist', icon: '💦', text: ['A lukewarm mist shower for the feathers.', 'Une douche tiède en brumisation pour son plumage.'] },
  { id: 'bird-word', icon: '🗣️', text: ['Repeat one short word to {n}, always the same.', 'Répète à {n} un mot court, toujours le même.'] },
  { id: 'bird-veg', icon: '🥕', text: ['A new vegetable to taste today.', 'Un nouveau légume à goûter aujourd’hui.'] },
  { id: 'bird-toys', icon: '🔄', text: ['Swap the toys in the cage: novelty fights boredom.', 'Change les jouets de la cage : la nouveauté chasse l’ennui.'] },
];

const HAMSTER: Challenge[] = [
  { id: 'hamster-maze', icon: '🧩', text: ['A cardboard maze with a seed at the end.', 'Un labyrinthe en carton avec une graine au bout.'] },
  { id: 'hamster-dig', icon: '⛏️', text: ['Add bedding: {n} loves to dig.', 'Ajoute de la litière : {n} adore creuser.'] },
  { id: 'hamster-scatter', icon: '🌻', text: ['Scatter the food instead of the bowl: a night of foraging.', 'Éparpille sa nourriture au lieu de la gamelle : une nuit de fouille.'] },
  { id: 'hamster-sand', icon: '🏖️', text: ['A sand bath to clean up (never water).', "Un bain de sable pour sa toilette (jamais d'eau)."] },
  { id: 'hamster-evening', icon: '🌙', text: ['A quiet chat at dusk, when {n} wakes up.', 'Un moment calme au crépuscule, quand {n} se réveille.'] },
];

const HORSE: Challenge[] = [
  { id: 'horse-hooves', icon: '🧲', text: ["Pick out {n}'s four hooves.", 'Cure les quatre sabots de {n}.'] },
  { id: 'horse-groom', icon: '🪮', text: ['A long grooming session: brush, mane, tail.', 'Un long pansage : brosse, crinière, queue.'] },
  { id: 'horse-walk', icon: '🌳', text: ['A walk in hand on a new path.', 'Une balade en main sur un nouveau chemin.'] },
  { id: 'horse-carrot', icon: '🥕', text: ['A carrot stretch: to each side, then between the legs.', 'Étirements à la carotte : de chaque côté, puis entre les jambes.'] },
  { id: 'horse-water', icon: '🪣', text: ['Clean water trough: {n} drinks better.', 'Abreuvoir propre : {n} boit mieux.'] },
];

const TURTLE: Challenge[] = [
  { id: 'turtle-sun', icon: '☀️', text: ['Check the heat lamp and UV: {n} needs both.', 'Vérifie la lampe chauffante et les UV : {n} a besoin des deux.'] },
  { id: 'turtle-greens', icon: '🌼', text: ['Wild plants for lunch: dandelion, clover.', 'Des plantes sauvages au menu : pissenlit, trèfle.'] },
  { id: 'turtle-bath', icon: '🛁', text: ['A shallow lukewarm bath to drink and relax.', 'Un bain tiède peu profond pour boire et se détendre.'] },
  { id: 'turtle-garden', icon: '🌿', text: ['A supervised walk on the grass.', "Une promenade surveillée dans l'herbe."] },
  { id: 'turtle-shell', icon: '🔍', text: ["A look at {n}'s shell: hard and clean?", 'Un œil sur la carapace de {n} : dure et propre ?'] },
];

const FISH: Challenge[] = [
  { id: 'fish-water', icon: '🪣', text: ['Change a quarter of the water, at the same temperature.', "Change un quart de l'eau, à la même température."] },
  { id: 'fish-pinch', icon: '🤏', text: ['A small pinch of food: what goes in 2 minutes.', 'Une petite pincée de nourriture : ce qui part en 2 minutes.'] },
  { id: 'fish-decor', icon: '🪸', text: ['Move one plant: a new corner to explore.', 'Déplace une plante : un nouveau coin à explorer.'] },
  { id: 'fish-test', icon: '🧪', text: ['Test the water today.', "Teste l'eau aujourd'hui."] },
  { id: 'fish-watch', icon: '👀', text: ['5 minutes watching {n}: it calms you both.', '5 minutes à regarder {n} : ça vous calme tous les deux.'] },
];

const OTHER: Challenge[] = [
  { id: 'other-new', icon: '✨', text: ['A new object to explore in its space.', 'Un nouvel objet à explorer dans son espace.'] },
  { id: 'other-quiet', icon: '🤍', text: ['A few quiet minutes together, no screen.', 'Quelques minutes au calme ensemble, sans écran.'] },
  { id: 'other-clean', icon: '💧', text: ['Fresh water and a clean home today.', "De l'eau fraîche et un habitat propre aujourd'hui."] },
  { id: 'other-photo', icon: '📸', text: ['Photo of the day: {n} at its best angle.', 'Photo du jour : {n} sous son meilleur angle.'] },
  { id: 'other-treat', icon: '🍓', text: ['A treat suited to its species, just for fun.', 'Une friandise adaptée à son espèce, juste pour le plaisir.'] },
];

export function challengesFor(species?: string | null): Challenge[] {
  const s = String(species ?? '').toLowerCase();
  if (/dog|chien/.test(s)) return DOG;
  if (/cat|chat/.test(s)) return CAT;
  if (/rabbit|lapin/.test(s)) return RABBIT;
  if (/bird|oiseau|parrot|perroquet|perruche/.test(s)) return BIRD;
  if (/hamster|guinea|cochon d.inde|gerbil|souris|^rat$/.test(s)) return HAMSTER;
  if (/horse|cheval|pony|poney/.test(s)) return HORSE;
  if (/turtle|tortoise|tortue/.test(s)) return TURTLE;
  if (/fish|poisson/.test(s)) return FISH;
  return OTHER;
}

/** Today's challenge (a new one each day, `skip` moves to the next) */
export function challengeOfTheDay(species: string | null | undefined, skip = 0, now = new Date()): Challenge {
  const pool = challengesFor(species);
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 864e5);
  return pool[(day + skip) % pool.length];
}

export const challengeText = (challenge: Challenge, language: 'en' | 'fr', name: string) =>
  (language === 'fr' ? challenge.text[1] : challenge.text[0]).replace(/\{n\}/g, name);

/** Monday of this week, as YYYY-MM-DD (the week's count of challenges done) */
export function weekKey(now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}
