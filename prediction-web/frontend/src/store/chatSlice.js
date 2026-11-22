import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { chatApi } from '../api/endpoints';
import { errorMessage } from '../api/client';

export const loadChat = createAsyncThunk('chat/load', () => chatApi.thread());

export const sendChat = createAsyncThunk('chat/send', async (body, { rejectWithValue }) => {
  try {
    return await chatApi.send(body);
  } catch (err) {
    return rejectWithValue({ message: errorMessage(err), code: err?.response?.data?.code });
  }
});

export const markChatRead = createAsyncThunk('chat/read', () => chatApi.read());

const initialState = {
  status: 'idle',
  canChat: false,
  planName: null,
  conversation: null,
  messages: [],
  open: false,
  staffTyping: null,
};

function addMessage(state, message) {
  if (!state.messages.some((m) => m.id === message.id)) state.messages.push(message);
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    chatOpened: (state) => { state.open = true; },
    chatClosed: (state) => { state.open = false; },
    chatMessageReceived: (state, { payload }) => {
      const { conversation, message } = payload;
      if (state.conversation?.id !== conversation.id) {
        state.conversation = conversation;
        state.messages = [];
      } else {
        state.conversation = conversation;
      }
      addMessage(state, message);
      if (message.senderRole === 'staff') state.staffTyping = null;
    },
    chatConversationUpdated: (state, { payload }) => {
      if (state.conversation?.id === payload.conversation.id) state.conversation = payload.conversation;
    },
    staffTyping: (state, { payload }) => { state.staffTyping = payload; },
    chatReset: () => initialState,
  },
  extraReducers: (b) => {
    b.addCase(loadChat.fulfilled, (state, { payload }) => {
      state.status = 'ready';
      state.canChat = payload.canChat;
      state.planName = payload.planName;
      state.conversation = payload.conversation;
      state.messages = payload.messages;
    })
      .addCase(loadChat.rejected, (state) => { state.status = 'error'; })
      .addCase(sendChat.fulfilled, (state, { payload }) => {
        if (state.conversation?.id !== payload.conversation.id) state.messages = [];
        state.conversation = payload.conversation;
        addMessage(state, payload.message);
      })
      .addCase(markChatRead.pending, (state) => {
        if (state.conversation) state.conversation.unread = { ...state.conversation.unread, customer: 0 };
      });
  },
});

export const {
  chatOpened, chatClosed, chatMessageReceived, chatConversationUpdated, staffTyping, chatReset,
} = chatSlice.actions;
export default chatSlice.reducer;
