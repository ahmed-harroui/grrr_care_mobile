create extension if not exists vector;

create table if not exists knowledge_species (
  id text primary key,
  name text not null,
  emoji text not null,
  group_name text not null,
  common_breeds jsonb not null default '[]'::jsonb,
  supported boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_sources (
  id text primary key,
  name text not null,
  organization text,
  source_type text not null,
  url text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_documents (
  id text primary key,
  title text not null,
  category text not null,
  subcategory text,
  species jsonb not null default '[]'::jsonb,
  language text not null default 'en',
  status text not null default 'draft',
  risk_level text not null default 'low',
  summary text not null,
  content text not null,
  key_points jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  source_ids jsonb not null default '[]'::jsonb,
  review_status text not null default 'needs_veterinary_review',
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_chunks (
  id text primary key,
  document_id text not null references knowledge_documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_document_id_idx on knowledge_chunks(document_id);
create index if not exists knowledge_documents_category_idx on knowledge_documents(category);
create index if not exists knowledge_documents_status_idx on knowledge_documents(status);

create table if not exists knowledge_reviews (
  id bigint generated always as identity primary key,
  document_id text not null references knowledge_documents(id) on delete cascade,
  reviewer text,
  status text not null default 'review',
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists emergency_guides (
  id text primary key,
  species jsonb not null default '[]'::jsonb,
  condition text not null,
  severity text not null,
  symptoms jsonb not null default '[]'::jsonb,
  immediate_actions jsonb not null default '[]'::jsonb,
  do_not_do jsonb not null default '[]'::jsonb,
  when_to_call_vet text not null,
  source_ids jsonb not null default '[]'::jsonb,
  review_status text not null default 'needs_veterinary_review',
  created_at timestamptz not null default now()
);
