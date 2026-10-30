// Locks every /admin page behind a username and password.
// The real username and password are NOT in this file. They live in Vercel:
// Project → Settings → Environment Variables → ADMIN_USER and ADMIN_PASS.
import { next } from '@vercel/functions';

export const config = { matcher: ['/admin', '/admin/:path*'] };

// Compare two strings without stopping at the first different character.
function same(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function askForLogin() {
  return new Response('Login required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Teacher area", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

export default function proxy(request) {
  const { pathname } = new URL(request.url);
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  if (!isAdmin) return next();

  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) {
    return new Response('Teacher area is locked: set ADMIN_USER and ADMIN_PASS in Vercel, then redeploy.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return askForLogin();

  let decoded = '';
  try {
    const bytes = Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0));
    decoded = new TextDecoder().decode(bytes);
  } catch {
    return askForLogin();
  }
  const split = decoded.indexOf(':');
  if (split < 0) return askForLogin();

  const userOk = same(decoded.slice(0, split), user);
  const passOk = same(decoded.slice(split + 1), pass);
  return userOk && passOk ? next() : askForLogin();
}
