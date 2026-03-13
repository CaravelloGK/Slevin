-- Migration: fix process_knockout — use status = 'active' only (no 'rebought' in enum),
-- add kills_count increment for killer.

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

  select count(*) into v_active_count
    from tournament_players
   where tournament_id = p_tournament_id
     and status        = 'active';

  v_finish_position := v_active_count;
  v_transferred     := v_victim.current_bounty;
  v_half            := floor(v_transferred * 0.5)::int;

  update tournament_players
     set guaranteed_bounty = guaranteed_bounty + v_half,
         current_bounty    = current_bounty    + v_half,
         kills_count       = kills_count       + 1
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
    'killer_kills_count',       v_killer.kills_count       + 1,
    'victim_finish_position',   v_finish_position,
    'bounty_transferred',       v_transferred,
    'log_id',                   v_log_id
  );
end;
$$;

revoke all on function process_knockout(uuid, uuid, uuid, uuid) from public;
grant execute on function process_knockout(uuid, uuid, uuid, uuid) to service_role;
