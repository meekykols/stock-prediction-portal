import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { publicApi } from '../api/endpoints';

export const fetchPlans = createAsyncThunk(
  'plans/fetch',
  () => publicApi.plans(),
  { condition: (_, { getState }) => !['loading', 'ready'].includes(getState().plans.status) },
);

const plansSlice = createSlice({
  name: 'plans',
  initialState: { items: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlans.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchPlans.fulfilled, (state, { payload }) => {
        state.status = 'ready';
        state.items = payload;
      })
      .addCase(fetchPlans.rejected, (state) => { state.status = 'error'; });
  },
});

export default plansSlice.reducer;
