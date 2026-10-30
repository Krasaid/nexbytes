/**
 * Largos máximos de lo que se guarda en Firestore. firestore.rules exige los
 * mismos valores: si cambias uno aquí, cámbialo también allá.
 * schemas.ts los usa para que el contenido del cotizador nunca genere
 * opciones que las reglas rechazarían.
 */
export const LIMITES = {
  /** Cada opción del cotizador: tipo, función, plazo o presupuesto. */
  opcion: 120,
  /** Cuántas funciones puede tener una cotización. */
  funciones: 12,
  nombre: 100,
  empresa: 120,
  correo: 254,
  whatsapp: 30,
  descripcion: 2000,
} as const;
