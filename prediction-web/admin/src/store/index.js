import { configureStore } from '@reduxjs/toolkit';
import auth, { sessionCleared, sessionReceived } from './authSlice';
import siteConfig from './siteConfigSlice';
import { setSessionHandlers } from '../api/client';

export const store = configureStore({ reducer: { auth, siteConfig } });

setSessionHandlers({
  onRefreshed: (data) => store.dispatch(sessionReceived(data)),
  onExpired: () => store.dispatch(sessionCleared()),
});
