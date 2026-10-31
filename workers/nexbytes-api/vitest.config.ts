import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

// Las pruebas corren dentro del runtime de Workers (workerd) con el R2 de
// wrangler.jsonc simulado en local por Miniflare: nunca tocan el bucket real.
export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './wrangler.jsonc' } })],
});
