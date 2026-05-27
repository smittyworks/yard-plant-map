create type public.feature_type as enum (
  'patio', 'pool', 'deck', 'driveway', 'shed', 'garden_bed', 'walkway', 'other'
);

create table public.yard_features (
  id           uuid primary key default gen_random_uuid(),
  yard_id      uuid not null references public.yards(id) on delete cascade,
  label        text not null,
  feature_type public.feature_type not null default 'other',
  grid_x       integer not null,
  grid_y       integer not null,
  grid_width   integer not null default 1,
  grid_height  integer not null default 1,
  color        text not null,
  created_at   timestamptz default now() not null
);

alter table public.yard_features enable row level security;

create policy "Users can manage features in own yards"
  on public.yard_features for all
  using (
    exists (
      select 1 from public.yards
      where yards.id = yard_features.yard_id
        and yards.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.yards
      where yards.id = yard_features.yard_id
        and yards.user_id = auth.uid()
    )
  );
