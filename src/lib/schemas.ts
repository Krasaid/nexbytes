/**
 * Contrato del contenido de la landing.
 * Cada bloque de src/content/data/*.json se valida contra uno de estos schemas,
 * y el CMS usará los mismos schemas para sus editores.
 */
import { z } from 'zod';
import { LIMITES } from './limites';

// Mensajes de validación en español.
z.config(z.locales.es());

// ── Piezas reutilizables ─────────────────────────────────────────────

const texto = z.string().trim().min(1);
const opcion = texto.max(LIMITES.opcion);

export const iconNames = [
  'web',
  'android',
  'database',
  'shield',
  'check',
  'check-circle',
  'arrow-right',
  'menu',
  'close',
] as const;
export type IconName = (typeof iconNames)[number];

export const linkSchema = z.object({
  label: texto,
  href: texto,
});

/** Imagen en R2: `src` es la ruta relativa dentro del bucket (se resuelve con `cdn()`). */
export const imagenSchema = z.object({
  src: texto.refine((s) => !/^https?:\/\//.test(s) && !s.startsWith('/'), {
    message: 'Debe ser una ruta relativa dentro del bucket, por ejemplo "proyectos/foto.webp"',
  }),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const headerSchema = z.object({
  eyebrow: texto,
  titulo: texto,
  descripcion: texto.optional(),
});

const campoSchema = z.object({
  label: texto,
  placeholder: z.string(),
});

// ── Bloques ──────────────────────────────────────────────────────────

export const siteSchema = z.object({
  nombre: texto,
  tagline: texto,
  ciudad: texto,
  correo: texto,
  /** Número tal cual se muestra; el link wa.me se arma quitando lo que no sea dígito. */
  whatsapp: texto,
  nav: z.array(linkSchema).min(1),
  ctaMenu: linkSchema,
  redes: z.array(z.object({ nombre: texto, url: z.url() })).optional(),
  seo: z.object({
    titulo: texto,
    descripcion: texto,
    imagenOg: imagenSchema.optional(),
  }),
  footer: z.object({
    tituloContacto: texto,
    tituloExplorar: texto,
    explorar: z.array(linkSchema).min(1),
    derechos: texto,
    codigo: texto,
  }),
});

export const heroSchema = z.object({
  eyebrow: texto,
  titulo: texto,
  subtitulo: texto,
  ctaPrimario: linkSchema,
  ctaSecundario: linkSchema,
  tarjeta: z.object({
    marca: texto,
    subtitulo: texto,
    codigo: texto,
    ubicacion: texto,
  }),
  chips: z.array(z.object({ numero: texto, label: texto })).length(3),
});

export const serviciosSchema = z.object({
  header: headerSchema,
  items: z
    .array(
      z.object({
        icono: z.enum(iconNames),
        titulo: texto,
        descripcion: texto,
      }),
    )
    .min(1),
});

export const proyectoSchema = z.object({
  slug: texto.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Solo minúsculas, números y guiones'),
  titulo: texto,
  etiqueta: texto,
  resumen: texto,
  stack: z.array(texto).default([]),
  imagen: imagenSchema.optional(),
  url: z.url().optional(),
  orden: z.number().int(),
  visible: z.boolean(),
});

export const proyectosSchema = z.object({
  header: headerSchema,
  textos: z.object({
    /** Etiqueta del placeholder cuando el proyecto todavía no tiene imagen. */
    sinImagen: texto,
    verSitio: texto,
  }),
  items: z.array(proyectoSchema),
});

export const procesoSchema = z.object({
  header: headerSchema,
  pasos: z.array(z.object({ titulo: texto, descripcion: texto })).min(1),
});

export const productoSchema = z.object({
  visible: z.boolean(),
  eyebrow: texto,
  nombre: texto,
  descripcion: texto,
  beneficios: z.array(texto).min(1),
  listaEspera: z.object({
    titulo: texto,
    texto: texto,
    label: texto,
    placeholder: z.string(),
    boton: texto,
    enviando: texto,
    /** Correo con formato inválido. */
    error: texto,
    /** No se pudo guardar en Firestore. */
    errorEnvio: texto,
    exitoTitulo: texto,
    exitoTexto: texto,
  }),
});

export const cotizadorSchema = z.object({
  header: headerSchema,
  /** Los 5 pasos son fijos: tipo, funciones, plazo, presupuesto y contacto. */
  pasos: z
    .array(
      z.object({
        nombre: texto,
        titulo: texto,
        ayuda: texto.optional(),
      }),
    )
    .length(5),
  // Las opciones elegidas se guardan en Firestore: respetan los límites de firestore.rules.
  tipos: z.array(z.object({ label: opcion, hint: texto })).min(1),
  funciones: z.array(opcion).min(1).max(LIMITES.funciones),
  plazos: z.array(opcion).min(1),
  presupuestos: z.array(opcion).min(1),
  campos: z.object({
    nombre: campoSchema,
    empresa: campoSchema,
    correo: campoSchema,
    whatsapp: campoSchema,
    descripcion: campoSchema,
  }),
  botones: z.object({
    atras: texto,
    siguiente: texto,
    enviar: texto,
    enviando: texto,
    otro: texto,
  }),
  /** Usa {actual} y {total}, por ejemplo "Paso {actual} de {total}". */
  progreso: texto,
  errores: z.object({
    /** Pasos de selección (tipo, plazo, presupuesto) sin opción elegida. */
    elegir: texto,
    nombre: texto,
    /** Falta correo y WhatsApp: se pide al menos uno. */
    contacto: texto,
    correo: texto,
    /** No se pudo guardar en Firestore: se ofrece el link de WhatsApp sin ref. */
    envio: texto,
  }),
  exito: z.object({
    titulo: texto,
    texto: texto,
    /** Etiqueta antes del ref, por ejemplo "Tu referencia". */
    ref: texto,
    /** Texto del enlace a WhatsApp (en éxito y en error). */
    whatsapp: texto,
    /** Se muestra si no hay número de WhatsApp configurado en site.json. */
    sinWhatsapp: texto,
  }),
  /**
   * Mensaje que se abre en WhatsApp. Marcadores: {ref}, {tipo}, {funciones},
   * {plazo}, {presupuesto}, {nombre}, {negocio} e {idea}. Una línea por campo:
   * si el campo está vacío, su línea se omite. *texto* es negrita en WhatsApp.
   */
  plantillaWhatsapp: texto,
  resumen: z.object({
    titulo: texto,
    proyecto: texto,
    funciones: texto,
    plazo: texto,
    presupuesto: texto,
    vacio: texto,
    contactoTexto: texto,
    contactoLink: texto,
  }),
});

export const nosotrosSchema = z.object({
  eyebrow: texto,
  titulo: texto,
  texto: texto,
  foto: imagenSchema.optional(),
  /** Etiqueta del placeholder mientras no haya foto. */
  sinFoto: texto,
  tecnologias: z.array(texto),
  portafolio: linkSchema,
});

// ── Tipos ────────────────────────────────────────────────────────────

export type Link = z.infer<typeof linkSchema>;
export type Imagen = z.infer<typeof imagenSchema>;
export type Header = z.infer<typeof headerSchema>;
export type Site = z.infer<typeof siteSchema>;
export type Hero = z.infer<typeof heroSchema>;
export type Servicios = z.infer<typeof serviciosSchema>;
export type Proyecto = z.infer<typeof proyectoSchema>;
export type Proyectos = z.infer<typeof proyectosSchema>;
export type Proceso = z.infer<typeof procesoSchema>;
export type Producto = z.infer<typeof productoSchema>;
export type Cotizador = z.infer<typeof cotizadorSchema>;
export type Nosotros = z.infer<typeof nosotrosSchema>;
