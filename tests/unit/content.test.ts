import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import heroJson from '../../src/content/data/hero.json';
import proyectosJson from '../../src/content/data/proyectos.json';
import siteJson from '../../src/content/data/site.json';

// Firestore simulado: content.ts lo carga con import() solo con CONTENT_SOURCE=firestore*.
const leerBloques = vi.fn();
vi.mock('../../src/lib/content-firestore', () => ({ leerBloques }));

const { getHero, getProyectos, getSite } = await import('../../src/lib/content');

const enFirestore = (cambios: Record<string, unknown> = {}) => ({
  site: siteJson,
  hero: heroJson,
  proyectos: proyectosJson,
  ...cambios,
});

/** CONTENT_SOURCE solo para esta prueba (process.env e import.meta.env, que content.ts lee). */
const fuente = (valor: string | undefined) => vi.stubEnv('CONTENT_SOURCE', valor);

// Las pruebas no dependen del entorno de quien las corre (por ejemplo,
// CONTENT_SOURCE=firestore-borradores npm test): cada una empieza sin la
// variable y al final se restaura el entorno original.
beforeEach(() => {
  fuente(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  leerBloques.mockReset();
});

describe('content.ts', () => {
  it('sin CONTENT_SOURCE lee los JSON locales y no toca Firestore', async () => {
    expect((await getSite()).nombre).toBe(siteJson.nombre);
    expect(leerBloques).not.toHaveBeenCalled();
  });

  it('rechaza un CONTENT_SOURCE desconocido', async () => {
    fuente('cms');
    await expect(getSite()).rejects.toThrow('CONTENT_SOURCE="cms" no es válido');
  });

  it('firestore lee publicado; firestore-borradores lee borradores', async () => {
    leerBloques.mockResolvedValue(enFirestore({ hero: { ...heroJson, titulo: 'Desde Firestore' } }));

    fuente('firestore');
    expect((await getHero()).titulo).toBe('Desde Firestore');
    expect(leerBloques).toHaveBeenLastCalledWith('publicado');

    fuente('firestore-borradores');
    await getHero();
    expect(leerBloques).toHaveBeenLastCalledWith('borradores');
  });

  it('ignora los metadatos de Firestore y aplica la misma lógica que con local', async () => {
    const conMeta = { ...proyectosJson, version: 7, actualizadoEn: new Date() };
    leerBloques.mockResolvedValue(enFirestore({ proyectos: conMeta }));
    fuente('firestore');

    const desdeFirestore = await getProyectos();
    fuente(undefined);
    expect(desdeFirestore).toEqual(await getProyectos());
    expect(desdeFirestore).not.toHaveProperty('version');
  });

  it('falla con el documento y el campo si un bloque no cumple el schema', async () => {
    leerBloques.mockResolvedValue(enFirestore({ hero: { ...heroJson, titulo: '' } }));
    fuente('firestore-borradores');
    await expect(getHero()).rejects.toThrow(/Firestore borradores\/hero[\s\S]*titulo/);
  });

  it('nunca usa un bloque vacío: un documento solo con metadatos no pasa', async () => {
    leerBloques.mockResolvedValue(enFirestore({ site: { version: 1, actualizadoEn: new Date() } }));
    fuente('firestore');
    await expect(getSite()).rejects.toThrow('Contenido inválido en Firestore publicado/site');
  });

  it('si la lectura de Firestore falla, el error llega al build', async () => {
    leerBloques.mockRejectedValue(new Error('Faltan bloques en Firestore publicado/: hero'));
    fuente('firestore');
    await expect(getHero()).rejects.toThrow('Faltan bloques');
  });
});
