// Partner products of the GRRRR store (grrrr-store, page /partenaires). The table has no policies (migration 019):
// this function is the only way in, and each action asks for the proof it needs.
//   { action: 'list' }                               published products, for the store's visitors
//   { action: 'mine', token }                        the partner and its products (token of its invitation link)
//   { action: 'add', token, ...fields, image }       adds a product, pending, and emails the admin to review it
//   { action: 'remove', token, id }                  removes one of the partner's products
//   { action: 'review-info', review }                the product a review link is about
//   { action: 'review', review, decision }           publish | reject, from the admin's email
// Secrets: RESEND_API_KEY, EMAIL_FROM and ADMIN_EMAIL (shared with partner-application), STORE_URL (optional).
// Deploy with --no-verify-jwt: the store is public.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { escapeHtml as escape, panel, paragraph, sendEmail } from '../_shared/email.ts';

type Admin = ReturnType<typeof createClient>;

const STORE_URL = (Deno.env.get('STORE_URL') ?? 'https://grrrr-store-89il.vercel.app').replace(/\/$/, '');
const BUCKET = 'store-products';
const MAX_PRODUCTS = 20;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const CATEGORIES: Record<string, string> = {
  accessories: 'Accessoires',
  toys: 'Jouets',
  food: 'Alimentation',
  care: 'Soins',
  services: 'Services',
  other: 'Autre',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isToken = (v: unknown) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const euros = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

// What the store shows of a product: never the review token
const view = (p: any) => ({
  id: p.id,
  name: p.name,
  description: p.description,
  price: euros(p.price_cents),
  category: CATEGORIES[p.category] ?? CATEGORIES.other,
  image: p.image_url,
  url: p.product_url,
  status: p.status,
});

const partnerView = (p: any) => ({
  name: p.name,
  city: p.city,
  address: p.address,
  phone: p.phone,
  website: p.website,
  discount: p.discount_percent,
});

// The invitation link is the partner's key; only establishments that accepted it may sell here
async function findPartner(admin: Admin, token: unknown) {
  if (!isToken(token)) return null;
  const { data: invite } = await admin.from('partner_invites').select('partner_id').eq('token', token).maybeSingle();
  if (!invite) return null;
  const { data: partner } = await admin
    .from('partners')
    .select('id, name, city, address, phone, website, discount_percent, is_partner, is_published')
    .eq('id', invite.partner_id)
    .maybeSingle();
  return partner ?? null;
}

async function list(admin: Admin) {
  const { data, error } = await admin
    .from('store_products')
    .select('*, partner:partners(name, city, address, phone, website, discount_percent, is_partner, is_published)')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  // A partner that left the map takes its products with it
  const products = (data ?? []).filter((p: any) => p.partner?.is_partner && p.partner?.is_published);
  return json({ ok: true, products: products.map((p: any) => ({ ...view(p), partner: partnerView(p.partner) })) });
}

async function mine(admin: Admin, body: any) {
  const partner = await findPartner(admin, body.token);
  if (!partner) return json({ error: 'Lien invalide ou expiré.' }, 404);
  if (!partner.is_partner) return json({ ok: true, partner: partnerView(partner), isPartner: false, products: [] });
  const { data, error } = await admin
    .from('store_products')
    .select('*')
    .eq('partner_id', partner.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return json({ ok: true, partner: partnerView(partner), isPartner: true, products: (data ?? []).map(view), max: MAX_PRODUCTS });
}

function decodeBase64(base64: string) {
  const binary = atob(base64.replace(/^data:[^,]*,/, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function add(admin: Admin, body: any) {
  const partner = await findPartner(admin, body.token);
  if (!partner) return json({ error: 'Lien invalide ou expiré.' }, 404);
  if (!partner.is_partner) return json({ error: "Confirmez d'abord votre partenariat pour ajouter des produits." }, 403);

  const name = text(body.name, 80);
  const description = text(body.description, 600) || null;
  const category = CATEGORIES[body.category] ? body.category : 'other';
  const price = Number(String(body.price ?? '').replace(',', '.'));
  let productUrl = text(body.url, 300) || null;
  if (!name) return json({ error: 'Le nom du produit est requis.' }, 400);
  if (!Number.isFinite(price) || price < 0.5 || price > 10000) return json({ error: 'Le prix doit être compris entre 0,50 € et 10 000 €.' }, 400);
  if (productUrl && !/^https?:\/\//i.test(productUrl)) productUrl = `https://${productUrl}`;
  if (productUrl && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(productUrl)) return json({ error: 'Le lien du produit est invalide.' }, 400);

  const extension = IMAGE_TYPES[body.image?.type];
  if (typeof body.image?.base64 !== 'string' || !extension) return json({ error: 'Ajoutez une photo au format JPG, PNG ou WebP.' }, 400);
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(body.image.base64);
  } catch {
    return json({ error: 'Photo illisible, choisissez-la à nouveau.' }, 400);
  }
  if (bytes.length > MAX_IMAGE_BYTES) return json({ error: 'La photo dépasse 3 Mo.' }, 400);

  const { count } = await admin.from('store_products').select('id', { count: 'exact', head: true }).eq('partner_id', partner.id);
  if ((count ?? 0) >= MAX_PRODUCTS) return json({ error: `Vous avez atteint la limite de ${MAX_PRODUCTS} produits.` }, 400);

  const path = `${partner.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: body.image.type });
  if (uploadError) throw uploadError;

  const { data: product, error } = await admin
    .from('store_products')
    .insert({
      partner_id: partner.id,
      name,
      description,
      price_cents: Math.round(price * 100),
      category,
      image_url: admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
      product_url: productUrl,
    })
    .select('*')
    .single();
  if (error) throw error;

  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await sendEmail(adminEmail, `Produit à valider : ${name} (${partner.name})`, {
      brand: 'store',
      kicker: 'Produit à valider',
      title: `${partner.name} propose un produit`,
      body:
        paragraph(`<b>${escape(partner.name)}</b>${partner.city ? ` (${escape(partner.city)})` : ''} propose un produit pour le rayon Partenaires du store.`) +
        panel(
          'store',
          CATEGORIES[category],
          `<b>${escape(name)}</b> · ${euros(product.price_cents)}${description ? `<br>${escape(description)}` : ''}${productUrl ? `<br>${escape(productUrl)}` : ''}`
        ) +
        `<p style="margin:0 0 16px;"><img src="${product.image_url}" alt="" width="260" style="border-radius:14px;max-width:100%;"></p>`,
      button: { label: 'Voir, puis publier ou refuser', url: `${STORE_URL}/partenaires?review=${product.review_token}` },
      hint: 'Le produit reste invisible sur le store tant que vous ne l’avez pas publié.',
    }).catch(e => console.error('admin email error', e));
  }
  return json({ ok: true, product: view(product) });
}

async function remove(admin: Admin, body: any) {
  const partner = await findPartner(admin, body.token);
  if (!partner || !isToken(body.id)) return json({ error: 'Lien invalide ou expiré.' }, 404);
  const { data: product } = await admin.from('store_products').select('id, image_url').eq('id', body.id).eq('partner_id', partner.id).maybeSingle();
  if (!product) return json({ error: 'Produit introuvable.' }, 404);
  const path = product.image_url?.split(`/${BUCKET}/`)[1];
  if (path) await admin.storage.from(BUCKET).remove([path]);
  const { error } = await admin.from('store_products').delete().eq('id', product.id);
  if (error) throw error;
  return json({ ok: true });
}

async function findReview(admin: Admin, review: unknown) {
  if (!isToken(review)) return null;
  const { data } = await admin
    .from('store_products')
    .select('*, partner:partners(name, city, address, phone, website, discount_percent)')
    .eq('review_token', review)
    .maybeSingle();
  return data ?? null;
}

async function reviewInfo(admin: Admin, body: any) {
  const product = await findReview(admin, body.review);
  if (!product) return json({ error: 'Lien de validation invalide.' }, 404);
  return json({ ok: true, product: { ...view(product), partner: partnerView(product.partner) } });
}

async function review(admin: Admin, body: any) {
  const product = await findReview(admin, body.review);
  if (!product) return json({ error: 'Lien de validation invalide.' }, 404);
  const status = body.decision === 'publish' ? 'published' : body.decision === 'reject' ? 'rejected' : null;
  if (!status) return json({ error: 'Invalid request' }, 400);
  const { error } = await admin.from('store_products').update({ status, updated_at: new Date().toISOString() }).eq('id', product.id);
  if (error) throw error;
  return json({ ok: true, product: { ...view({ ...product, status }), partner: partnerView(product.partner) } });
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
    if (body?.action === 'list') return await list(admin);
    if (body?.action === 'mine') return await mine(admin, body);
    if (body?.action === 'add') return await add(admin, body);
    if (body?.action === 'remove') return await remove(admin, body);
    if (body?.action === 'review-info') return await reviewInfo(admin, body);
    if (body?.action === 'review') return await review(admin, body);
    return json({ error: 'Invalid request' }, 400);
  } catch (e) {
    console.error('store products error', e);
    return json({ error: 'Une erreur est survenue. Réessayez dans un instant.' }, 500);
  }
});
