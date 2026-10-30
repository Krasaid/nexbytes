/**
 * Envío de formularios de la landing.
 * Por ahora son stubs que resuelven de inmediato; en T11 se conectan a
 * Firestore (`cotizaciones` y `lista_espera`) sin cambiar estas firmas.
 */

export interface QuoteRequest {
  tipo: string;
  funciones: string[];
  plazo: string;
  presupuesto: string;
  nombre: string;
  empresa: string;
  correo: string;
  whatsapp: string;
  descripcion: string;
}

export async function submitQuote(data: QuoteRequest): Promise<void> {
  void data;
}

export async function submitWaitlist(email: string): Promise<void> {
  void email;
}

/** Validación de formato compartida por los formularios. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
