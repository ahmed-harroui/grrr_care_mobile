// Uploaded by supabase/seed_data/seed-pet-photos.js
const SEED_PHOTOS = 'https://mfamxvbepohyeigpnsyi.supabase.co/storage/v1/object/public/pet-photos/seed';

export const DEMO_PETS = [
  {
    id: 'demo-pet-001',
    owner_id: 'demo-user-001',
    pet_name: 'Luna',
    species: 'Dog',
    breed: 'Labrador Retriever',
    age: 8,
    weight: 28,
    birthday: '2017-09-05',
    color: 'Golden',
    microchip: 'LAB-123456789',
    photo_url: `${SEED_PHOTOS}/luna.jpg`,
    created_at: '2024-01-15',
  },
  {
    id: 'demo-pet-002',
    owner_id: 'demo-user-001',
    pet_name: 'Mimi',
    species: 'Cat',
    breed: 'Persian',
    age: 3,
    weight: 4.2,
    birthday: '2021-05-20',
    color: 'White',
    microchip: 'CAT-987654321',
    photo_url: `${SEED_PHOTOS}/frost.jpg`,
    created_at: '2024-02-10',
  },
  {
    id: 'demo-pet-003',
    owner_id: 'demo-user-001',
    pet_name: 'Nala',
    species: 'Rabbit',
    breed: 'Holland Lop',
    age: 2,
    weight: 2.1,
    birthday: '2022-11-12',
    color: 'Brown',
    microchip: 'RAB-456789123',
    photo_url: `${SEED_PHOTOS}/bagera.jpg`,
    created_at: '2024-03-05',
  },
];

export const DEMO_VACCINATIONS = {
  'demo-pet-001': [
    { id: 'vac-001', vaccine: 'Rabies', date: '2024-03-15', next_due: '2025-03-15' },
    { id: 'vac-002', vaccine: 'DHPP', date: '2024-02-20', next_due: '2025-02-20' },
    { id: 'vac-003', vaccine: 'Bordatella', date: '2024-01-10', next_due: '2024-07-10' },
  ],
  'demo-pet-002': [
    { id: 'vac-004', vaccine: 'FVRCP', date: '2024-04-01', next_due: '2025-04-01' },
    { id: 'vac-005', vaccine: 'Rabies', date: '2023-12-15', next_due: '2026-12-15' },
  ],
  'demo-pet-003': [
    { id: 'vac-006', vaccine: 'Rabbit Viral Hemorrhage', date: '2024-03-01', next_due: '2025-03-01' },
  ],
};

export const DEMO_MEDICATIONS = {
  'demo-pet-001': [
    { id: 'med-001', name: 'Flea & Tick Prevention', dosage: 'Once monthly', start_date: '2024-01-01' },
    { id: 'med-002', name: 'Joint Supplement', dosage: 'Once daily with food', start_date: '2024-02-15' },
  ],
  'demo-pet-002': [
    { id: 'med-003', name: 'Hairball Control', dosage: '1 tsp twice weekly', start_date: '2024-01-20' },
  ],
  'demo-pet-003': [],
};

export const DEMO_VET_VISITS = {
  'demo-pet-001': [
    { id: 'visit-001', date: '2024-03-15', vet_name: 'Dr. Smith', reason: 'Annual checkup', diagnosis: 'Healthy' },
    { id: 'visit-002', date: '2024-01-10', vet_name: 'Dr. Johnson', reason: 'Vaccination', diagnosis: 'Updated' },
  ],
  'demo-pet-002': [
    { id: 'visit-003', date: '2024-02-01', vet_name: 'Dr. Smith', reason: 'Wellness exam', diagnosis: 'Healthy' },
  ],
  'demo-pet-003': [],
};

export function getDemo() {
  return {
    pets: DEMO_PETS,
    vaccinations: DEMO_VACCINATIONS,
    medications: DEMO_MEDICATIONS,
    vetVisits: DEMO_VET_VISITS,
  };
}
