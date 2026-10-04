-- Atomic todo reordering.
--
-- Previously the client renumbered todos one row at a time in a sequential
-- loop (reorderTodos in src/db.ts). On a flaky connection a single failed
-- UPDATE aborted the rest of the loop, leaving some rows renumbered and some
-- not — duplicate / out-of-sequence "order" values that scrambled the list on
-- the next load. This function writes every row's order (and section) in one
-- statement inside a single transaction, so the update is all-or-nothing.
--
-- items: jsonb array of { id: uuid, order: int, section_id: uuid|null }.
-- Runs SECURITY INVOKER (the default) so RLS still applies; the explicit
-- user_id guard is belt-and-suspenders.
create or replace function reorder_todos(items jsonb)
returns void
language plpgsql
as $$
begin
  update todos t
  set "order"    = (elem->>'order')::int,
      section_id = nullif(elem->>'section_id', '')::uuid
  from jsonb_array_elements(items) as elem
  where t.id = (elem->>'id')::uuid
    and t.user_id = auth.uid();
end;
$$;

grant execute on function reorder_todos(jsonb) to authenticated;
