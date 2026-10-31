/**
 * Orígenes permitidos: lista separada por comas (ALLOWED_ORIGINS). Un `*`
 * vale por un tramo de letras minúsculas, números y guiones, para los canales
 * de preview de Firebase Hosting (https://nexbytes1--preview-abc123.web.app).
 */
export function origenPermitido(origen: string, lista: string): boolean {
  if (!origen) return false;
  return lista
    .split(',')
    .map((patron) => patron.trim())
    .filter(Boolean)
    .some((patron) => {
      if (!patron.includes('*')) return patron === origen;
      const regex = patron.replace(/[.+?^${}()|[\]\\/]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+');
      return new RegExp(`^${regex}$`).test(origen);
    });
}
