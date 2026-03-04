-- Audioform auth table for custom server-side session auth.
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'admin' check (role in ('admin', 'user')),
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

-- If you use anon key for server writes, enable RLS + policy.
-- Recommended for server auth routes: use SUPABASE_SERVICE_ROLE_KEY and keep RLS disabled for this table.
alter table public.users disable row level security;
