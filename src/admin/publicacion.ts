/**
 * Publicar y pedir vistas previas desde el admin (T22).
 *
 * - Vista previa: valida los borradores y registra publicaciones/{id} (tipo preview);
 *   el workflow construye desde los borradores.
 * - Publicar: valida, copia a `publicado` los bloques con cambios y registra
 *   publicaciones/{id} (tipo produccion), todo en un mismo batch. Respeta la regla
 *   de T14: solo lee los borradores y los copia tal cual (salvo actualizadoEn).
 *   Si un borrador cambió entre la lectura y el batch, las reglas lo rechazan:
 *   se vuelve a leer y se reintenta.
 * - Después llama a /publish. Si falla (por ejemplo, 503 mientras GitHub Actions
 *   está pausado), la solicitud queda marcada como error con el mensaje.
 */
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';

import type { Bloque } from '../lib/bloques';
import { bloquesSinPublicar } from './acceso';
import { ErrorApi, solicitarPublicacion } from './api';
import { getServicios } from './firebase';
import { validarBorradores, type ErrorDeBloque } from './publicar';
import { textos } from './textos';

export type Tipo = 'produccion' | 'preview';

export class BorradoresInvalidos extends Error {
  constructor(readonly errores: ErrorDeBloque[]) {
    super('Borradores inválidos');
  }
}

/** La solicitud se registró, pero /publish falló (el registro quedó como error). */
export class PublicacionNoEnviada extends Error {
  constructor(
    mensaje: string,
    readonly noConfigurada: boolean,
    /** En producción, los bloques ya quedaron copiados a `publicado`. */
    readonly copiados: Bloque[],
  ) {
    super(mensaje);
  }
}

const INTENTOS = 3;

async function leer(nombre: 'borradores' | 'publicado'): Promise<Record<string, DocumentData>> {
  const snap = await getDocs(collection(getServicios().db, nombre));
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
}

const versiones = (docs: Record<string, DocumentData>) =>
  Object.fromEntries(Object.entries(docs).map(([id, datos]) => [id, datos.version]));

/** Pide una publicación; devuelve su id y los bloques copiados (solo en producción). */
export async function publicar(tipo: Tipo): Promise<{ id: string; copiados: Bloque[] }> {
  const { db } = getServicios();
  const ref = doc(collection(db, 'publicaciones'));
  const solicitud = { estado: 'solicitada', tipo, solicitadaEn: serverTimestamp() };
  let copiados: Bloque[] = [];

  for (let intento = 1; ; intento++) {
    const borradores = await leer('borradores');
    const errores = validarBorradores(borradores);
    if (errores.length) throw new BorradoresInvalidos(errores);

    const batch = writeBatch(db);
    if (tipo === 'produccion') {
      copiados = bloquesSinPublicar(versiones(borradores), versiones(await leer('publicado')));
      for (const bloque of copiados) {
        batch.set(doc(db, 'publicado', bloque), { ...borradores[bloque], actualizadoEn: serverTimestamp() });
      }
    }
    batch.set(ref, solicitud);
    try {
      await batch.commit();
      break;
    } catch (error) {
      const carrera = (error as { code?: string }).code === 'permission-denied' && copiados.length > 0;
      if (!carrera || intento >= INTENTOS) {
        throw new Error(carrera ? textos.publicar.copiaReintento : textos.publicar.errorGuardar);
      }
    }
  }

  try {
    await solicitarPublicacion(ref.id, tipo);
  } catch (error) {
    const mensaje = error instanceof ErrorApi ? error.message : textos.publicar.red;
    await updateDoc(ref, { estado: 'error', error: mensaje.slice(0, 300), terminadaEn: serverTimestamp() }).catch(() => {});
    throw new PublicacionNoEnviada(mensaje, error instanceof ErrorApi && error.estado === 503, copiados);
  }
  return { id: ref.id, copiados };
}
