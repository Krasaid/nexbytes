/**
 * Reglas de la página Publicar (funciones puras, probadas en tests/unit/admin-publicar.test.ts).
 */
import { BLOQUES, NOMBRES_BLOQUES, type Bloque } from '../lib/bloques';
import { erroresPorRuta } from './campos';
import { textos } from './textos';

/**
 * Una publicación "solicitada" o "construyendo" con más de esto se da por perdida
 * (el workflow tiene un límite de 20 minutos): no bloquea los botones y se ve como "sin respuesta".
 */
export const SIN_RESPUESTA_MS = 30 * 60 * 1000;

export interface Publicacion {
  id: string;
  estado: string;
  tipo: string;
  solicitadaEn?: Date;
  terminadaEn?: Date;
  url?: string;
  error?: string;
}

/** Está esperando a GitHub Actions o construyéndose, y todavía no se dio por perdida. */
export function enCurso(p: Publicacion, ahora = Date.now()): boolean {
  if (p.estado !== 'solicitada' && p.estado !== 'construyendo') return false;
  // Recién creada, la hora del servidor todavía no llegó: cuenta como en curso.
  return !p.solicitadaEn || ahora - p.solicitadaEn.getTime() < SIN_RESPUESTA_MS;
}

/** El estado que se muestra: igual al guardado, salvo las que quedaron sin respuesta. */
export function estadoVisible(p: Publicacion, ahora = Date.now()): string {
  if ((p.estado === 'solicitada' || p.estado === 'construyendo') && !enCurso(p, ahora)) return 'sinRespuesta';
  return p.estado;
}

export interface ErrorDeBloque {
  bloque: Bloque;
  /** Campo con el primer error ('' si falta el borrador entero). */
  ruta: string;
  mensaje: string;
}

/**
 * Valida todos los borradores con sus schemas (los mismos del build). Devuelve
 * el primer error de cada bloque que no pasa; vacío si todo se puede publicar.
 */
export function validarBorradores(borradores: Partial<Record<Bloque, Record<string, unknown>>>): ErrorDeBloque[] {
  const errores: ErrorDeBloque[] = [];
  for (const bloque of NOMBRES_BLOQUES) {
    const datos = borradores[bloque];
    if (!datos) {
      errores.push({ bloque, ruta: '', mensaje: textos.publicar.faltaBorrador });
      continue;
    }
    const { version: _version, actualizadoEn: _actualizadoEn, ...contenido } = datos;
    const resultado = BLOQUES[bloque].safeParse(contenido);
    if (!resultado.success) {
      const [ruta, mensaje] = [...erroresPorRuta(resultado.error.issues, contenido)][0];
      errores.push({ bloque, ruta, mensaje });
    }
  }
  return errores;
}
