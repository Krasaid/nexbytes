/**
 * Mensajes y links de WhatsApp. Funciones puras (sin DOM ni red) para poder
 * probarlas con Vitest: tests/unit/whatsapp.test.ts.
 */

/** Código de país que se antepone a los números locales de 8 dígitos. */
const CODIGO_PAIS = '503';

/** Largo máximo de la idea dentro del mensaje (Firestore guarda el texto completo). */
export const IDEA_MAX = 500;

/** Sin 0/O ni 1/I, para que el ref se pueda dictar sin confusiones. */
const REF_ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface QuoteMessageData {
  /** Vacío si la cotización no se pudo guardar: la línea del ref se omite. */
  ref?: string;
  tipo: string;
  funciones: string[];
  plazo: string;
  presupuesto: string;
  nombre: string;
  negocio?: string;
  idea?: string;
}

/**
 * Deja solo dígitos y agrega el 503 a los números locales (8 dígitos).
 * Devuelve `undefined` si no parece un número (por ejemplo, el placeholder `[WHATSAPP]`).
 */
export function normalizeWaNumber(raw: string): string | undefined {
  const digitos = raw.replace(/\D/g, '');
  if (digitos.length === 8) return CODIGO_PAIS + digitos;
  if (digitos.length >= 10 && digitos.length <= 15) return digitos;
  return undefined;
}

/** Corta en `max` caracteres (sin partir emojis ni acentos combinados a la mitad) y agrega "…". */
export function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return chars.slice(0, max - 1).join('').trimEnd() + '…';
}

/**
 * Llena la plantilla de cotizador.json. Marcadores: {ref}, {tipo}, {funciones},
 * {plazo}, {presupuesto}, {nombre}, {negocio} e {idea}.
 * Las líneas cuyo marcador queda vacío se omiten, así la plantilla no necesita
 * condicionales. Los marcadores desconocidos se dejan tal cual.
 */
export function buildQuoteMessage(template: string, data: QuoteMessageData): string {
  const valores: Record<string, string> = {
    ref: data.ref ?? '',
    tipo: data.tipo,
    funciones: data.funciones.join(', '),
    plazo: data.plazo,
    presupuesto: data.presupuesto,
    nombre: data.nombre,
    negocio: data.negocio ?? '',
    idea: truncate(data.idea ?? '', IDEA_MAX),
  };
  for (const key of Object.keys(valores)) valores[key] = limpiar(valores[key]);

  const lineas: string[] = [];
  for (const linea of template.split('\n')) {
    let vacia = false;
    // Un solo reemplazo por pasada: si el usuario escribe "{ref}" en su idea, no se vuelve a sustituir.
    const llena = linea.replace(/\{(\w+)\}/g, (marcador, key: string) => {
      if (!(key in valores)) return marcador;
      if (!valores[key]) vacia = true;
      return valores[key];
    });
    if (!vacia) lineas.push(llena);
  }

  // Al omitir líneas pueden quedar separadores dobles.
  return lineas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Link wa.me con el mensaje. `undefined` si el número no es válido. */
export function buildWaLink(numero: string, mensaje = ''): string | undefined {
  const n = normalizeWaNumber(numero);
  if (!n) return undefined;
  return mensaje ? `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}` : `https://wa.me/${n}`;
}

/** Ref corto para identificar la cotización en el chat: NX- + 4 caracteres. */
export function createQuoteRef(random: (n: number) => Uint8Array = randomBytes): string {
  const bytes = random(4);
  let ref = 'NX-';
  for (const b of bytes) ref += REF_ALFABETO[b % REF_ALFABETO.length];
  return ref;
}

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Los saltos de línea del usuario romperían la regla de "una línea por campo". */
function limpiar(valor: string): string {
  return valor.replace(/\s*\n\s*/g, ' ').trim();
}
