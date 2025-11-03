"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listOriginals, getDetail, uploadFile, deleteById } from "../lib/api";

export default function UploadFiles() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [images, setImages] = useState([]);
  const [others, setOthers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [currentViewUrl, setCurrentViewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const detailCache = useRef(new Map());

  async function fetchOriginals() {
    const originals = await listOriginals();
    const imageOriginals = originals.filter((r) => (r.mimeType || "").startsWith("image/"));
    const otherFiles = originals.filter((r) => !(r.mimeType || "").startsWith("image/"));

    const imageDetails = await Promise.all(
      imageOriginals.map(async (o) => {
        try {
          let d = detailCache.current.get(o.id);
          if (!d) {
            d = await getDetail(o.id);
            detailCache.current.set(o.id, d);
          }
          const thumbs = Array.isArray(d?.thumbnails) ? d.thumbnails : [];
          const t200 = thumbs.find((t) => t.variant === "200") || thumbs[0] || null;
          const t400 =
            thumbs.find((t) => t.variant === "400") ||
            thumbs.find((t) => t.variant === "400") ||
            thumbs[1] ||
            t200;
          return { ...o, detail: d, thumb200: t200, thumb400: t400 };
        } catch (e) {
          return { ...o, detail: null, thumb200: null, thumb400: null };
        }
      })
    );

    setImages(imageDetails);
    setOthers(otherFiles);
  }

  useEffect(() => {
    fetchOriginals();
  }, []);

  useEffect(() => {
    const sel = searchParams?.get("selected");
    if (!sel) {
      setSelected(null);
      setCurrentViewUrl(null);
      return;
    }

    (async () => {
      const cached = detailCache.current.get(sel) || images.find((x) => x.id === sel)?.detail;
      if (cached) {
        const original = cached.original || cached;
        const thumbs = Array.isArray(cached.thumbnails) ? cached.thumbnails : [];
        const t400 = thumbs.find((t) => t.variant === "400") || thumbs[1] || thumbs[0] || null;
        const t200 = thumbs.find((t) => t.variant === "200") || thumbs[0] || null;
        const composed = { original: original, thumbnails: thumbs, thumb200: t200, thumb400: t400 };
        setSelected(composed);
        setCurrentViewUrl(t400?.url || original?.url || null);
        return;
      }

      try {
        const d = await getDetail(sel);
        detailCache.current.set(sel, d);
        const original = d.original || d;
        const thumbs = Array.isArray(d.thumbnails) ? d.thumbnails : [];
        const t400 = thumbs.find((t) => t.variant === "400") || thumbs[1] || thumbs[0] || null;
        const t200 = thumbs.find((t) => t.variant === "200") || thumbs[0] || null;
        const composed = { original: original, thumbnails: thumbs, thumb200: t200, thumb400: t400 };
        setSelected(composed);
        setCurrentViewUrl(t400?.url || original?.url || null);
      } catch (err) {
        setSelected(null);
        setCurrentViewUrl(null);
      }
    })();
  }, [searchParams?.toString(), images]);

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      await uploadFile(file);
      await fetchOriginals();
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selected) return;
    const cnf = window.confirm("Delete this item and its thumbnails? This will delete thumb200, thumb400, then original.");
    if (!cnf) return;

    try {
      const t200 = selected.thumb200;
      const t400 = selected.thumb400;
      const original = selected.original;

      if (t200?.id) {
        await deleteById(t200.id);
      }

      if (t400?.id && t400.id !== t200?.id) {
        await deleteById(t400.id);
      }

      if (original?.id) {
        await deleteById(original.id);
      }

      await fetchOriginals();
      router.replace("/", { scroll: false });
      setSelected(null);
      setCurrentViewUrl(null);
    } catch (err) {
      console.error("Delete failed", err);
      alert("Delete failed");
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
      const { original } = selected;
      return (
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => {
                router.replace("/", { scroll: false });
                setSelected(null);
                setCurrentViewUrl(null);
              }}
            >
              ← Back to upload
            </button>
            <button onClick={handleDeleteSelected} style={{ color: "#a00", borderColor: "#a00" }}>
              Delete
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <img
              src={currentViewUrl || original.url}
              alt={original.fileName}
              style={{ width: "100%", height: "auto", borderRadius: 8, cursor: "pointer" }}
              onClick={() => {
                const origUrl = original.url;
                const t400Url = selected.thumb400?.url;
                if (currentViewUrl === t400Url && origUrl) {
                  setCurrentViewUrl(origUrl);
                }
              }}
            />

            <div>
              <div>
                <strong>Name</strong>: {original.fileName}
              </div>
              <div>
                <strong>MIME</strong>: {original.mimeType}
              </div>
              <div>
                <strong>Size</strong>: {original.size} bytes
              </div>
              <div>
                <strong>Uploaded</strong>: {new Date(original.uploadedAt).toLocaleString()}
              </div>
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
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px dashed #bbb",
          borderRadius: 8,
          background: dragOver ? "#f5f5f5" : "#fff",
          padding: 16,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: 8 }}>Drag & drop file here</p>
          <p style={{ marginBottom: 12 }}>or</p>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer" }}
          >
            {uploading ? "Uploading…" : "Choose File"}
          </button>
          <input
            ref={inputRef}
            type="file"
            style={{ display: "none" }}
            data-testid="file-input"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </div>
      </div>
    );
  }, [dragOver, uploading, selected, currentViewUrl, router]);

  return (
    <div style={{ display: "flex", gap: 16, minHeight: 480 }}>
      <div style={{ flex: "0 0 40%", maxWidth: "40%" }}>{leftPane}</div>
      <div style={{ flex: "1 1 auto" }}>
        <section>
          <h3 style={{ marginTop: 0 }}>Images</h3>
          {images.length === 0 ? (
            <div style={{ color: "#666" }}>No images yet.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {images.map((img) => (
                <ImageCard
                  key={img.id}
                  item={img}
                  onSelect={() => {
                    router.push(`/?selected=${img.id}`, { scroll: false });
                    if (img.detail) {
                      const original = img.detail.original || img.detail;
                      const thumbs = Array.isArray(img.detail.thumbnails) ? img.detail.thumbnails : [];
                      const t400 = img.thumb400;
                      const t200 = img.thumb200;
                      setSelected({ original, thumbnails: thumbs, thumb200: t200, thumb400: t400 });
                      setCurrentViewUrl(t400?.url || original?.url || null);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <section style={{ marginTop: 24 }}>
          <h3>Files</h3>
          {others.length === 0 ? (
            <div style={{ color: "#666" }}>No files yet.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {others.map((f) => (
                <li key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <span aria-hidden>📄</span>
                  <a href={f.url} download style={{ flex: 1 }}>
                    {f.fileName}
                  </a>
                  <button
                    onClick={() => {
                      (async () => {
                        const ok = window.confirm("Delete this file?");
                        if (!ok) return;
                        try {
                          await deleteById(f.id);
                          await fetchOriginals();
                        } catch (e) {
                          console.error(e);
                          alert("Delete failed");
                        }
                      })();
                    }}
                    style={{ color: "#a00", borderColor: "#a00" }}
                  >
                    Delete
                  </button>
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
  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={onSelect}
        style={{
          width: "100%",
          aspectRatio: "1/1",
          background: "#f0f0f0",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          border: "1px solid #eee",
          cursor: "pointer",
        }}
      >
        <img
          src={item.thumb200?.url || item.url}
          alt={item.fileName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
      </div>

      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          color: "#333",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.fileName}
      </div>
    </div>
  );
}
