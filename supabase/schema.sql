create table if not exists public.projects (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  title text not null check (length(btrim(title)) > 0),
  updated_at timestamptz not null default now(),
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array'),
  html text,
  files jsonb not null default '[]'::jsonb check (jsonb_typeof(files) = 'array'),
  is_new_project boolean not null default false,
  primary key (user_id, id)
);

create index if not exists projects_user_updated_at_idx
  on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

drop policy if exists "Users can read their own projects" on public.projects;
create policy "Users can read their own projects"
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own projects" on public.projects;
create policy "Users can create their own projects"
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own projects" on public.projects;
create policy "Users can update their own projects"
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own projects" on public.projects;
create policy "Users can delete their own projects"
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.projects to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'projects'
    ) then
    execute 'alter publication supabase_realtime add table public.projects';
  end if;
end
$$;
