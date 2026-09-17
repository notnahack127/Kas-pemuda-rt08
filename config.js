// Isi dua nilai ini dari Supabase Dashboard > Project Settings > API.
// Gunakan Publishable key / anon key. JANGAN masukkan service_role/secret key.
const SUPABASE_URL = "https://frosvokexwlbfucfkqli.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "KEY_PUBLISHABLE_KAMU";

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);