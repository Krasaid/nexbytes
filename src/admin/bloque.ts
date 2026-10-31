/**
 * useBloque(nombre): el borrador de un bloque como formulario.
 *
 * - Carga `borradores/{nombre}` y lo valida en vivo con el schema del bloque.
 * - Guarda con `version + 1` y `actualizadoEn` del servidor (lo exigen las reglas);
 *   lo que se guarda es la salida de zod (textos recortados, valores por defecto).
 * - Si otra pestaña guardó antes, las reglas rechazan la escritura: se avisa
 *   del conflicto en vez de pisar el trabajo ajeno.
 * - Mientras haya cambios sin guardar, el router y el cierre de sesión piden
 *   confirmación (`hayCambiosSinGuardar`) y el navegador avisa al cerrar o recargar.
 * - `ajustes` (opcional) cambian el contenido al cargarlo (`alCargar`) y antes de
 *   validarlo y guardarlo (`alGuardar`); por ejemplo, el orden de los proyectos.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { BLOQUES, type Bloque } from '../lib/bloques';
import { getServicios } from './firebase';
import { crearFormulario, proveerFormulario } from './formulario';

type Fase = 'cargando' | 'listo' | 'noExiste' | 'errorCarga' | 'sinPermiso';

type Ajuste = (contenido: Record<string, unknown>) => Record<string, unknown>;
export interface Ajustes {
  alCargar?: Ajuste;
  alGuardar?: Ajuste;
}

/** Hay un editor abierto con cambios sin guardar (lo consultan el router y el Shell). */
export const hayCambiosSinGuardar = ref(false);

export function useBloque(nombre: Bloque, ajustes: Ajustes = {}) {
  const alCargar = ajustes.alCargar ?? ((c) => c);
  const alGuardar = ajustes.alGuardar ?? ((c) => c);
  const schema = BLOQUES[nombre];
  const datos = ref<Record<string, unknown>>({});
  const original = ref('');
  const estado = reactive({
    fase: 'cargando' as Fase,
    version: 0,
    guardando: false,
    guardado: false,
    errorGuardar: false,
    conflicto: false,
  });

  const formulario = crearFormulario(schema, datos, nombre);
  proveerFormulario(formulario);

  const sucio = computed(() => estado.fase === 'listo' && JSON.stringify(datos.value) !== original.value);
  watch(sucio, (s) => {
    hayCambiosSinGuardar.value = s;
    if (s) estado.guardado = false;
  });

  const referencia = () => doc(getServicios().db, 'borradores', nombre);

  function aplicar(contenido: Record<string, unknown>, version: number) {
    datos.value = alCargar(structuredClone(contenido));
    original.value = JSON.stringify(datos.value);
    estado.version = version;
    estado.conflicto = false;
    estado.errorGuardar = false;
    formulario.intentado.value = false;
    formulario.tocados.clear();
  }

  async function cargar() {
    estado.fase = 'cargando';
    estado.guardado = false;
    try {
      const snap = await getDoc(referencia());
      if (!snap.exists()) {
        estado.fase = 'noExiste';
        return;
      }
      const { version, actualizadoEn: _actualizadoEn, ...contenido } = snap.data();
      aplicar(contenido, Number(version) || 0);
      estado.fase = 'listo';
    } catch (error) {
      // El mensaje de la pantalla es genérico; el motivo real (permisos, App Check, red) queda en la consola.
      console.error(`[admin] No se pudo cargar borradores/${nombre}:`, error);
      estado.fase = (error as { code?: string }).code === 'permission-denied' ? 'sinPermiso' : 'errorCarga';
    }
  }

  /** Lleva el foco al primer campo con error (en el orden de la página). */
  function enfocarPrimerError() {
    document.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalido="true"]')?.focus();
  }

  async function guardar(): Promise<boolean> {
    if (estado.guardando) return false;
    formulario.intentado.value = true;
    // Copia plana (JSON) de lo editado: los datos del formulario son proxies reactivos.
    const resultado = schema.safeParse(alGuardar(JSON.parse(JSON.stringify(datos.value))));
    if (!resultado.success) {
      await nextTick();
      enfocarPrimerError();
      return false;
    }

    estado.guardando = true;
    estado.errorGuardar = false;
    const nueva = estado.version + 1;
    try {
      const contenido = resultado.data as Record<string, unknown>;
      await setDoc(referencia(), { ...contenido, version: nueva, actualizadoEn: serverTimestamp() });
      aplicar(contenido, nueva);
      estado.guardado = true;
      return true;
    } catch (error) {
      // Las reglas rechazan una version que no es la siguiente: ¿alguien guardó antes?
      if ((error as { code?: string }).code === 'permission-denied') {
        const actual = await getDoc(referencia()).catch(() => null);
        if (actual?.exists() && actual.get('version') !== estado.version) {
          estado.conflicto = true;
          return false;
        }
      }
      estado.errorGuardar = true;
      return false;
    } finally {
      estado.guardando = false;
    }
  }

  function descartar() {
    aplicar(JSON.parse(original.value), estado.version);
  }

  const alCerrarVentana = (evento: BeforeUnloadEvent) => {
    if (!sucio.value) return;
    evento.preventDefault();
  };

  onMounted(() => {
    window.addEventListener('beforeunload', alCerrarVentana);
    void cargar();
  });
  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', alCerrarVentana);
    hayCambiosSinGuardar.value = false;
  });

  return {
    estado,
    sucio,
    /** Cuántos campos tienen error (para el resumen al intentar guardar). */
    cantidadErrores: computed(() => formulario.errores.value.size),
    intentado: formulario.intentado,
    guardar,
    descartar,
    recargar: cargar,
  };
}
