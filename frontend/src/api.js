const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function req(method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) {
    throw new Error(
      data.available_quantity !== undefined
        ? `${data.message} Available quantity: ${data.available_quantity}. Requested quantity: ${data.requested_quantity}.`
        : data.message
    );
  }
  return data;
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b),
};
