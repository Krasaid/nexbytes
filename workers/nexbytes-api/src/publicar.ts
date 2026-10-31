/**
 * POST /publish → repository_dispatch "publicar" en GitHub, que dispara
 * .github/workflows/deploy.yml con { publicacionId, tipo }.
 */
export const TIPOS_PUBLICACION = ['produccion', 'preview'] as const;
export type TipoPublicacion = (typeof TIPOS_PUBLICACION)[number];

export interface Solicitud {
  publicacionId: string;
  tipo: TipoPublicacion;
}

/** Valida el cuerpo; null si no sirve. El id es el de publicaciones/{id} (mismo formato que el workflow). */
export function leerSolicitud(cuerpo: unknown): Solicitud | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null;
  const { publicacionId, tipo } = cuerpo as Record<string, unknown>;
  if (typeof publicacionId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(publicacionId)) return null;
  if (typeof tipo !== 'string' || !(TIPOS_PUBLICACION as readonly string[]).includes(tipo)) return null;
  return { publicacionId, tipo: tipo as TipoPublicacion };
}

export type Resultado = { ok: true } | { ok: false; estado: number };

export async function dispararPublicacion(
  solicitud: Solicitud,
  repo: string,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<Resultado> {
  const respuesta = await fetchFn(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'nexbytes-api',
    },
    body: JSON.stringify({ event_type: 'publicar', client_payload: solicitud }),
  });
  // GitHub responde 204 sin cuerpo cuando acepta el evento.
  return respuesta.ok ? { ok: true } : { ok: false, estado: respuesta.status };
}
