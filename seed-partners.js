const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Set SUPABASE_URL and SUPABASE_ANON_KEY env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const partners = [
  {
    name: 'Riverside Animal Clinic',
    category: 'clinic',
    description: 'Full-service veterinary clinic with emergency care',
    address: '123 Main St, Downtown',
    phone: '555-0100',
    email: 'info@riverside.vet',
    website: 'www.riverside.vet',
    latitude: 44.8404,
    longitude: -0.5805,
    rating: 4.8,
    is_featured: true,
    services: ['vaccinations', 'surgery', 'dental', 'emergency'],
    is_published: true,
  },
  {
    name: 'Westside Veterinary Hospital',
    category: 'clinic',
    description: 'Modern facility with advanced diagnostic equipment',
    address: '456 Oak Ave, West District',
    phone: '555-0101',
    email: 'contact@westside.vet',
    website: 'www.westside.vet',
    latitude: 44.8350,
    longitude: -0.5750,
    rating: 4.6,
    is_featured: false,
    services: ['vaccinations', 'surgery', 'laboratory', 'ultrasound'],
    is_published: true,
  },
  {
    name: 'Petcare Plus Clinic',
    category: 'clinic',
    description: 'Compassionate care for all pets',
    address: '789 Pine Rd, Midtown',
    phone: '555-0102',
    email: 'hello@petcare.plus',
    website: 'www.petcare.plus',
    latitude: 44.8400,
    longitude: -0.5800,
    rating: 4.5,
    is_featured: false,
    services: ['vaccinations', 'check-ups', 'nutrition', 'behavior'],
    is_published: true,
  },
  {
    name: 'PetMeds Express',
    category: 'pharmacy',
    description: 'Online and in-store pet medications',
    address: '555 Pharmacy Lane, Central',
    phone: '555-0200',
    email: 'orders@petmeds.shop',
    website: 'www.petmeds.shop',
    latitude: 44.8380,
    longitude: -0.5790,
    rating: 4.4,
    is_featured: false,
    services: ['prescription-fulfillment', 'supplements', 'delivery'],
    is_published: true,
  },
  {
    name: 'Paws & Claws Supply Co',
    category: 'supplies',
    description: 'Complete pet supplies and accessories',
    address: '777 Shopping Center, Mall District',
    phone: '555-0300',
    email: 'info@pawsclaws.store',
    website: 'www.pawsclaws.store',
    latitude: 44.8420,
    longitude: -0.5810,
    rating: 4.3,
    is_featured: false,
    services: ['food', 'toys', 'grooming-products', 'training-supplies'],
    is_published: true,
  },
];

async function seedPartners() {
  try {
    console.log('🌱 Seeding partners...');
    const { error } = await supabase.from('partners').insert(partners);

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log('✅ Inserted', partners.length, 'partners');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedPartners();
