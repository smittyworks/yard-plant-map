-- Add premium flag to users table
alter table public.users add column if not exists is_premium boolean not null default false;
