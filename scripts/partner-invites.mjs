// Invites the establishments of the map to become partners (emails/partner-invite.html → public/partenaire.html).
//   node scripts/partner-invites.mjs preview              writes a sample of the email to open in a browser
//   node scripts/partner-invites.mjs prepare              creates one invitation per establishment that has an email
//   node scripts/partner-invites.mjs export               writes partner-invites.csv: who would be written to, and their link
//   node scripts/partner-invites.mjs send --limit 50      dry run: lists the next 50 that would be sent
//   node scripts/partner-invites.mjs send --limit 50 --yes   really sends them, and marks them as sent
//   Filters for export and send: --category clinic|supplies|grooming   --postcode 33 (starts with)   --email one@address
// Sending needs RESEND_API_KEY and EMAIL_FROM in the environment (the same as the partner-application function).
// An establishment is written to once: sent, accepted and declined invitations are never sent again.
// Needs the Supabase CLI, logged in and linked to the project.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'https://care.greatrascals.com/partenaire';
const SUBJECT = name => `${name} : apparaissez comme partenaire sur GRRR Care`;
// An address shared by many establishments is a chain's head office: one email there is enough
const MAX_PLACES_PER_EMAIL = 3;

const KIND = { clinic: 'un vétérinaire', supplies: 'une animalerie', grooming: 'un toiletteur' };
const LABEL = { clinic: 'Clinique vétérinaire', supplies: 'Animalerie', grooming: 'Toilettage', pharmacy: 'Pharmacie' };

const [command, ...args] = process.argv.slice(2);
const option = name => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const flag = name => args.includes(`--${name}`);

function query(sql) {
  const file = join(mkdtempSync(join(tmpdir(), 'invites-')), 'query.sql');
  writeFileSync(file, sql);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const output = execFileSync('supabase', ['db', 'query', '--linked', '-f', `"${file}"`], { stdio: ['ignore', 'pipe', 'pipe'], shell: true, maxBuffer: 256 * 1024 * 1024 }).toString();
      return JSON.parse(output.slice(output.indexOf('{'))).rows ?? [];
    } catch (error) {
      const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
      // The CLI's login step fails now and then; anything else is a real error
      if (!/TransportError/.test(output)) throw new Error(output.slice(-600) || error.message);
    }
  }
  throw new Error('Supabase CLI could not connect');
}

const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const literal = text => `'${String(text).replace(/'/g, "''")}'`;

function emailHtml(invite) {
  const link = `${PAGE}?token=${invite.token}`;
  const marks = {
    name: escape(invite.name),
    kind: KIND[invite.category] ?? 'un professionnel de confiance',
    place: invite.city ? ` (${escape(invite.city)})` : '',
    listing: escape([LABEL[invite.category] ?? invite.category, invite.address || invite.city].filter(Boolean).join(' · ')),
    accept_url: link,
    decline_url: `${link}#non`,
  };
  return readFileSync(join(ROOT, 'emails', 'partner-invite.html'), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, mark) => marks[mark] ?? '');
}

function pending() {
  const filters = [`i.status = 'pending'`, 'p.is_published', 'not p.is_partner'];
  if (option('category')) filters.push(`p.category = ${literal(option('category'))}`);
  if (option('postcode')) filters.push(`p.postcode like ${literal(`${option('postcode')}%`)}`);
  if (option('email')) filters.push(`i.email = ${literal(option('email').toLowerCase())}`);
  const limit = Number(option('limit')) > 0 ? `limit ${Number(option('limit'))}` : '';
  return query(`select i.partner_id, i.token, i.email, p.name, p.category, p.address, p.city, p.postcode
from public.partner_invites i join public.partners p on p.id = i.partner_id
where ${filters.join(' and ')}
order by p.postcode nulls last, p.name ${limit};`);
}

if (command === 'preview') {
  const file = join(ROOT, 'partner-invite-preview.html');
  writeFileSync(file, emailHtml({ token: '00000000-0000-0000-0000-000000000000', name: 'Clinique vétérinaire des Quais', category: 'clinic', address: '12 quai des Chartrons, 33000 Bordeaux', city: 'Bordeaux' }));
  console.log(`Sample written: ${file}`);
} else if (command === 'prepare') {
  const [result] = query(`with shared as (
  select lower(email) as email from public.partners where source = 'osm' and email is not null group by 1 having count(*) > ${MAX_PLACES_PER_EMAIL}
), created as (
  insert into public.partner_invites (partner_id, email)
  select distinct on (lower(p.email)) p.id, lower(p.email)
  from public.partners p
  where p.source = 'osm' and p.email is not null and p.is_published and not p.is_partner
    and lower(p.email) not in (select email from shared)
    and lower(p.email) not in (select email from public.partner_invites)
  order by lower(p.email), p.created_at
  on conflict (partner_id) do nothing
  returning 1
)
select (select count(*) from created) as created, (select count(*) from public.partner_invites) + (select count(*) from created) as invitations, (select count(*) from shared) as shared_addresses_skipped;`);
  console.log(`${result.created} invitations created, ${result.invitations} in all (${result.shared_addresses_skipped} shared addresses left out).`);
} else if (command === 'export') {
  const rows = pending();
  const cell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = ['name;category;city;postcode;email;link', ...rows.map(r => [r.name, LABEL[r.category] ?? r.category, r.city, r.postcode, r.email, `${PAGE}?token=${r.token}`].map(cell).join(';'))];
  const file = join(ROOT, 'partner-invites.csv');
  // BOM so Excel reads the accents
  writeFileSync(file, '﻿' + lines.join('\r\n'));
  console.log(`${rows.length} establishments written to ${file}`);
} else if (command === 'send') {
  if (!option('limit')) throw new Error('Give --limit: invitations go out in batches you choose.');
  const rows = pending();
  if (!flag('yes')) {
    rows.forEach(r => console.log(`${r.email}  ·  ${r.name}${r.city ? ` (${r.city})` : ''}`));
    console.log(`\n${rows.length} would be sent. Add --yes to send them.`);
    process.exit(0);
  }
  const { RESEND_API_KEY, EMAIL_FROM } = process.env;
  if (!RESEND_API_KEY || !EMAIL_FROM) throw new Error('Set RESEND_API_KEY and EMAIL_FROM first.');
  const sent = [];
  for (const invite of rows) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: invite.email, subject: SUBJECT(invite.name), html: emailHtml(invite) }),
    });
    if (res.ok) sent.push(invite.partner_id);
    else console.warn(`not sent to ${invite.email}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    // Resend allows a few emails per second
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  if (sent.length) query(`update public.partner_invites set status = 'sent', sent_at = now() where partner_id in (${sent.map(literal).join(', ')}) returning 1;`);
  console.log(`${sent.length} / ${rows.length} sent.`);
} else {
  console.log('Commands: preview | prepare | export | send --limit N [--yes]   (see the top of this file)');
}
