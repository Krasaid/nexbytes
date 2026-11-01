# Guía del panel de Nexbytes

Esta guía explica cómo usar el panel para cambiar el contenido del sitio, revisar los cambios antes de que se vean, publicarlos y atender las cotizaciones. Lo técnico (cómo está construido) está en `CLAUDE.md` y en el `README.md`.

## Lo básico en 30 segundos

- El panel está en **`/admin`**: `https://nexbytes1.web.app/admin` o, en tu computadora, `http://localhost:4321/admin` con `npm run dev`.
- Entras con el correo y la contraseña de la cuenta de administración. Otra cuenta ve "Sin acceso" y se le cierra la sesión.
- La sesión dura mientras la pestaña esté abierta. Si cierras la pestaña, la próxima vez tendrás que entrar de nuevo.
- Lo que guardas es un **borrador**: el sitio **no cambia** hasta que publicas. Puedes guardar cuantas veces quieras sin miedo.

El camino completo de un cambio:

```
Guardar (borrador)  →  Vista previa (enlace temporal)  →  Publicar  →  el sitio cambia
```

## Editar el contenido

1. En el menú, entra a **Contenido** y elige la sección: Sitio, Hero, Servicios, Proyectos, Proceso, Producto, Cotizador o Nosotros.
2. Cambia los campos. Junto al botón Guardar verás el estado: "Sin cambios", "Cambios sin guardar" o "Guardado · versión N".
3. Pulsa **Guardar**. También puedes pulsar Enter dentro de un campo de texto.

Algunas cosas que conviene saber:

- **Si un campo está mal, no se guarda.** El campo se marca en rojo con el motivo, y arriba aparece "Hay N campos por revisar". Corrígelo y vuelve a guardar.
- **Contadores.** Los campos con límite muestran cuántos caracteres llevas. En SEO hay un largo *recomendado* (título 60, descripción 155): si lo pasas, el contador avisa pero te deja guardar. Lo que no te deja guardar es pasar el máximo.
- **Descartar cambios** vuelve a lo último que guardaste.
- **Si sales con cambios sin guardar** (otra sección, cerrar sesión o cerrar la pestaña), el panel te pregunta antes.
- **Dos pestañas a la vez.** Si guardas el mismo bloque desde otra pestaña, esta te avisa con "Este bloque se guardó desde otra pestaña…". Pulsa **Cargar la versión guardada**: lo que tenías sin guardar en esta pestaña se pierde, así que edita cada bloque en una sola pestaña.
- **Proyectos:** el orden de la lista es el orden en el sitio (muévelos con los botones Subir y Bajar de cada uno). Si desmarcas "Visible", el proyecto se oculta sin borrarlo. El *slug* (la parte de la dirección) se genera solo mientras el proyecto es nuevo. Cambiarlo después puede romper enlaces que ya compartiste.
- **Producto:** mientras "Visible" esté apagado, la sección del producto propio y su lista de espera no aparecen en el sitio.
- **Cotizador → mensaje de WhatsApp:** usa marcadores entre llaves (`{ref}`, `{tipo}`, `{funciones}`…). La lista de marcadores válidos aparece debajo del campo, junto con una vista previa del mensaje. Si escribes uno que no existe, el panel no te deja guardar.

## Subir imágenes

Los campos de imagen están en Proyectos, Nosotros y Sitio → SEO (la imagen que se ve al compartir el enlace).

1. Pulsa **Subir imagen** y elige el archivo (JPG, PNG, WebP o AVIF).
2. El panel la prepara en tu navegador antes de subirla:
   - la achica a 1600 px por el lado mayor (nunca la agranda);
   - la imagen para compartir (SEO) se recorta al centro a 1200 × 630 y te muestra el recorte en "Así quedará el recorte";
   - la convierte a WebP para que pese poco (menos de 2 MB);
   - **le quita los datos ocultos de la foto (EXIF), incluida la ubicación GPS del teléfono.** Es a propósito.
3. Verás la barra de progreso y luego "Imagen subida. Escribe el texto alternativo y guarda".
4. Escribe el **Texto alternativo**: una frase que describa la imagen para quien no puede verla. Es obligatorio.
5. Pulsa **Guardar** en el bloque.

Las fotos HEIC del iPhone pueden no abrirse en algunos navegadores. Si ves "No pudimos leer esta imagen", conviértela a JPG o PNG (o compártela desde el iPhone como "Más compatible") y súbela de nuevo.

**Quitar o borrar.** Son dos botones distintos:

- **Quitar imagen** saca la imagen del campo. El archivo sigue guardado y puedes volver a usarlo.
- **Borrar del almacenamiento** elimina el archivo para siempre. El panel no te deja hacerlo si la imagen se usa en otro bloque o en el sitio publicado: primero publica sin ella.

Si subes muchas imágenes seguidas (más de 60 en una hora), el servidor te pide esperar unos minutos y te dice cuántos.

## Revisar con una vista previa

La vista previa es una copia del sitio con tus **borradores**, en un enlace temporal que dura 7 días. Sirve para revisar cómo se ve antes de que lo vea todo el mundo.

**Mientras GitHub siga pausado** (ver `docs/PENDIENTES.md`), la vista previa se genera desde la terminal, en la carpeta del proyecto:

```powershell
npm run deploy:cms:preview
```

Tarda uno o dos minutos. Al final aparece la dirección, con la forma `https://nexbytes1--preview-xxxx.web.app`. Ábrela y revisa con calma, también desde el teléfono.

El botón **Vista previa** de la página Publicar solo deja la solicitud anotada y muestra "Para generar la vista previa, corre npm run deploy:cms:preview en la terminal". Cuando GitHub vuelva a funcionar, ese botón hará todo solo.

## Publicar

1. Entra a **Publicar**. Ahí ves qué bloques tienen "Cambios sin publicar". Si alguno tiene un error, el panel lo indica y no te deja publicar hasta corregirlo.
2. Pulsa **Publicar** y confirma. Los borradores con cambios se copian a lo publicado.
3. **Mientras GitHub siga pausado**, el panel muestra "Los cambios ya quedaron en lo publicado. Para actualizar el sitio, corre npm run deploy:cms en la terminal". Es lo esperado. En la terminal:

   ```powershell
   npm run deploy:cms
   ```

   Cuando termine, el sitio ya muestra los cambios. Recarga la página para verlos.

**Importante:** usa siempre `npm run deploy:cms`. El comando `npm run deploy` (sin `:cms`) construye el sitio con los archivos JSON del proyecto, no con lo que editaste en el panel, y lo borraría del sitio publicado.

En el **Historial** de Publicar ves cada publicación con su estado: Solicitada, Construyendo, Publicada o Con error. Una que queda "Solicitada" o "Construyendo" más de 30 minutos se marca como "Sin respuesta" y no bloquea los botones.

## Cotizaciones y lista de espera

En el menú, **Bandeja**:

- **Cotizaciones.** Las nuevas aparecen arriba, y el número de nuevas se actualiza solo (también en Inicio).
  - **Filtrar y buscar:** filtra por estado, o busca por la referencia exacta (`NX-…`) o por el inicio del nombre. El nombre se busca tal como lo escribió la persona: "Ana" encuentra "Ana Rivas", pero "Rivas" no, y "Jose" no encuentra "José".
  - **Abrir una cotización:** muestra todo lo que llenó la persona, con botones para escribirle por WhatsApp (el saludo ya lleva la referencia) o por correo.
  - **Estado:** Nueva, Contactada, Propuesta enviada, Ganada o Perdida. Se guarda al tocarlo.
  - **Notas internas:** solo las ves tú. Tienen su propio botón **Guardar notas**.
- **Lista de espera.** La gente que se apuntó al producto propio. Puedes cambiar su estado (Nuevo, Invitado, Baja) y **Exportar CSV** para abrirla en Excel o Google Sheets.

Desde el panel no se pueden borrar cotizaciones ni registros. Es a propósito, para no perder nada por error.

## Si algo falla

### "Firestore no deja leer el borrador…" o el panel no carga nada en tu computadora

Casi siempre es **App Check**, que protege la base de datos y no reconoce tu navegador local.

1. Con `npm run dev` corriendo, abre `http://localhost:4321/admin` y la consola del navegador (F12 → Consola).
2. Busca la línea "App Check debug token: …" y copia ese código.
3. En la consola de Firebase: **App Check → Apps → (la app web) → menú ⋮ → Administrar tokens de depuración → Agregar token**. Pega el código, ponle un nombre (por ejemplo "Laptop") y guarda.
4. Recarga el panel.

El código es distinto para cada navegador. Si cambias de navegador o borras los datos del sitio, repite los pasos. No compartas esos códigos: dejan pasar App Check.

### "Firestore no deja…" también en el sitio publicado, o justo después de un cambio del panel

Faltan publicar las **reglas** de la base de datos (las que dicen quién puede leer o escribir qué). En la terminal:

```powershell
npm run deploy:rules
```

Si la bandeja dice que "necesita un índice de Firestore", falta otra cosa: los índices.

```powershell
firebase deploy --only firestore:indexes
```

Tardan unos minutos en quedar listos.

### "No se pudo contactar al servidor de imágenes…"

El servidor de imágenes (el Worker de Cloudflare) no respondió o no acepta la dirección desde la que abriste el panel. Revisa en este orden:

1. Tu conexión a internet.
2. Que abriste el panel desde una dirección permitida: `http://localhost:…`, `http://127.0.0.1:…`, `https://nexbytes1.web.app`, `https://nexbytes1.firebaseapp.com` o una vista previa `https://nexbytes1--….web.app`. Con un dominio nuevo, hay que agregarlo a `ALLOWED_ORIGINS` en `workers/nexbytes-api/wrangler.jsonc` y volver a desplegar el Worker (`cd workers/nexbytes-api; npx wrangler deploy`).
3. Que el Worker esté desplegado: `https://nexbytes-api.<tu-cuenta>.workers.dev` debe responder "Ruta no encontrada".

Otros mensajes:

- **"La sesión venció"**: sal y vuelve a entrar.
- **"Falta configurar PUBLIC_API_URL"**: falta la dirección del Worker en `.env` (`node scripts/configure-worker.mjs <url>`).

### Una publicación quedó "Con error"

- **Antes de cambiar nada, revisa si el contenido ya se copió.** Si en Publicar ya no aparecen "Cambios sin publicar", el contenido está bien y solo falta el despliegue: corre `npm run deploy:cms`.
- Si el botón dijo "Un borrador cambió mientras se publicaba", vuelve a pulsar **Publicar**.
- Si `npm run deploy:cms` falla en la terminal, el mensaje indica el paso que falló:
  - **Pruebas:** algo del código no pasa. No es un problema del contenido.
  - **Build:** un bloque de lo publicado no cumple las reglas del contenido. El mensaje dice qué bloque y qué campo; corrígelo en el panel, guarda y publica de nuevo.
  - **Despliegue:** problema con la sesión de Firebase en la terminal. Corre `firebase login` y repite.
- Una publicación "Sin respuesta" no hace daño: queda en el historial y no bloquea nada.

### Restaurar el contenido desde los archivos del proyecto

Los archivos `src/content/data/*.json` son el respaldo del contenido original. Para volver a ese contenido:

```powershell
npm run seed -- --dry-run   # muestra qué cambiaría, sin tocar nada
npm run seed                # sube los JSON a los borradores y a lo publicado
```

El comando avisa qué documentos va a sobrescribir y pide escribir el ID del proyecto para confirmar. **Reemplaza todo lo editado en el panel** (borradores y publicado) por el contenido de los JSON. Después corre `npm run deploy:cms` para que el sitio lo muestre.

Para guardar una copia de lo que tienes ahora antes de restaurar, construye el sitio con `npm run deploy:cms:preview`: esa vista previa queda disponible 7 días.
