/**
 * Arranque de la SPA del admin (solo en el cliente).
 * Se monta con su propia app de Vue en vez de `client:only="vue"`: instalar
 * vue-router con `appEntrypoint` lo aplicaría a todas las islas y lo metería en
 * el JavaScript de la landing.
 */
import { createApp } from 'vue';

import AdminApp from './AdminApp.vue';
import { router } from './router';

createApp(AdminApp).use(router).mount('#admin');
