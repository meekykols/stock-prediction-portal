import axios from 'axios';
import { ApiError } from '../../utils/ApiError.js';

const client = axios.create({ timeout: 15_000 });
const cache = new Map(); // key -> { at, ttl, value }

/** GET with a small in-memory cache. Exchange outages become a 503 the caller can show. */
export async function getJson(url, params, ttlMs = 0) {
  const key = `${url}?${new URLSearchParams(params)}`;
  const hit = cache.get(key);
  if (ttlMs && hit && Date.now() - hit.at < ttlMs) return hit.value;
  try {
    const { data } = await client.get(url, { params });
    if (ttlMs) cache.set(key, { at: Date.now(), value: data });
    return data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 451 || status === 403) {
      throw new ApiError(503, 'The exchange is refusing requests from this server location.', undefined, 'exchange_geo_blocked');
    }
    if (status === 400) throw new ApiError(422, err.response?.data?.msg || 'The exchange rejected the request', undefined, 'exchange_bad_request');
    throw new ApiError(503, 'The exchange is not responding. Please try again shortly.', undefined, 'exchange_unavailable');
  }
}
