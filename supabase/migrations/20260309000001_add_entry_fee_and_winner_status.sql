-- Migration: add entry_fee to tournaments, add 'winner' player status,
--            add process_end_tournament RPC.

-- 1. Add entry_fee to tournaments
alter table tournaments
  add column if not exists entry_fee integer not null default 0;

-- 2. Extend player_status enum to allow 'winner'
alter type player_status add value if not exists 'winner';

-- 3. process_end_tournament RPC
--    Marks the tournament as finished, optionally marks a single remaining
--    player as winner (status = 'winner', final_position = 1).

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
  -- Count remaining non-eliminated players
  select count(*) into v_active_cnt
    from tournament_players
   where tournament_id = p_tournament_id
     and status not in ('eliminated', 'winner');

  -- If exactly 1 active player, mark them winner
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

  -- Mark tournament as finished
  update tournaments
     set status = 'finished'
   where id = p_tournament_id;

  -- Log event
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
      'winner_player_id', case when v_active_cnt = 1 then v_winner.player_id else null end,
      'active_count_at_end', v_active_cnt
    ),
    'system'
  );

  return jsonb_build_object(
    'winner_player_id', case when v_active_cnt = 1 then v_winner.player_id else null end,
    'active_count_at_end', v_active_cnt
  );
end;
$$;

revoke all on function process_end_tournament(uuid, uuid) from public;
grant execute on function process_end_tournament(uuid, uuid) to service_role;
