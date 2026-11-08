import { useEffect, useState } from 'react';

type M = { id: number; key: string; filename: string | null; size: number; in_gallery?: number; caption?: string | null };

// Shrink in the browser first (max 1600px, WebP) so R2 storage lasts longer.
async function compress(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.82));
    if (blob && blob.size < file.size) return blob;
  } catch { /* fall back to the original */ }
  return file;
}

export default function MediaGrid({ onSelect, allowDelete = false }: { onSelect?: (m: M) => void; allowDelete?: boolean }) {
  const [items, setItems] = useState<M[]>([]);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await (await fetch('/api/admin/media')).json();
    setItems(d.items); setTotal(d.total_bytes);
  }
  useEffect(() => { load(); }, []);

  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true); setMsg('');
    for (const f of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', await compress(f), f.name);
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      if (!res.ok) { setMsg((await res.json().catch(() => ({}))).error ?? 'अपलोड अयशस्वी.'); break; }
    }
    setBusy(false); load();
  }
  async function del(m: M) {
    if (!confirm('ही प्रतिमा हटवायची?')) return;
    const res = await fetch(`/api/admin/media/${m.id}`, { method: 'DELETE' });
    if (!res.ok) setMsg((await res.json().catch(() => ({}))).error ?? 'त्रुटी.'); else load();
  }

  async function gallery(m: M, in_gallery: boolean, caption: string) {
    const res = await fetch(`/api/admin/media/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ in_gallery, caption }) });
    if (!res.ok) setMsg('जतन करता आले नाही.');
    else setItems((xs) => xs.map((x) => (x.id === m.id ? { ...x, in_gallery: in_gallery ? 1 : 0, caption } : x)));
  }

  return (
    <div>
      <p><input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={(e) => upload(e.target.files)} />
        <small> वापर: {(total / 1048576).toFixed(1)} MB / 10240 MB (मोफत मर्यादा)</small></p>
      {msg && <p role="alert" style={{ color: '#b3001b' }}>{msg}</p>}
      {items.length === 0 && <p>अद्याप प्रतिमा नाहीत.</p>}
      <div className="grid">
        {items.map((m) => (
          <div key={m.id}>
            <button type="button" className="thumb" onClick={() => onSelect?.(m)} disabled={!onSelect} style={{ width: '100%', cursor: onSelect ? 'pointer' : 'default' }}>
              <img src={`/media/${m.key}`} alt={m.filename ?? ''} loading="lazy" /><span>{(m.size / 1024).toFixed(0)} KB</span>
            </button>
            {allowDelete && <>
              <label className="chk" style={{ fontSize: '.8rem' }}>
                <input type="checkbox" checked={!!m.in_gallery} onChange={(e) => gallery(m, e.target.checked, m.caption ?? '')} /> फोटो गॅलरीत दाखवा</label>
              {!!m.in_gallery && <input defaultValue={m.caption ?? ''} placeholder="कॅप्शन" aria-label="कॅप्शन" maxLength={300}
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '.8rem', padding: '.2rem' }}
                onBlur={(e) => e.target.value !== (m.caption ?? '') && gallery(m, true, e.target.value)} />}
              <button type="button" className="sec" style={{ width: '100%', padding: '.2rem' }} onClick={() => del(m)}>हटवा</button>
            </>}
          </div>
        ))}
      </div>
    </div>
  );
}
