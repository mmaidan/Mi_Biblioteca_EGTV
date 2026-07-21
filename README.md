# Mi Biblioteca — proyecto listo para publicar

Esta carpeta convierte la app de biblioteca en un proyecto real que podés:
- publicar como sitio web (con actualizaciones cuando quieras),
- instalar como app en celulares Android (APK),
- instalar como app de escritorio (Windows/Mac),
- usar entre varios dispositivos viendo los mismos datos en tiempo real (cada ~4s).

No hace falta saber programar para seguir estos pasos, pero sí seguir el orden.

---

## Paso 1 — Crear la base de datos (Supabase, gratis)

1. Andá a https://supabase.com y creá una cuenta gratis (con GitHub o email).
2. Creá un proyecto nuevo (elegí cualquier nombre y contraseña, y una región cercana, ej. South America).
3. Cuando el proyecto esté listo, andá a **SQL Editor** (menú izquierdo) → **New query**.
4. Abrí el archivo `supabase.sql` de esta carpeta, copiá todo su contenido, pegalo ahí, y tocá **Run**.
5. Andá a **Project Settings** (ícono de engranaje) → **API**. Vas a necesitar dos datos:
   - **Project URL**
   - **anon public key**

## Paso 2 — Conectar la app a esa base de datos

1. En esta carpeta, hacé una copia del archivo `.env.example` y renombrala a `.env`.
2. Completá los dos valores que copiaste de Supabase:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi....
   ```

## Paso 3 — Probarla en tu computadora (opcional pero recomendado)

Necesitás tener [Node.js](https://nodejs.org) instalado (versión 18 o más nueva). Después, en esta carpeta:

```bash
npm install
npm run dev
```

Se abre en `http://localhost:5173`. Probá iniciar sesión, cargar un libro, etc.

## Paso 4 — Publicarla como sitio web (gratis)

La forma más simple, sin usar la terminal:

1. Subí esta carpeta a GitHub (podés arrastrar los archivos desde github.com, creando un repositorio nuevo).
2. Andá a https://vercel.com, entrá con tu cuenta de GitHub, tocá **Add New → Project**, elegí el repositorio.
3. En **Environment Variables**, cargá las mismas dos variables del Paso 2 (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
4. Tocá **Deploy**. En un minuto te da una URL tipo `https://mi-biblioteca.vercel.app` — esa es tu sitio, ya funcionando y accesible desde cualquier celular con navegador.

Para **actualizarla** más adelante: cualquier cambio que subas a GitHub, Vercel lo publica solo, automáticamente.

## Paso 5 — Convertirla en APK para Android

1. Con tu sitio ya publicado (Paso 4), andá a https://www.pwabuilder.com
2. Pegá la URL de tu sitio (ej. `https://mi-biblioteca.vercel.app`) y tocá **Start**.
3. PWABuilder analiza el sitio (ya viene preparado como PWA instalable gracias a este proyecto) y te deja **descargar el paquete de Android**.
4. Ese paquete te da un `.apk` (o `.aab` para subir a Google Play) que podés instalar directamente en cualquier celular Android, o compartir el archivo por WhatsApp/Drive para que otros lo instalen.

## Paso 6 — Convertirla en app de escritorio (Windows/Mac)

Desde la misma página de PWABuilder (Paso 5), además del paquete Android, hay opciones para generar el paquete de **Windows** y de **Mac**. Se descargan e instalan como cualquier programa.

---

## Preguntas frecuentes

**¿Todos ven los mismos libros y préstamos?**
Sí. Todos los dispositivos leen y escriben en la misma base de datos de Supabase, y la app revisa cambios cada 4 segundos, así que se ve prácticamente en tiempo real.

**¿Cuánto cuesta todo esto?**
Nada, mientras uses los planes gratuitos de Supabase y Vercel, que alcanzan de sobra para una biblioteca escolar.

**¿Cómo le pido a Claude que actualice algo (agregar una función, cambiar un color, etc.)?**
Pedímelo en el chat como hasta ahora. Te doy el archivo `src/App.jsx` actualizado, lo reemplazás en tu proyecto, subís el cambio a GitHub, y Vercel lo publica solo.

**¿Es seguro para datos sensibles?**
No es un sistema con seguridad robusta (las contraseñas de los usuarios de la app se guardan sin cifrar). Está pensado para gestión interna simple de una biblioteca escolar, no para información sensible.
