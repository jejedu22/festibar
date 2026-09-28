// frontend/src/utils/api.js
// Client HTTP unique : JSON, jeton d'authentification, erreurs homogènes

export class ApiError extends Error {
  constructor(message, { status = 0, network = false, data = null } = {}) {
    super(message);
    this.status = status;
    this.network = network; // true : serveur injoignable (hors-ligne, coupure…)
    this.data = data;
  }
}

// Appelé quand un jeton est refusé (401) : permet de renvoyer vers la connexion
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export async function api(url, { method = 'GET', body, token, raw = false, timeout = 10000 } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('Serveur injoignable : vérifiez la connexion réseau.', { network: true });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token && onUnauthorized) onUnauthorized(data.error);
    throw new ApiError(data.error || `Erreur ${res.status}`, { status: res.status, data });
  }

  if (raw) return res;
  return res.status === 204 ? null : res.json();
}
