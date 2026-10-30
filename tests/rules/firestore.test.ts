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

describe('otras colecciones', () => {
  it('están cerradas para todos', async () => {
    await assertFails(setDoc(doc(publico(), 'contenido', 'site'), { a: 1 }));
    await assertFails(getDoc(doc(admin(), 'contenido', 'site')));
  });
});
