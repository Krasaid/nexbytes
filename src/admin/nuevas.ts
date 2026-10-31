/**
 * Cotizaciones nuevas, en vivo (onSnapshot de estado == 'nuevo'). Lo usan el
 * contador de la barra lateral y el inicio. Se inicia al entrar y se detiene al salir.
 */
import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { reactive, readonly } from 'vue';

import { getServicios } from './firebase';

const estado = reactive({ listo: false, error: false, cantidad: 0 });
let detener: Unsubscribe | undefined;

export function iniciarNuevas(): void {
  if (detener) return;
  detener = onSnapshot(
    query(collection(getServicios().db, 'cotizaciones'), where('estado', '==', 'nuevo')),
    (snap) => {
      estado.cantidad = snap.size;
      estado.listo = true;
      estado.error = false;
    },
    () => {
      estado.error = true;
    },
  );
}

export function detenerNuevas(): void {
  detener?.();
  detener = undefined;
  estado.listo = false;
  estado.error = false;
  estado.cantidad = 0;
}

export function useNuevas() {
  return readonly(estado);
}
