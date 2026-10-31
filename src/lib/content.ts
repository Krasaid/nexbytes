/**
 * Única puerta de acceso al contenido de la landing.
 *
 * La fuente la elige CONTENT_SOURCE (variable del sistema o de .env):
 *   local                 los JSON de src/content/data/ (por defecto, en desarrollo)
 *   firestore             Firestore publicado/{bloque} (producción, en CI)
 *   firestore-borradores  Firestore borradores/{bloque} (vistas previas)
 *
 * Toda fuente pasa por los schemas de ./schemas.ts (vía ./bloques.ts): si un
 * bloque falta o no cumple, el build falla con un mensaje que dice dónde.
 * Las firmas no dependen de la fuente, así que los componentes nunca cambian
 * y nunca importan los JSON directamente.
 */
import { validarBloque, type Bloque, type ContenidoDe } from './bloques';
import type { Cotizador, Hero, Nosotros, Proceso, Producto, Proyectos, Servicios, Site } from './schemas';

import siteData from '../content/data/site.json';
import heroData from '../content/data/hero.json';
import serviciosData from '../content/data/servicios.json';
import proyectosData from '../content/data/proyectos.json';
import procesoData from '../content/data/proceso.json';
import productoData from '../content/data/producto.json';
import cotizadorData from '../content/data/cotizador.json';
import nosotrosData from '../content/data/nosotros.json';

const LOCALES: Record<Bloque, unknown> = {
  site: siteData,
  hero: heroData,
  servicios: serviciosData,
  proyectos: proyectosData,
  proceso: procesoData,
  producto: productoData,
  cotizador: cotizadorData,
  nosotros: nosotrosData,
};

const FUENTES = ['local', 'firestore', 'firestore-borradores'] as const;
type Fuente = (typeof FUENTES)[number];

function fuente(): Fuente {
  const valor = process.env.CONTENT_SOURCE || import.meta.env.CONTENT_SOURCE || 'local';
  if (!(FUENTES as readonly string[]).includes(valor)) {
    throw new Error(`CONTENT_SOURCE="${valor}" no es válido. Usa ${FUENTES.join(', ')}.`);
  }
  return valor as Fuente;
}

async function cargar<B extends Bloque>(nombre: B): Promise<ContenidoDe<B>> {
  const origen = fuente();
  if (origen === 'local') {
    return validarBloque(nombre, LOCALES[nombre], `src/content/data/${nombre}.json`);
  }

  const coleccion = origen === 'firestore' ? 'publicado' : 'borradores';
  const { leerBloques } = await import('./content-firestore');
  const datos = await leerBloques(coleccion);
  return validarBloque(nombre, datos[nombre], `Firestore ${coleccion}/${nombre}`);
}

export async function getSite(): Promise<Site> {
  return cargar('site');
}

export async function getHero(): Promise<Hero> {
  return cargar('hero');
}

export async function getServicios(): Promise<Servicios> {
  return cargar('servicios');
}

/** Solo los proyectos visibles, ordenados por `orden`. */
export async function getProyectos(): Promise<Proyectos> {
  const data = await cargar('proyectos');
  return {
    ...data,
    items: data.items.filter((p) => p.visible).sort((a, b) => a.orden - b.orden),
  };
}

export async function getProceso(): Promise<Proceso> {
  return cargar('proceso');
}

export async function getProducto(): Promise<Producto> {
  return cargar('producto');
}

export async function getCotizador(): Promise<Cotizador> {
  return cargar('cotizador');
}

export async function getNosotros(): Promise<Nosotros> {
  return cargar('nosotros');
}
