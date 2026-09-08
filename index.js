import { onRequestGet as authLogin } from '../functions/api/auth/login.js';
import { onRequestGet as authCallbackGoogle } from '../functions/api/auth/callback/google.js';
import { onRequestGet as authLogout } from '../functions/api/auth/logout.js';
import { onRequestGet as authMe } from '../functions/api/auth/me.js';
import { onRequestPost as resultsSubmit } from '../functions/api/results/submit.js';
import { onRequestGet as leaderboardGet } from '../functions/api/leaderboard.js';
import { onRequestGet as profileHistory } from '../functions/api/profile/history.js';

const ROUTES = [
  { method: 'GET', path: '/api/auth/login', handler: authLogin },
  { method: 'GET', path: '/api/auth/callback/google', handler: authCallbackGoogle },
  { method: 'GET', path: '/api/auth/logout', handler: authLogout },
  { method: 'GET', path: '/api/auth/me', handler: authMe },
  { method: 'POST', path: '/api/results/submit', handler: resultsSubmit },
  { method: 'GET', path: '/api/leaderboard', handler: leaderboardGet },
  { method: 'GET', path: '/api/profile/history', handler: profileHistory }
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
