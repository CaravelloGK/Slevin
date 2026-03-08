-- Migration: add started_at and finished_at to tournaments
-- Used for exact wall-clock timing and statistics.

alter table tournaments
  add column if not exists started_at  timestamptz,
  add column if not exists finished_at timestamptz;

-- Re-create process_end_tournament to also record finished_at
create or replace function process_end_tournament(
  p_tournament_id uuid,
  p_actor_id      uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner     tournament_players%rowtype;
  v_active_cnt int;
begin
  select count(*) into v_active_cnt
    from tournament_players
   where tournament_id = p_tournament_id
     and status not in ('eliminated', 'winner');

  if v_active_cnt = 1 then
    select * into v_winner
      from tournament_players
     where tournament_id = p_tournament_id
       and status not in ('eliminated', 'winner')
     limit 1
     for update;

    update tournament_players
       set status         = 'winner',
           final_position = 1
     where id = v_winner.id;
  end if;

  update tournaments
     set status      = 'finished',
         finished_at = now()
   where id = p_tournament_id;

  insert into tournament_logs (
    tournament_id,
    event_type,
    actor_player_id,
    data_json,
    source
  ) values (
    p_tournament_id,
    'tournament.finished',
    p_actor_id,
    jsonb_build_object(
      'winner_player_id',   case when v_active_cnt = 1 then v_winner.player_id else null end,
      'active_count_at_end', v_active_cnt
    ),
    'system'
  );

  return jsonb_build_object(
    'winner_player_id',    case when v_active_cnt = 1 then v_winner.player_id else null end,
    'active_count_at_end', v_active_cnt
  );
end;
$$;

revoke all on function process_end_tournament(uuid, uuid) from public;
grant execute on function process_end_tournament(uuid, uuid) to service_role;
