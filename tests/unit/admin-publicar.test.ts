import { describe, expect, it } from 'vitest';

import { enCurso, estadoVisible, SIN_RESPUESTA_MS, validarBorradores, type Publicacion } from '../../src/admin/publicar';
import { textos } from '../../src/admin/textos';
import { NOMBRES_BLOQUES } from '../../src/lib/bloques';

import cotizador from '../../src/content/data/cotizador.json';
import hero from '../../src/content/data/hero.json';
import nosotros from '../../src/content/data/nosotros.json';
import proceso from '../../src/content/data/proceso.json';
import producto from '../../src/content/data/producto.json';
import proyectos from '../../src/content/data/proyectos.json';
import servicios from '../../src/content/data/servicios.json';
import site from '../../src/content/data/site.json';

const AHORA = Date.parse('2026-10-31T12:00:00Z');
const hace = (minutos: number) => new Date(AHORA - minutos * 60_000);
const pub = (estado: string, solicitadaEn?: Date): Publicacion => ({ id: 'p', estado, tipo: 'produccion', solicitadaEn });

describe('enCurso / estadoVisible', () => {
  it('solicitada o construyendo reciente: en curso', () => {
    expect(enCurso(pub('solicitada', hace(1)), AHORA)).toBe(true);
    expect(enCurso(pub('construyendo', hace(15)), AHORA)).toBe(true);
    expect(enCurso(pub('solicitada'), AHORA)).toBe(true); // la hora del servidor todavía no llega
  });

  it('terminadas: no', () => {
    expect(enCurso(pub('publicada', hace(1)), AHORA)).toBe(false);
    expect(enCurso(pub('error', hace(1)), AHORA)).toBe(false);
  });

  it('a los 30 minutos sin terminar se da por perdida: no bloquea y se ve "sin respuesta"', () => {
    const vieja = pub('solicitada', new Date(AHORA - SIN_RESPUESTA_MS));
    expect(enCurso(vieja, AHORA)).toBe(false);
    expect(estadoVisible(vieja, AHORA)).toBe('sinRespuesta');
    expect(estadoVisible(pub('construyendo', hace(5)), AHORA)).toBe('construyendo');
    expect(estadoVisible(pub('publicada', hace(500)), AHORA)).toBe('publicada');
  });
});

describe('validarBorradores', () => {
  const todos = () => {
    const datos = structuredClone({ site, hero, servicios, proyectos, proceso, producto, cotizador, nosotros });
    return Object.fromEntries(NOMBRES_BLOQUES.map((b) => [b, { ...datos[b], version: 3, actualizadoEn: new Date() }]));
  };

  it('los borradores actuales se pueden publicar (los metadatos no estorban)', () => {
    expect(validarBorradores(todos())).toEqual([]);
  });

  it('devuelve el primer campo con error de cada bloque', () => {
    const datos = todos();
    (datos.hero as { titulo: string }).titulo = '';
    (datos.cotizador as { plantillaWhatsapp: string }).plantillaWhatsapp = 'Hola {telefono}';
    const errores = validarBorradores(datos);
    expect(errores.map((e) => [e.bloque, e.ruta])).toEqual([
      ['hero', 'titulo'],
      ['cotizador', 'plantillaWhatsapp'],
    ]);
    expect(errores[0].mensaje).toBe(textos.errores.obligatorio);
  });

  it('un bloque sin borrador tampoco se puede publicar', () => {
    const datos: Record<string, unknown> = todos();
    delete datos.nosotros;
    expect(validarBorradores(datos as never)).toEqual([{ bloque: 'nosotros', ruta: '', mensaje: textos.publicar.faltaBorrador }]);
  });
});
