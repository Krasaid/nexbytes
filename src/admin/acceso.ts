/**
 * Quién puede entrar al admin, qué bloques tienen cambios sin publicar y los
 * mensajes de error del login.
 * Funciones puras (sin Firebase), probadas en tests/unit/admin-acceso.test.ts.
 */
import { NOMBRES_BLOQUES, type Bloque } from '../lib/bloques';
import { textos } from './textos';

/**
 * UID de la única cuenta de administración (correo y contraseña).
 * Es el mismo de isAdmin() en firestore.rules, que es lo que de verdad protege
 * los datos: este chequeo solo decide qué pantalla mostrar.
 */
export const ADMIN_UID = 'kcUUn8dbtDdrv50iXDHkcupN8t73';

export function esAdmin(uid: string | null | undefined): boolean {
  return uid === ADMIN_UID;
}

/** `version` de cada documento de una colección de contenido, por bloque. */
export type Versiones = Partial<Record<string, unknown>>;

/**
 * Bloques cuyo borrador es más nuevo que lo publicado (o que nunca se publicó).
 * Un bloque sin borrador no cuenta: no hay nada que publicar.
 */
export function bloquesSinPublicar(borradores: Versiones, publicados: Versiones): Bloque[] {
  const entero = (v: unknown): number | undefined => (Number.isInteger(v) ? (v as number) : undefined);
  return NOMBRES_BLOQUES.filter((nombre) => {
    const borrador = entero(borradores[nombre]);
    if (borrador === undefined) return false;
    const publicado = entero(publicados[nombre]);
    return publicado === undefined || borrador > publicado;
  });
}

/** Mensaje para la pantalla de login según el código de error de Firebase Auth. */
export function mensajeDeLogin(codigo: string | undefined): string {
  const { errores } = textos.login;
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/user-disabled':
      return errores.credenciales;
    case 'auth/too-many-requests':
      return errores.demasiadosIntentos;
    case 'auth/network-request-failed':
      return errores.red;
    default:
      return errores.desconocido;
  }
}
