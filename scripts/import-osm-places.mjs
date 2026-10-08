// Fills the map with the real establishments OpenStreetMap knows in France: vets, pet shops and groomers.
//   node scripts/import-osm-places.mjs            fetch the whole country, then write to the linked Supabase project
//   node scripts/import-osm-places.mjs --dry-run  fetch and count only
//   node scripts/import-osm-places.mjs --cached   write what the last run fetched, without asking OpenStreetMap again
// Safe to run again: places are matched on their OpenStreetMap id, so a new run updates their details and never
// touches what is ours (is_partner, discount_percent, is_published, is_featured).
// Needs the Supabase CLI, logged in and linked to the project (supabase link).
// Data © OpenStreetMap contributors, ODbL: the app credits them on the map.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const CACHED = process.argv.includes('--cached');
const CACHE = join(tmpdir(), 'grrr-care-osm-places.json');
// The French community's server: fast for France, but it only answers by rectangle, not by region
const SERVER = 'https://overpass.openstreetmap.fr/api/interpreter';
const USER_AGENT = 'GRRR-Care-places-import/1.0 (contact@greatrascals.com)';
// Outline of mainland France and Corsica, to drop what a rectangle catches across a border
const OUTLINE = 'https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/metropole.geojson';
const BATCH = 300;
const CELL = 1.5; // degrees

const MAINLAND = { south: 41.3, west: -5.2, north: 51.2, east: 9.6 };
// Islands and Guyane: their rectangle is the territory (Guyane's borders are rivers, the rectangle hugs them)
const OVERSEAS = {
  Guadeloupe: { south: 15.8, west: -61.9, north: 16.6, east: -60.9 },
  Martinique: { south: 14.3, west: -61.3, north: 14.9, east: -60.7 },
  Guyane: { south: 2.1, west: -54.5, north: 5.8, east: -51.6 },
  'La Réunion': { south: -21.4, west: 55.2, north: -20.8, east: 55.9 },
  Mayotte: { south: -13.05, west: 44.95, north: -12.6, east: 45.35 },
};

// OpenStreetMap tag → category of the app
const category = tags => (tags.amenity === 'veterinary' ? 'clinic' : tags.shop === 'pet' ? 'supplies' : tags.shop === 'pet_grooming' ? 'grooming' : null);
const CATEGORIES = ['clinic', 'supplies', 'grooming'];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchBox({ south, west, north, east }) {
  const box = `(${south},${west},${north},${east})`;
  const query = `[out:json][timeout:170];(nwr["amenity"="veterinary"]${box};nwr["shop"="pet"]${box};nwr["shop"="pet_grooming"]${box};);out tags center;`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(SERVER, { method: 'POST', body: 'data=' + encodeURIComponent(query), headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(200_000) });
      const body = res.ok ? await res.json() : null;
      // A timed-out query still answers 200, with a remark and no elements
      if (body && !body.remark) return body.elements ?? [];
      console.warn(`  ${res.status} ${body?.remark ?? ''}, retrying`);
    } catch (error) {
      console.warn(`  failed (${error.message}), retrying`);
    }
    await sleep(10_000 * (attempt + 1));
  }
  return null;
}

// Ray casting on one ring ([longitude, latitude] pairs)
function inRing(longitude, latitude, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > latitude !== yj > latitude && longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

async function loadOutline() {
  const geojson = await (await fetch(OUTLINE)).json();
  const geometry = geojson.geometry ?? geojson.features[0].geometry;
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  // Outer rings only: France has no hole that matters here
  return (longitude, latitude) => polygons.some(polygon => inRing(longitude, latitude, polygon[0]));
}

const clean = (value, max) => (typeof value === 'string' ? value.replace(/\u0000/g, '').trim().slice(0, max) : '') || null;
const first = value => (value ? value.split(/[;,]/)[0].trim() : null);

function toPlace(element) {
  const tags = element.tags ?? {};
  const name = clean(tags.name, 120);
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  if (!name || !category(tags) || latitude == null || longitude == null) return null;

  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const city = clean(tags['addr:city'], 80);
  const postcode = clean(tags['addr:postcode'], 10);
  const address = clean([street, [postcode, city].filter(Boolean).join(' ')].filter(Boolean).join(', '), 300);
  const email = clean(first(tags.email ?? tags['contact:email']), 200)?.toLowerCase() ?? null;
  let website = clean(first(tags.website ?? tags['contact:website']), 300);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;

  return {
    osm_id: `${element.type}/${element.id}`,
    name,
    category: category(tags),
    address,
    city,
    postcode,
    phone: clean(first(tags.phone ?? tags['contact:phone']), 30),
    email: email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null,
    website,
    latitude,
    longitude,
  };
}

async function fetchPlaces() {
  const inMainland = await loadOutline();
  const boxes = [];
  for (let south = MAINLAND.south; south < MAINLAND.north; south += CELL) {
    for (let west = MAINLAND.west; west < MAINLAND.east; west += CELL) {
      const box = { south, west, north: Math.min(south + CELL, MAINLAND.north), east: Math.min(west + CELL, MAINLAND.east) };
      // Skip the squares that are all sea or all abroad: none of their corners or centre is in France
      const points = [[box.west, box.south], [box.east, box.south], [box.west, box.north], [box.east, box.north], [(box.west + box.east) / 2, (box.south + box.north) / 2]];
      const edge = [0.25, 0.5, 0.75].flatMap(t => [[box.west + t * CELL, box.south], [box.west + t * CELL, box.north], [box.west, box.south + t * CELL], [box.east, box.south + t * CELL]]);
      if ([...points, ...edge].some(([x, y]) => inMainland(x, y))) boxes.push({ ...box, keep: inMainland, label: `${south.toFixed(1)},${west.toFixed(1)}` });
    }
  }
  for (const [label, box] of Object.entries(OVERSEAS)) boxes.push({ ...box, keep: () => true, label });

  const places = new Map();
  const failed = [];
  for (const [index, box] of boxes.entries()) {
    const elements = await fetchBox(box);
    if (!elements) {
      failed.push(box.label);
      console.warn(`[${index + 1}/${boxes.length}] ${box.label}: no answer`);
      continue;
    }
    let kept = 0;
    for (const element of elements) {
      const place = toPlace(element);
      if (place && !places.has(place.osm_id) && box.keep(place.longitude, place.latitude)) {
        places.set(place.osm_id, place);
        kept++;
      }
    }
    console.log(`[${index + 1}/${boxes.length}] ${box.label}: ${elements.length} found, ${kept} kept`);
    await sleep(1500);
  }
  if (failed.length) console.log(`Not fetched (run again later): ${failed.join(' | ')}`);
  return [...places.values()];
}

const sql = value => (value == null ? 'null' : typeof value === 'number' ? String(value) : `'${String(value).replace(/'/g, "''")}'`);
const COLUMNS = ['osm_id', 'name', 'category', 'address', 'city', 'postcode', 'phone', 'email', 'website', 'latitude', 'longitude'];

function upsertSql(places) {
  const rows = places.map(place => `(${COLUMNS.map(column => sql(place[column])).join(', ')}, 'osm', true, false)`).join(',\n');
  const updates = COLUMNS.filter(column => column !== 'osm_id').map(column => `${column} = excluded.${column}`).join(', ');
  return `insert into public.partners (${COLUMNS.join(', ')}, source, is_published, is_featured)\nvalues\n${rows}\non conflict (osm_id) do update set ${updates}, updated_at = now();\nselect count(*) as places from public.partners where source = 'osm';\n`;
}

function runSql(file) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      execFileSync('supabase', ['db', 'query', '--linked', '-f', `"${file}"`], { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
      return;
    } catch (error) {
      const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
      // The CLI's login step fails now and then; anything else is a real error
      if (!/TransportError/.test(output)) throw new Error(output.slice(-600));
    }
  }
  throw new Error('Supabase CLI could not connect');
}

let all;
if (CACHED && existsSync(CACHE)) {
  all = JSON.parse(readFileSync(CACHE, 'utf8'));
  console.log(`Using ${all.length} places fetched earlier (${CACHE})`);
} else {
  all = await fetchPlaces();
  writeFileSync(CACHE, JSON.stringify(all));
}

const count = predicate => all.filter(predicate).length;
console.log(`\nTotal: ${all.length} places`);
for (const kind of CATEGORIES) {
  console.log(`  ${kind}: ${count(p => p.category === kind)} | email ${count(p => p.category === kind && p.email)} | phone ${count(p => p.category === kind && p.phone)} | website ${count(p => p.category === kind && p.website)}`);
}

if (DRY_RUN) process.exit(0);

const folder = mkdtempSync(join(tmpdir(), 'osm-places-'));
for (let start = 0; start < all.length; start += BATCH) {
  const file = join(folder, `places-${start}.sql`);
  writeFileSync(file, upsertSql(all.slice(start, start + BATCH)));
  runSql(file);
  console.log(`written ${Math.min(start + BATCH, all.length)} / ${all.length}`);
}
console.log('Done.');
