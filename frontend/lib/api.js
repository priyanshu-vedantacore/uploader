const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

async function jsonOrThrow(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function listOriginals() {
  const res = await fetch(`${API_BASE}/api/files`, { cache: 'no-store' });
  const data = await jsonOrThrow(res);
  return Array.isArray(data) ? data.filter((r) => r.type !== 'thumbnail') : [];
}

export async function getDetail(id) {
  const res = await fetch(`${API_BASE}/api/files/${id}/detail`, { cache: 'no-store' });
  return jsonOrThrow(res);
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/files/upload`, { method: 'POST', body: form });
  console.log(res);
  return jsonOrThrow(res);
}

export async function deleteById(id) {
  const res = await fetch(`${API_BASE}/api/files/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Delete failed: ${res.status}`);
  }
  return true;
}

