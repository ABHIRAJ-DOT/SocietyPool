-- Development-only seed data. The invite code is a demo value; the database stores only its hash.
insert into public.societies (id, name, city_area, invite_code_hash)
values (
  '10000000-0000-4000-8000-000000000001',
  'Greenview Residency',
  'Pune, Maharashtra',
  encode(extensions.digest(lower('GREENVIEW-DEMO-2026'), 'sha256'), 'hex')
)
on conflict (id) do nothing;

insert into public.suppliers (id, business_name, status)
values
  ('20000000-0000-4000-8000-000000000001', 'Ratnagiri Harvest', 'active'),
  ('20000000-0000-4000-8000-000000000002', 'Greenview Farm Collective', 'active')
on conflict (id) do nothing;

insert into public.products (id, supplier_id, name, description, image_url, unit_size, reference_price)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Alphonso mangoes', 'Ratnagiri Alphonso mangoes, selected for the Greenview community.', 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=85', 'Box of 6', 499.00),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Free-range brown eggs', 'Farm-fresh free-range eggs.', 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&q=85', 'Pack of 12', 125.00),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'Farm-picked tomatoes', 'Naturally ripened tomatoes from nearby farms.', 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=85', '1 kg', 48.00),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'Wood-pressed groundnut oil', 'Cold-pressed groundnut oil.', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85', '1 litre', 299.00),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'Seasonal strawberries', 'Seasonal strawberries from Mahabaleshwar.', 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=85', '250 g', 169.00)
on conflict (id) do nothing;

insert into public.deals (
  id, society_id, product_id, target_quantity, pooled_price, starts_at, ends_at, status
)
values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 60, 349.00, now() - interval '1 day', now() + interval '1 day', 'open'),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 45, 89.00, now() - interval '1 day', now() + interval '2 days', 'open')
on conflict (id) do nothing;
