-- ResuMatch core schema (spec section 5).
-- Only the server (service_role) may touch these objects: RLS is on with no policies,
-- table privileges are revoked from anon/authenticated, and EXECUTE is granted to service_role only.

create table public.analyses (
  id                text primary key check (id ~ '^[A-Za-z0-9_-]{12}$'),
  result            jsonb not null,
  result_digest     text not null unique,
  job_title         text not null check (char_length(job_title) between 1 and 120),
  delete_token_hash text not null,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default now() + interval '30 days'
);
create index analyses_expires_at_idx on public.analyses (expires_at);

create table public.rate_limits (
  ip_hash text    not null,
  day     date    not null,
  count   integer not null default 0 check (count >= 0),
  primary key (ip_hash, day)
);

alter table public.analyses enable row level security;
alter table public.rate_limits enable row level security;

revoke all on table public.analyses, public.rate_limits from anon, authenticated;
grant select, insert, update, delete on table public.analyses, public.rate_limits to service_role;

-- Atomic per-IP and global daily quota. A rejected request never uses up a slot (spec 5.1).
create function public.consume_quota(p_ip_hash text, p_ip_limit int, p_global_limit int)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Asia/Manila')::date;
  v_count int;
begin
  if p_ip_limit < 1 or p_global_limit < 1 then
    raise exception 'consume_quota limits must be at least 1';
  end if;

  insert into public.rate_limits as r (ip_hash, day, count)
  values (p_ip_hash, v_day, 1)
  on conflict (ip_hash, day) do update set count = r.count + 1 where r.count < p_ip_limit
  returning r.count into v_count;
  if v_count is null then
    return 'ip_limit';
  end if;

  v_count := null;
  insert into public.rate_limits as r (ip_hash, day, count)
  values ('__global__', v_day, 1)
  on conflict (ip_hash, day) do update set count = r.count + 1 where r.count < p_global_limit
  returning r.count into v_count;
  if v_count is null then
    update public.rate_limits set count = count - 1 where ip_hash = p_ip_hash and day = v_day;
    return 'global_limit';
  end if;

  return 'ok';
end;
$$;

-- Stores a shared result once per digest; re-sharing returns the live link (spec 5.2).
create function public.create_share(
  p_id text,
  p_result jsonb,
  p_digest text,
  p_job_title text,
  p_delete_token_hash text
)
returns table (id text, created boolean, expires_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  delete from public.analyses a where a.result_digest = p_digest and a.expires_at <= now();

  return query
    insert into public.analyses as a (id, result, result_digest, job_title, delete_token_hash)
    values (p_id, p_result, p_digest, p_job_title, p_delete_token_hash)
    on conflict (result_digest) do nothing
    returning a.id, true, a.expires_at;

  if not found then
    return query
      select a.id, false, a.expires_at from public.analyses a where a.result_digest = p_digest;
  end if;
end;
$$;

-- Deletes a share only when the id and the token hash both match (spec 5.3).
create function public.delete_share(p_id text, p_delete_token_hash text)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with deleted as (
    delete from public.analyses where id = p_id and delete_token_hash = p_delete_token_hash returning 1
  )
  select exists (select 1 from deleted);
$$;

-- Daily cleanup, scheduled by pg_cron in the next migration (spec 5.5).
create function public.cleanup_expired()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.analyses where expires_at <= now();
  delete from public.rate_limits where day < (now() at time zone 'Asia/Manila')::date - 1;
$$;

revoke execute on function
  public.consume_quota(text, int, int),
  public.create_share(text, jsonb, text, text, text),
  public.delete_share(text, text),
  public.cleanup_expired()
from public, anon, authenticated;

grant execute on function
  public.consume_quota(text, int, int),
  public.create_share(text, jsonb, text, text, text),
  public.delete_share(text, text),
  public.cleanup_expired()
to service_role;
