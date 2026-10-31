import { defineConfig, devices } from '@playwright/test';

// Pruebas del admin en el navegador (tests/e2e). Se corren con `npm run test:e2e`, que
// levanta los emuladores de Auth y Firestore; el servidor de Astro apunta a ellos con
// un proyecto demo, así que nunca se toca el proyecto real.
const PUERTO = 4329;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PUERTO}`,
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
  },
  webServer: {
    // --ignore-lock: corre junto a un `npm run dev` abierto sin reemplazarlo.
    command: `npx astro dev --ignore-lock --host 127.0.0.1 --port ${PUERTO}`,
    url: `http://127.0.0.1:${PUERTO}/admin`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Tienen prioridad sobre .env.
    env: {
      PUBLIC_FIREBASE_API_KEY: 'emulador',
      PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-nexbytes.firebaseapp.com',
      PUBLIC_FIREBASE_PROJECT_ID: 'demo-nexbytes',
      PUBLIC_FIREBASE_APP_ID: 'demo',
      PUBLIC_RECAPTCHA_SITE_KEY: 'demo',
      PUBLIC_AUTH_EMULATOR: '127.0.0.1:9099',
      PUBLIC_FIRESTORE_EMULATOR: '127.0.0.1:8080',
      // Las "imágenes de R2" de las pruebas salen de public/ del propio servidor.
      PUBLIC_CDN_URL: `http://127.0.0.1:${PUERTO}`,
      CONTENT_SOURCE: 'local',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } }],
});
