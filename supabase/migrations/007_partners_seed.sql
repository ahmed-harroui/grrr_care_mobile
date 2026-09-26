-- GRRR Care Partners & Clinics seed data

begin;

-- Featured clinic
insert into partners (id, name, category, description, address, phone, email, website, latitude, longitude, rating, is_featured, services, is_published)
values
  (gen_random_uuid(), 'Riverside Animal Clinic', 'clinic', 'Full-service veterinary clinic with emergency care', '123 Main St, Downtown', '555-0100', 'info@riverside.vet', 'www.riverside.vet', 40.7128, -74.0060, 4.8, true, '["vaccinations", "surgery", "dental", "emergency"]'::jsonb, true);

-- Additional clinics
insert into partners (id, name, category, description, address, phone, email, website, latitude, longitude, rating, is_featured, services, is_published)
values
  (gen_random_uuid(), 'Westside Veterinary Hospital', 'clinic', 'Modern facility with advanced diagnostic equipment', '456 Oak Ave, West District', '555-0101', 'contact@westside.vet', 'www.westside.vet', 40.7250, -74.0150, 4.6, false, '["vaccinations", "surgery", "laboratory", "ultrasound"]'::jsonb, true),
  (gen_random_uuid(), 'Petcare Plus Clinic', 'clinic', 'Compassionate care for all pets', '789 Pine Rd, Midtown', '555-0102', 'hello@petcare.plus', 'www.petcare.plus', 40.7200, -74.0100, 4.5, false, '["vaccinations", "check-ups", "nutrition", "behavior"]'::jsonb, true),
  (gen_random_uuid(), 'Emergency Animal Center', 'clinic', '24/7 emergency and urgent care services', '321 Emergency Blvd, Hospital Zone', '555-9999', 'er@emergencyvet.com', 'www.emergencyvet.com', 40.7180, -74.0120, 4.7, false, '["emergency", "trauma", "intensive-care", "surgery"]'::jsonb, true);

-- Pet pharmacies
insert into partners (id, name, category, description, address, phone, email, website, latitude, longitude, rating, services, is_published)
values
  (gen_random_uuid(), 'PetMeds Express', 'pharmacy', 'Online and in-store pet medications', '555 Pharmacy Lane, Central', '555-0200', 'orders@petmeds.shop', 'www.petmeds.shop', 40.7160, -74.0110, 4.4, '["prescription-fulfillment", "supplements", "delivery"]'::jsonb, true),
  (gen_random_uuid(), 'VetRx Pharmacy', 'pharmacy', 'Licensed veterinary pharmacy with consultation', '666 Health St, Medical District', '555-0201', 'info@vetrx.pharm', 'www.vetrx.pharm', 40.7210, -74.0130, 4.6, '["prescription-fulfillment", "consultation", "fast-delivery"]'::jsonb, true);

-- Pet supplies stores
insert into partners (id, name, category, description, address, phone, email, website, latitude, longitude, rating, services, is_published)
values
  (gen_random_uuid(), 'Paws & Claws Supply Co', 'supplies', 'Complete pet supplies and accessories', '777 Shopping Center, Mall District', '555-0300', 'info@pawsclaws.store', 'www.pawsclaws.store', 40.7190, -74.0140, 4.3, '["food", "toys", "grooming-products", "training-supplies"]'::jsonb, true),
  (gen_random_uuid(), 'Natural Pet Store', 'supplies', 'Organic and eco-friendly pet products', '888 Green Ave, Eco District', '555-0301', 'hello@naturalpes.store', 'www.naturalpets.store', 40.7220, -74.0090, 4.5, '["organic-food", "toys", "bedding", "eco-products"]'::jsonb, true);

-- Pet insurance
insert into partners (id, name, category, description, address, phone, email, website, rating, services, is_published)
values
  (gen_random_uuid(), 'PetGuard Insurance', 'insurance', 'Comprehensive pet health insurance plans', null, '555-0400', 'quote@petguard.ins', 'www.petguard.insurance', 4.4, '["health-coverage", "dental", "wellness", "emergency"]'::jsonb, true),
  (gen_random_uuid(), 'FurFamily Protection', 'insurance', 'Flexible pet insurance with fast claims', null, '555-0401', 'support@furfamily.ins', 'www.furfamily.insurance', 4.6, '["comprehensive-coverage", "fast-claims", "wellness"]'::jsonb, true);

-- Grooming services
insert into partners (id, name, category, description, address, phone, email, website, latitude, longitude, rating, services, is_published)
values
  (gen_random_uuid(), 'Pampered Paws Grooming', 'grooming', 'Professional grooming and spa services', '999 Spa Lane, Wellness District', '555-0500', 'book@pamperedpaws.groom', 'www.pamperedpaws.grooming', 40.7170, -74.0105, 4.7, '["bathing", "grooming", "nail-care", "spa-treatments"]'::jsonb, true),
  (gen_random_uuid(), 'Quick Wash Pet Salon', 'grooming', 'Fast and affordable grooming', '1010 Fast St, Downtown', '555-0501', 'quick@quickwash.salon', 'www.quickwash.salon', 40.7140, -74.0080, 4.2, '["bathing", "nail-trim", "ear-clean"]'::jsonb, true);

-- Pet food brands/suppliers
insert into partners (id, name, category, description, address, phone, email, website, rating, services, is_published)
values
  (gen_random_uuid(), 'Premium Pet Nutrition', 'food', 'High-quality specialized pet diets', null, '555-0600', 'info@premiumpet.nutrition', 'www.premiumpetn.food', 4.5, '["prescription-diets", "organic-food", "supplements"]'::jsonb, true),
  (gen_random_uuid(), 'Kibble Kingdom', 'food', 'Wide variety of pet food brands', null, '555-0601', 'orders@kibblekingdom.shop', 'www.kibblekingdom.shop', 4.3, '["bulk-orders", "delivery", "subscription"]'::jsonb, true);

commit;
