/**
 * Worker de la API (npm test, runner de Vitest para Workers). R2 es el de
 * Miniflare en local. Los tokens se firman con una llave de prueba y el Worker
 * la recibe en lugar de las llaves públicas de Google.
 */
import { env } from 'cloudflare:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Env } from '../src/env';
import { createHandler } from '../src/handler';
import { detectarTipo } from '../src/imagenes';
import { AVIF, PNG, WEBP } from './archivos';

const PROYECTO = 'nexbytes';
const ADMIN = 'uid-admin';
const ORIGEN = 'http://localhost:4321';

let llavePrivada: CryptoKey;
let llaves: JWTVerifyGetKey;

beforeAll(async () => {
  const par = await generateKeyPair('RS256');
  llavePrivada = par.privateKey;
  llaves = createLocalJWKSet({ keys: [{ ...(await exportJWK(par.publicKey)), kid: 'prueba', alg: 'RS256' }] });
});

/** ID token como los de Firebase; cada prueba cambia lo que necesite. */
async function token(cambios: { sub?: string; aud?: string; iss?: string; exp?: number } = {}) {
  const ahora = Math.floor(Date.now() / 1000);
  return new SignJWT({ auth_time: ahora })
    .setProtectedHeader({ alg: 'RS256', kid: 'prueba' })
    .setIssuer(cambios.iss ?? `https://securetoken.google.com/${PROYECTO}`)
    .setAudience(cambios.aud ?? PROYECTO)
    .setSubject(cambios.sub ?? ADMIN)
    .setIssuedAt(ahora)
    .setExpirationTime(cambios.exp ?? ahora + 3600)
    .sign(llavePrivada);
}

const entorno = (extra: Partial<Env> = {}): Env => ({
  BUCKET: env.BUCKET,
  FIREBASE_PROJECT_ID: PROYECTO,
  ALLOWED_ORIGINS: 'http://localhost:4321,https://nexbytes1.web.app,https://nexbytes1--*.web.app',
  ADMIN_UID: ADMIN,
  ...extra,
});

async function subir(
  archivo: Uint8Array,
  opciones: { prefijo?: string; slug?: string; tipo?: string; nombre?: string; autorizacion?: string } = {},
) {
  const formulario = new FormData();
  formulario.set('archivo', new File([archivo], opciones.nombre ?? 'imagen.webp', { type: opciones.tipo ?? 'image/webp' }));
  formulario.set('prefijo', opciones.prefijo ?? 'proyectos');
  if (opciones.slug !== undefined) formulario.set('slug', opciones.slug);
  // El cuerpo se arma antes para enviar Content-Length, como hace el navegador.
  // Del mismo Response: cada uno elige su propio separador del multipart.
  const serializado = new Response(formulario);
  const tipo = serializado.headers.get('Content-Type')!;
  const cuerpo = await serializado.arrayBuffer();
  return createHandler({ llaves })(
    new Request('https://api.test/upload', {
      method: 'POST',
      headers: {
        Origin: ORIGEN,
        Authorization: opciones.autorizacion ?? `Bearer ${await token()}`,
        'Content-Type': tipo,
        'Content-Length': String(cuerpo.byteLength),
      },
      body: cuerpo,
    }),
    entorno(),
  );
}

async function borrar(path: string) {
  return createHandler({ llaves })(
    new Request('https://api.test/upload', {
      method: 'DELETE',
      headers: { Origin: ORIGEN, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    }),
    entorno(),
  );
}

async function publicar(cuerpo: unknown, extra: Partial<Env> = {}, fetchFn?: typeof fetch) {
  return createHandler({ llaves, fetch: fetchFn })(
    new Request('https://api.test/publish', {
      method: 'POST',
      headers: { Origin: ORIGEN, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    }),
    entorno(extra),
  );
}

describe('token de Firebase', () => {
  it('válido: sube la imagen', async () => {
    const r = await subir(WEBP, { slug: 'wp-producciones' });
    expect(r.status).toBe(201);
    const { path } = (await r.json()) as { path: string };
    expect(path).toMatch(/^proyectos\/wp-producciones-[0-9a-f]{10}\.webp$/);
    const guardado = await env.BUCKET.get(path);
    expect(guardado?.httpMetadata?.contentType).toBe('image/webp');
    expect(new Uint8Array(await guardado!.arrayBuffer())).toEqual(WEBP);
  });

  it('vencido: 401', async () => {
    const r = await subir(WEBP, { autorizacion: `Bearer ${await token({ exp: Math.floor(Date.now() / 1000) - 60 })}` });
    expect(r.status).toBe(401);
  });

  it('de otro UID: 401', async () => {
    const r = await subir(WEBP, { autorizacion: `Bearer ${await token({ sub: 'otro-uid' })}` });
    expect(r.status).toBe(401);
  });

  it('con aud de otro proyecto: 401', async () => {
    const r = await subir(WEBP, { autorizacion: `Bearer ${await token({ aud: 'otro-proyecto' })}` });
    expect(r.status).toBe(401);
  });

  it('con iss de otro proyecto o sin token: 401', async () => {
    expect((await subir(WEBP, { autorizacion: `Bearer ${await token({ iss: 'https://securetoken.google.com/otro' })}` })).status).toBe(401);
    expect((await subir(WEBP, { autorizacion: '' })).status).toBe(401);
  });

  it('firmado con otra llave: 401', async () => {
    const otra = await generateKeyPair('RS256');
    const falso = await new SignJWT({ auth_time: 1 })
      .setProtectedHeader({ alg: 'RS256', kid: 'prueba' })
      .setIssuer(`https://securetoken.google.com/${PROYECTO}`)
      .setAudience(PROYECTO)
      .setSubject(ADMIN)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(otra.privateKey);
    expect((await subir(WEBP, { autorizacion: `Bearer ${falso}` })).status).toBe(401);
  });
});

describe('POST /upload', () => {
  it('un PNG que se hace pasar por WebP: 415', async () => {
    const r = await subir(PNG, { tipo: 'image/webp', nombre: 'foto.webp' });
    expect(r.status).toBe(415);
    expect(await r.json()).toEqual({ error: 'Solo se aceptan imágenes WebP o AVIF.' });
  });

  it('AVIF real: se guarda como .avif con su Content-Type, aunque el navegador diga otra cosa', async () => {
    const r = await subir(AVIF, { prefijo: 'nosotros', slug: 'fernando', tipo: 'application/octet-stream', nombre: 'x.bin' });
    expect(r.status).toBe(201);
    const { path } = (await r.json()) as { path: string };
    expect(path).toMatch(/^nosotros\/fernando-[0-9a-f]{10}\.avif$/);
    expect((await env.BUCKET.head(path))?.httpMetadata?.contentType).toBe('image/avif');
  });

  it('sin slug usa "imagen"; el mismo contenido da el mismo nombre', async () => {
    const a = (await (await subir(WEBP, { prefijo: 'general' })).json()) as { path: string };
    const b = (await (await subir(WEBP, { prefijo: 'general' })).json()) as { path: string };
    expect(a.path).toMatch(/^general\/imagen-[0-9a-f]{10}\.webp$/);
    expect(b.path).toBe(a.path);
  });

  it('prefijo no permitido: 400', async () => {
    for (const prefijo of ['privado', '../proyectos', 'proyectos/sub', '']) {
      expect((await subir(WEBP, { prefijo })).status).toBe(400);
    }
  });

  it('slug inválido: 400', async () => {
    expect((await subir(WEBP, { slug: '../../etc' })).status).toBe(400);
    expect((await subir(WEBP, { slug: 'Con Mayúsculas' })).status).toBe(400);
  });

  it('tamaño excedido: 413 (archivo de más de 2 MB, aunque empiece como WebP)', async () => {
    const grande = new Uint8Array(2 * 1024 * 1024 + 1);
    grande.set(WEBP);
    const r = await subir(grande);
    expect(r.status).toBe(413);
  });

  it('Content-Length enorme se rechaza antes de leer el cuerpo; sin Content-Length, 411', async () => {
    const handler = createHandler({ llaves });
    const autorizacion = `Bearer ${await token()}`;
    const enorme = await handler(
      new Request('https://api.test/upload', {
        method: 'POST',
        headers: { Authorization: autorizacion, 'Content-Type': 'multipart/form-data; boundary=x', 'Content-Length': String(50 * 1024 * 1024) },
        body: 'x',
      }),
      entorno(),
    );
    expect(enorme.status).toBe(413);
    const sinLargo = await handler(
      new Request('https://api.test/upload', { method: 'POST', headers: { Authorization: autorizacion }, body: 'x' }),
      entorno(),
    );
    expect(sinLargo.status).toBe(411);
  });
});

describe('DELETE /upload', () => {
  it('borra una imagen de un prefijo permitido', async () => {
    const { path } = (await (await subir(WEBP, { slug: 'para-borrar' })).json()) as { path: string };
    expect(await env.BUCKET.head(path)).not.toBeNull();
    expect((await borrar(path)).status).toBe(204);
    expect(await env.BUCKET.head(path)).toBeNull();
  });

  it('fuera de los prefijos permitidos: 400 y no toca nada', async () => {
    await env.BUCKET.put('privado/secreto.webp', WEBP);
    for (const path of ['privado/secreto.webp', '../privado/secreto.webp', 'proyectos/../privado/secreto.webp', 'proyectos/sub/x.webp', 'proyectos/x.png', '']) {
      expect((await borrar(path)).status).toBe(400);
    }
    expect(await env.BUCKET.head('privado/secreto.webp')).not.toBeNull();
  });
});

describe('POST /publish', () => {
  const solicitud = { publicacionId: 'aB3dE6gH9jK2mN5pQ8sT', tipo: 'preview' };

  it('sin GITHUB_TOKEN: 503 "Publicación automática no configurada"', async () => {
    const fetchFalso = vi.fn<typeof fetch>();
    const r = await publicar(solicitud, { GITHUB_REPO: 'Krasaid/nexbytes' }, fetchFalso);
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ error: 'Publicación automática no configurada' });
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('con token: llama a repository_dispatch con el payload', async () => {
    const fetchFalso = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const r = await publicar(solicitud, { GITHUB_REPO: 'Krasaid/nexbytes', GITHUB_TOKEN: 'github_pat_prueba' }, fetchFalso);
    expect(r.status).toBe(202);

    const [url, init] = fetchFalso.mock.calls[0];
    expect(url).toBe('https://api.github.com/repos/Krasaid/nexbytes/dispatches');
    expect(init?.method).toBe('POST');
    const cabeceras = new Headers(init?.headers);
    expect(cabeceras.get('Authorization')).toBe('Bearer github_pat_prueba');
    expect(cabeceras.get('Accept')).toBe('application/vnd.github+json');
    expect(cabeceras.get('User-Agent')).toBe('nexbytes-api');
    expect(JSON.parse(init?.body as string)).toEqual({ event_type: 'publicar', client_payload: solicitud });
  });

  it('si GitHub rechaza: 502 con el estado', async () => {
    const fetchFalso = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 401 }));
    const r = await publicar(solicitud, { GITHUB_REPO: 'Krasaid/nexbytes', GITHUB_TOKEN: 'vencido' }, fetchFalso);
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: 'GitHub rechazó la publicación (HTTP 401).' });
  });

  it('cuerpo inválido: 400 (antes de mirar la configuración)', async () => {
    for (const cuerpo of [{ ...solicitud, tipo: 'staging' }, { ...solicitud, publicacionId: '../x' }, {}]) {
      expect((await publicar(cuerpo)).status).toBe(400);
    }
  });
});

describe('CORS y rutas', () => {
  const pedir = (init: RequestInit & { origen?: string; ruta?: string }) =>
    createHandler({ llaves })(
      new Request(`https://api.test${init.ruta ?? '/upload'}`, {
        ...init,
        headers: { ...(init.origen ? { Origin: init.origen } : {}), ...(init.headers as Record<string, string>) },
      }),
      entorno(),
    );

  it('preflight de un origen permitido, incluidos los canales de preview', async () => {
    for (const origen of ['http://localhost:4321', 'https://nexbytes1.web.app', 'https://nexbytes1--preview-x7k2.web.app']) {
      const r = await pedir({ method: 'OPTIONS', origen });
      expect(r.status).toBe(204);
      expect(r.headers.get('Access-Control-Allow-Origin')).toBe(origen);
      expect(r.headers.get('Access-Control-Allow-Methods')).toBe('POST, DELETE, OPTIONS');
      expect(r.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    }
  });

  it('otros orígenes: 403 sin cabeceras CORS', async () => {
    for (const origen of ['https://evil.example', 'https://nexbytes1.web.app.evil.example', 'https://nexbytes1--x.web.app.evil', 'https://otro--x.web.app']) {
      const r = await pedir({ method: 'OPTIONS', origen });
      expect(r.status).toBe(403);
      expect(r.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
  });

  it('sin Origin (terminal) pasa a la verificación del token; rutas y métodos desconocidos', async () => {
    expect((await pedir({ method: 'POST' })).status).toBe(401);
    expect((await pedir({ method: 'GET', origen: ORIGEN })).status).toBe(405);
    expect((await pedir({ method: 'POST', origen: ORIGEN, ruta: '/otra' })).status).toBe(404);
  });
});

describe('detectarTipo', () => {
  it('por los primeros bytes, no por el nombre ni el Content-Type', () => {
    expect(detectarTipo(WEBP)).toBe('webp');
    expect(detectarTipo(AVIF)).toBe('avif');
    expect(detectarTipo(PNG)).toBeNull();
    expect(detectarTipo(new TextEncoder().encode('RIFF....WAVEfmt '))).toBeNull(); // RIFF pero no WebP
    expect(detectarTipo(new Uint8Array(4))).toBeNull();
  });
});
