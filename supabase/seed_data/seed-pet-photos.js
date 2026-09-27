// Uploads the test pet photos to the public "pet-photos" bucket and sets pets.photo_url.
// Usage (PowerShell):  $env:SUPABASE_SERVICE_ROLE_KEY="..."; node supabase/seed_data/seed-pet-photos.js
// Photos: Wikimedia Commons (freely licensed), see pet-photos/CREDITS.md.
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mfamxvbepohyeigpnsyi.supabase.co';
const TEST_OWNER = '5ea425cd-3c89-42a3-b935-d9f42ce67448'; // owner of the test pets in 004_add_test_pets.sql
const BUCKET = 'pet-photos';
const PETS = ['Luna', 'Rosa', 'Viola', 'Oscar', 'Frost', 'Titiz', 'Bagera', 'Twitter', 'Twitirw', 'Spirit'];

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY first (never hardcode it).');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, key, { auth: { persistSession: false } });

async function main() {
  const { error: bucketError } = await supabase.storage.getBucket(BUCKET);
  if (bucketError) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) throw error;
    console.log(`Created public bucket "${BUCKET}"`);
  }

  for (const name of PETS) {
    const file = `${name.toLowerCase()}.jpg`;
    const objectPath = `seed/${file}`;
    const bytes = fs.readFileSync(path.join(__dirname, 'pet-photos', file));

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, bytes, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    const url = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
    const { data, error } = await supabase
      .from('pets')
      .update({ photo_url: url })
      .eq('owner_id', TEST_OWNER)
      .eq('pet_name', name)
      .select('id');
    if (error) throw error;
    console.log(`${name}: ${data.length} pet(s) updated -> ${url}`);
  }
}

main().catch(error => {
  console.error('Failed:', error.message || error);
  process.exit(1);
});
