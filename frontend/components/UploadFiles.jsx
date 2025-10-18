"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function UploadFiles() {
  const [files, setFiles] = useState([]); // originals (both images + non-images)
  const [images, setImages] = useState([]); // originals where mimeType startsWith image/
  const [others, setOthers] = useState([]); // originals not images
  const [selected, setSelected] = useState(null); // detail for selected image
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function fetchOriginals() {
    // Get originals (exclude thumbnails)
    const res = await fetch(`${API_BASE}/api/files`);
    const data = await res.json();
    const originals = Array.isArray(data) ? data.filter((r) => r.type !== 'thumbnail') : [];
    setFiles(originals);
    setImages(originals.filter((r) => (r.mimeType || '').startsWith('image/')));
    setOthers(originals.filter((r) => !(r.mimeType || '').startsWith('image/')));
  }

  async function fetchDetail(id) {
    const res = await fetch(`${API_BASE}/api/files/${id}/detail`);
    if (!res.ok) return null;
    return res.json();
  }

  useEffect(() => {
    fetchOriginals();
  }, []);

  async function handleUpload(file) {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/api/files/upload`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      await fetchOriginals();
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  const leftPane = useMemo(() => {
    if (selected) {
      const { original, thumbnails } = selected;
      const large = thumbnails?.find((t) => t.variant === '400') || thumbnails?.[0];
      return (
        <div style={{ padding: 16 }}>
          <button onClick={() => setSelected(null)} style={{ marginBottom: 12 }}>← Back to upload</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <img
              src={(large || original).url}
              alt={original.fileName}
              style={{ width: '100%', height: 'auto', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => window.open(`/image/${original.id}`, '_blank')}
            />
            <div>
              <div><strong>Name</strong>: {original.fileName}</div>
              <div><strong>MIME</strong>: {original.mimeType}</div>
              <div><strong>Size</strong>: {original.size} bytes</div>
              <div><strong>Uploaded</strong>: {new Date(original.uploadedAt).toLocaleString()}</div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px dashed #bbb',
          borderRadius: 8,
          background: dragOver ? '#f5f5f5' : '#fff',
          padding: 16,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 8 }}>Drag & drop file here</p>
          <p style={{ marginBottom: 12 }}>or</p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer' }}
          >
            {uploading ? 'Uploading…' : 'Choose File'}
          </button>
          <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files?.[0])} />
        </div>
      </div>
    );
  }, [dragOver, uploading, selected]);

  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 480 }}>
      {/* Left 40% */}
      <div style={{ flex: '0 0 40%', maxWidth: '40%' }}>
        {leftPane}
      </div>
      {/* Right 60% */}
      <div style={{ flex: '1 1 auto' }}>
        <section>
          <h3 style={{ marginTop: 0 }}>Images</h3>
          {images.length === 0 ? (
            <div style={{ color: '#666' }}>No images yet.</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              {images.map((img) => (
                <ImageCard key={img.id} item={img} onSelect={async () => {
                  const detail = await fetchDetail(img.id);
                  if (detail) setSelected(detail);
                }} />
              ))}
            </div>
          )}
        </section>
        <section style={{ marginTop: 24 }}>
          <h3>Files</h3>
          {others.length === 0 ? (
            <div style={{ color: '#666' }}>No files yet.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {others.map((f) => (
                <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                  <span aria-hidden>📄</span>
                  <a href={f.url} download>{f.fileName}</a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ImageCard({ item, onSelect }) {
  const [thumb, setThumb] = useState(null);
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/files/${item.id}/detail`);
        if (!res.ok) return;
        const d = await res.json();
        const t = d.thumbnails?.find((x) => x.variant === '200') || d.thumbnails?.[0];
        if (!abort) setThumb(t);
      } catch {}
    })();
    return () => {
      abort = true;
    };
  }, [item.id]);

  return (
    <div onClick={onSelect} style={{ cursor: 'pointer' }}>
      <div style={{
        width: '100%',
        aspectRatio: '1/1',
        background: '#f0f0f0',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        border: '1px solid #eee',
      }}>
        {thumb ? (
          <img src={thumb.url} alt={item.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#888' }}>Loading…</span>
        )}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.fileName}
      </div>
    </div>
  );
}

