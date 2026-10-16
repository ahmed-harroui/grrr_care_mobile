// The admin's morning email: the problems found in the data (public.admin_alerts, migration 028),
// when there is at least one critical or warning one. Called every morning by pg_cron
// (send_admin_alerts) with the push webhook's secret; nothing is sent on a quiet day.
// Secrets: PUSH_WEBHOOK_SECRET, ADMIN_EMAIL, RESEND_API_KEY, EMAIL_FROM.
// Deploy: supabase functions deploy admin-alerts --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';
import { escapeHtml as escape, panel, paragraph, sendEmail } from '../_shared/email.ts';

type Alert = { level: 'critical' | 'warning' | 'info'; key: string; title: string; detail: string };

const DASHBOARD = 'https://www.greatrascals.com/dashboard';
const LABEL = { critical: '🔴 À réparer', warning: '🟠 À regarder', info: '🔵 Bon à savoir' } as const;

Deno.serve(async (request) => {
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret || request.headers.get('x-webhook-secret') !== secret) return new Response('Forbidden', { status: 403 });
  const to = Deno.env.get('ADMIN_EMAIL');
  if (!to) return Response.json({ error: 'ADMIN_EMAIL is not set' }, { status: 500 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc('admin_alerts');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const alerts = (data ?? []) as Alert[];
  const urgent = alerts.filter((a) => a.level !== 'info');
  // A quiet day: no email
  if (urgent.length === 0) return Response.json({ sent: false, alerts: alerts.length });

  const order = ['critical', 'warning', 'info'] as const;
  const body = [
    paragraph(`${urgent.length} point${urgent.length > 1 ? 's' : ''} à voir ce matin dans les apps GRRR.`),
    ...order.flatMap((level) => alerts.filter((a) => a.level === level).map((a) => panel('care', LABEL[level], `<b>${escape(a.title)}</b><br>${escape(a.detail)}`))),
  ].join('');
  const critical = alerts.some((a) => a.level === 'critical');
  await sendEmail(to, `${critical ? '🔴' : '🟠'} ${urgent[0].title}${urgent.length > 1 ? ` (+${urgent.length - 1})` : ''}`, {
    brand: 'care',
    kicker: 'Alertes du matin',
    title: critical ? 'Quelque chose ne marche plus' : 'Quelques points à regarder',
    body,
    button: { label: 'Ouvrir le tableau de bord', url: DASHBOARD },
    footnote: 'Envoyé chaque matin seulement quand il y a quelque chose à voir.',
  });
  return Response.json({ sent: true, alerts: alerts.length });
});
