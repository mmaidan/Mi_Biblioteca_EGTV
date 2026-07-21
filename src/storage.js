import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env y completá tus datos de Supabase."
  );
}

export const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "");

const TABLE = "library_kv";
const CACHE_PREFIX = "biblioteca-cache:";
const TIMEOUT_MS = 6000;

// --- Caché local (localStorage del navegador) --------------------------
// Esto es lo que permite que la app siga mostrando y aceptando cambios
// aunque no haya internet: cada lectura/escritura exitosa se guarda acá,
// y si Supabase no responde, se usa esta copia como respaldo.
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw === null ? null : raw;
  } catch (e) {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, value);
  } catch (e) {
    // Si el storage del navegador está lleno o bloqueado, no hacemos nada;
    // seguimos funcionando solo con lo que haya en memoria.
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// Compatible con la API window.storage que usa la app (get/set/delete/list).
// Todo se guarda en una única tabla de Supabase, así que "shared" y "personal"
// terminan siendo lo mismo: todos los dispositivos ven los mismos datos.
async function get(key) {
  try {
    const { data, error } = await withTimeout(
      supabase.from(TABLE).select("value").eq("key", key).maybeSingle(),
      TIMEOUT_MS
    );
    if (error) throw error;
    if (!data) throw new Error("Key not found: " + key);
    cacheSet(key, data.value);
    return { key, value: data.value, shared: true, fromCache: false };
  } catch (err) {
    const cached = cacheGet(key);
    if (cached !== null) {
      return { key, value: cached, shared: true, fromCache: true };
    }
    throw err;
  }
}

// A diferencia de antes, set() NUNCA tira error hacia afuera: siempre guarda
// primero en la copia local (eso nunca falla), y después intenta mandarlo a
// Supabase. Si Supabase no responde (sin conexión), devuelve synced:false
// para que la app sepa que ese cambio todavía no llegó al servidor, pero
// el dato ya quedó guardado localmente y no se pierde.
async function set(key, value) {
  cacheSet(key, value);
  try {
    const { error } = await withTimeout(
      supabase.from(TABLE).upsert({ key, value, updated_at: new Date().toISOString() }),
      TIMEOUT_MS
    );
    if (error) throw error;
    return { key, value, shared: true, synced: true };
  } catch (err) {
    return { key, value, shared: true, synced: false };
  }
}

async function del(key) {
  try {
    localStorage.removeItem(CACHE_PREFIX + key);
  } catch (e) {}
  const { error } = await supabase.from(TABLE).delete().eq("key", key);
  if (error) throw error;
  return { key, deleted: true, shared: true };
}

async function list(prefix = "") {
  const { data, error } = await supabase.from(TABLE).select("key").like("key", `${prefix}%`);
  if (error) throw error;
  return { keys: (data || []).map((r) => r.key), prefix, shared: true };
}

// --- Portadas (Supabase Storage) ----------------------------------------
const COVERS_BUCKET = "covers";
const MAX_COVER_WIDTH = 500;

// Achica y comprime la imagen en el propio navegador antes de subirla, así
// cada portada pesa unos pocos KB en vez de varios MB (la foto tal cual sale
// de un celular).
function resizeImage(file, maxWidth = MAX_COVER_WIDTH) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen"))), "image/jpeg", 0.82);
      };
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

async function uploadCover(file) {
  const blob = await resizeImage(file);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(COVERS_BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(COVERS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const storage = { get, set, delete: del, list };
export default storage;
export { uploadCover };
