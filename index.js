import menuHtml from './menu_privado.html';
import entradaHtml from './entrada.html';

const enc = new TextEncoder();
const UUID = /^[0-9a-f-]{36}$/i;

async function firmar(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return [...new Uint8Array(sig)]
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

async function crearToken(env, id) {
  const exp = Date.now() + 3600 * 1000; // dura 1 hora
  return `${id}.${exp}.${await firmar(env.SECRET, `${id}.${exp}`)}`;
}

// Devuelve el id del equipo si el token es válido, o null
async function verificarToken(env, token = '') {
  const [id, exp, firma] = token.split('.');
  if (!id || !exp || !firma || Date.now() > Number(exp)) return null;
  const esperada = await firmar(env.SECRET, `${id}.${exp}`);
  if (firma.length !== esperada.length) return null;
  const ok = crypto.subtle.timingSafeEqual(enc.encode(firma), enc.encode(esperada));
  return ok ? id : null;
}

async function autorizado(env, id) {
  if (!UUID.test(id || '')) return false;
  const d = await env.DISPOSITIVOS.get(id, 'json');
  return !!d && new Date(d.expira) > new Date();
}

function leerCookie(req, nombre) {
  const c = req.headers.get('Cookie') || '';
  const m = c.match(new RegExp('(?:^|; )' + nombre + '=([^;]+)'));
  return m ? m[1] : '';
}

const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // Página pública
    if (url.pathname === '/') return html(entradaHtml);

    // El equipo pide acceso
    if (url.pathname === '/api/auth') {
      const id = url.searchParams.get('id');
      if (!(await autorizado(env, id))) {
        return Response.json({ ok: false }, { status: 403 });
      }
      const token = await crearToken(env, id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `tok=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
        },
      });
    }

    // Menú privado: token válido Y equipo todavía autorizado
    if (url.pathname === '/menu') {
      const id = await verificarToken(env, leerCookie(req, 'tok'));
      if (!id || !(await autorizado(env, id))) {
        return html('Acceso denegado', 403);
      }
      return html(menuHtml);
    }

    return new Response('No encontrado', { status: 404 });
  },
};
