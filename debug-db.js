const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

console.log('🔍 Supabase Debug\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 10) + '...\n');

if (supabaseUrl.includes('your-project')) {
  console.log('❌ SUPABASE_URL not set. Check your .env file');
  console.log('\nCreate a .env file with:');
  console.log('SUPABASE_URL=https://your-project.supabase.co');
  console.log('SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  try {
    // Test connection
    console.log('📡 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('pets')
      .select('count', { count: 'exact' })
      .limit(1);

    if (testError) {
      console.log('❌ Connection failed:', testError.message);
      return;
    }
    console.log('✅ Connected to Supabase\n');

    // Check partners table
    console.log('🔎 Checking partners table...');
    const { data: partners, error: partnersError, count } = await supabase
      .from('partners')
      .select('*', { count: 'exact' });

    if (partnersError) {
      console.log('❌ Error:', partnersError.message);
      console.log('\nThe partners table might not exist.');
      console.log('Run these SQL commands in Supabase SQL Editor:\n');
      console.log(require('fs').readFileSync('./supabase/migrations/006_partners_clinics.sql', 'utf8'));
      return;
    }

    console.log(`✅ Partners table exists\n`);
    console.log(`   Total partners: ${count}`);
    console.log(`   Rows: ${partners?.length || 0}\n`);

    if (count === 0) {
      console.log('📌 Inserting sample partners...\n');
      const samplePartners = [
        {
          name: 'Riverside Animal Clinic',
          category: 'clinic',
          description: 'Full-service veterinary clinic',
          address: '123 Main St',
          phone: '555-0100',
          email: 'info@riverside.vet',
          website: 'www.riverside.vet',
          latitude: 44.8404,
          longitude: -0.5805,
          rating: 4.8,
          is_featured: true,
          services: JSON.stringify(['vaccinations', 'surgery', 'dental', 'emergency']),
          is_published: true,
        },
        {
          name: 'Petcare Plus',
          category: 'clinic',
          description: 'Compassionate pet care',
          address: '789 Pine Rd',
          phone: '555-0102',
          email: 'hello@petcare.plus',
          website: 'www.petcare.plus',
          latitude: 44.8400,
          longitude: -0.5800,
          rating: 4.5,
          is_featured: false,
          services: JSON.stringify(['vaccinations', 'check-ups', 'nutrition']),
          is_published: true,
        },
      ];

      const { data: inserted, error: insertError } = await supabase
        .from('partners')
        .insert(samplePartners);

      if (insertError) {
        console.log('❌ Insert error:', insertError.message);
        return;
      }
      console.log('✅ Inserted', samplePartners.length, 'sample partners');
    } else {
      console.log('Partners in DB:');
      partners?.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (${p.category}) - Featured: ${p.is_featured}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debug();
