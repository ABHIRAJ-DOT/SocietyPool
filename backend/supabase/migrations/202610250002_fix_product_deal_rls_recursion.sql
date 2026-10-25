-- Avoid an RLS cycle: product visibility checks deals, while the supplier deal
-- policy previously queried products and re-entered the product policy.
create or replace function public.is_supplier_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.products p
    join public.suppliers s on s.id = p.supplier_id
    where p.id = p_product_id
      and s.owner_user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_supplier_product(uuid) from public;
revoke all on function public.is_supplier_product(uuid) from anon;
grant execute on function public.is_supplier_product(uuid) to authenticated;

drop policy if exists "Suppliers can read deals for their products" on public.deals;
create policy "Suppliers can read deals for their products"
  on public.deals for select to authenticated
  using (public.is_supplier_product(product_id));
