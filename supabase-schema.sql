-- AGENT PREMIUM - Supabase Postgres schema

create table if not exists public.users (
  id text primary key,
  provider text not null,
  name text,
  email text unique not null,
  passwordhash text,
  createdat timestamptz default now(),
  updatedat timestamptz
);

create table if not exists public.orders (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  status text not null default 'en_attente',
  totalamount integer not null default 0,
  paymentmethod text,
  items jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz
);

create table if not exists public.favorites (
  user_id text primary key references public.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
