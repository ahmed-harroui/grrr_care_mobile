// Orders and croquettes of the GRRRR store (grrrr-store). The store is paid in croquettes (migration 020).
//   { action: 'packs' }                          the packs of croquettes on sale, and whether buying is open
//   { action: 'order', items, shipping }   (*)   pays an order in croquettes and emails it to the admin
//   { action: 'buy', pack, returnUrl }     (*)   opens a Stripe Checkout page for a pack; returns its url
//   Stripe's webhook (header stripe-signature)   a paid Checkout session credits the croquettes, once
//   (*) signed in: the Authorization header carries the account's Supabase session
// Secrets: ADMIN_EMAIL, RESEND_API_KEY, EMAIL_FROM (order emails), STORE_URL (optional).
// Buying croquettes stays closed until STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set; the webhook to
// declare in Stripe is this function's URL, for the event checkout.session.completed.
// Deploy with --no-verify-jwt: packs and the webhook are public, the rest checks the session itself.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { escapeHtml as escape, panel, paragraph, sendEmail } from '../_shared/email.ts';

type Admin = ReturnType<typeof createClient>;

const STORE_URL = (Deno.env.get('STORE_URL') ?? 'https://grrrr-store-89il.vercel.app').replace(/\/$/, '');
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// 0,50 € the croquette; the largest pack gives 10 more
const PACKS: Record<string, { croquettes: number; cents: number; label: string }> = {
  small: { croquettes: 20, cents: 1000, label: '20 croquettes' },
  medium: { croquettes: 50, cents: 2500, label: '50 croquettes' },
  large: { croquettes: 110, cents: 5000, label: '110 croquettes (dont 10 offertes)' },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

async function signedIn(admin: Admin, req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const { data } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  return data?.user ?? null;
}

async function order(admin: Admin, req: Request, body: any) {
  const user = await signedIn(admin, req);
  if (!user) return json({ error: 'Connecte-toi pour commander.' }, 401);

  const shipping = {
    name: text(body.shipping?.name, 100),
    address: text(body.shipping?.address, 200),
    postcode: text(body.shipping?.postcode, 12),
    city: text(body.shipping?.city, 80),
    phone: text(body.shipping?.phone, 30),
  };
  if (!shipping.name || !shipping.address || !shipping.postcode || !shipping.city) {
    return json({ error: 'Nom, adresse, code postal et ville sont requis pour la livraison.' }, 400);
  }
  if (!Array.isArray(body.items)) return json({ error: 'Panier invalide.' }, 400);
  const items = body.items.slice(0, 20).map((item: any) => ({
    slug: text(item?.slug, 40),
    variant: text(item?.variant, 60),
    quantity: Number(item?.quantity),
  }));

  const { data, error } = await admin.rpc('store_place_order', { p_user: user.id, p_items: items, p_shipping: shipping });
  if (error) {
    if (/NOT_ENOUGH/.test(error.message)) return json({ error: "Tu n'as pas assez de croquettes pour cette commande.", code: 'not_enough' }, 402);
    if (/INVALID_ORDER/.test(error.message)) return json({ error: 'Panier invalide.' }, 400);
    throw error;
  }

  const lines = (data.items as any[])
    .map(i => `${i.quantity} × <b>${escape(i.name)}</b>${i.variant ? ` (${escape(i.variant)})` : ''} · ${i.croquettes * i.quantity} croquettes`)
    .join('<br>');
  const basket = panel('store', 'La commande', `${lines}<br><b>Total : ${data.total} croquettes</b>`);
  const where = `${escape(shipping.name)}<br>${escape(shipping.address)}<br>${escape(shipping.postcode)} ${escape(shipping.city)}${
    shipping.phone ? `<br>${escape(shipping.phone)}` : ''
  }`;
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  if (adminEmail) {
    await sendEmail(adminEmail, `Nouvelle commande du store : ${data.total} croquettes`, {
      brand: 'store',
      kicker: 'Nouvelle commande',
      title: `${data.total} croquettes, à expédier`,
      body: paragraph(`Commande de <b>${escape(user.email ?? '')}</b><br><span style="font-size:13px;color:#666666;">${data.order}</span>`) + basket + panel('store', 'À expédier à', where),
    }).catch(e => console.error('admin order email error', e));
  }
  if (user.email) {
    await sendEmail(user.email, 'Ta commande GRRRR est confirmée', {
      brand: 'store',
      kicker: 'Commande confirmée',
      title: 'Merci ! Ton colis se prépare',
      body: paragraph('Ta commande est enregistrée et tes croquettes ont été débitées. On te prévient dès que le colis part.') + basket + panel('store', 'Livraison', where),
      button: { label: 'Retourner à la boutique', url: STORE_URL },
      signature: "L'équipe GRRRR",
    }).catch(e => console.error('buyer order email error', e));
  }
  return json({ ok: true, order: data.order, total: data.total, balance: data.balance });
}

async function buy(admin: Admin, req: Request, body: any) {
  if (!STRIPE_KEY || !STRIPE_WEBHOOK_SECRET) return json({ error: "L'achat de croquettes ouvre bientôt.", code: 'closed' }, 503);
  const user = await signedIn(admin, req);
  if (!user) return json({ error: 'Connecte-toi pour acheter des croquettes.' }, 401);
  const pack = PACKS[body.pack];
  if (!pack) return json({ error: 'Pack inconnu.' }, 400);

  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(pack.cents),
    'line_items[0][price_data][product_data][name]': `GRRRR · ${pack.label}`,
    client_reference_id: user.id,
    'metadata[croquettes]': String(pack.croquettes),
    'metadata[pack]': body.pack,
    success_url: `${STORE_URL}/?croquettes=merci`,
    cancel_url: `${STORE_URL}/?croquettes=annule`,
  });
  if (user.email) form.set('customer_email', user.email);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const session = await res.json();
  if (!res.ok) {
    console.error('stripe checkout error', res.status, session);
    return json({ error: 'Le paiement est indisponible pour le moment.' }, 502);
  }
  return json({ ok: true, url: session.url });
}

// Stripe signs "<timestamp>.<raw body>" with the webhook secret (HMAC SHA-256, hex), header t=…,v1=…
async function verifiedEvent(raw: string, header: string) {
  const parts = Object.fromEntries(header.split(',').map(part => part.split('=') as [string, string]));
  const timestamp = Number(parts.t);
  if (!timestamp || !parts.v1 || Math.abs(Date.now() / 1000 - timestamp) > 300) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(STRIPE_WEBHOOK_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parts.t}.${raw}`));
  const expected = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');
  // Same length always; compared without stopping at the first difference
  let different = expected.length ^ parts.v1.length;
  for (let i = 0; i < expected.length; i++) different |= expected.charCodeAt(i) ^ (parts.v1.charCodeAt(i) || 0);
  return different === 0 ? JSON.parse(raw) : null;
}

async function webhook(admin: Admin, req: Request) {
  if (!STRIPE_WEBHOOK_SECRET) return json({ error: 'closed' }, 503);
  const event = await verifiedEvent(await req.text(), req.headers.get('stripe-signature') ?? '');
  if (!event) return json({ error: 'Invalid signature' }, 400);
  if (event.type !== 'checkout.session.completed') return json({ received: true });

  const session = event.data.object;
  const pack = PACKS[session.metadata?.pack];
  // The amount paid must be the pack's: the croquettes credited are ours, not what the session claims
  if (session.payment_status !== 'paid' || !session.client_reference_id || !pack || session.amount_total !== pack.cents) {
    console.error('stripe session ignored', session.id, session.payment_status, session.amount_total);
    return json({ received: true });
  }
  const { error } = await admin.rpc('store_credit_croquettes', {
    p_user: session.client_reference_id,
    p_croquettes: pack.croquettes,
    p_amount_cents: pack.cents,
    p_provider_ref: session.id,
  });
  if (error) {
    // 500: Stripe sends the event again later
    console.error('croquettes not credited', session.id, error);
    return json({ error: 'not credited' }, 500);
  }
  return json({ received: true });
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  try {
    if (req.headers.get('stripe-signature')) return await webhook(admin, req);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }
    if (body?.action === 'packs') {
      return json({
        ok: true,
        open: Boolean(STRIPE_KEY && STRIPE_WEBHOOK_SECRET),
        packs: Object.entries(PACKS).map(([key, pack]) => ({ key, croquettes: pack.croquettes, price: `${(pack.cents / 100).toFixed(0)} €`, label: pack.label })),
      });
    }
    if (body?.action === 'order') return await order(admin, req, body);
    if (body?.action === 'buy') return await buy(admin, req, body);
    return json({ error: 'Invalid request' }, 400);
  } catch (e) {
    console.error('store checkout error', e);
    return json({ error: 'Une erreur est survenue. Réessaie dans un instant.' }, 500);
  }
});
