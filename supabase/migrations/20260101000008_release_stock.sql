-- R3 Riders: release a reservation made by reserve_stock when order creation fails part-way
-- (service role only, like the other stock functions).

create or replace function public.release_stock(p_variant uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_qty <= 0 then return; end if;
  update public.product_variants
     set reserved = greatest(reserved - p_qty, 0)
   where id = p_variant;
end;
$$;

revoke all on function public.release_stock(uuid, integer) from public, anon, authenticated;
grant execute on function public.release_stock(uuid, integer) to service_role;
