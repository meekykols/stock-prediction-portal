import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi, accountApi } from '../api/endpoints';
import { errorMessage, fieldErrors, refreshSession, setAccessToken } from '../api/client';

const reject = (err, rejectWithValue) =>
  rejectWithValue({ message: errorMessage(err), fields: fieldErrors(err) });

/** On app load: try to resume a session from the refresh cookie. */
export const bootstrapSession = createAsyncThunk('auth/bootstrap', async () => {
  try {
    return await refreshSession();
  } catch {
    return null;
  }
});

export const login = createAsyncThunk('auth/login', async (body, { rejectWithValue }) => {
  try {
    const data = await authApi.login(body);
    setAccessToken(data.accessToken);
    return data;
  } catch (err) {
    return reject(err, rejectWithValue);
  }
});

export const register = createAsyncThunk('auth/register', async (body, { rejectWithValue }) => {
  try {
    const data = await authApi.register(body);
    setAccessToken(data.accessToken);
    return data;
  } catch (err) {
    return reject(err, rejectWithValue);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } finally {
    setAccessToken(null);
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (body, { rejectWithValue }) => {
  try {
    return await accountApi.updateProfile(body);
  } catch (err) {
    return reject(err, rejectWithValue);
  }
});

export const changePassword = createAsyncThunk('auth/changePassword', async (body, { rejectWithValue }) => {
  try {
    const data = await accountApi.changePassword(body);
    setAccessToken(data.accessToken);
    return data;
  } catch (err) {
    return reject(err, rejectWithValue);
  }
});

const initialState = {
  status: 'idle', // idle | loading | authenticated | guest
  user: null,
  subscription: null,
};

const applySession = (state, data) => {
  state.status = 'authenticated';
  state.user = data.user;
  state.subscription = data.subscription;
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionReceived: (state, { payload }) => applySession(state, payload),
    sessionCleared: () => ({ ...initialState, status: 'guest' }),
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.pending, (state) => { state.status = 'loading'; })
      .addCase(bootstrapSession.fulfilled, (state, { payload }) => {
        if (payload) applySession(state, payload);
        else state.status = 'guest';
      })
      .addCase(login.fulfilled, (state, { payload }) => applySession(state, payload))
      .addCase(register.fulfilled, (state, { payload }) => applySession(state, payload))
      .addCase(logout.fulfilled, () => ({ ...initialState, status: 'guest' }))
      .addCase(logout.rejected, () => ({ ...initialState, status: 'guest' }))
      .addCase(updateProfile.fulfilled, (state, { payload }) => { state.user = payload.user; });
  },
});

export const { sessionReceived, sessionCleared } = authSlice.actions;
export default authSlice.reducer;
