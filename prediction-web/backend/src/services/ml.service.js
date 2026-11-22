import axios from 'axios';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Internal client for the Django ML service. Users never call Django directly.
const ml = axios.create({
  baseURL: env.mlService.url.replace(/\/$/, ''),
  timeout: 120_000,
  headers: { 'X-Service-Key': env.mlService.apiKey },
});

function translate(err) {
  if (!err.response) {
    return new ApiError(503, 'The prediction service is offline. Please try again shortly.', undefined, 'ml_offline');
  }
  const { status, data } = err.response;
  const message = data?.message || 'The prediction service could not complete the request';
  const code = data?.code;

  if (status === 401 || status === 403) {
    console.error('[ml] service key rejected — check ML_SERVICE_API_KEY in both services');
    return new ApiError(503, 'The prediction service is unavailable.', undefined, 'ml_misconfigured');
  }
  if (status === 400) return new ApiError(422, message, data?.errors, code);
  if (status >= 500 && status !== 503) {
    return new ApiError(502, 'The prediction service hit an error. Please try again.', undefined, code);
  }
  return new ApiError(status, message, undefined, code);
}

async function call(method, url, payload) {
  try {
    const res = await ml.request({ method, url, ...(method === 'get' ? { params: payload } : { data: payload }) });
    return res.data.data;
  } catch (err) {
    throw translate(err);
  }
}

export const mlService = {
  marketCatalog: () => call('get', '/v1/markets/catalog/'),
  resolveMarket: ({ assetClass, symbol }) => call('get', '/v1/markets/resolve/', { assetClass, symbol }),
  predictMarket: ({ assetClass, symbol, horizon }) => call('post', '/v1/markets/predict/', { assetClass, symbol, horizon }),
  sportsFixtures: (date) => call('get', '/v1/sports/fixtures/', date ? { date } : {}),
  predictSports: ({ fixtureId }) => call('post', '/v1/sports/predict/', { fixtureId }),
};
