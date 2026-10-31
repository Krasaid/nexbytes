import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { erroresPorRuta, escribir, esquemaEn, idDe, leer, limitesDe, mensajeDeIssue } from '../../src/admin/campos';
import { textos } from '../../src/admin/textos';
import { cotizadorSchema, heroSchema, siteSchema } from '../../src/lib/schemas';

describe('leer y escribir por ruta', () => {
  const datos = () => ({ seo: { titulo: 'Hola', ubicacion: { pais: 'SV' } }, nav: [{ label: 'A', href: '/#a' }] });

  it('lee objetos y listas', () => {
    expect(leer(datos(), 'seo.ubicacion.pais')).toBe('SV');
    expect(leer(datos(), 'nav.0.label')).toBe('A');
    expect(leer(datos(), 'nav.3.label')).toBeUndefined();
    expect(leer(datos(), 'seo.titulo.extra')).toBeUndefined();
  });

  it('escribe y crea lo que falte', () => {
    const d: Record<string, unknown> = datos();
    escribir(d, 'nav.0.href', '/#b');
    escribir(d, 'seo.imagenOg.alt', 'Logo');
    expect(leer(d, 'nav.0.href')).toBe('/#b');
    expect(leer(d, 'seo.imagenOg')).toEqual({ alt: 'Logo' });
  });

  it('undefined borra la propiedad (un opcional vacío no queda como "")', () => {
    const d: Record<string, unknown> = datos();
    escribir(d, 'seo.titulo', undefined);
    expect(d.seo).not.toHaveProperty('titulo');
  });
});

describe('schema y límites de un campo', () => {
  it('encuentra el schema por ruta, también dentro de listas y opcionales', () => {
    expect(esquemaEn(siteSchema, 'seo.ubicacion.pais')).toBeDefined();
    expect(esquemaEn(siteSchema, 'nav.2.href')).toBeDefined();
    expect(esquemaEn(siteSchema, 'seo.imagenOg.alt')).toBeDefined();
    expect(esquemaEn(siteSchema, 'redes.0.url')).toBeDefined();
    expect(esquemaEn(siteSchema, 'no.existe')).toBeUndefined();
    expect(esquemaEn(siteSchema, 'nav.x')).toBeUndefined();
  });

  it('marca los opcionales', () => {
    expect(limitesDe(siteSchema, 'seo.ubicacion.region').opcional).toBe(true);
    expect(limitesDe(siteSchema, 'seo.imagenOg').opcional).toBe(true);
    expect(limitesDe(siteSchema, 'nombre').opcional).toBe(false);
  });

  it('lee mínimos y máximos de textos y listas', () => {
    expect(limitesDe(siteSchema, 'nombre')).toEqual({ opcional: false, min: 1, max: undefined });
    expect(limitesDe(cotizadorSchema, 'tipos.0.label')).toMatchObject({ max: 120 });
    expect(limitesDe(heroSchema, 'chips')).toMatchObject({ min: 3, max: 3 });
    expect(limitesDe(siteSchema, 'nav')).toEqual({ opcional: false, min: 1 });
  });
});

describe('mensajes de error', () => {
  const issues = (schema: z.ZodType, datos: unknown) => {
    const r = schema.safeParse(datos);
    return r.success ? [] : r.error.issues;
  };

  it('los casos comunes en lenguaje claro', () => {
    const schema = z.object({
      nombre: z.string().trim().min(1),
      clave: z.string().min(8),
      corto: z.string().max(5),
      web: z.url(),
      chips: z.array(z.string()).length(3),
      tags: z.array(z.string()).min(2),
    });
    const datos = { nombre: '', clave: 'abc', corto: 'demasiado', web: 'no-es-url', chips: [], tags: [] };
    expect(Object.fromEntries(erroresPorRuta(issues(schema, datos), datos))).toEqual({
      nombre: textos.errores.obligatorio,
      clave: textos.errores.minCaracteres(8),
      corto: textos.errores.maxCaracteres(5),
      web: textos.errores.url,
      chips: textos.errores.exactoElementos(3),
      tags: textos.errores.minElementos(2),
    });
  });

  it('un campo que falta es obligatorio; otro tipo usa el texto de zod en español', () => {
    const schema = z.object({ a: z.string(), b: z.number() });
    const [faltaA, tipoB] = issues(schema, { b: 'x' });
    expect(mensajeDeIssue(faltaA, undefined)).toBe(textos.errores.obligatorio);
    expect(mensajeDeIssue(tipoB, 'x')).toBe('Entrada inválida: se esperaba número, recibido texto');
  });

  it('se queda con el primer error de cada ruta', () => {
    const schema = z.object({ pais: z.string().min(1).regex(/^[A-Z]{2}$/) });
    expect(erroresPorRuta(issues(schema, { pais: '' }), { pais: '' }).size).toBe(1);
  });
});

describe('idDe', () => {
  it('da ids válidos y estables', () => {
    expect(idDe('nav.0.label')).toBe('campo-nav-0-label');
    expect(idDe('seo.imagenOg')).toBe('campo-seo-imagenOg');
  });
});
