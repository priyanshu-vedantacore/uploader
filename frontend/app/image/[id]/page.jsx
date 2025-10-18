import { notFound } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

async function fetchDetail(id) {
  const res = await fetch(`${API_BASE}/api/files/${id}/detail`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function ImagePage({ params }) {
  const { id } = params;
  const detail = await fetchDetail(id);
  if (!detail) return notFound();
  const { original, thumbnails } = detail;
  const large = Array.isArray(thumbnails)
    ? thumbnails.find((t) => t.variant === '400') || thumbnails[0]
    : null;
  const imgUrl = original?.url;
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>{original?.fileName || 'Image'}</h2>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {large ? (
          <img src={large.url} alt={original?.fileName} style={{ maxWidth: '60vw', height: 'auto', borderRadius: 8 }} />
        ) : (
          <img src={imgUrl} alt={original?.fileName} style={{ maxWidth: '60vw', height: 'auto', borderRadius: 8 }} />
        )}
        <div>
          <div><strong>MIME</strong>: {original?.mimeType}</div>
          <div><strong>Size</strong>: {original?.size} bytes</div>
          <div><strong>Uploaded</strong>: {new Date(original?.uploadedAt).toLocaleString()}</div>
          {large && (
            <div style={{ marginTop: 8 }}>
              <div><strong>Preview</strong>: {large.width}x{large.height}</div>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <a href={imgUrl} target="_blank" rel="noreferrer">Open Original</a>
          </div>
        </div>
      </div>
    </div>
  );
}

