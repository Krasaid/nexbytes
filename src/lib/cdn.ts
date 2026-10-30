const base = (import.meta.env.PUBLIC_CDN_URL ?? '').replace(/\/+$/, '');

/**
 * Convierte una ruta relativa guardada en el contenido
 * (`proyectos/wp-producciones.webp`) en la URL pública del bucket R2.
 * Las URLs absolutas se devuelven tal cual.
 */
export function cdn(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${base}/${path.replace(/^\/+/, '')}`;
}
