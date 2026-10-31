// Runs on Vercel before /admin and /quiz pages are sent.
//  - Locks every /admin page behind a username and password.
//  - Hides a quiz page (404) unless visible.json says that quiz is shown.
//  - /admin/visibility reads and saves visible.json in the site's GitHub repo; Vercel then redeploys.
// No secrets are in this file. They live in Vercel: Project → Settings → Environment Variables:
//   ADMIN_USER, ADMIN_PASS  the teacher's login
//   GITHUB_TOKEN            fine-grained token with "Contents: Read and write" on the site repo only
//   GITHUB_REPO (optional)  "owner/name"; Vercel's own VERCEL_GIT_REPO_OWNER/SLUG are used when it is not set
//   GITHUB_BRANCH (optional, default "main")
// Which paths run this file is set in vercel.json (proxy.matcher). Vercel refuses to build if it is set here too.
import { next } from '@vercel/functions';

const FILE = 'visible.json';

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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

function notFound() {
  return new Response('This quiz is not open right now.', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// Returns null when the login is right, or the response to send back when it is not.
function checkLogin(request) {
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
  return userOk && passOk ? null : askForLogin();
}

// visible.json as this deployment serves it. Anything missing or unreadable counts as hidden.
async function deployedVisible(request) {
  try {
    const r = await fetch(new URL('/' + FILE, request.url), { cache: 'no-store' });
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
}

// ---------- visible.json in GitHub ----------
function github() {
  const repo = process.env.GITHUB_REPO
    || (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}` : '');
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return null;
  return {
    url: `https://api.github.com/repos/${repo}/contents/${FILE}`,
    branch: process.env.GITHUB_BRANCH || 'main',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'class10-quiz-admin' },
  };
}

async function readGithub(gh) {
  const r = await fetch(`${gh.url}?ref=${encodeURIComponent(gh.branch)}`, { headers: gh.headers, cache: 'no-store' });
  if (r.status === 404) return { visible: {}, sha: undefined };
  if (!r.ok) throw new Error(`GitHub said ${r.status} when reading ${FILE}. Check GITHUB_TOKEN.`);
  const j = await r.json();
  return { visible: JSON.parse(atob(j.content.replace(/\n/g, ''))), sha: j.sha };
}

async function writeGithub(gh, visible, sha) {
  const shown = Object.keys(visible).filter((k) => visible[k]).join(', ') || 'none';
  return fetch(gh.url, {
    method: 'PUT',
    headers: { ...gh.headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Show quizzes: ${shown}`,
      content: btoa(JSON.stringify(visible, null, 2) + '\n'),
      branch: gh.branch,
      ...(sha ? { sha } : {}),
    }),
  });
}

async function visibility(request) {
  const gh = github();
  if (!gh) return json({ error: 'Set GITHUB_TOKEN in Vercel, then redeploy.' }, 503);
  try {
    if (request.method === 'GET') return json({ visible: (await readGithub(gh)).visible });
    if (request.method !== 'POST') return json({ error: 'Use GET or POST.' }, 405);

    const body = await request.json().catch(() => null);
    const ok = body && typeof body === 'object' && !Array.isArray(body)
      && Object.entries(body).every(([k, v]) => /^[a-z0-9-]{1,40}$/.test(k) && typeof v === 'boolean');
    if (!ok) return json({ error: 'Expected {"unit": true/false, ...}.' }, 400);

    // Retry once if someone else saved in between (GitHub answers 409 when the sha is stale).
    for (let attempt = 0; attempt < 2; attempt++) {
      const cur = await readGithub(gh);
      const visible = { ...cur.visible, ...body };
      const r = await writeGithub(gh, visible, cur.sha);
      if (r.ok) return json({ visible });
      if (r.status !== 409) return json({ error: `GitHub said ${r.status} when saving. Check GITHUB_TOKEN has write access.` }, 502);
    }
    return json({ error: 'Someone else saved at the same moment. Try again.' }, 409);
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}

export default async function proxy(request) {
  const { pathname } = new URL(request.url);

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const denied = checkLogin(request);
    if (denied) return denied;
    if (pathname === '/admin/visibility') return visibility(request);
    return next();
  }

  // /quiz/strings or /quiz/strings.html → "strings"
  const m = pathname.match(/^\/quiz\/([a-z0-9-]+)(?:\.html)?\/?$/);
  if (m) return (await deployedVisible(request))[m[1]] === true ? next() : notFound();
  return next();
}
