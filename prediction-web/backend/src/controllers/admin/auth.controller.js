import { AUDIENCE } from '../../utils/tokens.js';
import { createAuthHandlers } from '../shared/authFactory.js';

const presentStaff = async (user) => ({ user: user.toJSON() });

export const { login, refresh, logout, me } = createAuthHandlers(AUDIENCE.ADMIN, presentStaff);
