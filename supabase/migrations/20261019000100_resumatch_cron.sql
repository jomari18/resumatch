-- Daily cleanup at 03:00 Philippine time (19:00 UTC). Applied only to the hosted Supabase project;
-- the local test database runs public.cleanup_expired() directly instead.
create extension if not exists pg_cron;

select cron.schedule('resumatch-cleanup', '0 19 * * *', 'select public.cleanup_expired()');
