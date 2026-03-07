-- Migration: add process_rebuy RPC
-- Rebuy logic: reactivate player, add tournament.bounty_amount to current_bounty,
-- increment rebuys counter, insert event log — all in one transaction.
-- NOTE: guaranteed_bounty is NEVER modified on rebuy (per spec).

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
  -- Fetch tournament to get bounty_amount
  select * into v_tournament
    from tournaments
   where id = p_tournament_id;

  if not found then
    raise exception 'tournament_not_found' using errcode = 'P0001';
  end if;

  -- Lock and fetch the player row
  select * into v_tp
    from tournament_players
   where tournament_id = p_tournament_id
     and player_id     = p_player_id
   for update;

  if not found then
    raise exception 'player_not_in_tournament' using errcode = 'P0001';
  end if;

  -- Apply rebuy: add bounty, reactivate, increment counter
  -- guaranteed_bounty intentionally NOT touched
  update tournament_players
     set current_bounty  = current_bounty + v_tournament.bounty_amount,
         rebuys          = rebuys + 1,
         is_active       = true,
         finish_position = null
   where tournament_id = p_tournament_id
     and player_id     = p_player_id
  returning * into v_tp;

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
    'player.rebuy',
    p_actor_id,
    jsonb_build_object(
      'player_id',    p_player_id,
      'rebuy_count',  v_tp.rebuys,
      'bounty_added', v_tournament.bounty_amount
    ),
    'dealer'
  )
  returning id into v_log_id;

  return jsonb_build_object(
    'player_current_bounty', v_tp.current_bounty,
    'player_rebuys',         v_tp.rebuys,
    'bounty_added',          v_tournament.bounty_amount,
    'log_id',                v_log_id
  );
end;
$$;

revoke all on function process_rebuy(uuid, uuid, uuid) from public;
grant execute on function process_rebuy(uuid, uuid, uuid) to service_role;
