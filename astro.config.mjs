// @ts-check
import { defineConfig } from 'astro/config';

import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // URL pública: canonical, Open Graph, sitemap y robots.txt salen de aquí.
  // Cámbiala cuando el dominio propio esté conectado.
  site: 'https://nexbytes1.web.app',
  output: 'static',
  integrations: [vue(), sitemap({ filter: (page) => !page.includes('/404') })],
});
