import { configureStore } from '@reduxjs/toolkit';
import auth, { sessionCleared, sessionReceived } from './authSlice';
import siteConfig from './siteConfigSlice';
import chat from './chatSlice';
import { setSessionHandlers } from '../api/client';

export const store = configureStore({ reducer: { auth, siteConfig, chat } });

setSessionHandlers({
  onRefreshed: (data) => store.dispatch(sessionReceived(data)),
  onExpired: () => store.dispatch(sessionCleared()),
});
