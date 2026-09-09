import { onRequestGet as authLogin } from '../Functions/api/auth/login.js';
import { onRequestGet as authCallbackGoogle } from '../Functions/api/auth/callback/google.js';
import { onRequestGet as authLogout } from '../Functions/api/auth/logout.js';
import { onRequestGet as authMe } from '../Functions/api/auth/me.js';
import { onRequestPost as resultsSubmit } from '../Functions/api/results/submit.js';
import { onRequestGet as leaderboardGet } from '../Functions/api/leaderboard.js';
import { onRequestGet as profileHistory } from '../Functions/api/profile/history.js';
import { onRequestGet as profileSettingsGet, onRequestPost as profileSettingsPost } from '../Functions/api/profile/settings.js';
import { onRequestPost as profileDelete } from '../Functions/api/profile/delete.js';

const ROUTES = [
  { method: 'GET', path: '/api/auth/login', handler: authLogin },
  { method: 'GET', path: '/api/auth/callback/google', handler: authCallbackGoogle },
  { method: 'GET', path: '/api/auth/logout', handler: authLogout },
  { method: 'GET', path: '/api/auth/me', handler: authMe },
  { method: 'POST', path: '/api/results/submit', handler: resultsSubmit },
  { method: 'GET', path: '/api/leaderboard', handler: leaderboardGet },
  { method: 'GET', path: '/api/profile/history', handler: profileHistory },
  { method: 'GET', path: '/api/profile/settings', handler: profileSettingsGet },
  { method: 'POST', path: '/api/profile/settings', handler: profileSettingsPost },
  { method: 'POST', path: '/api/profile/delete', handler: profileDelete }
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const route = ROUTES.find(r => r.method === request.method && r.path === url.pathname);

    if (route) {
      try {
        return await route.handler({ request, env });
      } catch (err) {
        return new Response('Internal server error: ' + (err && err.message ? err.message : 'unknown'), {
          status: 500
        });
      }
    }

    // Not an API route - serve the matching static file (index.html, game.html, etc.)
    return env.ASSETS.fetch(request);
  }
};
