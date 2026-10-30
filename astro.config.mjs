// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';

const { PUBLIC_CDN_URL } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
// Origen de las imágenes (R2). Si cambia PUBLIC_CDN_URL (p. ej. a cdn.nexbytes.com), la CSP lo sigue.
const cdnOrigin = PUBLIC_CDN_URL ? new URL(PUBLIC_CDN_URL).origin : '';

// https://astro.build/config
export default defineConfig({
  // URL pública: canonical, Open Graph, sitemap y robots.txt salen de aquí.
  // Cámbiala cuando el dominio propio esté conectado.
  site: 'https://nexbytes1.web.app',
  output: 'static',
  integrations: [vue(), sitemap({ filter: (page) => !page.includes('/404') })],

  // CSP en un <meta> de cada página, con los hashes exactos de los scripts y
  // estilos inline que genera el build (sin 'unsafe-inline').
  // firebase.json agrega lo que un <meta> no puede: frame-ancestors.
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        `img-src 'self' data: ${cdnOrigin}`,
        `media-src 'self' ${cdnOrigin}`,
        // Vite incrusta como data: algunos subconjuntos pequeños de las fuentes.
        "font-src 'self' data:",
        // Firestore (escritura de formularios), App Check y reCAPTCHA.
        "connect-src 'self' https://firestore.googleapis.com https://content-firebaseappcheck.googleapis.com https://www.google.com/recaptcha/",
        // reCAPTCHA v3 usa un iframe invisible.
        'frame-src https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://www.google.com/recaptcha/', 'https://www.gstatic.com/recaptcha/'],
      },
      styleDirective: {
        resources: ["'self'"],
      },
    },
  },
});
