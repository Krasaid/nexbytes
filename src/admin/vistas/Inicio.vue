<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type Timestamp,
} from 'firebase/firestore';

import { useCambios } from '../cambios';
import { getServicios } from '../firebase';
import { textos } from '../textos';

const t = textos.inicio;
const cambios = useCambios();

const nuevas = ref<number | null>(null);
const errorNuevas = ref(false);

interface Publicacion {
  estado: string;
  tipo: string;
  fecha?: Date;
}
const ultima = ref<Publicacion | null | undefined>(undefined); // undefined = cargando, null = no hay
const errorUltima = ref(false);

const fecha = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' });

onMounted(async () => {
  const { db } = getServicios();

  getCountFromServer(query(collection(db, 'cotizaciones'), where('estado', '==', 'nuevo')))
    .then((snap) => (nuevas.value = snap.data().count))
    .catch(() => (errorNuevas.value = true));

  getDocs(query(collection(db, 'publicaciones'), orderBy('solicitadaEn', 'desc'), limit(1)))
    .then((snap) => {
      const doc = snap.docs[0];
      ultima.value = doc
        ? {
            estado: doc.get('estado'),
            tipo: doc.get('tipo'),
            fecha: ((doc.get('terminadaEn') ?? doc.get('solicitadaEn')) as Timestamp | undefined)?.toDate(),
          }
        : null;
    })
    .catch(() => (errorUltima.value = true));
});
</script>

<template>
  <h1 id="admin-titulo" tabindex="-1">{{ t.titulo }}</h1>

  <div class="tarjetas">
    <section class="tarjeta" aria-labelledby="inicio-cotizaciones">
      <h2 id="inicio-cotizaciones">{{ t.cotizacionesNuevas }}</h2>
      <p v-if="errorNuevas" class="aviso">{{ t.error }}</p>
      <p v-else-if="nuevas === null" class="tenue">{{ textos.cargando }}</p>
      <p v-else class="cifra">{{ nuevas }}</p>
      <RouterLink :to="{ name: 'cotizaciones' }" class="enlace">{{ t.verBandeja }}</RouterLink>
    </section>

    <section class="tarjeta" aria-labelledby="inicio-publicacion">
      <h2 id="inicio-publicacion">{{ t.ultimaPublicacion }}</h2>
      <p v-if="errorUltima" class="aviso">{{ t.error }}</p>
      <p v-else-if="ultima === undefined" class="tenue">{{ textos.cargando }}</p>
      <p v-else-if="ultima === null" class="tenue">{{ t.sinPublicaciones }}</p>
      <template v-else>
        <p class="estado">
          {{ textos.publicaciones.estados[ultima.estado] ?? ultima.estado }}
          <span class="tenue">· {{ textos.publicaciones.tipos[ultima.tipo] ?? ultima.tipo }}</span>
        </p>
        <p v-if="ultima.fecha" class="tenue">{{ fecha.format(ultima.fecha) }}</p>
      </template>
    </section>

    <section class="tarjeta" aria-labelledby="inicio-borradores">
      <h2 id="inicio-borradores">{{ t.borradores }}</h2>
      <p v-if="cambios.error" class="aviso">{{ t.error }}</p>
      <p v-else-if="!cambios.listo" class="tenue">{{ textos.cargando }}</p>
      <p v-else-if="!cambios.pendientes.length" class="tenue">{{ t.todoAlDia }}</p>
      <template v-else>
        <ul class="bloques">
          <li v-for="bloque in cambios.pendientes" :key="bloque">
            <RouterLink :to="{ name: 'contenido', params: { bloque } }">{{ textos.bloques[bloque] }}</RouterLink>
          </li>
        </ul>
        <RouterLink :to="{ name: 'publicar' }" class="enlace">{{ t.irAPublicar }}</RouterLink>
      </template>
    </section>
  </div>
</template>

<style scoped>
.tarjetas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: var(--space-4);
}

.tarjeta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

h2 {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: var(--tracking-eyebrow);
  text-transform: uppercase;
  color: var(--muted);
}

.cifra {
  font-size: var(--text-h2);
  font-weight: 600;
  line-height: 1;
  color: var(--text);
}

.estado {
  font-size: var(--text-lg);
  color: var(--text);
}

.tenue {
  color: var(--muted);
}

.bloques {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
}

.bloques a,
.enlace {
  display: inline-flex;
  align-items: center;
  min-height: var(--tap-min);
}

.bloques a {
  padding: 0 var(--space-3);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
}

.enlace {
  margin-top: auto;
}
</style>
