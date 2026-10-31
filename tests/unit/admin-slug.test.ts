import { describe, expect, it } from 'vitest';

import { numerarProyectos, ordenarProyectos } from '../../src/admin/proyectos';
import { esSlugAutomatico, slugDe, slugUnico } from '../../src/admin/slug';
import { cotizadorSchema, LARGOS_SEO, proyectosSchema, siteSchema } from '../../src/lib/schemas';
import { buildQuoteMessage, MARCADORES, marcadoresDesconocidos } from '../../src/lib/whatsapp';

import cotizadorJson from '../../src/content/data/cotizador.json';
import proyectosJson from '../../src/content/data/proyectos.json';
import siteJson from '../../src/content/data/site.json';

describe('slug', () => {
  it('sale del título: minúsculas, sin tildes ni símbolos', () => {
    expect(slugDe('Café & Más Ñandú')).toBe('cafe-mas-nandu');
    expect(slugDe('  WP Producciones 2026!  ')).toBe('wp-producciones-2026');
    expect(slugDe('¡¿?!')).toBe('');
  });

  it('nunca repite uno usado', () => {
    expect(slugUnico('web', ['app'])).toBe('web');
    expect(slugUnico('web', ['web', 'web-2'])).toBe('web-3');
    expect(slugUnico('', [])).toBe('proyecto');
  });

  it('es automático mientras siga siendo el del título (con o sin sufijo)', () => {
    expect(esSlugAutomatico('', 'Lo que sea')).toBe(true);
    expect(esSlugAutomatico('tienda-online', 'Tienda online')).toBe(true);
    expect(esSlugAutomatico('tienda-online-2', 'Tienda online')).toBe(true);
    expect(esSlugAutomatico('mi-tienda', 'Tienda online')).toBe(false); // editado a mano
  });
});

describe('ordenarProyectos', () => {
  it('ordena por `orden` y lo renumera 1, 2, 3…', () => {
    const contenido = { header: {}, items: [{ slug: 'b', orden: 20 }, { slug: 'a', orden: 10 }, { slug: 'c', orden: 30 }] };
    expect(ordenarProyectos(contenido).items).toEqual([
      { slug: 'a', orden: 1 },
      { slug: 'b', orden: 2 },
      { slug: 'c', orden: 3 },
    ]);
  });

  it('al guardar, el orden es la posición en la lista (subir/bajar y los nuevos al final)', () => {
    // "c" se subió y "nuevo" se agregó con orden 0: no se reordena, se numera.
    const lista = { items: [{ slug: 'c', orden: 3 }, { slug: 'a', orden: 1 }, { slug: 'nuevo', orden: 0 }] };
    expect(numerarProyectos(lista).items).toEqual([
      { slug: 'c', orden: 1 },
      { slug: 'a', orden: 2 },
      { slug: 'nuevo', orden: 3 },
    ]);
  });

  it('no toca el contenido original', () => {
    const contenido = { items: [{ slug: 'b', orden: 2 }, { slug: 'a', orden: 1 }] };
    ordenarProyectos(contenido);
    expect(contenido.items[0].slug).toBe('b');
  });
});

describe('marcadores de la plantilla de WhatsApp', () => {
  it('detecta los que no existen, sin repetir', () => {
    expect(marcadoresDesconocidos('Hola {nombre}, {telefono} y {telefono} y {ciudad}')).toEqual(['telefono', 'ciudad']);
    expect(marcadoresDesconocidos(cotizadorJson.plantillaWhatsapp)).toEqual([]);
  });

  it('son exactamente los que llena buildQuoteMessage', () => {
    const plantilla = MARCADORES.map((m) => `${m}={${m}}`).join('\n');
    const mensaje = buildQuoteMessage(plantilla, {
      ref: 'R', tipo: 'T', funciones: ['F'], plazo: 'P', presupuesto: 'S', nombre: 'N', negocio: 'B', idea: 'I',
    });
    expect(mensaje).not.toMatch(/\{\w+\}/);
  });
});

describe('cambios de schema', () => {
  it('el SEO tiene máximo; el recomendado es menor', () => {
    const conTitulo = (titulo: string) => ({ ...siteJson, seo: { ...siteJson.seo, titulo } });
    expect(siteSchema.safeParse(conTitulo('x'.repeat(LARGOS_SEO.titulo.maximo))).success).toBe(true);
    expect(siteSchema.safeParse(conTitulo('x'.repeat(LARGOS_SEO.titulo.maximo + 1))).success).toBe(false);
    expect(LARGOS_SEO.titulo.recomendado).toBeLessThan(LARGOS_SEO.titulo.maximo);
    expect(LARGOS_SEO.descripcion.recomendado).toBeLessThan(LARGOS_SEO.descripcion.maximo);
  });

  it('los slugs de proyectos no se repiten', () => {
    expect(proyectosSchema.safeParse(proyectosJson).success).toBe(true);
    const repetido = { ...proyectosJson, items: [...proyectosJson.items, { ...proyectosJson.items[0], orden: 9 }] };
    const r = proyectosSchema.safeParse(repetido);
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path).toEqual(['items', proyectosJson.items.length, 'slug']);
  });

  it('la plantilla no puede usar marcadores que no existen', () => {
    const r = cotizadorSchema.safeParse({ ...cotizadorJson, plantillaWhatsapp: 'Hola {nombre}, tu {telefono}' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toContain('{telefono}');
    expect(cotizadorSchema.safeParse(cotizadorJson).success).toBe(true);
  });
});
