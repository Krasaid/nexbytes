/**
 * Llamadas del admin al Worker (workers/nexbytes-api), en PUBLIC_API_URL.
 * Todas llevan el ID token de la sesión (Authorization: Bearer).
 *
 * La subida usa XMLHttpRequest y no fetch: fetch no informa el progreso de
 * subida, y para una foto de 2 MB por datos móviles el progreso importa.
 */
import { getServicios } from './firebase';
import { textos } from './textos';

const t = textos.campos.imagen.errores;
const BASE = (import.meta.env.PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export type Prefijo = 'proyectos' | 'nosotros' | 'seo' | 'general';

export class ErrorApi extends Error {}

async function tokenDeSesion(): Promise<string> {
  const usuario = getServicios().auth.currentUser;
  if (!usuario) throw new ErrorApi(t.sesion);
  return usuario.getIdToken();
}

function mensajeDe(respuesta: unknown, estado: number): string {
  const error = (respuesta as { error?: unknown } | null)?.error;
  if (typeof error === 'string') return error;
  if (estado === 401) return t.sesion;
  return t.servidor(estado);
}

/** Sube el WebP ya procesado. `alProgreso` recibe de 0 a 1. Devuelve la ruta en R2. */
export async function subirImagen(
  imagen: Blob,
  destino: { prefijo: Prefijo; slug: string },
  alProgreso: (fraccion: number) => void = () => {},
): Promise<string> {
  if (!BASE) throw new ErrorApi(t.sinApi);
  const token = await tokenDeSesion();

  const formulario = new FormData();
  formulario.append('archivo', imagen, `${destino.slug}.webp`);
  formulario.append('prefijo', destino.prefijo);
  formulario.append('slug', destino.slug);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) alProgreso(evento.loaded / evento.total);
    };
    xhr.onload = () => {
      const path = (xhr.response as { path?: unknown } | null)?.path;
      if (xhr.status === 201 && typeof path === 'string') resolve(path);
      else reject(new ErrorApi(mensajeDe(xhr.response, xhr.status)));
    };
    xhr.onerror = () => reject(new ErrorApi(t.red));
    xhr.send(formulario);
  });
}

/** Borra una imagen de R2 (solo rutas que creó /upload). */
export async function borrarImagen(path: string): Promise<void> {
  if (!BASE) throw new ErrorApi(t.sinApi);
  const respuesta = await fetch(`${BASE}/upload`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${await tokenDeSesion()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  }).catch(() => {
    throw new ErrorApi(t.red);
  });
  if (respuesta.status !== 204) throw new ErrorApi(mensajeDe(await respuesta.json().catch(() => null), respuesta.status));
}
