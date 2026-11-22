import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { publicApi } from '../api/endpoints';

export const fetchSiteConfig = createAsyncThunk('siteConfig/fetch', () => publicApi.siteConfig());

const slice = createSlice({
  name: 'siteConfig',
  initialState: { data: null },
  reducers: { siteConfigUpdated: (s, { payload }) => { s.data = payload; } },
  extraReducers: (b) => { b.addCase(fetchSiteConfig.fulfilled, (s, { payload }) => { s.data = payload; }); },
});

export const { siteConfigUpdated } = slice.actions;
export default slice.reducer;
