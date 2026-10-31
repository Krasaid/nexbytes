/**
 * Lo común de las pruebas del admin: solo emuladores, cuentas de prueba, login
 * y acceso a Firestore (firebase-admin contra el emulador) para sembrar y comprobar.
 */
import { readFileSync } from 'node:fs';
import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import { textos } from '../../src/admin/textos';

export const AUTH = '127.0.0.1:9099';
export const FIRESTORE = '127.0.0.1:8080';
export const PROYECTO = 'demo-nexbytes';

if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== AUTH || process.env.FIRESTORE_EMULATOR_HOST !== FIRESTORE) {
  throw new Error('Corre estas pruebas con npm run test:e2e: solo se permiten los emuladores locales.');
}

export const ADMIN_UID = readFileSync('firestore.rules', 'utf8').match(/request\.auth\.uid == '([^']+)'/)![1];
export const ADMIN = 'admin@nexbytes.test';
export const OTRA = 'otra@ejemplo.test';
export const CONTRASENA = 'contrasena-de-prueba-123';

/** Firestore del emulador con firebase-admin (se salta las reglas). */
export function db(): Firestore {
  return getFirestore(getApps()[0] ?? initializeApp({ projectId: PROYECTO }));
}

/** Contenido de src/content/data/{nombre}.json. */
export function json<T = Record<string, unknown>>(nombre: string): T {
  return JSON.parse(readFileSync(`src/content/data/${nombre}.json`, 'utf8')) as T;
}

/** Borra cuentas y documentos, y crea la cuenta admin y otra cualquiera. */
export async function reiniciarEmuladores(request: APIRequestContext) {
  await request.delete(`http://${AUTH}/emulator/v1/projects/${PROYECTO}/accounts`);
  await vaciarFirestore(request);
  for (const [localId, email] of [[ADMIN_UID, ADMIN], [undefined, OTRA]]) {
    const r = await request.post(`http://${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROYECTO}/accounts`, {
      headers: { Authorization: 'Bearer owner' },
      data: { localId, email, password: CONTRASENA },
    });
    expect(r.ok(), await r.text()).toBeTruthy();
  }
}

export async function vaciarFirestore(request: APIRequestContext) {
  await request.delete(`http://${FIRESTORE}/emulator/v1/projects/${PROYECTO}/databases/(default)/documents`);
}

export async function entrar(page: Page, correo = ADMIN, contrasena = CONTRASENA, ruta = '/admin') {
  await page.goto(ruta);
  await page.getByLabel(textos.login.correo).fill(correo);
  await page.getByLabel(textos.login.contrasena).fill(contrasena);
  await page.getByRole('button', { name: textos.login.entrar }).click();
}

export const titulo = (page: Page) => page.getByRole('heading', { level: 1 });
export const nav = (page: Page) => page.getByRole('navigation', { name: textos.shell.navegacion });
