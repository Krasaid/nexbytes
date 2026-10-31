/**
 * Trazos SVG de los íconos (viewBox 0 0 24 24, stroke con currentColor).
 * Única fuente: los usa Icon.astro en la landing y el selector de íconos del admin.
 * Los nombres válidos son `iconNames` de schemas.ts.
 */
import type { IconName } from './schemas';

export const ICONOS: Record<IconName, string> = {
  web: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18"/><path d="M8 21h8"/>',
  android: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  database:
    '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  shield: '<path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7l8-4z"/><path d="M9 12l2 2 4-4"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  'check-circle': '<circle cx="12" cy="12" r="10"/><path d="M7 12.5l3.2 3.2L17 9"/>',
  'arrow-right': '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
};
