-- Hotspot login credentials: 4-digit username + 3-digit password.
-- Digunakan untuk login ke MikroTik hotspot.
--
-- Flow: admin generate batch → user beli paket → dapat credentials
-- → login ke WiFi pakai username 4 digit + password 3 digit.

create table if not exists public.hotspot_users (
  id            bigint generated always as identity primary key,
  username      text not null unique check (username ~ '^\d{4}$'),
  pin           text not null check (pin ~ '^\d{3}$'),
  user_id       uuid references auth.users(id) on delete set null,
  package_order_id uuid references public.package_orders(id) on delete set null,

  -- status
  active        boolean not null default true,
  locked        boolean not null default false,

  -- metadata
  batch_label   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  last_login_at timestamptz
);

create index if not exists idx_hotspot_users_username
  on public.hotspot_users (username);

create index if not exists idx_hotspot_users_user_id
  on public.hotspot_users (user_id) where user_id is not null;

create index if not exists idx_hotspot_users_active
  on public.hotspot_users (active) where active = true;

-- RLS
alter table public.hotspot_users enable row level security;

-- Admin bisa semua
drop policy if exists hotspot_users_admin_all on public.hotspot_users;
create policy hotspot_users_admin_all
  on public.hotspot_users for all
  using (public.is_admin())
  with check (public.is_admin());

-- Staff (kasir) bisa baca & update
drop policy if exists hotspot_users_staff_read on public.hotspot_users;
create policy hotspot_users_staff_read
  on public.hotspot_users for select
  using (public.is_staff());

drop policy if exists hotspot_users_staff_update on public.hotspot_users;
create policy hotspot_users_staff_update
  on public.hotspot_users for update
  using (public.is_staff());

-- User bisa baca data hotspot miliknya sendiri
drop policy if exists hotspot_users_self_read on public.hotspot_users;
create policy hotspot_users_self_read
  on public.hotspot_users for select
  using (auth.uid() = user_id);

-- Generate hotspot credentials batch (admin only)
create or replace function public.admin_generate_hotspot_batch(
  p_count integer,
  p_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_created integer := 0;
  v_username text;
  v_pin text;
  v_attempts integer;
begin
  if v_admin is null or not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  if p_count is null or p_count < 1 or p_count > 100 then
    raise exception 'COUNT_INVALID' using errcode = '22023';
  end if;

  for i in 1..p_count loop
    v_attempts := 0;

    loop
      v_username := lpad(floor(random() * 10000)::int::text, 4, '0');
      v_pin := lpad(floor(random() * 1000)::int::text, 3, '0');

      exit when not exists (
        select 1 from public.hotspot_users where username = v_username
      );

      v_attempts := v_attempts + 1;

      if v_attempts > 50 then
        raise exception 'TOO_MANY_ATTEMPTS' using errcode = '22023';
      end if;
    end loop;

    insert into public.hotspot_users (username, pin, batch_label)
    values (v_username, v_pin, p_label);

    v_created := v_created + 1;
  end loop;

  return jsonb_build_object(
    'created', v_created,
    'label', p_label
  );
end;
$$;

revoke all on function public.admin_generate_hotspot_batch(integer, text)
  from public, anon;
grant execute on function public.admin_generate_hotspot_batch(integer, text)
  to authenticated;

-- Validate hotspot login (untuk MikroTik RADIUS/API integration)
create or replace function public.validate_hotspot_login(
  p_username text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.hotspot_users;
begin
  if p_username is null or btrim(p_username) = '' then
    raise exception 'USERNAME_REQUIRED' using errcode = '22023';
  end if;

  if p_pin is null or btrim(p_pin) = '' then
    raise exception 'PIN_REQUIRED' using errcode = '22023';
  end if;

  select * into v_user
    from public.hotspot_users
    where username = btrim(p_username)
      and pin = btrim(p_pin)
    for update;

  if not found then
    raise exception 'INVALID_CREDENTIALS' using errcode = '28P01';
  end if;

  if v_user.locked then
    raise exception 'ACCOUNT_LOCKED' using errcode = '42501';
  end if;

  if not v_user.active then
    raise exception 'ACCOUNT_INACTIVE' using errcode = '42501';
  end if;

  -- Cek apakah ada package_order aktif yang terhubung
  if v_user.package_order_id is not null then
    if not exists (
      select 1 from public.package_orders
      where id = v_user.package_order_id
        and status = 'active'
        and (end_at is null or end_at > now())
    ) then
      raise exception 'PACKAGE_EXPIRED' using errcode = 'P0002';
    end if;
  end if;

  -- Update last_login_at
  update public.hotspot_users
    set last_login_at = now(), updated_at = now()
    where id = v_user.id;

  return jsonb_build_object(
    'ok', true,
    'username', v_user.username,
    'user_id', v_user.user_id,
    'package_order_id', v_user.package_order_id
  );
end;
$$;

revoke all on function public.validate_hotspot_login(text, text)
  from public, anon;
grant execute on function public.validate_hotspot_login(text, text)
  to authenticated;
