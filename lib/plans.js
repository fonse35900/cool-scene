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

// A new trial lasts this many days; the ASMS admin can extend it in increments.
export const TRIAL_DAYS = 14;

// Public email providers are not accepted for company sign-up: each company
// must register with its own domain (one domain = one company).
export const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.co.uk', 'hotmail.fr',
  'outlook.com', 'outlook.pt', 'live.com', 'live.com.pt', 'msn.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.es', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'gmx.com', 'gmx.net', 'mail.com', 'zoho.com',
  'yandex.com', 'yandex.ru', 'sapo.pt', 'clix.pt', 'netcabo.pt',
]);

export function emailDomain(email) {
  const at = String(email || '').toLowerCase().trim().split('@');
  return at.length === 2 ? at[1] : '';
}

export function isCompanyEmail(email) {
  const d = emailDomain(email);
  return !!d && d.includes('.') && !FREE_EMAIL_DOMAINS.has(d);
}

// Trial status for a company row. Non-free plans are never in trial.
export function trialInfo(company) {
  if (!company || company.plan !== 'free' || !company.trial_ends_at) {
    return { isTrial: false, daysLeft: null, expired: false };
  }
  const end = new Date(company.trial_ends_at).getTime();
  const now = Date.now();
  const daysLeft = Math.ceil((end - now) / 86400000);
  return { isTrial: true, daysLeft, expired: now > end };
}

export function trialEndFromNow(days = TRIAL_DAYS) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

