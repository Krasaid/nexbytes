/**
 * Pruebas de firestore.rules contra el emulador.
 * Correr con: npm run test:rules (levanta el emulador y lo apaga al terminar).
 */
import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const ADMIN_UID = 'kcUUn8dbtDdrv50iXDHkcupN8t73';

let env: RulesTestEnvironment;

const cotizacion = () => ({
  ref: 'NX-AB12',
  tipo: 'Tienda en línea',
  funciones: ['Pagos en línea', 'Facturación'],
  plazo: 'En 1 a 2 meses',
  presupuesto: 'Prefiero que me asesoren',
  nombre: 'José Peña',
  empresa: '',
  correo: 'jose@cafe.com',
  whatsapp: '',
  descripcion: 'Vender café en línea',
  estado: 'nuevo',
  canal: 'whatsapp',
  creadoEn: serverTimestamp(),
});

const registro = () => ({ email: 'ana@negocio.com', estado: 'nuevo', creadoEn: serverTimestamp() });

const publico = (): Firestore => env.unauthenticatedContext().firestore() as unknown as Firestore;
const admin = (): Firestore => env.authenticatedContext(ADMIN_UID).firestore() as unknown as Firestore;
const otroUsuario = (): Firestore => env.authenticatedContext('otro-uid').firestore() as unknown as Firestore;

/** Crea un documento saltándose las reglas, para probar lectura/edición/borrado. */
async function sembrar(coleccion: string, id: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore() as unknown as Firestore, coleccion, id), data);
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-nexbytes',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe('cotizaciones: crear (público)', () => {
  it('acepta una cotización válida', async () => {
    await assertSucceeds(addDoc(collection(publico(), 'cotizaciones'), cotizacion()));
  });

  it('acepta solo WhatsApp sin correo', async () => {
    await assertSucceeds(
      addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), correo: '', whatsapp: '7000 1234' }),
    );
  });

  it('rechaza un campo extra', async () => {
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), precio: 0 }));
  });

  it('rechaza si falta un campo', async () => {
    const { descripcion: _, ...sinDescripcion } = cotizacion();
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), sinDescripcion));
  });

  it.each([
    ['nombre', 'x'.repeat(101)],
    ['empresa', 'x'.repeat(121)],
    ['correo', 'x'.repeat(255)],
    ['whatsapp', '1'.repeat(31)],
    ['descripcion', 'x'.repeat(2001)],
    ['tipo', 'x'.repeat(121)],
  ])('rechaza %s demasiado largo', async (campo, valor) => {
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), [campo]: valor }));
  });

  it('rechaza demasiadas funciones o una función demasiado larga', async () => {
    const muchas = Array.from({ length: 13 }, (_, i) => `Función ${i}`);
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), funciones: muchas }));
    await assertFails(
      addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), funciones: ['ok', 'x'.repeat(121)] }),
    );
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), funciones: ['ok', 3] }));
  });

  it('rechaza tipos incorrectos', async () => {
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), nombre: 42 }));
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), funciones: 'Pagos' }));
  });

  it('rechaza nombre vacío o sin correo ni WhatsApp', async () => {
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), nombre: '' }));
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), correo: '', whatsapp: '' }));
  });

  it('rechaza un ref con otro formato', async () => {
    for (const ref of ['NX-ab12', 'NX-ABC', 'XX-AB12', 'NX-AB123']) {
      await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), ref }));
    }
  });

  it('rechaza estado, canal o fecha distintos', async () => {
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), estado: 'ganado' }));
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), canal: 'correo' }));
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), creadoEn: new Date(0) }));
  });
});

describe('cotizaciones: leer, editar y borrar', () => {
  beforeEach(async () => {
    await sembrar('cotizaciones', 'c1', { ...cotizacion(), creadoEn: new Date() });
  });

  it('el público no puede leer, listar, editar ni borrar', async () => {
    await assertFails(getDoc(doc(publico(), 'cotizaciones', 'c1')));
    await assertFails(getDocs(collection(publico(), 'cotizaciones')));
    await assertFails(updateDoc(doc(publico(), 'cotizaciones', 'c1'), { estado: 'contactado' }));
    await assertFails(deleteDoc(doc(publico(), 'cotizaciones', 'c1')));
  });

  it('otro usuario autenticado tampoco', async () => {
    await assertFails(getDoc(doc(otroUsuario(), 'cotizaciones', 'c1')));
    await assertFails(updateDoc(doc(otroUsuario(), 'cotizaciones', 'c1'), { estado: 'contactado' }));
  });

  it('el admin puede leer y listar', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'cotizaciones', 'c1')));
    await assertSucceeds(getDocs(collection(admin(), 'cotizaciones')));
  });

  it('el admin puede cambiar el estado', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'cotizaciones', 'c1'), { estado: 'contactado' }));
  });

  it('el admin no puede cambiar otros campos ni poner un estado desconocido', async () => {
    await assertFails(updateDoc(doc(admin(), 'cotizaciones', 'c1'), { nombre: 'Otro' }));
    await assertFails(updateDoc(doc(admin(), 'cotizaciones', 'c1'), { estado: 'contactado', nombre: 'Otro' }));
    await assertFails(updateDoc(doc(admin(), 'cotizaciones', 'c1'), { estado: 'cualquiera' }));
  });

  it('el admin no puede borrar', async () => {
    await assertFails(deleteDoc(doc(admin(), 'cotizaciones', 'c1')));
  });
});

describe('lista_espera', () => {
  it('el público puede registrarse con un correo válido', async () => {
    await assertSucceeds(addDoc(collection(publico(), 'lista_espera'), registro()));
  });

  it('rechaza campos extra, correos inválidos o demasiado largos', async () => {
    await assertFails(addDoc(collection(publico(), 'lista_espera'), { ...registro(), nombre: 'Ana' }));
    await assertFails(addDoc(collection(publico(), 'lista_espera'), { ...registro(), email: 'no-es-correo' }));
    await assertFails(
      addDoc(collection(publico(), 'lista_espera'), { ...registro(), email: `${'a'.repeat(250)}@x.com` }),
    );
  });

  it('el público no puede leer, editar ni borrar', async () => {
    await sembrar('lista_espera', 'l1', { ...registro(), creadoEn: new Date() });
    await assertFails(getDoc(doc(publico(), 'lista_espera', 'l1')));
    await assertFails(getDocs(collection(publico(), 'lista_espera')));
    await assertFails(updateDoc(doc(publico(), 'lista_espera', 'l1'), { estado: 'invitado' }));
    await assertFails(deleteDoc(doc(publico(), 'lista_espera', 'l1')));
  });

  it('el admin puede leer y cambiar solo el estado, pero no borrar', async () => {
    await sembrar('lista_espera', 'l1', { ...registro(), creadoEn: new Date() });
    await assertSucceeds(getDoc(doc(admin(), 'lista_espera', 'l1')));
    await assertSucceeds(updateDoc(doc(admin(), 'lista_espera', 'l1'), { estado: 'invitado' }));
    await assertFails(updateDoc(doc(admin(), 'lista_espera', 'l1'), { email: 'otro@x.com' }));
    await assertFails(deleteDoc(doc(admin(), 'lista_espera', 'l1')));
  });
});

describe('notas del admin', () => {
  beforeEach(async () => {
    await sembrar('cotizaciones', 'c1', { ...cotizacion(), creadoEn: new Date() });
    await sembrar('lista_espera', 'l1', { ...registro(), creadoEn: new Date() });
  });

  it('el admin puede escribir notas, solas o junto con el estado', async () => {
    await assertSucceeds(updateDoc(doc(admin(), 'cotizaciones', 'c1'), { notas: 'Llamar el lunes' }));
    await assertSucceeds(updateDoc(doc(admin(), 'cotizaciones', 'c1'), { estado: 'propuesta', notas: '' }));
    await assertSucceeds(updateDoc(doc(admin(), 'lista_espera', 'l1'), { notas: 'Conocido de Ana' }));
  });

  it('rechaza notas demasiado largas o que no son texto', async () => {
    await assertFails(updateDoc(doc(admin(), 'cotizaciones', 'c1'), { notas: 'x'.repeat(2001) }));
    await assertFails(updateDoc(doc(admin(), 'lista_espera', 'l1'), { notas: 42 }));
  });

  it('el público no puede mandar notas al crear ni editarlas', async () => {
    await assertFails(addDoc(collection(publico(), 'cotizaciones'), { ...cotizacion(), notas: 'hola' }));
    await assertFails(addDoc(collection(publico(), 'lista_espera'), { ...registro(), notas: 'hola' }));
    await assertFails(updateDoc(doc(publico(), 'cotizaciones', 'c1'), { notas: 'hola' }));
  });
});

/** Un bloque de contenido ya guardado (como lo deja `npm run seed`). */
const bloque = (version: number) => ({ titulo: 'Software que resuelve', version, actualizadoEn: new Date() });

describe('borradores', () => {
  beforeEach(async () => {
    await sembrar('borradores', 'hero', bloque(3));
  });

  it('el público y otros usuarios no pueden leer ni escribir', async () => {
    for (const db of [publico(), otroUsuario()]) {
      await assertFails(getDoc(doc(db, 'borradores', 'hero')));
      await assertFails(getDocs(collection(db, 'borradores')));
      await assertFails(
        updateDoc(doc(db, 'borradores', 'hero'), { titulo: 'x', version: 4, actualizadoEn: serverTimestamp() }),
      );
    }
  });

  it('el admin puede leer y listar', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'borradores', 'hero')));
    await assertSucceeds(getDocs(collection(admin(), 'borradores')));
  });

  it('el admin guarda con version + 1 y la hora del servidor', async () => {
    await assertSucceeds(
      updateDoc(doc(admin(), 'borradores', 'hero'), { titulo: 'Nuevo', version: 4, actualizadoEn: serverTimestamp() }),
    );
  });

  it('rechaza una actualización con version incorrecta', async () => {
    for (const version of [3, 5, 2, '4']) {
      await assertFails(
        updateDoc(doc(admin(), 'borradores', 'hero'), { titulo: 'Nuevo', version, actualizadoEn: serverTimestamp() }),
      );
    }
    // Sin tocar version tampoco.
    await assertFails(updateDoc(doc(admin(), 'borradores', 'hero'), { titulo: 'Nuevo', actualizadoEn: serverTimestamp() }));
  });

  it('rechaza actualizadoEn que no sea la hora del servidor', async () => {
    await assertFails(
      updateDoc(doc(admin(), 'borradores', 'hero'), { titulo: 'Nuevo', version: 4, actualizadoEn: new Date(0) }),
    );
    await assertFails(updateDoc(doc(admin(), 'borradores', 'hero'), { titulo: 'Nuevo', version: 4 }));
  });

  it('el admin crea un bloque conocido con version 1', async () => {
    await assertSucceeds(
      setDoc(doc(admin(), 'borradores', 'proceso'), { pasos: [], version: 1, actualizadoEn: serverTimestamp() }),
    );
    await assertFails(
      setDoc(doc(admin(), 'borradores', 'nosotros'), { titulo: 'x', version: 2, actualizadoEn: serverTimestamp() }),
    );
    await assertFails(
      setDoc(doc(admin(), 'borradores', 'blog'), { titulo: 'x', version: 1, actualizadoEn: serverTimestamp() }),
    );
  });

  it('nadie puede borrar', async () => {
    await assertFails(deleteDoc(doc(admin(), 'borradores', 'hero')));
    await assertFails(deleteDoc(doc(publico(), 'borradores', 'hero')));
  });
});

describe('publicado', () => {
  beforeEach(async () => {
    await sembrar('borradores', 'hero', bloque(5));
    await sembrar('publicado', 'hero', { ...bloque(3), titulo: 'Título anterior' });
  });

  it('el público y otros usuarios no pueden leer ni escribir', async () => {
    for (const db of [publico(), otroUsuario()]) {
      await assertFails(getDoc(doc(db, 'publicado', 'hero')));
      await assertFails(getDocs(collection(db, 'publicado')));
      await assertFails(setDoc(doc(db, 'publicado', 'hero'), { ...bloque(5), actualizadoEn: serverTimestamp() }));
    }
  });

  it('el admin puede leer y listar', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'publicado', 'hero')));
    await assertSucceeds(getDocs(collection(admin(), 'publicado')));
  });

  it('el admin publica una copia exacta del borrador, con su misma version', async () => {
    await assertSucceeds(setDoc(doc(admin(), 'publicado', 'hero'), { ...bloque(5), actualizadoEn: serverTimestamp() }));
  });

  it('publicar de nuevo un borrador sin cambios también vale', async () => {
    await sembrar('publicado', 'hero', bloque(5));
    await assertSucceeds(setDoc(doc(admin(), 'publicado', 'hero'), { ...bloque(5), actualizadoEn: serverTimestamp() }));
  });

  it('rechaza contenido o version distintos del borrador', async () => {
    await assertFails(
      setDoc(doc(admin(), 'publicado', 'hero'), { ...bloque(5), titulo: 'Otro', actualizadoEn: serverTimestamp() }),
    );
    await assertFails(setDoc(doc(admin(), 'publicado', 'hero'), { ...bloque(4), actualizadoEn: serverTimestamp() }));
    await assertFails(
      setDoc(doc(admin(), 'publicado', 'hero'), { ...bloque(5), extra: true, actualizadoEn: serverTimestamp() }),
    );
  });

  it('rechaza actualizadoEn que no sea la hora del servidor', async () => {
    await assertFails(setDoc(doc(admin(), 'publicado', 'hero'), bloque(5)));
  });

  it('rechaza publicar un bloque sin borrador', async () => {
    await assertFails(
      setDoc(doc(admin(), 'publicado', 'nosotros'), { ...bloque(1), actualizadoEn: serverTimestamp() }),
    );
  });

  it('nadie puede borrar', async () => {
    await assertFails(deleteDoc(doc(admin(), 'publicado', 'hero')));
  });
});

describe('publicaciones', () => {
  const solicitud = () => ({ estado: 'solicitada', tipo: 'preview', solicitadaEn: serverTimestamp() });

  it('el admin puede solicitar una publicación de producción o de vista previa', async () => {
    await assertSucceeds(addDoc(collection(admin(), 'publicaciones'), solicitud()));
    await assertSucceeds(addDoc(collection(admin(), 'publicaciones'), { ...solicitud(), tipo: 'produccion' }));
  });

  it('rechaza otro estado, tipo desconocido, campos extra o fecha del cliente', async () => {
    const col = collection(admin(), 'publicaciones');
    await assertFails(addDoc(col, { ...solicitud(), estado: 'publicada' }));
    await assertFails(addDoc(col, { ...solicitud(), tipo: 'staging' }));
    await assertFails(addDoc(col, { ...solicitud(), url: 'https://nexbytes1.web.app' }));
    await assertFails(addDoc(col, { ...solicitud(), solicitadaEn: new Date() }));
  });

  it('el admin puede marcar como error una solicitud que no llegó a GitHub', async () => {
    await sembrar('publicaciones', 'p1', { estado: 'solicitada', tipo: 'produccion', solicitadaEn: new Date() });
    await assertSucceeds(
      updateDoc(doc(admin(), 'publicaciones', 'p1'), {
        estado: 'error',
        error: 'Publicación automática no configurada',
        terminadaEn: serverTimestamp(),
      }),
    );
  });

  it('solo esa transición: nada de publicada, url, otro estado de origen, fecha del cliente ni mensajes largos', async () => {
    await sembrar('publicaciones', 'p1', { estado: 'solicitada', tipo: 'produccion', solicitadaEn: new Date() });
    await sembrar('publicaciones', 'p2', { estado: 'construyendo', tipo: 'produccion', solicitadaEn: new Date() });
    const ref = doc(admin(), 'publicaciones', 'p1');
    const error = { estado: 'error', error: 'falló', terminadaEn: serverTimestamp() };
    await assertFails(updateDoc(ref, { estado: 'publicada', terminadaEn: serverTimestamp() }));
    await assertFails(updateDoc(ref, { ...error, url: 'https://x.web.app' }));
    await assertFails(updateDoc(ref, { ...error, tipo: 'preview' }));
    await assertFails(updateDoc(ref, { ...error, terminadaEn: new Date() }));
    await assertFails(updateDoc(ref, { ...error, error: 'x'.repeat(301) }));
    await assertFails(updateDoc(ref, { ...error, error: '' }));
    await assertFails(updateDoc(doc(admin(), 'publicaciones', 'p2'), error)); // ya la tomó GitHub Actions
    await assertFails(updateDoc(doc(otroUsuario(), 'publicaciones', 'p1'), error));
  });

  it('el admin lee el historial pero no lo edita ni lo borra', async () => {
    await sembrar('publicaciones', 'p1', { estado: 'construyendo', tipo: 'preview', solicitadaEn: new Date() });
    await assertSucceeds(getDoc(doc(admin(), 'publicaciones', 'p1')));
    await assertSucceeds(getDocs(collection(admin(), 'publicaciones')));
    await assertFails(updateDoc(doc(admin(), 'publicaciones', 'p1'), { estado: 'publicada' }));
    await assertFails(deleteDoc(doc(admin(), 'publicaciones', 'p1')));
  });

  it('el público no puede leer ni solicitar', async () => {
    await sembrar('publicaciones', 'p1', { estado: 'publicada', tipo: 'produccion', solicitadaEn: new Date() });
    await assertFails(getDoc(doc(publico(), 'publicaciones', 'p1')));
    await assertFails(addDoc(collection(publico(), 'publicaciones'), solicitud()));
    await assertFails(addDoc(collection(otroUsuario(), 'publicaciones'), solicitud()));
  });
});

describe('matriz: quién lee, lista y borra en cada colección', () => {
  // Documentos sembrados saltándose las reglas: lo que importa es el permiso, no el contenido.
  const colecciones = {
    cotizaciones: { ...cotizacion(), creadoEn: new Date() },
    lista_espera: { ...registro(), creadoEn: new Date() },
    borradores: bloque(1),
    publicado: bloque(1),
    publicaciones: { estado: 'publicada', tipo: 'produccion', solicitadaEn: new Date() },
    configuracion: { secreto: 'no' }, // cualquier colección no declarada
  } as const;
  const sinAcceso = ['configuracion'];
  const id = (nombre: string) => (nombre === 'borradores' || nombre === 'publicado' ? 'hero' : 'x');

  beforeEach(async () => {
    for (const [nombre, datos] of Object.entries(colecciones)) await sembrar(nombre, id(nombre), datos);
  });

  for (const nombre of Object.keys(colecciones)) {
    it(`${nombre}: el público y otra cuenta no leen, no listan y no borran`, async () => {
      for (const db of [publico(), otroUsuario()]) {
        await assertFails(getDoc(doc(db, nombre, id(nombre))));
        await assertFails(getDocs(collection(db, nombre)));
        await assertFails(deleteDoc(doc(db, nombre, id(nombre))));
      }
    });

    it(`${nombre}: el admin ${sinAcceso.includes(nombre) ? 'tampoco lee' : 'lee y lista'}, y nadie borra`, async () => {
      if (sinAcceso.includes(nombre)) {
        await assertFails(getDoc(doc(admin(), nombre, id(nombre))));
        await assertFails(getDocs(collection(admin(), nombre)));
      } else {
        await assertSucceeds(getDoc(doc(admin(), nombre, id(nombre))));
        await assertSucceeds(getDocs(collection(admin(), nombre)));
      }
      await assertFails(deleteDoc(doc(admin(), nombre, id(nombre))));
    });
  }

  it('otra cuenta con sesión no puede editar la lista de espera ni crear borradores o solicitudes', async () => {
    await assertFails(updateDoc(doc(otroUsuario(), 'lista_espera', 'x'), { estado: 'invitado' }));
    await assertFails(
      setDoc(doc(otroUsuario(), 'borradores', 'proceso'), { pasos: [], version: 1, actualizadoEn: serverTimestamp() }),
    );
    await assertFails(
      addDoc(collection(otroUsuario(), 'publicaciones'), { estado: 'solicitada', tipo: 'preview', solicitadaEn: serverTimestamp() }),
    );
  });
});

describe('otras colecciones', () => {
  it('están cerradas para todos', async () => {
    await assertFails(setDoc(doc(publico(), 'contenido', 'site'), { a: 1 }));
    await assertFails(getDoc(doc(admin(), 'contenido', 'site')));
  });
});
