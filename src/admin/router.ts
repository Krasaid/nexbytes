/**
 * Rutas del admin en modo hash (/admin/#/contenido/hero): recargar en una ruta
 * interna funciona igual en `astro dev`, en `astro preview` y en Hosting, sin
 * rewrites en firebase.json.
 */
import { createRouter, createWebHashHistory, type RouteLocationNormalized } from 'vue-router';

import { NOMBRES_BLOQUES, type Bloque } from '../lib/bloques';
import { textos } from './textos';
import Inicio from './vistas/Inicio.vue';
import Pendiente from './vistas/Pendiente.vue';

declare module 'vue-router' {
  interface RouteMeta {
    /** Título de la página (h1 y pestaña). */
    titulo: (ruta: RouteLocationNormalized) => string;
    /** Tarea de docs/TAREAS-CMS.md que implementa la vista, mientras sea un marcador. */
    tarea?: string;
  }
}

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'inicio', component: Inicio, meta: { titulo: () => textos.inicio.titulo } },
    {
      path: '/contenido/:bloque',
      name: 'contenido',
      component: Pendiente,
      meta: { titulo: (ruta) => textos.bloques[ruta.params.bloque as Bloque], tarea: 'T18/T19' },
      beforeEnter: (ruta) => (NOMBRES_BLOQUES.includes(ruta.params.bloque as Bloque) ? true : { name: 'inicio' }),
    },
    {
      path: '/bandeja/cotizaciones',
      name: 'cotizaciones',
      component: Pendiente,
      meta: { titulo: () => textos.shell.cotizaciones, tarea: 'T23' },
    },
    {
      path: '/bandeja/lista-espera',
      name: 'lista-espera',
      component: Pendiente,
      meta: { titulo: () => textos.shell.listaEspera, tarea: 'T23' },
    },
    { path: '/publicar', name: 'publicar', component: Pendiente, meta: { titulo: () => textos.shell.publicar, tarea: 'T22' } },
    { path: '/:pathMatch(.*)*', redirect: { name: 'inicio' } },
  ],
});

router.afterEach((ruta) => {
  document.title = `${ruta.meta.titulo(ruta)} · ${textos.tituloPagina}`;
});
