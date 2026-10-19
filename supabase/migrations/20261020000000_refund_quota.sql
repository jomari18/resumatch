-- Gives back one quota slot (IP and site-wide) when the AI provider, not the visitor, caused the failure.
create function public.refund_quota(p_ip_hash text)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.rate_limits
  set count = greatest(count - 1, 0)
  where day = (now() at time zone 'Asia/Manila')::date
    and ip_hash in (p_ip_hash, '__global__');
$$;

revoke execute on function public.refund_quota(text) from public, anon, authenticated;
grant execute on function public.refund_quota(text) to service_role;
