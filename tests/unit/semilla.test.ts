import { describe, expect, it } from 'vitest';

import { NOMBRES_BLOQUES, type Bloque } from '../../src/lib/bloques';
import { siguienteVersion, validarBloques } from '../../scripts/lib/semilla';

import site from '../../src/content/data/site.json';
import hero from '../../src/content/data/hero.json';
import servicios from '../../src/content/data/servicios.json';
import proyectos from '../../src/content/data/proyectos.json';
import proceso from '../../src/content/data/proceso.json';
import producto from '../../src/content/data/producto.json';
import cotizador from '../../src/content/data/cotizador.json';
import nosotros from '../../src/content/data/nosotros.json';

const reales = (): Record<Bloque, unknown> =>
  structuredClone({ site, hero, servicios, proyectos, proceso, producto, cotizador, nosotros });

describe('validarBloques', () => {
  it('acepta los JSON actuales de la landing', () => {
    const resultado = validarBloques(reales());
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(Object.keys(resultado.bloques)).toEqual(NOMBRES_BLOQUES);
  });

  it('sube los datos como los deja zod: sin campos desconocidos y con valores por defecto', () => {
    const datos = reales() as Record<Bloque, any>;
    datos.hero.campoViejo = 'x';
    delete datos.proyectos.items[0].stack;

    const resultado = validarBloques(datos);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.bloques.hero).not.toHaveProperty('campoViejo');
    expect((resultado.bloques.proyectos as any).items[0].stack).toEqual([]);
  });

  it('reporta el archivo y el campo de cada error, y no devuelve nada a medias', () => {
    const datos = reales() as Record<Bloque, any>;
    datos.site.nombre = '';
    delete datos.nosotros;

    const resultado = validarBloques(datos);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.errores).toHaveLength(2);
    expect(resultado.errores[0]).toContain('src/content/data/site.json');
    expect(resultado.errores[0]).toContain('nombre');
    expect(resultado.errores[1]).toBe('Falta src/content/data/nosotros.json');
  });
});

describe('siguienteVersion', () => {
  it('empieza en 1 si el bloque es nuevo', () => {
    expect(siguienteVersion(undefined, undefined)).toBe(1);
  });

  it('nunca retrocede: una más que la mayor entre borrador y publicado', () => {
    expect(siguienteVersion(7, 5)).toBe(8);
    expect(siguienteVersion(undefined, 3)).toBe(4);
  });

  it('ignora valores que no son enteros positivos', () => {
    expect(siguienteVersion('9', 2.5, -4, null, 2)).toBe(3);
  });
});
