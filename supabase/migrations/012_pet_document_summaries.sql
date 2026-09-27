-- What the assistant read in each document file, written once by the grrr-doc-read Edge Function
-- so the chat can use it without sending the file to the model on every message.

alter table public.pet_documents add column if not exists ai_summary text;
-- done | unsupported | failed
alter table public.pet_documents add column if not exists ai_summary_status text;
-- file_path the summary was made from; differs from file_path when the file was replaced
alter table public.pet_documents add column if not exists ai_summary_path text;
