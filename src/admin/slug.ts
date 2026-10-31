/**
 * Slugs de proyectos (funciones puras, probadas en tests/unit/admin-slug.test.ts).
 *
 * Mientras el usuario no edite el slug a mano, sigue al título. No hace falta
 * guardar una marca de "editado": el slug es automático si todavía es el que
 * saldría del título anterior (con o sin el sufijo -2, -3… que lo hace único).
 */

/** "Café & Más Ñandú" → "cafe-mas-nandu". */
export function slugDe(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `base`, o `base-2`, `base-3`… si ya está usado. Sin base, "proyecto". */
export function slugUnico(base: string, usados: Iterable<string>): string {
  const ocupados = new Set(usados);
  const raiz = base || 'proyecto';
  if (!ocupados.has(raiz)) return raiz;
  let n = 2;
  while (ocupados.has(`${raiz}-${n}`)) n++;
  return `${raiz}-${n}`;
}

/** ¿El slug sigue siendo el automático del título? (vacío también cuenta). */
export function esSlugAutomatico(slug: string, titulo: string): boolean {
  if (!slug) return true;
  const raiz = slugDe(titulo) || 'proyecto';
  return slug === raiz || new RegExp(`^${raiz}-\\d+$`).test(slug);
}
