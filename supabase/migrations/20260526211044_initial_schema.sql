-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  hardiness_zone text,
  created_at     timestamptz default now() not null
);

alter table public.users enable row level security;

create policy "Users can read and update own record"
  on public.users for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create user record on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- YARDS
-- ============================================================
create table public.yards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  grid_width  integer not null default 16,
  grid_height integer not null default 12,
  created_at  timestamptz default now() not null
);

alter table public.yards enable row level security;

create policy "Users can manage own yards"
  on public.yards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- PLANTS
-- ============================================================
create type public.plant_type as enum (
  'tree', 'shrub', 'perennial', 'annual', 'vine', 'grass', 'bulb', 'other'
);

create table public.plants (
  id             uuid primary key default gen_random_uuid(),
  yard_id        uuid not null references public.yards(id) on delete cascade,
  common_name    text not null,
  botanical_name text,
  plant_type     public.plant_type not null default 'other',
  grid_x         integer,
  grid_y         integer,
  placed         boolean not null default false,
  date_planted   date,
  notes          text,
  created_at     timestamptz default now() not null
);

alter table public.plants enable row level security;

create policy "Users can manage plants in own yards"
  on public.plants for all
  using (
    exists (
      select 1 from public.yards
      where yards.id = plants.yard_id
        and yards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.yards
      where yards.id = plants.yard_id
        and yards.user_id = auth.uid()
    )
  );

-- ============================================================
-- PLANT PHOTOS
-- ============================================================
create table public.plant_photos (
  id          uuid primary key default gen_random_uuid(),
  plant_id    uuid not null references public.plants(id) on delete cascade,
  storage_url text not null,
  taken_at    timestamptz default now() not null,
  notes       text
);

alter table public.plant_photos enable row level security;

create policy "Users can manage photos for own plants"
  on public.plant_photos for all
  using (
    exists (
      select 1 from public.plants
      join public.yards on yards.id = plants.yard_id
      where plants.id = plant_photos.plant_id
        and yards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plants
      join public.yards on yards.id = plants.yard_id
      where plants.id = plant_photos.plant_id
        and yards.user_id = auth.uid()
    )
  );

-- ============================================================
-- CARE EVENTS
-- ============================================================
create type public.care_event_type as enum (
  'pruning', 'fertilizing', 'watering', 'treatment', 'transplanting', 'other'
);

create table public.care_events (
  id          uuid primary key default gen_random_uuid(),
  plant_id    uuid not null references public.plants(id) on delete cascade,
  event_type  public.care_event_type not null,
  occurred_at timestamptz default now() not null,
  notes       text
);

alter table public.care_events enable row level security;

create policy "Users can manage care events for own plants"
  on public.care_events for all
  using (
    exists (
      select 1 from public.plants
      join public.yards on yards.id = plants.yard_id
      where plants.id = care_events.plant_id
        and yards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plants
      join public.yards on yards.id = plants.yard_id
      where plants.id = care_events.plant_id
        and yards.user_id = auth.uid()
    )
  );

-- ============================================================
-- REMINDERS
-- ============================================================
create table public.reminders (
  id            uuid primary key default gen_random_uuid(),
  plant_id      uuid not null references public.plants(id) on delete cascade,
  reminder_type public.care_event_type not null,
  due_date      date not null,
  completed_at  timestamptz
);

alter table public.reminders enable row level security;

create policy "Users can manage reminders for own plants"
  on public.reminders for all
  using (
    exists (
      select 1 from public.plants
      join public.yards on yards.id = plants.yard_id
      where plants.id = reminders.plant_id
        and yards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.plants
      join public.yards on yards.id = plants.yard_id
      where plants.id = reminders.plant_id
        and yards.user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE: plant-photos bucket
-- ============================================================
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', false);

create policy "Users can upload their own plant photos"
  on storage.objects for insert
  with check (
    bucket_id = 'plant-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read their own plant photos"
  on storage.objects for select
  using (
    bucket_id = 'plant-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own plant photos"
  on storage.objects for delete
  using (
    bucket_id = 'plant-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
