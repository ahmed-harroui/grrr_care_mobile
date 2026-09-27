-- Create Partners & Featured Clinics table
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null, -- 'clinic', 'pharmacy', 'supplies', 'insurance', 'food', 'grooming'
  description text,
  address text,
  phone text,
  email text,
  website text,
  hours jsonb, -- { "monday": "9am-5pm", "tuesday": "9am-5pm", ... }
  latitude numeric,
  longitude numeric,
  rating numeric default 4.5,
  is_featured boolean default false,
  logo_url text,
  cover_image_url text,
  services jsonb, -- array of services provided
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for faster queries
create index if not exists partners_category_idx on public.partners(category);
create index if not exists partners_is_featured_idx on public.partners(is_featured);
create index if not exists partners_is_published_idx on public.partners(is_published);

-- Enable RLS
alter table public.partners enable row level security;

-- Public read policy (anyone can see published partners)
create policy "Anyone can read published partners" on public.partners
  for select using (is_published = true);

-- Admin insert/update policy (only if we add admin role later)
-- For now, we'll skip insert/update policies - backend/developers only
