/**
 * Datos estructurados (JSON-LD) para buscadores. Se arman a partir de site.json:
 * los datos que todavía son placeholders (`[CORREO]`, `[WHATSAPP]`) no se publican.
 */
import { cdn } from './cdn';
import { mailtoUrl } from './links';
import type { Site } from './schemas';
import { normalizeWaNumber } from './whatsapp';

export function professionalServiceJsonLd(site: Site, url: URL): Record<string, unknown> {
  const { seo } = site;
  const telefono = normalizeWaNumber(site.whatsapp);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': new URL('/#organizacion', url).href,
    name: site.nombre,
    slogan: site.tagline,
    description: seo.descripcion,
    url: url.href,
    logo: new URL('/apple-touch-icon.png', url).href,
    address: {
      '@type': 'PostalAddress',
      addressLocality: seo.ubicacion.localidad,
      ...(seo.ubicacion.region ? { addressRegion: seo.ubicacion.region } : {}),
      addressCountry: seo.ubicacion.pais,
    },
  };

  if (seo.imagenOg) data.image = cdn(seo.imagenOg.src);
  if (seo.areaServida?.length) data.areaServed = seo.areaServida;
  if (mailtoUrl(site.correo)) data.email = site.correo;
  if (telefono) data.telephone = `+${telefono}`;
  if (site.redes?.length) data.sameAs = site.redes.map((red) => red.url);

  return data;
}

/** JSON listo para <script type="application/ld+json">, sin permitir cerrar la etiqueta. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
