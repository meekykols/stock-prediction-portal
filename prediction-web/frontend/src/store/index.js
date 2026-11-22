import { configureStore } from '@reduxjs/toolkit';
import auth, { sessionCleared, sessionReceived } from './authSlice';
import siteConfig from './siteConfigSlice';
import plans from './plansSlice';
import chat from './chatSlice';
import { setSessionHandlers } from '../api/client';

export const store = configureStore({
  reducer: { auth, siteConfig, plans, chat },
});

// Let the API client keep Redux in sync when it silently refreshes or loses a session.
setSessionHandlers({
  onRefreshed: (data) => store.dispatch(sessionReceived(data)),
  onExpired: () => store.dispatch(sessionCleared()),
});
