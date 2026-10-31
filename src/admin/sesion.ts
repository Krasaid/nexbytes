/**
 * Estado de la sesión del admin, compartido por todos los componentes.
 *
 * - `cargando` hasta que Firebase Auth dice si hay sesión (al recargar, la restaura).
 * - Una cuenta que no es la de administración nunca llega a `dentro`: se marca
 *   `sinAcceso`, se cierra su sesión y vuelve al login con el aviso.
 */
import { reactive, readonly } from 'vue';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { esAdmin } from './acceso';
import { getServicios } from './firebase';

type Fase = 'cargando' | 'fuera' | 'dentro';

const estado = reactive({ fase: 'cargando' as Fase, correo: '', sinAcceso: false });

let escuchando = false;

function escuchar() {
  if (escuchando) return;
  escuchando = true;
  const { auth } = getServicios();
  onAuthStateChanged(auth, (user) => {
    if (user && !esAdmin(user.uid)) {
      estado.sinAcceso = true;
      estado.fase = 'fuera';
      estado.correo = '';
      void signOut(auth);
      return;
    }
    estado.fase = user ? 'dentro' : 'fuera';
    estado.correo = user?.email ?? '';
  });
}

async function entrar(correo: string, contrasena: string): Promise<void> {
  estado.sinAcceso = false;
  await signInWithEmailAndPassword(getServicios().auth, correo.trim(), contrasena);
}

async function salir(): Promise<void> {
  await signOut(getServicios().auth);
}

export function useSesion() {
  escuchar();
  return { estado: readonly(estado), entrar, salir };
}
