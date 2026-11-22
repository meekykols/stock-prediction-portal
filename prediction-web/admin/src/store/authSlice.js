import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '../api/endpoints';
import { errorMessage, fieldErrors, refreshSession, setAccessToken } from '../api/client';

export const bootstrapSession = createAsyncThunk('auth/bootstrap', async () => {
  try { return await refreshSession(); } catch { return null; }
});

export const login = createAsyncThunk('auth/login', async (body, { rejectWithValue }) => {
  try {
    const data = await authApi.login(body);
    setAccessToken(data.accessToken);
    return data;
  } catch (err) {
    return rejectWithValue({ message: errorMessage(err), fields: fieldErrors(err) });
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await authApi.logout(); } finally { setAccessToken(null); }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: { status: 'idle', user: null },
  reducers: {
    sessionReceived: (state, { payload }) => { state.status = 'authenticated'; state.user = payload.user; },
    sessionCleared: () => ({ status: 'guest', user: null }),
    userUpdated: (state, { payload }) => { state.user = payload; },
  },
  extraReducers: (b) => {
    b.addCase(bootstrapSession.pending, (s) => { s.status = 'loading'; })
      .addCase(bootstrapSession.fulfilled, (s, { payload }) => {
        if (payload) { s.status = 'authenticated'; s.user = payload.user; } else s.status = 'guest';
      })
      .addCase(login.fulfilled, (s, { payload }) => { s.status = 'authenticated'; s.user = payload.user; })
      .addCase(logout.fulfilled, () => ({ status: 'guest', user: null }))
      .addCase(logout.rejected, () => ({ status: 'guest', user: null }));
  },
});

export const { sessionReceived, sessionCleared, userUpdated } = authSlice.actions;
export default authSlice.reducer;
