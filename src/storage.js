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

// Compatible con la API window.storage que usa la app (get/set/delete/list).
// Todo se guarda en una única tabla de Supabase, así que "shared" y "personal"
// terminan siendo lo mismo: todos los dispositivos ven los mismos datos.
async function get(key) {
  const { data, error } = await supabase.from(TABLE).select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Key not found: " + key);
  return { key, value: data.value, shared: true };
}

async function set(key, value) {
  const { error } = await supabase.from(TABLE).upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { key, value, shared: true };
}

async function del(key) {
  const { error } = await supabase.from(TABLE).delete().eq("key", key);
  if (error) throw error;
  return { key, deleted: true, shared: true };
}

async function list(prefix = "") {
  const { data, error } = await supabase.from(TABLE).select("key").like("key", `${prefix}%`);
  if (error) throw error;
  return { keys: (data || []).map((r) => r.key), prefix, shared: true };
}

const storage = { get, set, delete: del, list };
export default storage;
