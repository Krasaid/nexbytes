/**
 * Bloques con cambios sin publicar, en vivo: escucha `borradores` y `publicado`
 * con onSnapshot y compara `version`. Lo comparten el indicador de la barra
 * superior y la página de inicio. Se inicia al entrar y se detiene al salir.
 */
import { reactive, readonly } from 'vue';
import { collection, onSnapshot, type QuerySnapshot, type Unsubscribe } from 'firebase/firestore';

import type { Bloque } from '../lib/bloques';
import { bloquesSinPublicar, type Versiones } from './acceso';
import { getServicios } from './firebase';

const estado = reactive({
  listo: false,
  error: false,
  pendientes: [] as Bloque[],
});

let detenciones: Unsubscribe[] = [];

function versiones(snap: QuerySnapshot): Versiones {
  return Object.fromEntries(snap.docs.map((d) => [d.id, d.get('version')]));
}

export function iniciarCambios(): void {
  if (detenciones.length) return;
  const { db } = getServicios();
  const ultimas: { borradores?: Versiones; publicado?: Versiones } = {};

  const recalcular = () => {
    if (!ultimas.borradores || !ultimas.publicado) return;
    estado.pendientes = bloquesSinPublicar(ultimas.borradores, ultimas.publicado);
    estado.listo = true;
  };
  const alFallar = () => {
    estado.error = true;
  };

  detenciones = (['borradores', 'publicado'] as const).map((nombre) =>
    onSnapshot(
      collection(db, nombre),
      (snap) => {
        ultimas[nombre] = versiones(snap);
        estado.error = false;
        recalcular();
      },
      alFallar,
    ),
  );
}

export function detenerCambios(): void {
  detenciones.forEach((detener) => detener());
  detenciones = [];
  estado.listo = false;
  estado.error = false;
  estado.pendientes = [];
}

export function useCambios() {
  return readonly(estado);
}
