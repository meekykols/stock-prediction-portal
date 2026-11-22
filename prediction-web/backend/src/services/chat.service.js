import { ChatMessage, Conversation } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getCurrentEntitlement } from './subscription.service.js';
import { emitTo, ROOMS } from '../socket/index.js';

const MESSAGE_PAGE = 100;
const PERSON = 'firstName lastName email avatar';

const preview = (body) => (body.length > 140 ? `${body.slice(0, 137)}…` : body);

async function populated(conv) {
  return conv.populate([{ path: 'customer', select: PERSON }, { path: 'assignedTo', select: 'firstName lastName' }]);
}

function messagesOf(conversationId) {
  return ChatMessage.find({ conversation: conversationId }).sort({ createdAt: -1 }).limit(MESSAGE_PAGE)
    .then((list) => list.reverse());
}

/** Pushes a new message to the customer and to every staff member who can answer chat. */
async function broadcast(conv, message) {
  const full = await populated(conv);
  const payload = { conversation: full.toJSON(), message: message.toJSON() };
  emitTo(ROOMS.user(conv.customer._id ?? conv.customer), 'chat:message', payload);
  emitTo(ROOMS.staffChat, 'chat:message', payload);
}

async function addMessage(conv, { sender, senderRole, senderName, body }) {
  const message = await ChatMessage.create({ conversation: conv._id, sender, senderRole, senderName, body });
  conv.lastMessageAt = message.createdAt;
  conv.lastMessage = { body: preview(body), senderRole };
  if (senderRole === 'customer') conv.unread.staff += 1;
  if (senderRole === 'staff') conv.unread.customer += 1;
  await conv.save();
  await broadcast(conv, message);
  return message;
}

// ---------------------------------------------------------------- customer

export async function chatAccess(userId) {
  const { plan } = await getCurrentEntitlement(userId);
  return { canChat: Boolean(plan?.limits?.liveChat), planName: plan?.name ?? null };
}

export async function customerThread(userId) {
  const access = await chatAccess(userId);
  const conv = (await Conversation.findOne({ customer: userId, status: 'open' }))
    ?? (await Conversation.findOne({ customer: userId }).sort({ lastMessageAt: -1 }));
  return {
    ...access,
    conversation: conv ? conv.toJSON() : null,
    messages: conv ? await messagesOf(conv._id) : [],
  };
}

export async function customerSend(user, body) {
  const { canChat } = await chatAccess(user._id);
  if (!canChat) throw new ApiError(403, 'Live chat is included in Pro and Elite plans.', undefined, 'chat_not_in_plan');

  let conv = await Conversation.findOne({ customer: user._id, status: 'open' });
  if (!conv) conv = await Conversation.create({ customer: user._id });
  const message = await addMessage(conv, { sender: user._id, senderRole: 'customer', body });
  return { conversation: conv.toJSON(), message };
}

export async function customerMarkRead(userId) {
  await Conversation.updateMany({ customer: userId, 'unread.customer': { $gt: 0 } }, { 'unread.customer': 0 });
}

// ---------------------------------------------------------------- staff

export async function staffList({ status = 'open', mine, staffId }) {
  const filter = {};
  if (status) filter.status = status;
  if (mine === 'true') filter.assignedTo = staffId;
  const items = await Conversation.find(filter).sort({ lastMessageAt: -1 }).limit(200)
    .populate('customer', PERSON).populate('assignedTo', 'firstName lastName');
  const unreadTotal = await Conversation.aggregate([
    { $match: { status: 'open' } }, { $group: { _id: null, n: { $sum: '$unread.staff' } } },
  ]);
  return { items, unreadTotal: unreadTotal[0]?.n ?? 0 };
}

async function findConversation(id) {
  const conv = await Conversation.findById(id);
  if (!conv) throw ApiError.notFound('Conversation not found');
  return conv;
}

export async function staffThread(id) {
  const conv = await populated(await findConversation(id));
  const { plan } = await getCurrentEntitlement(conv.customer._id);
  return { conversation: conv, messages: await messagesOf(conv._id), customerPlan: plan ? { name: plan.name, slug: plan.slug } : null };
}

export async function staffSend(staff, id, body) {
  const conv = await findConversation(id);
  if (conv.status === 'closed') {
    conv.status = 'open';
    conv.closedAt = undefined;
    conv.closedBy = undefined;
  }
  conv.assignedTo ??= staff._id;
  const message = await addMessage(conv, { sender: staff._id, senderRole: 'staff', senderName: staff.firstName, body });
  return { conversation: (await populated(conv)).toJSON(), message };
}

export async function staffMarkRead(id) {
  const conv = await findConversation(id);
  conv.unread.staff = 0;
  await conv.save();
  emitTo(ROOMS.staffChat, 'chat:conversation', { conversation: (await populated(conv)).toJSON() });
  return conv;
}

export async function assign(id, staffId) {
  const conv = await findConversation(id);
  conv.assignedTo = staffId;
  await conv.save();
  const full = (await populated(conv)).toJSON();
  emitTo(ROOMS.staffChat, 'chat:conversation', { conversation: full });
  return full;
}

export async function close(staff, id) {
  const conv = await findConversation(id);
  if (conv.status === 'closed') return (await populated(conv)).toJSON();
  await addMessage(conv, { senderRole: 'system', body: `${staff.firstName} closed this conversation. Send a message any time to start a new one.` });
  conv.status = 'closed';
  conv.closedAt = new Date();
  conv.closedBy = staff._id;
  conv.unread.staff = 0;
  await conv.save();
  const full = (await populated(conv)).toJSON();
  emitTo(ROOMS.staffChat, 'chat:conversation', { conversation: full });
  emitTo(ROOMS.user(conv.customer._id ?? conv.customer), 'chat:conversation', { conversation: full });
  return full;
}
