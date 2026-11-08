-- Rendimiento de RLS SIN cambiar quién ve qué.
-- Problema: las políticas llamaban can_view_child(child_id) / can_view_classroom(classroom_id)
-- por CADA fila. Con 5 días de lecturas, leer event_context completo superaba el statement
-- timeout (8 s). Patrón recomendado: calcular UNA vez el conjunto de ids visibles por consulta
-- (`x in (select f())` se ejecuta como subconsulta hasheada) en vez de una función por fila.
-- Las reglas son las mismas que en can_view_child / can_view_classroom (que se conservan):
--   niño visible  = admin, o tutor del niño, o docente del salón del niño
--   salón visible = admin, o docente del salón, o tutor de algún niño de ese salón

create function public.visible_child_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id
  from public.children c
  where public.is_admin()
     or exists (
       select 1 from public.guardians g
       where g.child_id = c.id and g.profile_id = (select auth.uid())
     )
     or exists (
       select 1 from public.teacher_classrooms t
       where t.classroom_id = c.classroom_id and t.profile_id = (select auth.uid())
     );
$$;

create function public.visible_classroom_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select cl.id
  from public.classrooms cl
  where public.is_admin()
     or exists (
       select 1 from public.teacher_classrooms t
       where t.classroom_id = cl.id and t.profile_id = (select auth.uid())
     )
     or exists (
       select 1 from public.children c
       join public.guardians g on g.child_id = c.id
       where c.classroom_id = cl.id and g.profile_id = (select auth.uid())
     );
$$;

revoke all on function public.visible_child_ids() from public, anon;
revoke all on function public.visible_classroom_ids() from public, anon;
grant execute on function public.visible_child_ids() to authenticated;
grant execute on function public.visible_classroom_ids() to authenticated;

alter policy "salones visibles" on public.classrooms
  using (id in (select public.visible_classroom_ids()));

alter policy "ninos visibles" on public.children
  using (id in (select public.visible_child_ids()));

alter policy "dispositivos visibles" on public.devices
  using (
    (kind = 'toy' and child_id in (select public.visible_child_ids()))
    or (kind = 'box' and classroom_id in (select public.visible_classroom_ids()))
  );

alter policy "eventos visibles" on public.toy_events
  using (child_id in (select public.visible_child_ids()));

alter policy "lecturas visibles" on public.sensor_readings
  using (classroom_id in (select public.visible_classroom_ids()));
