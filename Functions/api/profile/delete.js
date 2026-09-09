import { verifySession } from '../../_utils/session.js';
import { getCookie } from '../../_utils/cookies.js';

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}

export async function onRequestPost({ request, env }) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const token = getCookie(cookieHeader, 'session');
  const payload = token ? await verifySession(token, env.SESSION_SECRET) : null;

  if (!payload || !payload.exp || payload.exp < Date.now()) {
    return json({ error: 'Not signed in.' }, 401);
  }

  // Delete child rows before the parent user row.
  await env.DB.prepare('DELETE FROM results WHERE user_id = ?').bind(payload.userId).run();
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(payload.userId).run();

  // The account no longer exists, so clear their session too.
  return json({ ok: true }, 200, { 'Set-Cookie': 'session=; Path=/; Max-Age=0' });
}
