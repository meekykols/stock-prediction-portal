// Mirrors backend/src/utils/permissions.js
export const P = Object.freeze({
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  PLANS_MANAGE: 'plans.manage',
  SUBSCRIPTIONS_VIEW: 'subscriptions.view',
  SUBSCRIPTIONS_MANAGE: 'subscriptions.manage',
  PREDICTIONS_MANAGE: 'predictions.manage',
  TIPS_MANAGE: 'tips.manage',
  CODES_MANAGE: 'codes.manage',
  CONTEST_MANAGE: 'contest.manage',
  MESSAGES_VIEW: 'messages.view',
  CHAT_RESPOND: 'chat.respond',
  SETTINGS_MANAGE: 'settings.manage',
  STAFF_MANAGE: 'staff.manage',
});

export const PERMISSION_LABELS = {
  [P.DASHBOARD_VIEW]: 'View dashboard & revenue',
  [P.USERS_VIEW]: 'View customers',
  [P.USERS_MANAGE]: 'Suspend / reactivate customers',
  [P.PLANS_MANAGE]: 'Manage plans & pricing',
  [P.SUBSCRIPTIONS_VIEW]: 'View subscriptions & payments',
  [P.SUBSCRIPTIONS_MANAGE]: 'Grant & cancel subscriptions',
  [P.PREDICTIONS_MANAGE]: 'View predictions',
  [P.TIPS_MANAGE]: 'Manage sports tips',
  [P.CODES_MANAGE]: 'Post booking codes',
  [P.CONTEST_MANAGE]: 'Run the picks contest & rewards',
  [P.MESSAGES_VIEW]: 'Handle contact messages',
  [P.CHAT_RESPOND]: 'Answer live chat',
  [P.SETTINGS_MANAGE]: 'Edit site settings',
};

export const ASSIGNABLE = Object.keys(PERMISSION_LABELS);

export function can(user, permission) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  if (permission === 'superadmin') return false;
  return !permission || user.permissions?.includes(permission);
}
