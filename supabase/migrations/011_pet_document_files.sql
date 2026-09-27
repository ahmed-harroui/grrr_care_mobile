-- Documents can hold any file (PDF, scans, Word...): keep the original name and size for display.

alter table public.pet_documents add column if not exists file_name text;
alter table public.pet_documents add column if not exists file_size bigint;

-- Cap uploads at 20 MB so a single document can't fill the project storage.
update storage.buckets set file_size_limit = 20 * 1024 * 1024 where id = 'pet-documents';
