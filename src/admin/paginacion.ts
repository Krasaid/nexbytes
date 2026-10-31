/**
 * Paginación con cursores de Firestore (20 por página). Se piden 21 documentos
 * para saber si hay página siguiente; "anterior" usa los cursores ya vistos.
 * Si la consulta necesita un índice compuesto que no está desplegado, lo informa
 * aparte (firestore.indexes.json).
 */
import {
  collection,
  getDocs,
  limit,
  query,
  startAfter,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, shallowRef } from 'vue';

import { POR_PAGINA } from './bandeja';
import { getServicios } from './firebase';

export function usePaginacion(coleccion: string, restricciones: () => QueryConstraint[]) {
  const docs = shallowRef<QueryDocumentSnapshot[]>([]);
  const pagina = ref(0);
  const hayMas = ref(false);
  const cargando = ref(false);
  const error = ref<'' | 'indice' | 'otro'>('');
  // cursores[n] = último documento de la página n-1 (null para la primera).
  let cursores: (QueryDocumentSnapshot | null)[] = [null];
  let turno = 0;

  async function cargar(n: number) {
    const mio = ++turno; // si cambian los filtros a mitad de camino, gana la última consulta
    cargando.value = true;
    error.value = '';
    try {
      const cursor = cursores[n];
      const snap = await getDocs(
        query(collection(getServicios().db, coleccion), ...restricciones(), ...(cursor ? [startAfter(cursor)] : []), limit(POR_PAGINA + 1)),
      );
      if (mio !== turno) return;
      docs.value = snap.docs.slice(0, POR_PAGINA);
      hayMas.value = snap.docs.length > POR_PAGINA;
      cursores[n + 1] = docs.value.at(-1) ?? null;
      pagina.value = n;
    } catch (e) {
      if (mio !== turno) return;
      console.error(`[admin] No se pudo cargar ${coleccion}:`, e);
      const { code, message } = e as { code?: string; message?: string };
      error.value = code === 'failed-precondition' && /index/i.test(message ?? '') ? 'indice' : 'otro';
      docs.value = [];
      hayMas.value = false;
    } finally {
      if (mio === turno) cargando.value = false;
    }
  }

  return {
    docs,
    pagina,
    hayMas,
    cargando,
    error,
    /** Vuelve a la primera página (al cambiar filtros). */
    reiniciar: () => {
      cursores = [null];
      return cargar(0);
    },
    siguiente: () => cargar(pagina.value + 1),
    anterior: () => cargar(Math.max(0, pagina.value - 1)),
    /** Recarga la página actual (después de un cambio de estado). */
    recargar: () => cargar(pagina.value),
  };
}
