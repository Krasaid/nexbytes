/**
 * Arma links de contacto a partir del contenido.
 * Devuelven `undefined` si el dato todavía es un placeholder (`[WHATSAPP]`, `[CORREO]`),
 * para que el componente muestre el texto sin link en vez de un link roto.
 */

export function whatsappUrl(numero: string): string | undefined {
  const digitos = numero.replace(/\D/g, '');
  return digitos.length >= 8 ? `https://wa.me/${digitos}` : undefined;
}

export function mailtoUrl(correo: string): string | undefined {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? `mailto:${correo}` : undefined;
}
