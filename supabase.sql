-- Ejecutá esto en Supabase: Project > SQL Editor > New query > Run

create table if not exists library_kv (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table library_kv enable row level security;

-- Política simple: cualquiera con la anon key puede leer y escribir.
-- Suficiente para un uso interno tipo biblioteca escolar. Si más adelante
-- querés restringirlo, esto es lo primero que hay que endurecer.
create policy "Acceso total (uso interno)" on library_kv
  for all
  using (true)
  with check (true);
