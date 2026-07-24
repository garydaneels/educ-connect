import { createClient } from "@supabase/supabase-js";

const BUCKET = "uploads";

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis");
  supabaseClient = createClient(url, key);
  return supabaseClient;
}

export async function uploadToStorage(
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const supabase = getClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true });
  if (error) throw new Error(`Upload Supabase échoué : ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function deleteFromStorage(storedPath: string): Promise<void> {
  // Accepte soit une URL publique complète, soit un ancien chemin relatif (/uploads/…)
  const marker = `/object/public/${BUCKET}/`;
  const idx = storedPath.indexOf(marker);
  if (idx === -1) return; // Ancien chemin relatif — fichier déjà absent, rien à faire
  const storagePath = storedPath.slice(idx + marker.length);
  const supabase = getClient();
  await supabase.storage.from(BUCKET).remove([storagePath]);
}
