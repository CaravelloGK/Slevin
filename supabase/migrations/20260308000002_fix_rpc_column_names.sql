-- Migration: fix column names in bounty RPCs
-- Actual DB schema uses: status ('active'/'eliminated'/'rebought'), final_position, rebuy_count
-- Previous RPCs incorrectly used: is_active, finish_position, rebuys

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
  v_victim           tournament_players%rowtype;
  v_killer           tournament_players%rowtype;
  v_transferred      int;
  v_half             int;
  v_active_count     int;
  v_finish_position  int;
  v_log_id           uuid;
begin
  -- Lock victim row
  select * into v_victim
    from tournament_players
   where tournament_id = p_tournament_id
     and player_id     = p_victim_id
     and status        = 'active'
   for update;

  if not found then
    raise exception 'victim_not_active' using errcode = 'P0001';
  end if;

  -- Lock killer row
  select * into v_killer
    from tournament_players
   where tournament_id = p_tournament_id
     and player_id     = p_killer_id
     and status        = 'active'
   for update;

  if not found then
    raise exception 'killer_not_active' using errcode = 'P0001';
  end if;

  -- Count remaining active players (before eliminating victim)
  select count(*) into v_active_count
    from tournament_players
   where tournament_id = p_tournament_id
     and status        = 'active';

  v_finish_position := v_active_count;
  v_transferred     := v_victim.current_bounty;
  v_half            := floor(v_transferred * 0.5)::int;

  -- Apply bounty transfer to killer
  update tournament_players
     set guaranteed_bounty = guaranteed_bounty + v_half,
         current_bounty    = current_bounty    + v_half
   where tournament_id = p_tournament_id
     and player_id     = p_killer_id;

  -- Eliminate victim
  update tournament_players
     set current_bounty  = 0,
         status          = 'eliminated',
         eliminated_at   = now(),
         final_position  = v_finish_position
   where tournament_id = p_tournament_id
     and player_id     = p_victim_id;

  -- Insert event log
  insert into tournament_logs (
    tournament_id,
    timestamp,
    event_type,
    actor_player_id,
    data_json,
    source
  ) values (
    p_tournament_id,
    now(),
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

create or replace function process_rebuy(
  p_tournament_id uuid,
  p_player_id     uuid,
  p_actor_id      uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tp          tournament_players%rowtype;
  v_tournament  tournaments%rowtype;
  v_log_id      uuid;
begin
  select * into v_tournament
    from tournaments
   where id = p_tournament_id;

  if not found then
    raise exception 'tournament_not_found' using errcode = 'P0001';
  end if;

  select * into v_tp
    from tournament_players
   where tournament_id = p_tournament_id
     and player_id     = p_player_id
   for update;

  if not found then
    raise exception 'player_not_in_tournament' using errcode = 'P0001';
  end if;

  -- Reactivate player, add bounty, increment rebuy_count
  -- guaranteed_bounty intentionally NOT touched
  update tournament_players
     set current_bounty  = current_bounty + v_tournament.bounty_amount,
         rebuy_count     = rebuy_count + 1,
         status          = 'active',
         eliminated_at   = null,
         final_position  = null
   where tournament_id = p_tournament_id
     and player_id     = p_player_id
  returning * into v_tp;

  insert into tournament_logs (
    tournament_id,
    timestamp,
    event_type,
    actor_player_id,
    data_json,
    source
  ) values (
    p_tournament_id,
    now(),
    'player.rebuy',
    p_actor_id,
    jsonb_build_object(
      'player_id',    p_player_id,
      'rebuy_count',  v_tp.rebuy_count,
      'bounty_added', v_tournament.bounty_amount
    ),
    'dealer'
  )
  returning id into v_log_id;

  return jsonb_build_object(
    'player_current_bounty', v_tp.current_bounty,
    'player_rebuy_count',    v_tp.rebuy_count,
    'bounty_added',          v_tournament.bounty_amount,
    'log_id',                v_log_id
  );
end;
$$;

-- Revoke/grant unchanged (same functions, same signatures)
revoke all on function process_knockout(uuid, uuid, uuid, uuid) from public;
grant execute on function process_knockout(uuid, uuid, uuid, uuid) to service_role;

revoke all on function process_rebuy(uuid, uuid, uuid) from public;
grant execute on function process_rebuy(uuid, uuid, uuid) to service_role;
