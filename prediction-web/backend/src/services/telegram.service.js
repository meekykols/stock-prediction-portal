import crypto from 'node:crypto';
import axios from 'axios';
import { env } from '../config/env.js';
import { CryptoConfig, TelegramLink, User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getCurrentEntitlement } from './subscription.service.js';

/**
 * Telegram bot for signal alerts.
 *
 * Customers link their chat with a one-time code (/start <code>), so alerts follow their plan:
 * when a subscription lapses the messages stop, unlike a private channel people can stay in.
 * Updates are read by long polling, which works without a public webhook URL. Run it on one
 * instance only (the scheduler instance).
 */

const LINK_TTL_MS = 15 * 60 * 1000;
const SEND_GAP_MS = 50; // stay well under Telegram's ~30 messages/second

let botInfo = null;
let polling = false;

export const telegramConfigured = () => Boolean(env.telegram.botToken);

async function api(method, body = {}, timeout = 15_000) {
  if (!telegramConfigured()) throw new ApiError(503, 'Telegram is not configured (set TELEGRAM_BOT_TOKEN).', undefined, 'telegram_not_configured');
  const { data } = await axios.post(`${env.telegram.apiBase}/bot${env.telegram.botToken}/${method}`, body, { timeout });
  return data.result;
}

export async function botUsername() {
  if (!botInfo) botInfo = await api('getMe');
  return botInfo.username;
}

// ---------------------------------------------------------------- linking

export async function createLinkCode(userId) {
  const code = crypto.randomBytes(6).toString('base64url');
  await TelegramLink.deleteMany({ user: userId });
  await TelegramLink.create({ code, user: userId, expiresAt: new Date(Date.now() + LINK_TTL_MS) });
  let link = null;
  try { link = `https://t.me/${await botUsername()}?start=${code}`; } catch { /* bot offline: the code still works */ }
  return { code, link, expiresAt: new Date(Date.now() + LINK_TTL_MS) };
}

export async function telegramStatus(userId) {
  const user = await User.findById(userId).select('telegram');
  let username = null;
  if (telegramConfigured()) { try { username = await botUsername(); } catch { /* offline */ } }
  return {
    available: telegramConfigured(),
    bot: username,
    linked: Boolean(user?.telegram?.chatId),
    username: user?.telegram?.username ?? null,
    linkedAt: user?.telegram?.linkedAt ?? null,
  };
}

export async function unlink(userId) {
  const user = await User.findById(userId).select('telegram');
  const chatId = user?.telegram?.chatId;
  await User.updateOne({ _id: userId }, { $unset: { telegram: 1 } });
  if (chatId && telegramConfigured()) sendMessage(chatId, 'Signal alerts are turned off for this chat. You can reconnect from your account at any time.').catch(() => {});
}

async function handleUpdate(update) {
  const msg = update.message;
  if (!msg?.text || msg.chat?.type !== 'private') return;
  const chatId = String(msg.chat.id);
  const [command, arg] = msg.text.trim().split(/\s+/, 2);

  if (command === '/start' && arg) {
    const link = await TelegramLink.findOneAndDelete({ code: arg, expiresAt: { $gt: new Date() } });
    if (!link) {
      await sendMessage(chatId, 'That link has expired. Open Crypto signals in your account and press "Connect Telegram" again.');
      return;
    }
    // One chat per account, and one account per chat.
    await User.updateMany({ 'telegram.chatId': chatId, _id: { $ne: link.user } }, { $unset: { telegram: 1 } });
    const user = await User.findByIdAndUpdate(link.user, { telegram: { chatId, username: msg.from?.username, linkedAt: new Date() } }, { returnDocument: 'after' });
    await sendMessage(chatId, `✅ Connected, ${escape(user.firstName)}. You'll get crypto signal alerts here for the signals your plan includes.\n\nSend /stop to turn alerts off.`);
    return;
  }
  if (command === '/stop') {
    await User.updateMany({ 'telegram.chatId': chatId }, { $unset: { telegram: 1 } });
    await sendMessage(chatId, 'Alerts turned off. Reconnect from your account at any time.');
    return;
  }
  await sendMessage(chatId, 'To get signal alerts, open Crypto signals in your account and press "Connect Telegram".\n\n/stop turns alerts off.');
}

/** Long-polls getUpdates until stopPolling(). */
export async function startPolling() {
  if (!telegramConfigured() || polling) return;
  polling = true;
  let offset = 0;
  try {
    console.log(`[telegram] polling as @${await botUsername()}`);
  } catch (err) {
    console.error('[telegram] could not reach the bot API:', err.message);
  }
  while (polling) {
    try {
      const updates = await api('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] }, 35_000);
      for (const u of updates || []) {
        offset = u.update_id + 1;
        await handleUpdate(u).catch((err) => console.error('[telegram] update failed:', err.message));
      }
    } catch (err) {
      if (polling) {
        console.error('[telegram] polling error:', err.response?.data?.description || err.message);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }
}

export function stopPolling() {
  polling = false;
}

// ---------------------------------------------------------------- sending

const escape = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function sendMessage(chatId, text) {
  try {
    return await api('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });
  } catch (err) {
    const code = err.response?.data?.error_code;
    const gone = code === 403 || /chat not found/i.test(err.response?.data?.description || '');
    // Blocked the bot or deleted the chat: stop sending to it.
    if (gone) await User.updateMany({ 'telegram.chatId': String(chatId) }, { $unset: { telegram: 1 } });
    throw err;
  }
}

const fmt = (n) => (Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : String(n));
const ex = { binance: 'Binance', bybit: 'Bybit' };

export function formatSignalMessage(signal, event) {
  const head = `${signal.side === 'long' ? '🟢 LONG' : '🔴 SHORT'} <b>${escape(signal.symbol)}</b> · ${ex[signal.exchange]} · ${signal.timeframe}`;
  switch (event.type) {
    case 'posted': {
      const tps = signal.tps.map((tp, i) => `TP${i + 1}: <code>${fmt(tp)}</code> (${signal.rr[i]}R)`).join('\n');
      return [
        `${head}${signal.source === 'manual' ? ' · Analyst signal' : ''}`,
        `Entry: <code>${fmt(signal.entry)}</code> ${signal.entryType === 'market' ? '(market)' : '(limit)'}`,
        `Stop-loss: <code>${fmt(signal.sl)}</code>`,
        tps,
        signal.note ? `\n${escape(signal.note)}` : '',
        '\n<i>Risk only what you can afford to lose. Not financial advice.</i>',
      ].filter(Boolean).join('\n');
    }
    case 'filled': return `${head}\n✅ Entry filled at <code>${fmt(event.price)}</code>`;
    case 'tp': return `${head}\n🎯 TP${event.index} hit at <code>${fmt(event.price)}</code>`;
    case 'breakeven': return `${head}\n🛡 Stop moved to entry (<code>${fmt(event.price)}</code>)`;
    case 'stopped': return `${head}\n⛔ Stopped out at <code>${fmt(event.price)}</code>`;
    case 'stopped_after_tp': return `${head}\n↩️ Rest closed at <code>${fmt(event.price)}</code> after taking profit`;
    case 'time_exit': return `${head}\n⏱ Closed at <code>${fmt(event.price)}</code> (time limit)`;
    case 'closed_by_staff': return `${head}\nClosed by our analyst at <code>${fmt(event.price)}</code>`;
    case 'closed': return `${head}\nResult: <b>${event.resultR > 0 ? '+' : ''}${event.resultR}R</b> after fees`;
    case 'expired': return `${head}\n⌛ Entry not reached: signal expired`;
    case 'cancelled': return `${head}\nCancelled before entry`;
    default: return null;
  }
}

/** Who may receive this signal: linked customers whose plan includes its kind. */
async function recipients(signal) {
  const config = await CryptoConfig.getSingleton();
  if (!config.telegram?.enabled) return [];
  const allowed = config.plans[signal.source === 'manual' ? 'manual' : signal.style] || [];
  const users = await User.find({ 'telegram.chatId': { $exists: true }, status: 'active', role: 'customer' }).select('telegram');
  const out = [];
  for (const u of users) {
    const { plan } = await getCurrentEntitlement(u._id);
    if (plan && allowed.includes(plan.slug)) out.push(u.telegram.chatId);
  }
  return out;
}

/** Fire-and-forget: send each event of a signal to everyone entitled to it. */
export async function notifySignal(signal, events) {
  if (!telegramConfigured() || !events?.length) return 0;
  const messages = events.map((e) => formatSignalMessage(signal, e)).filter(Boolean);
  if (!messages.length) return 0;
  const chats = await recipients(signal);
  let sent = 0;
  for (const chatId of chats) {
    for (const text of messages) {
      try {
        await sendMessage(chatId, text);
        sent += 1;
      } catch (err) {
        console.warn('[telegram] send failed:', err.response?.data?.description || err.message);
        break;
      }
      await new Promise((r) => setTimeout(r, SEND_GAP_MS));
    }
  }
  return sent;
}
