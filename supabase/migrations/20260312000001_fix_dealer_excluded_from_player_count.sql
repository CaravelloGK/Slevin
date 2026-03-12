-- Fix: exclude the assigned dealer from active player counts.
-- The dealer is a registered tournament player whose role is elevated to 'dealer',
-- but they are NOT a competing player. All counts that determine finish positions
-- and auto-end logic must exclude them.

-- ─── process_knockout ────────────────────────────────────────────────────────
create or replace function process_knockout(
  p_tournament_id uuid,
  p_killer_id     uuid,
  p_victim_id     uuid,
  p_actor_id      uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_victim              tournament_players%rowtype;
  v_killer              tournament_players%rowtype;
  v_dealer_player_id    uuid;
  v_transferred         int;
  v_half                int;
  v_active_count        int;
  v_finish_position     int;
  v_log_id              uuid;
begin
  -- Resolve dealer so we can exclude them from player counts
  select dealer_player_id into v_dealer_player_id
    from tournaments
   where id = p_tournament_id;

  select * into v_victim
    from tournament_players
   where tournament_id = p_tournament_id
     and player_id     = p_victim_id
     and status        = 'active'
   for update;

  if not found then
    raise exception 'victim_not_active' using errcode = 'P0001';
  end if;

  select * into v_killer
    from tournament_players
   where tournament_id = p_tournament_id
     and player_id     = p_killer_id
     and status        = 'active'
   for update;

  if not found then
    raise exception 'killer_not_active' using errcode = 'P0001';
  end if;

  -- Count active competing players (exclude dealer)
  select count(*) into v_active_count
    from tournament_players
   where tournament_id = p_tournament_id
     and status        = 'active'
     and (v_dealer_player_id is null or player_id != v_dealer_player_id);

  v_finish_position := v_active_count;
  v_transferred     := v_victim.current_bounty;
  v_half            := floor(v_transferred * 0.5)::int;

  update tournament_players
     set guaranteed_bounty = guaranteed_bounty + v_half,
         current_bounty    = current_bounty    + v_half
   where tournament_id = p_tournament_id
     and player_id     = p_killer_id;

  update tournament_players
     set current_bounty  = 0,
         status          = 'eliminated',
         eliminated_at   = now(),
         final_position  = v_finish_position
   where tournament_id = p_tournament_id
     and player_id     = p_victim_id;

  insert into tournament_logs (
    tournament_id,
    event_type,
    actor_player_id,
    data_json,
    source
  ) values (
    p_tournament_id,
    'player.eliminated',
    p_actor_id,
    jsonb_build_object(
      'killer_id',          p_killer_id,
      'victim_id',          p_victim_id,
      'bounty_transferred', v_transferred,
      'half_transferred',   v_half,
      'finish_position',    v_finish_position
    ),
    'dealer'
  )
  returning id into v_log_id;

  return jsonb_build_object(
    'killer_guaranteed_bounty', v_killer.guaranteed_bounty + v_half,
    'killer_current_bounty',    v_killer.current_bounty    + v_half,
    'victim_finish_position',   v_finish_position,
    'bounty_transferred',       v_transferred,
    'log_id',                   v_log_id
  );
end;
$$;

revoke all on function process_knockout(uuid, uuid, uuid, uuid) from public;
grant execute on function process_knockout(uuid, uuid, uuid, uuid) to service_role;


-- ─── process_end_tournament ──────────────────────────────────────────────────
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
  v_winner              tournament_players%rowtype;
  v_dealer_player_id    uuid;
  v_active_cnt          int;
begin
  -- Resolve dealer so we can exclude them from player counts
  select dealer_player_id into v_dealer_player_id
    from tournaments
   where id = p_tournament_id;

  -- Count remaining competing players (exclude dealer and already-finished)
  select count(*) into v_active_cnt
    from tournament_players
   where tournament_id = p_tournament_id
     and status not in ('eliminated', 'winner')
     and (v_dealer_player_id is null or player_id != v_dealer_player_id);

  -- If exactly 1 competing player remains, mark them winner
  if v_active_cnt = 1 then
    select * into v_winner
      from tournament_players
     where tournament_id = p_tournament_id
       and status not in ('eliminated', 'winner')
       and (v_dealer_player_id is null or player_id != v_dealer_player_id)
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
