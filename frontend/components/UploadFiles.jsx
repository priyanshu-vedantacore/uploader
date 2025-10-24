"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listOriginals, getDetail, uploadFile, deleteById } from "../lib/api";

export default function UploadFiles() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [images, setImages] = useState([]);
  const [others, setOthers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  async function fetchOriginals() {
    const originals = await listOriginals();
    setImages(originals.filter((r) => (r.mimeType || '').startsWith('image/')));
    setOthers(originals.filter((r) => !(r.mimeType || '').startsWith('image/')));
  }

  useEffect(() => {
    fetchOriginals();
  }, []);

  // Sync selected item with URL (?selected=<id>)
  useEffect(() => {
    const sel = searchParams?.get('selected');
    (async () => {
      if (sel) {
        try {
          const detail = await getDetail(sel);
          setSelected(detail);
        } catch {
          setSelected(null);
        }
      } else {
        setSelected(null);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      await uploadFile(file);
      await fetchOriginals();
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    if (!id) return;
    const ok = window.confirm('Delete this item and its thumbnails?');
    if (!ok) return;
    try {
      await deleteById(id);
      if (selected?.original?.id === id) {
        router.push('/', { scroll: false });
        setSelected(null);
      }
      await fetchOriginals();
    } catch (e) {
      console.error(e);
      alert('Delete failed');
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }
  function onDragOver(e) { e.preventDefault(); setDragOver(true); }
  function onDragLeave() { setDragOver(false); }

  const leftPane = useMemo(() => {
    if (selected) {
      const { original, thumbnails } = selected;
      const large = thumbnails?.find((t) => t.variant === '400') || thumbnails?.[0];
      return (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => { router.push('/', { scroll: false }); setSelected(null); }}>← Back to upload</button>
            <button onClick={() => handleDelete(original.id)} style={{ color: '#a00', borderColor: '#a00' }}>Delete</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <img
              src={(large || original).url}
              alt={original.fileName}
              style={{ width: '100%', height: 'auto', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => router.push(`/image/${original.id}`)}
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
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px dashed #bbb', borderRadius: 8, background: dragOver ? '#f5f5f5' : '#fff', padding: 16,
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
          <input ref={inputRef} type="file" style={{ display: 'none' }} data-testid="file-input" onChange={(e) => handleUpload(e.target.files?.[0])} />
        </div>
      </div>
    );
  }, [dragOver, uploading, selected]);

  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 480 }}>
      <div style={{ flex: '0 0 40%', maxWidth: '40%' }}>{leftPane}</div>
      <div style={{ flex: '1 1 auto' }}>
        <section>
          <h3 style={{ marginTop: 0 }}>Images</h3>
          {images.length === 0 ? (
            <div style={{ color: '#666' }}>No images yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              {images.map((img) => (
                <ImageCard
                  key={img.id}    
                  item={img}
                  onSelect={async () => {
                    router.push(`/?selected=${img.id}`, { scroll: false });
                  }}
                  onDelete={() => handleDelete(img.id)}
                />
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
                  <a href={f.url} download style={{ flex: 1 }}>{f.fileName}</a>
                  <button onClick={() => handleDelete(f.id)} style={{ color: '#a00', borderColor: '#a00' }}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ImageCard({ item, onSelect, onDelete }) {
  const [thumb, setThumb] = useState(null);
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const d = await getDetail(item.id);
        const t = d.thumbnails?.find((x) => x.variant === '200') || d.thumbnails?.[0];
        if (!abort) setThumb(t);
      } catch {}
    })();
    return () => { abort = true; };
  }, [item.id]);

  return (
    <div style={{ position: 'relative' }}>
      <div onClick={onSelect} style={{
        width: '100%', aspectRatio: '1/1', background: '#f0f0f0', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #eee', cursor: 'pointer',
      }}>
        {thumb ? (
          <img src={thumb.url} alt={item.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#888' }}>Loading…</span>
        )}
      </div>
      {/* <button
        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        title="Delete"
        style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.9)', border: '1px solid #ccc', borderRadius: 6, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}
      >
        Delete
      </button> */}
      <div style={{ marginTop: 6, fontSize: 12, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.fileName}
      </div>
    </div>
  );
}
