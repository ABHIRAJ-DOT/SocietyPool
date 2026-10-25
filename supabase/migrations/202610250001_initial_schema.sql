-- Society Pool MVP foundation for Supabase (PostgreSQL + Auth).
-- Apply through the Supabase SQL editor or `supabase db push`.

create extension if not exists pgcrypto with schema extensions;

create type public.member_role as enum ('resident', 'admin');
create type public.membership_status as enum ('active', 'pending', 'removed');
create type public.supplier_status as enum ('pending', 'active', 'inactive');
create type public.deal_status as enum (
  'draft', 'scheduled', 'open', 'target_reached', 'successful', 'failed', 'expired', 'cancelled'
);
create type public.order_status as enum (
  'pending_confirmation', 'confirmed', 'packed', 'ready_for_pickup', 'out_for_delivery',
  'completed', 'cancelled', 'refund_pending', 'refunded'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.societies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_area text not null,
  invite_code_hash text not null unique,
  created_at timestamptz not null default now()
);

create table public.society_members (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'resident',
  membership_status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (society_id, user_id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id) on delete set null,
  business_name text not null,
  status public.supplier_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  name text not null,
  description text not null default '',
  image_url text,
  unit_size text not null,
  reference_price numeric(10,2) not null check (reference_price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references public.societies(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  target_quantity integer not null check (target_quantity > 0),
  pooled_price numeric(10,2) not null check (pooled_price >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.deal_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  society_id uuid not null references public.societies(id) on delete restrict,
  deal_id uuid not null references public.deals(id) on delete restrict,
  quantity integer not null check (quantity between 1 and 20),
  unit_price_snapshot numeric(10,2) not null check (unit_price_snapshot >= 0),
  total_amount_snapshot numeric(12,2) not null check (total_amount_snapshot >= 0),
  status public.order_status not null default 'pending_confirmation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index society_members_user_active_idx on public.society_members(user_id, society_id)
  where membership_status = 'active';
create index deals_society_status_end_idx on public.deals(society_id, status, ends_at);
create index deals_product_id_idx on public.deals(product_id);
create index products_supplier_id_idx on public.products(supplier_id);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index orders_deal_id_idx on public.orders(deal_id);
create index order_history_order_created_idx on public.order_status_history(order_id, created_at);

-- SECURITY DEFINER helpers avoid recursive membership RLS checks. They never accept a user ID
-- from the client; the identity always comes from the verified Supabase auth context.
create function public.is_active_society_member(p_society_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.society_members sm
    where sm.society_id = p_society_id
      and sm.user_id = (select auth.uid())
      and sm.membership_status = 'active'
  );
$$;

create function public.is_society_admin(p_society_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.society_members sm
    where sm.society_id = p_society_id
      and sm.user_id = (select auth.uid())
      and sm.role = 'admin'
      and sm.membership_status = 'active'
  );
$$;

create function public.is_supplier_owner(p_supplier_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.suppliers s
    where s.id = p_supplier_id and s.owner_user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_active_society_member(uuid) from public;
revoke all on function public.is_society_admin(uuid) from public;
revoke all on function public.is_supplier_owner(uuid) from public;
grant execute on function public.is_active_society_member(uuid) to authenticated;
grant execute on function public.is_society_admin(uuid) to authenticated;
grant execute on function public.is_supplier_owner(uuid) to authenticated;

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

-- The raw invite code is never stored or exposed. A resident joins through this authenticated RPC.
create function public.join_society(p_invite_code text)
returns table (id uuid, name text, city_area text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_society_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in before joining a society.';
  end if;
  if p_invite_code is null or length(trim(p_invite_code)) < 4 or length(trim(p_invite_code)) > 64 then
    raise exception using errcode = '22023', message = 'Enter a valid invite code.';
  end if;

  select s.id into v_society_id
  from public.societies s
  where s.invite_code_hash = encode(extensions.digest(lower(trim(p_invite_code)), 'sha256'), 'hex');

  if v_society_id is null then
    raise exception using errcode = '22023', message = 'That invite code was not found.';
  end if;

  insert into public.society_members (society_id, user_id)
  values (v_society_id, v_user_id)
  on conflict (society_id, user_id)
  do update set
    membership_status = 'active',
    role = case
      when public.society_members.membership_status = 'removed' then 'resident'::public.member_role
      else public.society_members.role
    end;

  return query select s.id, s.name, s.city_area
  from public.societies s where s.id = v_society_id;
end;
$$;
revoke all on function public.join_society(text) from public;
grant execute on function public.join_society(text) to authenticated;

-- Creating an order accepts only a deal ID and quantity. It serializes orders for that deal,
-- reads price/status from the database, and writes the order and progress update atomically.
create function public.create_order(p_deal_id uuid, p_quantity integer)
returns public.orders
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_deal public.deals%rowtype;
  v_order public.orders%rowtype;
  v_total_quantity bigint;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in before placing an order.';
  end if;
  if p_deal_id is null or p_quantity is null or p_quantity < 1 or p_quantity > 20 then
    raise exception using errcode = '22023', message = 'Choose a quantity between 1 and 20.';
  end if;

  select d.* into v_deal
  from public.deals d
  where d.id = p_deal_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Deal not found.';
  end if;
  if v_deal.status not in ('open', 'target_reached')
      or v_deal.starts_at > now() or v_deal.ends_at <= now() then
    raise exception using errcode = '22023', message = 'This deal is not accepting orders.';
  end if;
  if not public.is_active_society_member(v_deal.society_id) then
    raise exception using errcode = '42501', message = 'Join this society before ordering.';
  end if;
  if not exists (
    select 1 from public.products p
    where p.id = v_deal.product_id and p.is_active
  ) then
    raise exception using errcode = '22023', message = 'This product is no longer available.';
  end if;

  insert into public.orders (
    user_id, society_id, deal_id, quantity, unit_price_snapshot, total_amount_snapshot
  ) values (
    v_user_id, v_deal.society_id, v_deal.id, p_quantity, v_deal.pooled_price,
    round(v_deal.pooled_price * p_quantity, 2)
  ) returning * into v_order;

  select coalesce(sum(o.quantity), 0) into v_total_quantity
  from public.orders o
  where o.deal_id = v_deal.id and o.status <> 'cancelled';

  if v_total_quantity >= v_deal.target_quantity and v_deal.status = 'open' then
    update public.deals set status = 'target_reached', updated_at = now()
    where id = v_deal.id;
  end if;

  return v_order;
end;
$$;
revoke all on function public.create_order(uuid, integer) from public;
grant execute on function public.create_order(uuid, integer) to authenticated;

-- Aggregate progress is exposed only to current members of the deal's society. The function
-- runs with database privileges so residents see the pool total, not just their own orders.
create function public.get_deal_progress(p_deal_id uuid)
returns table (deal_id uuid, joined_quantity bigint, target_quantity integer, status public.deal_status)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_society_id uuid;
begin
  select d.society_id into v_society_id
  from public.deals d where d.id = p_deal_id;

  if v_society_id is null then
    raise exception using errcode = 'P0002', message = 'Deal not found.';
  end if;
  if not public.is_active_society_member(v_society_id) then
    raise exception using errcode = '42501', message = 'Join this society to view deal progress.';
  end if;

  return query
  select d.id,
         coalesce(sum(o.quantity) filter (where o.status <> 'cancelled'), 0)::bigint,
         d.target_quantity,
         d.status
  from public.deals d
  left join public.orders o on o.deal_id = d.id
  where d.id = p_deal_id
  group by d.id;
end;
$$;
revoke all on function public.get_deal_progress(uuid) from public;
grant execute on function public.get_deal_progress(uuid) to authenticated;

create function public.enforce_order_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'pending_confirmation' and new.status in ('confirmed', 'cancelled', 'refund_pending')) or
    (old.status = 'confirmed' and new.status in ('packed', 'cancelled', 'refund_pending')) or
    (old.status = 'packed' and new.status in ('ready_for_pickup', 'out_for_delivery', 'cancelled')) or
    (old.status = 'ready_for_pickup' and new.status = 'completed') or
    (old.status = 'out_for_delivery' and new.status = 'completed') or
    (old.status = 'refund_pending' and new.status = 'refunded')
  ) then
    raise exception using errcode = '22023', message = 'That order status transition is not allowed.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create function public.record_order_status_change()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.order_status_history (order_id, old_status, new_status, changed_by)
  values (new.id, case when tg_op = 'INSERT' then null else old.status end,
          new.status, (select auth.uid()));
  return new;
end;
$$;

create trigger enforce_order_status_transition
  before update of status on public.orders
  for each row execute function public.enforce_order_status_transition();
create trigger record_order_status_change
  after insert or update of status on public.orders
  for each row execute function public.record_order_status_change();

alter table public.profiles enable row level security;
alter table public.societies enable row level security;
alter table public.society_members enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.deals enable row level security;
alter table public.orders enable row level security;
alter table public.order_status_history enable row level security;

create policy "Profiles are readable by their owner"
  on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Profiles are insertable by their owner"
  on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "Profiles are editable by their owner"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Members can read their society details"
  on public.societies for select to authenticated
  using (public.is_active_society_member(id));

create policy "Members can read society membership"
  on public.society_members for select to authenticated
  using (
    user_id = (select auth.uid()) or public.is_active_society_member(society_id)
  );

create policy "Suppliers can read their own supplier record"
  on public.suppliers for select to authenticated
  using (owner_user_id = (select auth.uid()));
create policy "Residents can read products in their society deals"
  on public.products for select to authenticated
  using (
    is_active and exists (
      select 1 from public.deals d
      where d.product_id = products.id and public.is_active_society_member(d.society_id)
    )
  );
create policy "Suppliers can read their own products"
  on public.products for select to authenticated
  using (public.is_supplier_owner(supplier_id));
create policy "Suppliers can add their own products"
  on public.products for insert to authenticated
  with check (public.is_supplier_owner(supplier_id));
create policy "Suppliers can update their own products"
  on public.products for update to authenticated
  using (public.is_supplier_owner(supplier_id))
  with check (public.is_supplier_owner(supplier_id));

create policy "Members can read deals for their society"
  on public.deals for select to authenticated
  using (public.is_active_society_member(society_id));
create policy "Suppliers can read deals for their products"
  on public.deals for select to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and public.is_supplier_owner(p.supplier_id)
  ));
create policy "Society admins can create deals"
  on public.deals for insert to authenticated
  with check (public.is_society_admin(society_id));
create policy "Society admins can update deals"
  on public.deals for update to authenticated
  using (public.is_society_admin(society_id))
  with check (public.is_society_admin(society_id));
create policy "Society admins can delete draft deals"
  on public.deals for delete to authenticated
  using (public.is_society_admin(society_id) and status = 'draft');

create policy "Residents can read their own orders"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Suppliers can read orders for their assigned products"
  on public.orders for select to authenticated
  using (
    exists (
      select 1 from public.deals d
      join public.products p on p.id = d.product_id
      where d.id = deal_id and public.is_supplier_owner(p.supplier_id)
    )
  );
create policy "Society admins can read orders in their society"
  on public.orders for select to authenticated
  using (public.is_society_admin(society_id));

create policy "Residents can read status history for their own orders"
  on public.order_status_history for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.user_id = (select auth.uid())
  ));
create policy "Suppliers and society admins can read relevant order history"
  on public.order_status_history for select to authenticated
  using (exists (
    select 1 from public.orders o
    join public.deals d on d.id = o.deal_id
    join public.products p on p.id = d.product_id
    where o.id = order_id
      and (public.is_society_admin(o.society_id) or public.is_supplier_owner(p.supplier_id))
  ));

-- Residents and browsers cannot insert/update orders directly; only create_order can place one.
revoke insert, update, delete on public.orders from anon, authenticated;
grant select on public.orders to authenticated;
revoke insert, update, delete on public.order_status_history from anon, authenticated;
grant select on public.order_status_history to authenticated;

grant select on public.profiles, public.societies, public.society_members,
  public.suppliers, public.products, public.deals to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.deals to authenticated;
