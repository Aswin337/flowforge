-- ================================================================
-- FlowForge v2 — Database Schema
-- ✅ Paste this ENTIRE file into Supabase SQL Editor and click RUN
-- Project: cigufklxwwiyohfijex.supabase.co
-- ================================================================

-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Workflows
create table if not exists workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  is_active boolean default true,
  version integer default 1,
  input_schema jsonb default '{}',
  start_step_id uuid,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Steps
create table if not exists steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade not null,
  name text not null,
  step_type text not null default 'task' check (step_type in ('task','approval','notification','condition')),
  metadata jsonb default '{}',
  position jsonb default '{"x":0,"y":0}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Rules (transitions between steps)
create table if not exists rules (
  id uuid primary key default gen_random_uuid(),
  step_id uuid references steps(id) on delete cascade not null,
  condition text default 'DEFAULT',
  next_step_id uuid references steps(id) on delete set null,
  priority integer default 0,
  label text default '',
  created_at timestamptz default now()
);

-- Executions
create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references workflows(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending','running','waiting','completed','failed','cancelled')),
  input_data jsonb default '{}',
  current_step_id uuid references steps(id) on delete set null,
  error_message text,
  started_by uuid references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  ended_at timestamptz
);

-- Execution Logs
create table if not exists execution_logs (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid references executions(id) on delete cascade not null,
  level text not null default 'info' check (level in ('info','success','error','warn')),
  message text not null,
  meta jsonb default '{}',
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_workflows_created_by   on workflows(created_by);
create index if not exists idx_steps_workflow_id       on steps(workflow_id);
create index if not exists idx_rules_step_id           on rules(step_id);
create index if not exists idx_executions_workflow_id  on executions(workflow_id);
create index if not exists idx_executions_status       on executions(status);
create index if not exists idx_exec_logs_execution_id  on execution_logs(execution_id);

-- ── Row Level Security ────────────────────────────────────────────
alter table users           enable row level security;
alter table workflows       enable row level security;
alter table steps           enable row level security;
alter table rules           enable row level security;
alter table executions      enable row level security;
alter table execution_logs  enable row level security;

-- Drop existing policies (safe for re-runs)
drop policy if exists "ff_users"     on users;
drop policy if exists "ff_workflows" on workflows;
drop policy if exists "ff_steps"     on steps;
drop policy if exists "ff_rules"     on rules;
drop policy if exists "ff_execs"     on executions;
drop policy if exists "ff_logs"      on execution_logs;

-- Allow full access (service role key bypasses RLS anyway)
create policy "ff_users"     on users           for all using (true) with check (true);
create policy "ff_workflows" on workflows       for all using (true) with check (true);
create policy "ff_steps"     on steps           for all using (true) with check (true);
create policy "ff_rules"     on rules           for all using (true) with check (true);
create policy "ff_execs"     on executions      for all using (true) with check (true);
create policy "ff_logs"      on execution_logs  for all using (true) with check (true);

-- ── Seed: Demo Users ─────────────────────────────────────────────
-- Password: admin123
insert into users (id, name, email, password_hash, role) values
  ('00000000-0000-0000-0000-000000000001',
   'Admin User',
   'admin@flowforge.dev',
   '$2a$10$nveFVDkat792hq40xwX7K.qwsnY/LC4D0ReLNY7jDeVaqCevwneu2',
   'admin')
on conflict (email) do update set
  password_hash = excluded.password_hash,
  role = excluded.role;

insert into users (id, name, email, password_hash, role) values
  ('00000000-0000-0000-0000-000000000002',
   'Demo User',
   'user@flowforge.dev',
   '$2a$10$nveFVDkat792hq40xwX7K.qwsnY/LC4D0ReLNY7jDeVaqCevwneu2',
   'user')
on conflict (email) do update set
  password_hash = excluded.password_hash,
  role = excluded.role;

-- ── Seed: Demo Workflow ───────────────────────────────────────────
insert into workflows (id, name, description, is_active, created_by) values
  ('00000000-0000-0000-0000-000000000010',
   'Expense Approval',
   'Automated expense approval with manager sign-off',
   true,
   '00000000-0000-0000-0000-000000000001')
on conflict do nothing;

insert into steps (id, workflow_id, name, step_type, metadata, position) values
  ('00000000-0000-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000010',
   'Submit Expense',
   'task',
   '{"description":"Employee submits expense report"}',
   '{"x":160,"y":60}'),
  ('00000000-0000-0000-0000-000000000021',
   '00000000-0000-0000-0000-000000000010',
   'Manager Approval',
   'approval',
   '{"approver":"manager@company.com","instructions":"Review and approve or reject"}',
   '{"x":160,"y":200}'),
  ('00000000-0000-0000-0000-000000000022',
   '00000000-0000-0000-0000-000000000010',
   'Send Confirmation',
   'notification',
   '{"to":"employee@company.com","subject":"Expense Approved"}',
   '{"x":160,"y":340}')
on conflict do nothing;

-- Set start step
update workflows
  set start_step_id = '00000000-0000-0000-0000-000000000020'
  where id = '00000000-0000-0000-0000-000000000010';

-- Rules: chain steps together
insert into rules (id, step_id, condition, next_step_id, priority, label) values
  ('00000000-0000-0000-0000-000000000030',
   '00000000-0000-0000-0000-000000000020',
   'DEFAULT',
   '00000000-0000-0000-0000-000000000021',
   0, 'To manager'),
  ('00000000-0000-0000-0000-000000000031',
   '00000000-0000-0000-0000-000000000021',
   'DEFAULT',
   '00000000-0000-0000-0000-000000000022',
   0, 'Notify employee')
on conflict do nothing;
