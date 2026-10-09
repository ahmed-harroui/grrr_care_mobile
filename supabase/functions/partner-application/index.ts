// Public form for establishments that want to appear on the Find Vet map (public/partenaires.html, served at care.greatrascals.com/partenaires).
//   { action: 'apply', ...fields }  saves the application, finds the address on the map and emails a confirmation link
//   { action: 'confirm', token }    confirms the email and adds the establishment to partners, unpublished,
//                                   so it only shows on the map once the admin publishes it from the Studio dashboard
// And for the establishments invited by email (public/partenaire.html, link sent by scripts/partner-invites.mjs):
//   { action: 'invite', token }             the listing the invitation is about
//   { action: 'accept', token, discount }   becomes a partner, with an optional discount for GRRR members
//   { action: 'decline', token, remove }    no more emails; with remove, the listing also leaves the map
// Secrets: RESEND_API_KEY + EMAIL_FROM (a sender on a domain verified in Resend), PARTNER_FORM_URL (where the form is
// hosted, the confirmation link points to it), ADMIN_EMAIL (optional, told about each confirmed application).
// Deploy with --no-verify-jwt: the form is public.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { escapeHtml as escape, panel, paragraph, sendEmail } from '../_shared/email.ts';

const CATEGORIES: Record<string, string> = {
  clinic: 'Clinique vétérinaire',
  grooming: 'Toilettage',
  pharmacy: 'Pharmacie',
  supplies: 'Animalerie',
};
const MAX_PER_EMAIL_PER_DAY = 3;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// French national address base first (free, no key, precise to the house number), then OpenStreetMap for
// addresses outside France. Both are free; one request per application is well within their usage policies.
async function geocode(address: string) {
  const q = encodeURIComponent(address);
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${q}&limit=1`);
    const [feature] = res.ok ? (await res.json()).features ?? [] : [];
    if (feature && feature.properties?.score >= 0.5) {
      const [longitude, latitude] = feature.geometry.coordinates;
      return { latitude, longitude };
    }
  } catch (e) {
    console.error('geocode error (BAN)', e);
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, {
      headers: { 'User-Agent': 'GRRR Care partner form (ah001dev@gmail.com)' },
    });
    const [place] = res.ok ? await res.json() : [];
    return place ? { latitude: Number(place.lat), longitude: Number(place.lon) } : null;
  } catch (e) {
    console.error('geocode error (OSM)', e);
    return null;
  }
}

async function apply(admin: ReturnType<typeof createClient>, body: any) {
  // Hidden field of the form: only bots fill it in, and they get the same answer as people
  if (text(body.company_fax, 100)) return json({ ok: true });

  const fields = {
    name: text(body.name, 120),
    category: text(body.category, 30),
    description: text(body.description, 1000) || null,
    address: text(body.address, 300),
    phone: text(body.phone, 30),
    email: text(body.email, 200).toLowerCase(),
    website: text(body.website, 300) || null,
  };
  if (!fields.name || !fields.address || !fields.phone) return json({ error: 'Nom, adresse et téléphone sont requis.' }, 400);
  if (!CATEGORIES[fields.category]) return json({ error: 'Catégorie inconnue.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return json({ error: 'Adresse e-mail invalide.' }, 400);
  if (fields.phone.replace(/\D/g, '').length < 9) return json({ error: 'Numéro de téléphone invalide.' }, 400);
  if (fields.website && !/^https?:\/\//i.test(fields.website)) fields.website = `https://${fields.website}`;

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await admin
    .from('partner_applications')
    .select('id', { count: 'exact', head: true })
    .eq('email', fields.email)
    .gte('created_at', since);
  if ((count ?? 0) >= MAX_PER_EMAIL_PER_DAY) {
    return json({ error: 'Trop de demandes avec cette adresse e-mail. Réessayez demain.' }, 429);
  }

  const place = await geocode(fields.address);
  const { data: application, error } = await admin
    .from('partner_applications')
    .insert({ ...fields, ...place })
    .select('token')
    .single();
  if (error) throw error;

  const link = `${Deno.env.get('PARTNER_FORM_URL')}?token=${application.token}`;
  await sendEmail(fields.email, 'Confirmez votre inscription sur GRRR Care', {
    brand: 'care',
    kicker: 'Inscription partenaire',
    title: 'Plus qu’un clic pour confirmer votre inscription',
    body:
      paragraph('Bonjour,') +
      paragraph(`Merci d'avoir inscrit <b>${escape(fields.name)}</b> sur la carte GRRR Care.`) +
      panel('care', 'Votre établissement', `<b>${escape(fields.name)}</b><br>${CATEGORIES[fields.category]} · ${escape(fields.address)}`) +
      paragraph('Confirmez votre adresse e-mail avec le bouton ci-dessous. Votre établissement apparaîtra sur la carte après vérification par notre équipe.'),
    button: { label: 'Confirmer mon inscription', url: link },
    signature: "L'équipe GRRR Care",
    footnote: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
  });
  return json({ ok: true });
}

async function confirm(admin: ReturnType<typeof createClient>, body: any) {
  const token = text(body.token, 64);
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: 'Lien invalide.' }, 400);

  const { data: application } = await admin.from('partner_applications').select('*').eq('token', token).maybeSingle();
  if (!application) return json({ error: 'Lien invalide ou expiré.' }, 404);
  if (application.status === 'confirmed') return json({ ok: true, name: application.name });

  const { data: partner, error } = await admin
    .from('partners')
    .insert({
      name: application.name,
      category: application.category,
      description: application.description,
      address: application.address,
      phone: application.phone,
      email: application.email,
      website: application.website,
      latitude: application.latitude,
      longitude: application.longitude,
      is_published: false,
      is_featured: false,
      // It asked to join: a partner, not a place imported from OpenStreetMap
      source: 'form',
      is_partner: true,
      partner_since: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) throw error;

  await admin
    .from('partner_applications')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString(), partner_id: partner.id })
    .eq('id', application.id);

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    const located = application.latitude != null;
    await sendEmail(adminEmail, `Nouvel établissement à valider : ${application.name}`, {
      brand: 'care',
      kicker: 'À valider',
      title: `${application.name} a confirmé son e-mail`,
      body:
        panel(
          'care',
          CATEGORIES[application.category],
          `<b>${escape(application.name)}</b><br>${escape(application.address)}<br>${escape(application.phone)} · ${escape(application.email)}${
            application.website ? `<br>${escape(application.website)}` : ''
          }`
        ) +
        (application.description ? paragraph(escape(application.description)) : '') +
        (located ? '' : paragraph('<b>Adresse introuvable sur la carte :</b> renseignez latitude et longitude à la main.')) +
        paragraph('Pour le publier : Studio → Tableau de bord → Demandes de partenaires → Publier sur la carte.'),
      button: { label: 'Ouvrir le Studio', url: 'https://grrrr-main.vercel.app/studio' },
    }).catch(e => console.error('admin email error', e));
  }

  return json({ ok: true, name: application.name });
}

// The address a partner confirms or corrects on its invitation page, found in the national address base
// (the page suggests from the same base while typing): its official wording, town and position on the map.
async function locate(address: string) {
  const q = encodeURIComponent(address);
  for (const base of ['https://data.geopf.fr/geocodage/search', 'https://api-adresse.data.gouv.fr/search/']) {
    try {
      const res = await fetch(`${base}?q=${q}&limit=1`);
      const [feature] = res.ok ? (await res.json()).features ?? [] : [];
      if (!feature) continue;
      // A town alone is no address: the listing's own position is more precise than a town centre
      if (feature.properties?.score < 0.6 || !['housenumber', 'street'].includes(feature.properties?.type)) return null;
      const [longitude, latitude] = feature.geometry.coordinates;
      return { address: String(feature.properties.label), city: feature.properties.city ?? null, postcode: feature.properties.postcode ?? null, latitude, longitude };
    } catch (e) {
      console.error('locate error', base, e);
    }
  }
  return null;
}

// Invitations sent to the establishments imported from OpenStreetMap (migration 018, public/partenaire.html).
// The token of the email link is the only proof asked: it shows the listing, accepts or declines.
const MAX_DISCOUNT = 50;
// Where a partner adds its products to the GRRRR store (grrrr-store, store-products function)
const STORE_PARTNERS_URL = `${(Deno.env.get('STORE_URL') ?? 'https://store.greatrascals.com').replace(/\/$/, '')}/partenaires`;

async function findInvite(admin: ReturnType<typeof createClient>, body: any) {
  const token = text(body.token, 64);
  if (!/^[0-9a-f-]{36}$/i.test(token)) return null;
  const { data: invite } = await admin.from('partner_invites').select('partner_id, status, email, token').eq('token', token).maybeSingle();
  if (!invite) return null;
  const { data: partner } = await admin
    .from('partners')
    .select('id, name, category, address, city, is_partner, is_published, discount_percent')
    .eq('id', invite.partner_id)
    .maybeSingle();
  return partner ? { invite, partner } : null;
}

const inviteView = (found: NonNullable<Awaited<ReturnType<typeof findInvite>>>) => ({
  ok: true,
  name: found.partner.name,
  category: CATEGORIES[found.partner.category] ?? found.partner.category,
  address: found.partner.address ?? found.partner.city ?? '',
  status: found.invite.status,
  discount: found.partner.discount_percent,
  listed: found.partner.is_published,
});

async function invite(admin: ReturnType<typeof createClient>, body: any) {
  const found = await findInvite(admin, body);
  if (!found) return json({ error: 'Lien invalide ou expiré.' }, 404);
  return json(inviteView(found));
}

async function accept(admin: ReturnType<typeof createClient>, body: any) {
  const found = await findInvite(admin, body);
  if (!found) return json({ error: 'Lien invalide ou expiré.' }, 404);
  // No discount is a valid answer: being a partner only requires saying yes
  const asked = body.discount === '' || body.discount == null ? null : Number(body.discount);
  if (asked != null && (!Number.isInteger(asked) || asked < 1 || asked > MAX_DISCOUNT)) {
    return json({ error: `La réduction doit être un nombre entier entre 1 et ${MAX_DISCOUNT} %.` }, 400);
  }
  // The address shown on the page, confirmed as it is or corrected. A corrected one moves the listing on the map
  // when the address base knows it; otherwise the wording is kept and the position stays where it was.
  const typed = text(body.address, 300);
  const addressChanges: Record<string, unknown> = {};
  if (typed.length >= 5 && typed !== (found.partner.address ?? found.partner.city ?? '')) {
    const place = await locate(typed);
    Object.assign(addressChanges, place ?? { address: typed });
    found.partner.address = (addressChanges.address as string) ?? typed;
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('partners')
    .update({ ...addressChanges, is_partner: true, is_published: true, partner_since: now, discount_percent: asked, updated_at: now })
    .eq('id', found.partner.id);
  if (error) throw error;
  await admin.from('partner_invites').update({ status: 'accepted', answered_at: now }).eq('partner_id', found.partner.id);

  // The confirmation the partner keeps: what it agreed to, and the link to its corner of the GRRRR store
  if (found.invite.status !== 'accepted') {
    const storeLink = `${STORE_PARTNERS_URL}?token=${found.invite.token}`;
    const careLink = `https://care.greatrascals.com/partenaire?token=${found.invite.token}`;
    await sendEmail(found.invite.email, `${found.partner.name} est partenaire GRRR Care`, {
      brand: 'care',
      kicker: 'Partenariat confirmé',
      title: 'Bienvenue parmi les partenaires GRRR Care',
      body:
        paragraph('Bonjour,') +
        paragraph(`C'est confirmé : <b>${escape(found.partner.name)}</b> apparaît maintenant comme <b>partenaire</b> dans l'application GRRR Care.`) +
        panel(
          'care',
          'Votre fiche',
          `<b>${escape(found.partner.name)}</b><br>${escape(found.partner.address ?? found.partner.city ?? '')}<br>Réduction pour les membres GRRR : <b>${
            asked ? `${asked} %` : 'aucune'
          }</b>`
        ) +
        paragraph('<b>Vous vendez des produits pour animaux ?</b> Ajoutez-les à notre store : ils seront proposés aux propriétaires, avec votre nom et le lien vers chez vous.'),
      button: { label: 'Ajouter mes produits au store', url: storeLink },
      hint: 'Ce lien est personnel : gardez cet e-mail pour revenir gérer vos produits.',
      signature: "L'équipe GRRR Care",
      footnote: `Pour modifier votre réduction ou vous retirer : <a href="${careLink}" style="color:#6B7280;">votre page partenaire</a>.`,
    }).catch(e => console.error('partner confirmation email error', e));
  }

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail && found.invite.status !== 'accepted') {
    await sendEmail(adminEmail, `Nouveau partenaire : ${found.partner.name}`, {
      brand: 'care',
      kicker: 'Nouveau partenaire',
      title: `${found.partner.name} a accepté l'invitation`,
      body: panel(
        'care',
        CATEGORIES[found.partner.category] ?? found.partner.category,
        `<b>${escape(found.partner.name)}</b><br>${escape(found.partner.address ?? found.partner.city ?? '')}<br>Réduction pour les membres GRRR : <b>${
          asked ? `${asked} %` : 'aucune'
        }</b>`
      ),
    }).catch(e => console.error('admin email error', e));
  }
  return json({ ...inviteView(found), status: 'accepted', discount: asked, listed: true });
}

// "No thanks": never written to again. With remove, the listing also leaves the map.
async function decline(admin: ReturnType<typeof createClient>, body: any) {
  const found = await findInvite(admin, body);
  if (!found) return json({ error: 'Lien invalide ou expiré.' }, 404);
  const now = new Date().toISOString();
  const changes: Record<string, unknown> = { is_partner: false, discount_percent: null, updated_at: now };
  if (body.remove === true) changes.is_published = false;
  const { error } = await admin.from('partners').update(changes).eq('id', found.partner.id);
  if (error) throw error;
  await admin.from('partner_invites').update({ status: 'declined', answered_at: now }).eq('partner_id', found.partner.id);
  return json({ ...inviteView(found), status: 'declined', discount: null, listed: body.remove === true ? false : found.partner.is_published });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  try {
    if (body?.action === 'apply') return await apply(admin, body);
    if (body?.action === 'confirm') return await confirm(admin, body);
    if (body?.action === 'invite') return await invite(admin, body);
    if (body?.action === 'accept') return await accept(admin, body);
    if (body?.action === 'decline') return await decline(admin, body);
    return json({ error: 'Invalid request' }, 400);
  } catch (e) {
    console.error('partner application error', e);
    return json({ error: 'Une erreur est survenue. Réessayez dans un instant.' }, 500);
  }
});
