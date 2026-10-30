/**
 * Única puerta de acceso al contenido de la landing.
 *
 * Hoy lee los JSON de src/content/data/ y los valida con los schemas de
 * ./schemas.ts. En la fase CMS esta capa leerá los mismos bloques desde
 * Firestore durante el build: solo cambia la implementación de este archivo,
 * no las firmas. Por eso todas las funciones son async desde ya, y los
 * componentes nunca importan los JSON directamente.
 */
import type { z } from 'zod';

import {
  cotizadorSchema,
  heroSchema,
  nosotrosSchema,
  procesoSchema,
  productoSchema,
  proyectosSchema,
  serviciosSchema,
  siteSchema,
  type Cotizador,
  type Hero,
  type Nosotros,
  type Proceso,
  type Producto,
  type Proyectos,
  type Servicios,
  type Site,
} from './schemas';

import siteData from '../content/data/site.json';
import heroData from '../content/data/hero.json';
import serviciosData from '../content/data/servicios.json';
import proyectosData from '../content/data/proyectos.json';
import procesoData from '../content/data/proceso.json';
import productoData from '../content/data/producto.json';
import cotizadorData from '../content/data/cotizador.json';
import nosotrosData from '../content/data/nosotros.json';

/** Valida un bloque y, si falla, lanza un error que dice el archivo y cada campo mal. */
function validar<S extends z.ZodType>(schema: S, data: unknown, bloque: string): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const detalle = result.error.issues
    .map((issue) => `  • ${issue.path.length ? issue.path.join('.') : '(raíz)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Contenido inválido en src/content/data/${bloque}.json\n${detalle}`);
}

export async function getSite(): Promise<Site> {
  return validar(siteSchema, siteData, 'site');
}

export async function getHero(): Promise<Hero> {
  return validar(heroSchema, heroData, 'hero');
}

export async function getServicios(): Promise<Servicios> {
  return validar(serviciosSchema, serviciosData, 'servicios');
}

/** Solo los proyectos visibles, ordenados por `orden`. */
export async function getProyectos(): Promise<Proyectos> {
  const data = validar(proyectosSchema, proyectosData, 'proyectos');
  return {
    ...data,
    items: data.items.filter((p) => p.visible).sort((a, b) => a.orden - b.orden),
  };
}

export async function getProceso(): Promise<Proceso> {
  return validar(procesoSchema, procesoData, 'proceso');
}

export async function getProducto(): Promise<Producto> {
  return validar(productoSchema, productoData, 'producto');
}

export async function getCotizador(): Promise<Cotizador> {
  return validar(cotizadorSchema, cotizadorData, 'cotizador');
}

export async function getNosotros(): Promise<Nosotros> {
  return validar(nosotrosSchema, nosotrosData, 'nosotros');
}
