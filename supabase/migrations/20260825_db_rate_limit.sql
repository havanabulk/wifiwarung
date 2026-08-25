-- Rate limit berbasis database (hasil audit):
-- menggantikan rate limit in-memory yang hilang saat restart dan
-- tidak dibagi antar instance. Bucket di-upsert secara atomik
-- (ON CONFLICT mengunci baris), aman terhadap request serentak.
--
-- Kontrak fungsi:
--   return 0                  -> masih dalam limit, boleh lewat
--   return > 0                -> melebihi limit; nilai = detik sisa
--                                sampai window reset (untuk Retry-After)

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  hit_count integer not null default 0,
  window_started_at timestamptz not null default now()
);

revoke all on public.rate_limit_buckets from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hit_count integer;
  v_window_started_at timestamptz;
begin
  insert into public.rate_limit_buckets
    (bucket_key, hit_count, window_started_at)
  values (p_bucket, 1, now())
  on conflict (bucket_key) do update
    set hit_count = case
          when public.rate_limit_buckets.window_started_at
            <= now() - make_interval(secs => p_window_seconds)
          then 1
          else public.rate_limit_buckets.hit_count + 1
        end,
    window_started_at = case
          when public.rate_limit_buckets.window_started_at
            <= now() - make_interval(secs => p_window_seconds)
          then now()
          else public.rate_limit_buckets.window_started_at
        end
  returning hit_count, window_started_at
    into v_hit_count, v_window_started_at;

  -- Housekeeping murah: sesekali buang bucket kadaluarsa.
  if random() < 0.01 then
    delete from public.rate_limit_buckets
      where window_started_at <= now() - interval '1 hour';
  end if;

  if v_hit_count > p_limit then
    return greatest(
      1,
      ceil(
        extract(
          epoch from
            v_window_started_at
            + make_interval(secs => p_window_seconds)
            - now()
        )
      )::integer
    );
  end if;

  return 0;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to anon, authenticated;
