import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

// Compila los .vue para las pruebas de componentes del admin (tests/unit/admin-fields.test.ts,
// que usa happy-dom). El resto de las pruebas corre en Node.
export default defineConfig({
  plugins: [vue()],
});
