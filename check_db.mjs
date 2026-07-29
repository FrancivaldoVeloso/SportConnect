import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTournaments() {
  const { data, error } = await supabase.from('torneios').select('id, nome, capa_url, created_at');
  if (error) {
    console.error("Erro:", error);
  } else {
    console.log("Torneios no banco:");
    console.log(JSON.stringify(data, null, 2));
  }
}

checkTournaments();
