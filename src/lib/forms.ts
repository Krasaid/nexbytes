/**
 * Envío de formularios de la landing a Firestore.
 * - `cotizaciones` y `lista_espera`; las reglas (firestore.rules) validan cada campo.
 * - Firebase se carga aquí con import() la primera vez que se envía algo.
 * - Campo trampa: si un bot lo llena, se finge el envío y no se guarda nada.
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

/** Si Firestore no responde en este tiempo, el formulario ofrece WhatsApp. */
const TIMEOUT_MS = 10_000;

export async function submitQuote(data: QuoteRequest, ref: string, trampa = ''): Promise<void> {
  if (trampa.trim()) return;
  await guardar('cotizaciones', {
    ...data,
    ref,
    estado: 'nuevo',
    canal: 'whatsapp',
  });
}

export async function submitWaitlist(email: string, trampa = ''): Promise<void> {
  if (trampa.trim()) return;
  await guardar('lista_espera', { email: email.trim().toLowerCase(), estado: 'nuevo' });
}

/** Validación de formato compartida por los formularios. */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

async function guardar(coleccion: string, data: Record<string, unknown>): Promise<void> {
  const escritura = (async () => {
    const [{ getDb }, { addDoc, collection, serverTimestamp }] = await Promise.all([
      import('./firebase'),
      import('firebase/firestore/lite'),
    ]);
    await addDoc(collection(getDb(), coleccion), { ...data, creadoEn: serverTimestamp() });
  })();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore no respondió a tiempo')), TIMEOUT_MS);
  });

  try {
    await Promise.race([escritura, limite]);
  } finally {
    clearTimeout(timer);
  }
}
