-- Migration: add process_bounty_adjust RPC
-- Manual bounty correction by admin. Applies an integer delta to current_bounty.
-- Rejects if result would go below 0 (constraint mirrors DB check).
-- guaranteed_bounty is never touched.

create or replace function process_bounty_adjust(
  p_tournament_id uuid,
  p_player_id     uuid,
  p_delta         int,
  p_reason        text,
  p_actor_id      uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tp     tournament_players%rowtype;
  v_log_id uuid;
begin
  if p_delta = 0 then
    raise exception 'delta_is_zero' using errcode = 'P0001';
  end if;

  -- Lock player row
  select * into v_tp
    from tournament_players
   where tournament_id = p_tournament_id
     and player_id     = p_player_id
   for update;

  if not found then
    raise exception 'player_not_in_tournament' using errcode = 'P0001';
  end if;

  -- Guard: bounty must not go below 0
  if v_tp.current_bounty + p_delta < 0 then
    raise exception 'bounty_below_zero' using errcode = 'P0002';
  end if;

  -- Apply delta
  update tournament_players
     set current_bounty = current_bounty + p_delta
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
    'player.bounty_adjusted',
    p_actor_id,
    jsonb_build_object(
      'player_id', p_player_id,
      'delta',     p_delta,
      'reason',    p_reason,
      'new_bounty', v_tp.current_bounty
    ),
    'dealer'
  )
  returning id into v_log_id;

  return jsonb_build_object(
    'new_bounty', v_tp.current_bounty,
    'delta',      p_delta,
    'log_id',     v_log_id
  );
end;
$$;

revoke all on function process_bounty_adjust(uuid, uuid, int, text, uuid) from public;
grant execute on function process_bounty_adjust(uuid, uuid, int, text, uuid) to service_role;
