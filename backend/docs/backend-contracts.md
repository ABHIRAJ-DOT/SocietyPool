# Backend MVP contract

This contract is the first Supabase-backed slice for the resident prototype. The database is the source of truth for membership, deal availability, pooled price, order totals, and pool progress.

## Canonical statuses

- Deal: `draft`, `scheduled`, `open`, `target_reached`, `successful`, `failed`, `expired`, `cancelled`.
- Order: `pending_confirmation`, `confirmed`, `packed`, `ready_for_pickup`, `out_for_delivery`, `completed`, `cancelled`, `refund_pending`, `refunded`.
- Membership: `active`, `pending`, `removed`.

`target_reached` does not close a deal early. It remains orderable until `ends_at`; a scheduled close operation will later mark it `successful` or `failed`. No real payment or refund is performed in this prototype.

## Resident operations

All operations require a signed-in Supabase user. Row Level Security scopes society data to active membership.

| Operation | Supabase call | Input | Result |
| --- | --- | --- | --- |
| Join by invite code | `rpc('join_society')` | `{ p_invite_code }` | Society `id`, `name`, `city_area`; raw code is stored only as a hash |
| Browse deals | `from('deals').select(...)` | Optional society/status filters | Only deals belonging to the resident's active societies |
| Read a product | `from('products').select(...)` | Product id or deal relation | Active product data for a society deal |
| Read pooled progress | `rpc('get_deal_progress')` | `{ p_deal_id }` | Deal id, joined quantity, target, current server status |
| Place an order | `rpc('create_order')` | `{ p_deal_id, p_quantity }` | Created order with server price/total snapshots and initial status |
| List own orders | `from('orders').select(...)` | Optional status/order filters | Only the authenticated resident's orders |
| Read own status history | `from('order_status_history').select(...)` | Order id | History for the resident's own order |

The client must never submit a price or total. `create_order` checks authentication, active membership, deal status and time window, product availability, and quantity (1-20), then locks the deal row while creating the order and updating `open` to `target_reached` when appropriate. It snapshots `pooled_price` and total in one transaction. A failed RPC is an order failure; the UI must not optimistically show a confirmed order.

## MVP access rules

- Profiles are readable and editable by their owner; `id` is tied to `auth.users`.
- Society invite codes are hashed and are never selected directly by a client.
- Residents can read society-scoped deals, their own orders, and their own order history.
- Suppliers can read their supplier record and assigned products/orders; product writes require supplier ownership.
- Society admins can manage deals for their society and inspect its orders.
- Direct order inserts/updates are revoked. Orders are created through the validated RPC.
- Order status changes must follow the database transition trigger and are recorded in `order_status_history`.

## First-slice limitations

- A trusted admin bootstrap process is still needed to grant the first society admin membership; never let the browser choose its role.
- The supplier/admin order-status RPCs, deal close/expiry scheduler, authentication screens, and application-side Supabase client are not included in this foundation migration yet.
- Demo invite code in `supabase/seed.sql`: `GREENVIEW-DEMO-2026`. Use only in a development project.
