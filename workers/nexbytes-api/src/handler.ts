/**
 * Rutas del Worker (las dependencias se inyectan para las pruebas):
 *   POST   /upload   multipart: archivo, prefijo, slug → 201 { path }
 *   DELETE /upload   JSON { path } → 204
 *   POST   /publish  JSON { publicacionId, tipo } → 202 (503 si GitHub no está configurado)
 * Todas piden el ID token de Firebase de la cuenta admin (Authorization: Bearer).
 * CORS: solo los orígenes de ALLOWED_ORIGINS; sin Origin (terminal) no hay cabeceras CORS.
 * /upload tiene un límite por cuenta (SUBIDAS_POR_HORA). Ningún error devuelve
 * detalles internos: lo inesperado responde 500 genérico y queda en los registros.
 */
import type { JWTVerifyGetKey } from 'jose';

import { verificarToken } from './auth';
import { origenPermitido } from './cors';
import type { Env } from './env';
import { claveDe, detectarTipo, esPrefijo, MAX_BYTES, rutaBorrable, slugValido, TIPOS } from './imagenes';
import { dispararPublicacion, leerSolicitud } from './publicar';

export interface Dependencias {
  /** Llaves para verificar el token (por defecto, las públicas de Google). */
  llaves?: JWTVerifyGetKey;
  /** fetch hacia GitHub (simulado en las pruebas). */
  fetch?: typeof fetch;
}

/** Margen del multipart (límites y encabezados) sobre el tamaño del archivo. */
const MARGEN_MULTIPART = 64 * 1024;

const MENSAJES = {
  origen: 'Origen no permitido.',
  ruta: 'Ruta no encontrada.',
  metodo: 'Método no permitido.',
  sesion: 'Debes iniciar sesión.',
  token: 'La sesión no es válida o la cuenta no está autorizada.',
  sinTamano: 'Se requiere un archivo con tamaño conocido.',
  tamano: 'La imagen pesa más de 2 MB.',
  formulario: 'Envía la imagen como formulario (multipart) con el campo "archivo".',
  prefijo: 'Prefijo no permitido. Usa proyectos, nosotros, seo o general.',
  slug: 'El nombre solo puede tener minúsculas, números y guiones.',
  tipo: 'Solo se aceptan imágenes WebP o AVIF.',
  rutaBorrar: 'Solo se pueden borrar imágenes de proyectos/, nosotros/, seo/ o general/.',
  r2: 'No se pudo guardar en R2. Intenta de nuevo.',
  solicitud: 'Solicitud inválida: se espera { publicacionId, tipo: "produccion" | "preview" }.',
  sinGithub: 'Publicación automática no configurada',
  github: (estado: number) => `GitHub rechazó la publicación (HTTP ${estado}).`,
  limite: (minutos: number) => `Demasiadas subidas seguidas. Intenta de nuevo en ${minutos} min.`,
  interno: 'Error interno. Intenta de nuevo.',
} as const;

const HORA_MS = 60 * 60 * 1000;

export function createHandler(deps: Dependencias = {}) {
  const atender = crearAtencion(deps);
  return async function fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await atender(request, env);
    } catch (e) {
      // Sin detalles hacia afuera (ni el mensaje ni la traza); el detalle queda en `wrangler tail`.
      console.error('nexbytes-api: error inesperado', e);
      const cabeceras = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      const origen = request.headers.get('Origin');
      if (origen && origenPermitido(origen, env.ALLOWED_ORIGINS ?? '')) cabeceras.set('Access-Control-Allow-Origin', origen);
      return new Response(JSON.stringify({ error: MENSAJES.interno }), { status: 500, headers: cabeceras });
    }
  };
}

function crearAtencion(deps: Dependencias) {
  return async function atender(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origen = request.headers.get('Origin');
    const cabeceras = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' });

    const json = (cuerpo: Record<string, unknown>, estado: number) => {
      const h = new Headers(cabeceras);
      h.set('Content-Type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify(cuerpo), { status: estado, headers: h });
    };
    const error = (mensaje: string, estado: number) => json({ error: mensaje }, estado);

    // Un navegador desde otro sitio no pasa; sin Origin (curl, servidores) decide el token.
    if (origen !== null) {
      if (!origenPermitido(origen, env.ALLOWED_ORIGINS)) return error(MENSAJES.origen, 403);
      cabeceras.set('Access-Control-Allow-Origin', origen);
    }

    const metodos = url.pathname === '/upload' ? 'POST, DELETE' : url.pathname === '/publish' ? 'POST' : null;
    if (!metodos) return error(MENSAJES.ruta, 404);

    if (request.method === 'OPTIONS') {
      cabeceras.set('Access-Control-Allow-Methods', `${metodos}, OPTIONS`);
      cabeceras.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      cabeceras.set('Access-Control-Max-Age', '600');
      return new Response(null, { status: 204, headers: cabeceras });
    }
    if (!metodos.split(', ').includes(request.method)) return error(MENSAJES.metodo, 405);

    const token = request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9._-]+)$/)?.[1];
    if (!token) return error(MENSAJES.sesion, 401);
    let uid: string;
    try {
      uid = await verificarToken(token, env.FIREBASE_PROJECT_ID, env.ADMIN_UID, deps.llaves);
    } catch {
      return error(MENSAJES.token, 401);
    }

    if (url.pathname === '/publish') {
      const solicitud = leerSolicitud(await request.json().catch(() => null));
      if (!solicitud) return error(MENSAJES.solicitud, 400);
      if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return error(MENSAJES.sinGithub, 503);
      try {
        const resultado = await dispararPublicacion(solicitud, env.GITHUB_REPO, env.GITHUB_TOKEN, deps.fetch);
        return resultado.ok ? json({ ok: true }, 202) : error(MENSAJES.github(resultado.estado), 502);
      } catch {
        return error(MENSAJES.github(0), 502);
      }
    }

    if (request.method === 'DELETE') {
      const cuerpo = (await request.json().catch(() => null)) as { path?: unknown } | null;
      if (!rutaBorrable(cuerpo?.path)) return error(MENSAJES.rutaBorrar, 400);
      await env.BUCKET.delete(cuerpo.path);
      return new Response(null, { status: 204, headers: cabeceras });
    }

    // POST /upload. Primero el límite por cuenta y el tamaño, antes de leer el cuerpo.
    const maximo = Number(env.SUBIDAS_POR_HORA) || 60;
    const limite = await env.LIMITE_SUBIDAS.get(env.LIMITE_SUBIDAS.idFromName(uid)).consumir(maximo, HORA_MS);
    if (!limite.permitido) {
      const respuesta = error(MENSAJES.limite(Math.ceil(limite.reintentarEn / 60)), 429);
      respuesta.headers.set('Retry-After', String(limite.reintentarEn));
      return respuesta;
    }

    const largo = Number(request.headers.get('Content-Length'));
    if (!request.headers.has('Content-Length') || !Number.isFinite(largo)) return error(MENSAJES.sinTamano, 411);
    if (largo > MAX_BYTES + MARGEN_MULTIPART) return error(MENSAJES.tamano, 413);

    const formulario = await request.formData().catch(() => null);
    const archivo = formulario?.get('archivo');
    if (!formulario || !archivo || typeof archivo === 'string') return error(MENSAJES.formulario, 400);
    if (archivo.size > MAX_BYTES) return error(MENSAJES.tamano, 413);

    const prefijo = formulario.get('prefijo');
    if (!esPrefijo(prefijo)) return error(MENSAJES.prefijo, 400);
    const slug = slugValido(formulario.get('slug'));
    if (!slug) return error(MENSAJES.slug, 400);

    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const extension = detectarTipo(bytes);
    if (!extension) return error(MENSAJES.tipo, 415);

    const clave = await claveDe(prefijo, slug, bytes, extension);
    try {
      await env.BUCKET.put(clave, bytes, {
        httpMetadata: { contentType: TIPOS[extension], cacheControl: 'public, max-age=31536000, immutable' },
      });
    } catch {
      return error(MENSAJES.r2, 503);
    }
    return json({ path: clave }, 201);
  };
}
