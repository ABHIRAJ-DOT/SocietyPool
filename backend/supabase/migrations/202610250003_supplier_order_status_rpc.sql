-- Allow scoped suppliers and society admins to advance order fulfillment.
-- The existing trigger remains responsible for enforcing legal status transitions
-- and writing every change to order_status_history.
create function public.update_order_status(
  p_order_id uuid,
  p_new_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_is_admin boolean;
  v_is_supplier boolean;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Sign in before updating an order.';
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Order not found.';
  end if;

  v_is_admin := public.is_society_admin(v_order.society_id);
  select exists (
    select 1
    from public.deals d
    join public.products p on p.id = d.product_id
    where d.id = v_order.deal_id
      and public.is_supplier_owner(p.supplier_id)
  ) into v_is_supplier;

  if not v_is_admin and not v_is_supplier then
    raise exception using errcode = '42501', message = 'You cannot update this order.';
  end if;

  if not v_is_admin and not (
    (v_order.status = 'confirmed' and p_new_status = 'packed') or
    (v_order.status = 'packed' and p_new_status in ('ready_for_pickup', 'out_for_delivery')) or
    (v_order.status in ('ready_for_pickup', 'out_for_delivery') and p_new_status = 'completed')
  ) then
    raise exception using errcode = '42501', message = 'Suppliers can only advance fulfillment statuses.';
  end if;

  update public.orders
  set status = p_new_status
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.update_order_status(uuid, public.order_status) from public;
revoke all on function public.update_order_status(uuid, public.order_status) from anon;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
