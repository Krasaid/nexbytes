// Activa los estados iniciales de animación solo si hay JS y no se pidió
// movimiento reducido. Si animations.ts no corre en 1.5 s, se muestra todo.
// Base.astro lo inserta inline (debe correr antes del primer pintado) y agrega
// su hash a la CSP.
(function () {
  var root = document.documentElement;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.classList.add('anim');
  setTimeout(function () {
    if (!root.dataset.animReady) root.classList.remove('anim');
  }, 1500);
})();
