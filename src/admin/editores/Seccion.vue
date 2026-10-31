<script setup lang="ts">
// Grupo de campos de un editor, con su título (navegable por encabezados).
defineProps<{ id: string; titulo: string }>();
</script>

<template>
  <section class="seccion" :aria-labelledby="`seccion-${id}`">
    <h2 :id="`seccion-${id}`">{{ titulo }}</h2>
    <div class="campos">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.seccion {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding-top: var(--space-6);
  border-top: 1px solid var(--line);
}

h2 {
  font-size: var(--text-2xl);
  font-weight: 600;
}

.campos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

/* Lo que ocupa todo el ancho: textos largos, listas, grupos e imágenes. */
.campos > :deep(.ancho),
.campos > :deep(fieldset),
.campos > :deep(.lista),
.campos > :deep(.imagen) {
  grid-column: 1 / -1;
}

@media (max-width: 767px) {
  .campos {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
