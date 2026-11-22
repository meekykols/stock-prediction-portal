// Every staff permission in one place. The admin app mirrors these keys for its routes.
export const PERMISSIONS = Object.freeze({
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
  CRYPTO_SIGNALS: 'crypto.signals',
  MESSAGES_VIEW: 'messages.view',
  CHAT_RESPOND: 'chat.respond',
  SETTINGS_MANAGE: 'settings.manage',
  STAFF_MANAGE: 'staff.manage',
});

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  STAFF: 'staff',
  SUPERADMIN: 'superadmin',
});

export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === ROLES.SUPERADMIN) return true;
  return user.role === ROLES.STAFF && user.permissions?.includes(permission);
}
