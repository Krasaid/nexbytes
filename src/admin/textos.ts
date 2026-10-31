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

  /** Errores de validación (los casos comunes de zod, en lenguaje claro). */
  errores: {
    obligatorio: 'Este campo es obligatorio.',
    minCaracteres: (n: number) => `Escribe al menos ${n} caracteres.`,
    maxCaracteres: (n: number) => `Máximo ${n} caracteres.`,
    minElementos: (n: number) => (n === 1 ? 'Agrega al menos 1 elemento.' : `Agrega al menos ${n} elementos.`),
    maxElementos: (n: number) => `Máximo ${n} elementos.`,
    exactoElementos: (n: number) => `Debe tener exactamente ${n} elementos.`,
    url: 'Escribe una URL completa, por ejemplo https://ejemplo.com.',
  },

  campos: {
    opcional: 'opcional',
    contador: (n: number, max: number) => `${n} / ${max}`,
    contadorLector: (n: number, max: number) => `${n} de ${max} caracteres`,
    abrirEnlace: 'Abrir',
    abrirEnlaceLector: 'Abrir en una pestaña nueva',
    lista: {
      agregar: (elemento: string) => `Agregar ${elemento}`,
      subir: (nombre: string) => `Subir ${nombre}`,
      bajar: (nombre: string) => `Bajar ${nombre}`,
      quitar: (nombre: string) => `Quitar ${nombre}`,
      vacia: 'Todavía no hay elementos.',
    },
    imagen: {
      sinImagen: 'Sin imagen.',
      subidaPronto: 'La subida de imágenes llega en la tarea T21.',
      sinVistaPrevia: 'No se pudo cargar la vista previa.',
      ruta: 'Ruta en R2',
      tamano: 'Tamaño',
      pixeles: (ancho: number, alto: number) => `${ancho} × ${alto} px`,
      alt: 'Texto alternativo',
      altAyuda: 'Describe la imagen para quien no puede verla.',
      quitar: 'Quitar imagen',
    },
  },

  confirmar: {
    cancelar: 'Cancelar',
    quitar: {
      titulo: (nombre: string) => `¿Quitar ${nombre}?`,
      texto: 'Se quita del formulario. El cambio queda guardado cuando pulses Guardar.',
      accion: 'Quitar',
    },
    quitarImagen: {
      titulo: '¿Quitar la imagen?',
      texto: 'Solo se quita la referencia de este campo; el archivo sigue en R2. El cambio queda guardado cuando pulses Guardar.',
      accion: 'Quitar imagen',
    },
    salir: {
      titulo: 'Tienes cambios sin guardar',
      texto: 'Si sales ahora, se pierden.',
      accion: 'Salir sin guardar',
    },
    cerrarSesion: {
      titulo: 'Tienes cambios sin guardar',
      texto: 'Si cierras la sesión ahora, se pierden.',
      accion: 'Cerrar sesión igual',
    },
    descartar: {
      titulo: '¿Descartar los cambios?',
      texto: 'El formulario vuelve a la última versión guardada.',
      accion: 'Descartar',
    },
  },

  editor: {
    noExiste: 'Este bloque todavía no tiene borrador. Créalo con npm run seed.',
    errorCarga: 'No se pudo cargar el borrador. Revisa tu conexión y recarga la página.',
    nota: 'Lo que guardas queda como borrador: el sitio cambia cuando publiques.',
    guardar: 'Guardar',
    guardando: 'Guardando…',
    descartar: 'Descartar cambios',
    estado: {
      sinCambios: 'Sin cambios',
      sucio: 'Cambios sin guardar',
      guardando: 'Guardando…',
      guardado: (version: number) => `Guardado · versión ${version}`,
    },
    invalido: (n: number) => (n === 1 ? 'Hay 1 campo por revisar.' : `Hay ${n} campos por revisar.`),
    errorGuardar: 'No se pudo guardar. Revisa tu conexión y vuelve a intentar.',
    conflicto:
      'Este bloque se guardó desde otra pestaña mientras lo editabas. Carga la versión guardada para seguir; los cambios de aquí se pierden.',
    cargarGuardada: 'Cargar la versión guardada',
    sinPublicar: 'Este bloque tiene cambios guardados que todavía no se publican.',
    irAPublicar: 'Ir a Publicar',
  },

  /** Etiquetas de los editores de cada bloque. */
  editores: {
    enlace: { texto: 'Texto', destino: 'Destino', destinoAyuda: 'Una sección (/#servicios) o una URL completa.' },
    site: {
      general: 'Datos generales',
      nombre: 'Nombre del negocio',
      tagline: 'Frase corta (tagline)',
      ciudad: 'Ciudad',
      correo: 'Correo de contacto',
      whatsapp: 'WhatsApp',
      whatsappAyuda: 'Tal como se muestra. El enlace usa solo los dígitos; con 8 dígitos se agrega +503.',
      menu: 'Menú',
      nav: 'Enlaces del menú',
      enlace: 'enlace',
      ctaMenu: 'Botón del menú',
      redes: 'Redes sociales',
      red: 'red',
      redNombre: 'Nombre',
      redUrl: 'URL',
      seo: 'SEO y vista al compartir',
      seoTitulo: 'Título de la página',
      seoTituloAyuda: 'Lo que se ve en la pestaña y en Google.',
      seoDescripcion: 'Descripción',
      seoDescripcionAyuda: 'El texto bajo el título en Google y al compartir el enlace.',
      imagenOg: 'Imagen para compartir',
      imagenOgAyuda: '1200 × 630 px. Se ve al compartir el enlace en WhatsApp o redes.',
      ubicacion: 'Ubicación (para Google)',
      localidad: 'Localidad',
      region: 'Región o departamento',
      pais: 'País',
      areaServida: 'Zonas que atiende',
      zona: 'zona',
      footer: 'Pie de página',
      tituloContacto: 'Título de la columna de contacto',
      tituloExplorar: 'Título de la columna de enlaces',
      explorar: 'Enlaces del pie',
      derechos: 'Texto de derechos',
      codigo: 'Código de la línea inferior',
      noEncontrada: 'Página 404',
      noEncontradaCodigo: 'Código',
      noEncontradaTitulo: 'Título',
      noEncontradaTexto: 'Texto',
      noEncontradaBoton: 'Botón',
    },
    hero: {
      textos: 'Textos',
      eyebrow: 'Línea superior',
      titulo: 'Título',
      subtitulo: 'Subtítulo',
      botones: 'Botones',
      ctaPrimario: 'Botón principal',
      ctaSecundario: 'Botón secundario',
      tarjeta: 'Tarjeta de presentación',
      marca: 'Marca',
      tarjetaSubtitulo: 'Subtítulo',
      codigo: 'Código',
      ubicacion: 'Ubicación',
      chips: 'Etiquetas bajo la tarjeta',
      chip: 'etiqueta',
      numero: 'Número',
      chipTexto: 'Texto',
    },
  },

  /** Países para la ubicación de SEO (código ISO de 2 letras). */
  paises: [
    { valor: 'SV', etiqueta: 'El Salvador' },
    { valor: 'GT', etiqueta: 'Guatemala' },
    { valor: 'HN', etiqueta: 'Honduras' },
    { valor: 'NI', etiqueta: 'Nicaragua' },
    { valor: 'CR', etiqueta: 'Costa Rica' },
    { valor: 'PA', etiqueta: 'Panamá' },
    { valor: 'BZ', etiqueta: 'Belice' },
    { valor: 'MX', etiqueta: 'México' },
    { valor: 'US', etiqueta: 'Estados Unidos' },
  ],
} as const;
