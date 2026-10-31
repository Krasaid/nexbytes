/**
 * Confirmaciones accesibles (nunca `confirm()`): `await confirmar({...})`
 * devuelve true si se aceptó. Las muestra el único <Confirmacion /> del Shell.
 */
import { reactive, readonly } from 'vue';

export interface Pedido {
  titulo: string;
  texto: string;
  /** Texto del botón que confirma (la acción destructiva). */
  accion: string;
}

const estado = reactive({ pedido: null as Pedido | null });
let resolver: ((aceptado: boolean) => void) | undefined;

export function confirmar(pedido: Pedido): Promise<boolean> {
  resolver?.(false); // Si había otra abierta, se toma como cancelada.
  estado.pedido = pedido;
  return new Promise((resolve) => {
    resolver = resolve;
  });
}

export function responder(aceptado: boolean): void {
  estado.pedido = null;
  const r = resolver;
  resolver = undefined;
  r?.(aceptado);
}

export function useConfirmacion() {
  return readonly(estado);
}
