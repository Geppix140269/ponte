-- ponte.trade — Phase 4: trust-score engine
-- Date: 2026-06-04. Idempotent.
-- One atomic function applies a score delta, clamps to 0-100, recomputes the
-- risk category, and writes both the trust ledger and the audit log. Every
-- trust change in the app goes through this, so the ledger is always complete.
--
-- Risk thresholds: blocked (0), high (1-39), medium (40-69), low (70-100).
-- Reason 'blocked' forces the score to 0 regardless of delta.

create or replace function apply_trust_delta(
  p_profile uuid,
  p_delta int,
  p_reason text,
  p_actor uuid default null
) returns int language plpgsql security definer as $$
declare
  cur int;
  nxt int;
  rk text;
begin
  select trust_score into cur from profiles where id = p_profile for update;
  if cur is null then
    raise exception 'profile % not found', p_profile;
  end if;

  if p_reason = 'blocked' then
    nxt := 0;
  else
    nxt := greatest(0, least(100, cur + p_delta));
  end if;

  rk := case
    when nxt = 0 then 'blocked'
    when nxt < 40 then 'high'
    when nxt < 70 then 'medium'
    else 'low'
  end;

  update profiles
    set trust_score = nxt, risk_category = rk, updated_at = now()
    where id = p_profile;

  insert into trust_score_events (profile_id, delta, reason, new_score, created_by)
    values (p_profile, nxt - cur, p_reason, nxt, p_actor);

  insert into audit_logs (actor_id, action, target_type, target_id, metadata)
    values (p_actor, 'trust_delta', 'user', p_profile,
            jsonb_build_object('reason', p_reason, 'requested_delta', p_delta,
                               'applied_delta', nxt - cur, 'new_score', nxt));

  return nxt;
end;
$$;
