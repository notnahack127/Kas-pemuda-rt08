// ==========================================
// KAS WARGA RT 08 - SUPABASE CONFIG
// ==========================================

const SUPABASE_URL = "https://frosvokexwlbfucfkqli.supabase.co";

// Tempel PUBLISHABLE KEY SUPABASE LENGKAP di antara tanda kutip
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_H5f_s1Cl6dPqtFalsA4f-A_ebX6J4zA";

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
