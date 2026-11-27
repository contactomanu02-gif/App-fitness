-- Cantidad de filas de cada tabla de datos (public, auth, storage). Sirve para comprobar
-- que la copia restaurada tiene exactamente lo mismo que la base original.
select coalesce(json_agg(json_build_object('t', t, 'n', n) order by t), '[]') as filas from (
  select format('%I.%I', table_schema, table_name) as t,
    (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint as n
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and (table_schema = 'public' or (table_schema, table_name) in (('auth', 'users'), ('auth', 'identities'), ('storage', 'objects'), ('storage', 'buckets')))
) x;
