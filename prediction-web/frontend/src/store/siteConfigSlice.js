import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { publicApi } from '../api/endpoints';

export const fetchSiteConfig = createAsyncThunk('siteConfig/fetch', () => publicApi.siteConfig());

const siteConfigSlice = createSlice({
  name: 'siteConfig',
  initialState: { data: null, status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteConfig.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchSiteConfig.fulfilled, (state, { payload }) => {
        state.status = 'ready';
        state.data = payload;
      })
      .addCase(fetchSiteConfig.rejected, (state) => { state.status = 'error'; });
  },
});

export default siteConfigSlice.reducer;
