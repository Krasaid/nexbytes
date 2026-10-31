/**
 * Textos de la interfaz del panel /admin.
 * Excepción a la regla #1 de CLAUDE.md: no los edita el CMS, pero viven aquí
 * juntos, nunca repartidos por los componentes.
 */
import type { Bloque } from '../lib/bloques';

export const textos = {
  marca: 'Nexbytes',
  marcaAdmin: 'Admin',
  tituloPagina: 'Admin · Nexbytes',
  sinJavascript: 'El panel de administración necesita JavaScript.',
  saltarContenido: 'Saltar al contenido',
  cargando: 'Cargando…',

  login: {
    titulo: 'Iniciar sesión',
    descripcion: 'Acceso solo para la cuenta de administración de Nexbytes.',
    correo: 'Correo electrónico',
    contrasena: 'Contraseña',
    entrar: 'Entrar',
    entrando: 'Entrando…',
    errores: {
      credenciales: 'Correo o contraseña incorrectos.',
      demasiadosIntentos: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
      red: 'No hay conexión con Firebase. Revisa tu internet y vuelve a intentar.',
      desconocido: 'No se pudo iniciar sesión. Vuelve a intentar.',
    },
  },

  sinAcceso: {
    titulo: 'Sin acceso',
    texto: 'Esta cuenta no tiene permiso para administrar el sitio. Se cerró la sesión.',
  },

  shell: {
    abrirMenu: 'Abrir menú',
    cerrarMenu: 'Cerrar menú',
    navegacion: 'Secciones del panel',
    inicio: 'Inicio',
    contenido: 'Contenido',
    bandeja: 'Bandeja',
    cotizaciones: 'Cotizaciones',
    listaEspera: 'Lista de espera',
    publicar: 'Publicar',
    cerrarSesion: 'Cerrar sesión',
    sesionDe: 'Sesión iniciada como',
    todoPublicado: 'Todo publicado',
    sinPublicar: (n: number) => (n === 1 ? '1 bloque sin publicar' : `${n} bloques sin publicar`),
    revisandoCambios: 'Revisando cambios…',
  },

  bloques: {
    site: 'Sitio',
    hero: 'Hero',
    servicios: 'Servicios',
    proyectos: 'Proyectos',
    proceso: 'Proceso',
    producto: 'Producto',
    cotizador: 'Cotizador',
    nosotros: 'Nosotros',
  } satisfies Record<Bloque, string>,

  inicio: {
    titulo: 'Inicio',
    cotizacionesNuevas: 'Cotizaciones nuevas',
    verBandeja: 'Ver bandeja',
    ultimaPublicacion: 'Última publicación',
    sinPublicaciones: 'Todavía no hay publicaciones.',
    borradores: 'Borradores sin publicar',
    todoAlDia: 'Todo el contenido está publicado.',
    irAPublicar: 'Ir a Publicar',
    error: 'No se pudo cargar este dato.',
  },

  publicaciones: {
    estados: {
      solicitada: 'Solicitada',
      construyendo: 'Construyendo',
      publicada: 'Publicada',
      error: 'Con error',
    } as Record<string, string>,
    tipos: { produccion: 'Producción', preview: 'Vista previa' } as Record<string, string>,
  },

  pendiente: {
    texto: (tarea: string) => `Esta sección llega en la tarea ${tarea}.`,
  },
} as const;
