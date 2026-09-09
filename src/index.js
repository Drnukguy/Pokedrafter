import { onRequestGet as authLogin } from '../Functions/api/auth/login.js';
import { onRequestGet as authCallbackGoogle } from '../Functions/api/auth/callback/google.js';
import { onRequestGet as authLogout } from '../Functions/api/auth/logout.js';
import { onRequestGet as authMe } from '../Functions/api/auth/me.js';
import { onRequestPost as resultsSubmit } from '../Functions/api/results/submit.js';
import { onRequestGet as leaderboardGet } from '../Functions/api/leaderboard.js';
import { onRequestGet as profileHistory } from '../Functions/api/profile/history.js';
import { onRequestGet as profileSettingsGet, onRequestPost as profileSettingsPost } from '../Functions/api/profile/settings.js';
import { onRequestPost as profileDelete } from '../Functions/api/profile/delete.js';
import { onRequestGet as profileStats } from '../Functions/api/profile/stats.js';
import { onRequestGet as publicProfile } from '../Functions/api/public-profile.js';

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
  { method: 'POST', path: '/api/profile/delete', handler: profileDelete },
  { method: 'GET', path: '/api/profile/stats', handler: profileStats },
  { method: 'GET', path: '/api/public-profile', handler: publicProfile }
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

    // Shareable public profile URLs (/u/42) don't correspond to a real file -
    // serve public-profile.html instead, while the browser's address bar keeps
    // showing /u/42 so the page's own script can read the id back out of it.
    if (request.method === 'GET' && url.pathname.startsWith('/u/')) {
      const rewritten = new Request(new URL('/public-profile.html', url), request);
      let assetResponse = await env.ASSETS.fetch(rewritten);

      // Cloudflare's asset serving redirects /file.html -> /file by default.
      // That redirect would otherwise reach the browser and blow away the real
      // /u/42 URL (and the id in it) - so resolve it ourselves right here and
      // hand back the final page content directly instead of passing it on.
      if (assetResponse.status >= 300 && assetResponse.status < 400) {
        const location = assetResponse.headers.get('Location');
        if (location) {
          assetResponse = await env.ASSETS.fetch(new Request(new URL(location, url), request));
        }
      }

      return assetResponse;
    }

    // Not an API route - serve the matching static file (index.html, game.html, etc.)
    return env.ASSETS.fetch(request);
  }
};
