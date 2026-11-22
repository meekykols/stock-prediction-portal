import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { chatApi } from '../api/endpoints';

export const loadConversations = createAsyncThunk('chat/list', (params) => chatApi.list(params));

const byRecent = (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt);

const slice = createSlice({
  name: 'chat',
  initialState: { items: [], status: 'idle', unreadTotal: 0, filter: { status: 'open', mine: '' } },
  reducers: {
    filterChanged: (s, { payload }) => { s.filter = { ...s.filter, ...payload }; },
    conversationUpserted: (s, { payload: conv }) => {
      const prev = s.items.find((c) => c.id === conv.id);
      const prevUnread = prev?.status === 'open' ? prev.unread.staff : 0;
      const nextUnread = conv.status === 'open' ? conv.unread.staff : 0;
      s.unreadTotal = Math.max(0, s.unreadTotal - prevUnread + nextUnread);
      const matches = (!s.filter.status || s.filter.status === conv.status);
      s.items = s.items.filter((c) => c.id !== conv.id);
      if (matches) s.items.push(conv);
      s.items.sort(byRecent);
    },
  },
  extraReducers: (b) => {
    b.addCase(loadConversations.pending, (s) => { s.status = 'loading'; })
      .addCase(loadConversations.fulfilled, (s, { payload }) => {
        s.status = 'ready';
        s.items = payload.items;
        s.unreadTotal = payload.unreadTotal;
      })
      .addCase(loadConversations.rejected, (s) => { s.status = 'error'; });
  },
});

export const { filterChanged, conversationUpserted } = slice.actions;
export default slice.reducer;
