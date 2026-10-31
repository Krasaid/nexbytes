/**
 * Lógica pura de la bandeja (cotizaciones y lista de espera), probada en
 * tests/unit/admin-bandeja.test.ts.
 */
import { isEmail } from '../lib/forms';
import { buildWaLink } from '../lib/whatsapp';
import { textos } from './textos';

export const ESTADOS_COTIZACION = ['nuevo', 'contactado', 'propuesta', 'ganado', 'perdido'] as const;
export const ESTADOS_LISTA = ['nuevo', 'invitado', 'baja'] as const;
export const POR_PAGINA = 20;

export interface Cotizacion {
  id: string;
  ref: string;
  tipo: string;
  funciones: string[];
  plazo: string;
  presupuesto: string;
  nombre: string;
  empresa: string;
  correo: string;
  whatsapp: string;
  descripcion: string;
  estado: string;
  canal: string;
  notas?: string;
  creadoEn?: Date;
}

export type Busqueda = { tipo: 'ref'; ref: string } | { tipo: 'nombre'; desde: string; hasta: string } | null;

/**
 * Firestore no busca texto dentro de un campo ni ignora mayúsculas, así que:
 * - ref: "NX-AB12", "nx ab12" o "AB12" (4 caracteres con al menos un número) → igualdad exacta;
 * - nombre: por cómo empieza, con mayúscula inicial en cada palabra ("mar" → "Mar…").
 */
export function interpretarBusqueda(texto: string): Busqueda {
  const limpio = texto.trim().replace(/\s+/g, ' ');
  if (!limpio) return null;
  const compacto = limpio.toUpperCase().replace(/[\s-]/g, '');
  const ref = compacto.match(/^NX([A-Z0-9]{4})$/) ?? (/\d/.test(compacto) ? compacto.match(/^([A-Z0-9]{4})$/) : null);
  if (ref) return { tipo: 'ref', ref: `NX-${ref[1]}` };
  const desde = limpio
    .split(' ')
    .map((p) => p.charAt(0).toLocaleUpperCase('es') + p.slice(1))
    .join(' ');
  return { tipo: 'nombre', desde, hasta: `${desde}` };
}

const relativa = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

/** "hace 5 minutos", "ayer", "hace 3 meses". */
export function fechaRelativa(fecha: Date, ahora = Date.now()): string {
  const segundos = Math.round((fecha.getTime() - ahora) / 1000);
  const abs = Math.abs(segundos);
  if (abs < 60) return textos.bandeja.justoAhora;
  if (abs < 3600) return relativa.format(Math.round(segundos / 60), 'minute');
  if (abs < 86_400) return relativa.format(Math.round(segundos / 3600), 'hour');
  if (abs < 30 * 86_400) return relativa.format(Math.round(segundos / 86_400), 'day');
  if (abs < 365 * 86_400) return relativa.format(Math.round(segundos / (30 * 86_400)), 'month');
  return relativa.format(Math.round(segundos / (365 * 86_400)), 'year');
}

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? '';

/** Saludo con el ref, para WhatsApp y correo. */
export function saludo(c: Pick<Cotizacion, 'nombre' | 'ref'>): string {
  return textos.bandeja.saludo(primerNombre(c.nombre), c.ref);
}

/** wa.me con el saludo; undefined si el cliente no dejó un número válido. */
export function enlaceWhatsapp(c: Pick<Cotizacion, 'nombre' | 'ref' | 'whatsapp'>): string | undefined {
  return c.whatsapp ? buildWaLink(c.whatsapp, saludo(c)) : undefined;
}

/** mailto: con asunto y saludo; undefined si no dejó un correo válido. */
export function enlaceCorreo(c: Pick<Cotizacion, 'nombre' | 'ref' | 'correo'>): string | undefined {
  if (!c.correo || !isEmail(c.correo)) return undefined;
  const asunto = encodeURIComponent(textos.bandeja.asuntoCorreo(c.ref));
  return `mailto:${c.correo.trim()}?subject=${asunto}&body=${encodeURIComponent(saludo(c))}`;
}

/** Campo CSV: entre comillas si hace falta y sin fórmulas (=, +, -, @ al inicio). */
function celda(valor: string): string {
  const seguro = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
  return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** "2026-10-31 14:05" en hora local. */
export function fechaCsv(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/**
 * CSV de la lista de espera. Empieza con BOM UTF-8 para que Excel lea bien las
 * tildes, y usa fin de línea CRLF.
 */
export function csvListaEspera(registros: { email: string; estado: string; creadoEn?: Date }[]): string {
  const filas = [
    textos.bandeja.csvEncabezado.map(celda).join(','),
    ...registros.map((r) =>
      [r.email, textos.bandeja.estadosLista[r.estado] ?? r.estado, r.creadoEn ? fechaCsv(r.creadoEn) : '']
        .map(celda)
        .join(','),
    ),
  ];
  return `﻿${filas.join('\r\n')}\r\n`;
}
