-- Schema Supabase - Sistema de Gestão Empresarial Nexo Group
-- Rode no SQL Editor do Supabase, depois importe os CSVs da pasta dados/

create table if not exists companies (
  id bigint primary key,
  name text not null,
  legal_name text,
  tax_id text,
  segment text,
  email text,
  phone text,
  country text,
  address text,
  notes text,
  logo_url text,
  created_at timestamptz
);

create table if not exists clients (
  id bigint primary key,
  name text not null,
  company text,
  country text,
  email text,
  phone text,
  address text,
  profession text,
  service text,
  status text default 'ativo',
  growth_notes text,
  created_at timestamptz
);

create table if not exists transactions (
  id bigint primary key,
  description text,
  type text,
  category text,
  amount numeric,
  currency text,
  date date,
  due_date date,
  status text,
  client_id bigint references clients(id),
  client_name text,
  company text,
  installment_count int,
  installment_index int,
  installment_group text,
  recurrence_freq text,
  recurrence_count int,
  recurrence_index int,
  recurrence_group text,
  recurrence_until date,
  product_codes text,
  created_at timestamptz
);

create table if not exists crm_leads (
  id bigint primary key,
  name text,
  stage text,
  origin text,
  follow_up_date date,
  company text,
  created_at timestamptz
);

create table if not exists projects (
  id bigint primary key,
  name text,
  client_id bigint references clients(id),
  stage text,
  company text,
  created_at timestamptz
);

create table if not exists mentoring_sessions (
  id bigint primary key,
  client_id bigint references clients(id),
  mentee_name text,
  theme text,
  closed_date date,
  session_date date,
  summary text,
  next_step text,
  contact_date date,
  created_at timestamptz
);

create table if not exists accounting_tasks (
  id bigint primary key,
  title text,
  due_date date,
  done boolean default false,
  created_at timestamptz
);

-- Segurança: cada usuário só vê os próprios dados
-- Depois de criar as tabelas, ative RLS no Supabase e crie as policies por user_id / owner.
-- Para a primeira versão, importe os CSVs com os dados reais do backup 2026-11-11:
-- 4 empresas, 13 clientes, 130 lançamentos, 1 lead, 4 obrigações.
