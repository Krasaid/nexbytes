<script setup lang="ts">
// Estado con color. El texto siempre está: el color nunca es la única pista.
defineProps<{ estado: string; etiquetas: Record<string, string> }>();
</script>

<template>
  <span class="estado" :data-estado="estado">{{ etiquetas[estado] ?? estado }}</span>
</template>

<style scoped>
.estado {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  white-space: nowrap;
  color: var(--text-soft);
}

.estado::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: currentColor;
}

/* Nueva y Ganada resaltan; Perdida y Baja se apagan. */
.estado[data-estado='nuevo'] {
  border-color: var(--gold);
  background: var(--gold-tint);
  color: var(--gold-light);
}

.estado[data-estado='propuesta'],
.estado[data-estado='invitado'] {
  color: var(--gold-light);
}

.estado[data-estado='ganado'] {
  border-color: var(--gold);
  background: var(--gold);
  color: var(--on-gold);
}

.estado[data-estado='perdido'],
.estado[data-estado='baja'] {
  color: var(--faint);
}
</style>
