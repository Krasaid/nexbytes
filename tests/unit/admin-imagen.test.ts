import { describe, expect, it } from 'vitest';

import {
  codificarConLimite,
  ErrorImagen,
  MAX_BYTES,
  pesoLegible,
  recorteCentrado,
  tamanoDestino,
  TAMANO_OG,
  usosDeRuta,
} from '../../src/admin/imagen';
import { imagenSchema } from '../../src/lib/schemas';

describe('tamanoDestino', () => {
  it('lleva el lado mayor a 1600 conservando la proporción', () => {
    expect(tamanoDestino(4000, 3000)).toEqual({ ancho: 1600, alto: 1200 });
    expect(tamanoDestino(3024, 4032)).toEqual({ ancho: 1200, alto: 1600 }); // foto vertical de celular
    expect(tamanoDestino(5000, 1000)).toEqual({ ancho: 1600, alto: 320 });
  });

  it('no agranda las imágenes más pequeñas', () => {
    expect(tamanoDestino(800, 600)).toEqual({ ancho: 800, alto: 600 });
    expect(tamanoDestino(1600, 900)).toEqual({ ancho: 1600, alto: 900 });
  });

  it('nunca da 0 px', () => {
    expect(tamanoDestino(10000, 2)).toEqual({ ancho: 1600, alto: 1 });
  });
});

describe('recorteCentrado (1200×630)', () => {
  const proporcion = TAMANO_OG.ancho / TAMANO_OG.alto;

  it('en una imagen más ancha recorta los costados, centrado', () => {
    const r = recorteCentrado(4000, 1000);
    expect(r).toEqual({ sx: 1048, sy: 0, sw: 1905, sh: 1000 });
    expect(r.sw / r.sh).toBeCloseTo(proporcion, 2);
    expect(Math.abs(r.sx - (4000 - r.sx - r.sw))).toBeLessThanOrEqual(1); // mismo margen a cada lado (±1 px)
  });

  it('en una imagen más alta recorta arriba y abajo, centrado', () => {
    const r = recorteCentrado(1200, 1600);
    expect(r).toEqual({ sx: 0, sy: 485, sw: 1200, sh: 630 });
  });

  it('si ya tiene la proporción, usa toda la imagen', () => {
    expect(recorteCentrado(2400, 1260)).toEqual({ sx: 0, sy: 0, sw: 2400, sh: 1260 });
  });

  it('el recorte siempre cabe en la original', () => {
    for (const [w, h] of [[300, 200], [1080, 1920], [640, 640], [6000, 400]]) {
      const r = recorteCentrado(w, h);
      expect(r.sx).toBeGreaterThanOrEqual(0);
      expect(r.sy).toBeGreaterThanOrEqual(0);
      expect(r.sx + r.sw).toBeLessThanOrEqual(w);
      expect(r.sy + r.sh).toBeLessThanOrEqual(h);
    }
  });
});

describe('codificarConLimite', () => {
  const blob = (bytes: number) => new Blob([new Uint8Array(bytes)], { type: 'image/webp' });

  it('usa 0.82 si ya cabe en 2 MB', async () => {
    const r = await codificarConLimite(async () => blob(500_000));
    expect(r.calidad).toBe(0.82);
  });

  it('si pasa de 2 MB reintenta con menos calidad', async () => {
    const probadas: number[] = [];
    const r = await codificarConLimite(async (q) => {
      probadas.push(q);
      return blob(q > 0.6 ? MAX_BYTES + 1 : MAX_BYTES - 1);
    });
    expect(probadas).toEqual([0.82, 0.72, 0.62, 0.52]);
    expect(r.calidad).toBe(0.52);
  });

  it('si ninguna calidad alcanza, la rechaza', async () => {
    await expect(codificarConLimite(async () => blob(MAX_BYTES + 1))).rejects.toEqual(new ErrorImagen('pesada'));
  });
});

describe('usosDeRuta', () => {
  it('cuenta las referencias { src } a cualquier profundidad', () => {
    const ruta = 'proyectos/web-abc.webp';
    const contenidos = [
      { items: [{ imagen: { src: ruta, alt: 'a' } }, { imagen: { src: 'otra.webp', alt: 'b' } }] },
      { seo: { imagenOg: { src: ruta, alt: 'c' } } },
      { titulo: ruta }, // un texto igual no es una imagen
    ];
    expect(usosDeRuta(contenidos, ruta)).toBe(2);
    expect(usosDeRuta(contenidos, 'nada.webp')).toBe(0);
  });
});

describe('pesoLegible', () => {
  it('KB o MB', () => {
    expect(pesoLegible(380 * 1024)).toBe('380 KB');
    expect(pesoLegible(1.25 * 1024 * 1024)).toMatch(/^1[,.]3 MB$/);
    expect(pesoLegible(100)).toBe('1 KB');
  });
});

describe('alt obligatorio', () => {
  it('una imagen sin texto alternativo no pasa el schema', () => {
    const base = { src: 'nosotros/foto-abc.webp', width: 800, height: 800 };
    expect(imagenSchema.safeParse({ ...base, alt: 'Fernando Martínez' }).success).toBe(true);
    expect(imagenSchema.safeParse({ ...base, alt: '   ' }).success).toBe(false);
    expect(imagenSchema.safeParse({ ...base, alt: '' }).success).toBe(false);
  });
});
