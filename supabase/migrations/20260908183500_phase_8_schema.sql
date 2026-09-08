create extension if not exists pgcrypto;

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null,
  display_name text,
  role text not null default 'admin' check (role in ('admin','owner')),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists admins_email_lower_uidx on public.admins (lower(email));

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sessions_admin_idx on public.sessions(admin_id);
create index if not exists sessions_expiry_idx on public.sessions(expires_at);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_tokens_admin_idx on public.password_reset_tokens(admin_id);

create table if not exists public.job_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.job_categories(id) on delete set null,
  slug text not null unique,
  code text not null unique,
  title text not null,
  summary text,
  description text not null,
  location text,
  work_model text check (work_model in ('onsite','hybrid','remote','flexible')),
  employment_type text,
  experience text,
  technologies jsonb not null default '[]'::jsonb,
  responsibilities jsonb not null default '[]'::jsonb,
  qualifications jsonb not null default '[]'::jsonb,
  benefits jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','closed','archived')),
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid references public.admins(id) on delete set null,
  updated_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);
create index if not exists jobs_status_idx on public.jobs(status);
create index if not exists jobs_category_idx on public.jobs(category_id);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  candidate_name text not null,
  email text not null,
  phone text,
  status text not null default 'new' check (status in ('new','reviewing','shortlisted','interview','rejected','hired','withdrawn')),
  consent_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists applications_job_idx on public.applications(job_id);
create index if not exists applications_status_idx on public.applications(status);
create index if not exists applications_email_lower_idx on public.applications(lower(email));

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  kind text not null check (kind in ('resume','cover_letter')),
  storage_bucket text not null default 'candidate-documents',
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20971520),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique(application_id, kind)
);
create index if not exists application_documents_application_idx on public.application_documents(application_id);

create table if not exists public.application_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists application_history_application_idx on public.application_history(application_id, created_at desc);

create table if not exists public.contact_enquiries (
  id uuid primary key,
  source_type text not null check (source_type in ('contact','demo','consultation','chat')),
  first_name text,
  last_name text,
  name text,
  company text,
  job_title text,
  email text not null,
  phone text,
  topic text,
  message text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','read','in_progress','resolved','spam')),
  assigned_admin_id uuid references public.admins(id) on delete set null,
  request_id text,
  received_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contact_enquiries_status_idx on public.contact_enquiries(status, received_at desc);
create index if not exists contact_enquiries_email_lower_idx on public.contact_enquiries(lower(email));

create table if not exists public.candidate_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','internal')),
  subject text,
  body text not null,
  admin_id uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists candidate_messages_application_idx on public.candidate_messages(application_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admins(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_admin_idx on public.notifications(admin_id, read_at, created_at desc);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  related_entity_type text,
  related_entity_id uuid,
  template_key text,
  recipient text not null,
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  error_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_logs_status_idx on public.email_logs(status, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_admin_id uuid references public.admins(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_admin_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admins_set_updated_at before update on public.admins for each row execute function public.set_updated_at();
create trigger job_categories_set_updated_at before update on public.job_categories for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs for each row execute function public.set_updated_at();
create trigger applications_set_updated_at before update on public.applications for each row execute function public.set_updated_at();
create trigger contact_enquiries_set_updated_at before update on public.contact_enquiries for each row execute function public.set_updated_at();

alter table public.admins enable row level security;
alter table public.sessions enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.job_categories enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.application_history enable row level security;
alter table public.contact_enquiries enable row level security;
alter table public.candidate_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.email_logs enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.admins, public.sessions, public.password_reset_tokens, public.job_categories, public.jobs,
  public.applications, public.application_documents, public.application_history, public.contact_enquiries,
  public.candidate_messages, public.notifications, public.email_logs, public.audit_logs from anon, authenticated;

grant select, insert, update, delete on table public.admins, public.sessions, public.password_reset_tokens, public.job_categories, public.jobs,
  public.applications, public.application_documents, public.application_history, public.contact_enquiries,
  public.candidate_messages, public.notifications, public.email_logs, public.audit_logs to service_role;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
grant execute on function public.set_updated_at() to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
