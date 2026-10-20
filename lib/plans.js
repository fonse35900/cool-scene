// SaaS plans offered at public sign-up (see the ASMS landing pricing table).
// Only the Free plan self-provisions; Pro/Enterprise go through sales contact,
// so a self-registered company always starts on 'free'. Existing companies are
// migrated to 'pro' (no limits) so they are never restricted retroactively.

export const PLANS = {
  free: { id: 'free', name: 'Free', maxUsers: 2, maxVehicles: 25 },
  pro: { id: 'pro', name: 'Pro', maxUsers: Infinity, maxVehicles: Infinity },
  enterprise: { id: 'enterprise', name: 'Enterprise', maxUsers: Infinity, maxVehicles: Infinity },
};

export const DEFAULT_PLAN = 'free';

export function planLimits(plan) {
  return PLANS[plan] || PLANS[DEFAULT_PLAN];
}
