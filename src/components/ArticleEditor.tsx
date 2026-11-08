import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Node } from '@tiptap/core';
import MediaGrid from './MediaGrid';

// Photo with caption inside the article text: <figure><img><figcaption>
const Figure = Node.create({
  name: 'figure', group: 'block', atom: true, draggable: true,
  addAttributes() { return { src: { default: null }, caption: { default: '' } }; },
  parseHTML() {
    return [{ tag: 'figure', getAttrs: (el) => {
      const e = el as HTMLElement; const img = e.querySelector('img'); if (!img) return false;
      return { src: img.getAttribute('src'), caption: e.querySelector('figcaption')?.textContent ?? '' };
    } }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['figure', {}, ['img', { src: HTMLAttributes.src, alt: HTMLAttributes.caption }], ['figcaption', {}, HTMLAttributes.caption]];
  },
});

type Cat = { id: number; name_mr: string };
type Initial = {
  id?: number; headline: string; subtitle: string; body_html: string; category_id: number | '';
  location_label: string; main_image_key: string; main_image_caption: string; byline: string; source: string; image_credit: string;
  is_featured: boolean; is_breaking: boolean; status: string;
};
type Corr = { note: string; created_at: string };

export default function ArticleEditor({ categories, initial, corrections = [] }: { categories: Cat[]; initial: Initial; corrections?: Corr[] }) {
  const [f, setF] = useState(initial);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState<null | 'main' | 'body'>(null);
  const id = initial.id;
  const set = (k: keyof Initial, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const editor = useEditor({
    // Tiptap 3: StarterKit already includes Link and Underline.
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }), Figure],
    content: initial.body_html,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true, // keep toolbar buttons' active state live (Tiptap 3 default is off)
  });

  async function save(status: 'draft' | 'published' | 'archived') {
    setBusy(true); setMsg('');
    const res = await fetch(id ? `/api/admin/articles/${id}` : '/api/admin/articles', {
      method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, body_html: editor?.getHTML() ?? '', status }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(data.error ?? 'जतन करता आले नाही.'); return; }
    if (!id) { location.href = `/admin/articles/${data.id}`; return; }
    set('status', status);
    setMsg(status === 'published' ? 'प्रकाशित केले.' : 'जतन केले.');
  }

  async function remove() {
    if (!confirm('ही बातमी कायमची हटवायची? सुधारणा व जुन्या आवृत्त्याही हटतील. हे परत आणता येणार नाही.')) return;
    setBusy(true);
    const res = await fetch(`/api/admin/articles/${id}`, { method: 'DELETE' });
    if (res.ok) { location.href = '/admin/articles?ok=' + encodeURIComponent('बातमी कायमची हटवली.'); return; }
    setBusy(false); setMsg((await res.json().catch(() => ({}))).error ?? 'हटवता आले नाही.');
  }

  async function addCorrection() {
    const res = await fetch(`/api/admin/articles/${id}/corrections`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note }) });
    if (res.ok) location.reload(); else setMsg((await res.json().catch(() => ({}))).error ?? 'त्रुटी.');
  }

  function picked(m: { key: string }) {
    if (picker === 'main') set('main_image_key', m.key);
    else {
      const caption = window.prompt('फोटो कॅप्शन (ऐच्छिक)') ?? '';
      editor?.chain().focus().insertContent({ type: 'figure', attrs: { src: `/media/${m.key}`, caption } }).run();
    }
    setPicker(null);
  }

  const Btn = ({ label, on, active }: { label: string; on: () => void; active?: boolean }) => (
    <button type="button" className={'tb' + (active ? ' act' : '')} onMouseDown={(e) => { e.preventDefault(); on(); }}>{label}</button>
  );
  const e = editor;

  return (
    <div className="editor">
      {picker && (
        <div className="modal" onClick={() => setPicker(null)}>
          <div className="modal-body" onClick={(x) => x.stopPropagation()}>
            <p><b>छायाचित्र निवडा</b> <button type="button" className="sec" onClick={() => setPicker(null)}>बंद करा</button></p>
            <MediaGrid onSelect={picked} />
          </div>
        </div>
      )}
      <div className="f"><label>मराठी शीर्षक *</label><input value={f.headline} onChange={(x) => set('headline', x.target.value)} /></div>
      <div className="f"><label>उपशीर्षक</label><input value={f.subtitle} onChange={(x) => set('subtitle', x.target.value)} /></div>
      <div className="row">
        <div className="f"><label>विभाग *</label>
          <select value={f.category_id} onChange={(x) => set('category_id', Number(x.target.value))}>
            <option value="">निवडा</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name_mr}</option>)}
          </select></div>
        <div className="f"><label>गाव / ठिकाण (ऐच्छिक)</label><input value={f.location_label} onChange={(x) => set('location_label', x.target.value)} /></div>
      </div>
      <div className="row">
        <div className="f"><label>लेखक / संपादकीय नाव *</label><input value={f.byline} onChange={(x) => set('byline', x.target.value)} /></div>
        <div className="f"><label>बातमीचा स्रोत *</label><input value={f.source} placeholder="उदा. स्वतःचे वार्ताहर, प्रसिद्धीपत्रक" onChange={(x) => set('source', x.target.value)} /></div>
      </div>
      <div className="f"><label>मुख्य छायाचित्र</label>
        {f.main_image_key && <img src={`/media/${f.main_image_key}`} alt="" style={{ maxWidth: 260, display: 'block', marginBottom: '.4rem' }} />}
        <button type="button" className="sec" onClick={() => setPicker('main')}>{f.main_image_key ? 'बदला' : 'छायाचित्र निवडा / अपलोड करा'}</button>
        {f.main_image_key && <button type="button" className="sec" style={{ marginLeft: '.5rem' }} onClick={() => set('main_image_key', '')}>काढा</button>}
      </div>
      <div className="f"><label>मुख्य छायाचित्र कॅप्शन</label><input value={f.main_image_caption} onChange={(x) => set('main_image_caption', x.target.value)} /></div>
      <div className="f"><label>छायाचित्र श्रेय</label><input value={f.image_credit} onChange={(x) => set('image_credit', x.target.value)} /></div>
      <div className="f"><label>मजकूर</label>
        <div className="toolbar">
          <Btn label="B" active={e?.isActive('bold')} on={() => e?.chain().focus().toggleBold().run()} />
          <Btn label="I" active={e?.isActive('italic')} on={() => e?.chain().focus().toggleItalic().run()} />
          <Btn label="U" active={e?.isActive('underline')} on={() => e?.chain().focus().toggleUnderline().run()} />
          <Btn label="मोठे उपशीर्षक" active={e?.isActive('heading', { level: 2 })} on={() => e?.chain().focus().toggleHeading({ level: 2 }).run()} />
          <Btn label="लहान उपशीर्षक" active={e?.isActive('heading', { level: 3 })} on={() => e?.chain().focus().toggleHeading({ level: 3 }).run()} />
          <Btn label="• यादी" active={e?.isActive('bulletList')} on={() => e?.chain().focus().toggleBulletList().run()} />
          <Btn label="१. यादी" active={e?.isActive('orderedList')} on={() => e?.chain().focus().toggleOrderedList().run()} />
          <Btn label="उद्धरण" active={e?.isActive('blockquote')} on={() => e?.chain().focus().toggleBlockquote().run()} />
          <Btn label="लिंक" active={e?.isActive('link')} on={() => {
            const url = window.prompt('लिंक (https://...)'); if (url === null) return;
            url ? e?.chain().focus().setLink({ href: url }).run() : e?.chain().focus().unsetLink().run(); }} />
          <Btn label="फोटो" on={() => setPicker('body')} />
          <Btn label="↶" on={() => e?.chain().focus().undo().run()} />
          <Btn label="↷" on={() => e?.chain().focus().redo().run()} />
        </div>
        <EditorContent editor={editor} />
      </div>
      <div className="row">
        <label className="chk"><input type="checkbox" checked={f.is_featured} onChange={(x) => set('is_featured', x.target.checked)} /> मुख्य बातमी (Featured)</label>
        <label className="chk"><input type="checkbox" checked={f.is_breaking} onChange={(x) => set('is_breaking', x.target.checked)} /> ताजी बातमी (Breaking)</label>
      </div>
      <div className="actions">
        <button type="button" disabled={busy} onClick={() => save('draft')} className="sec">ड्राफ्ट म्हणून जतन करा</button>
        <button type="button" disabled={busy} onClick={() => save('published')}>{f.status === 'published' ? 'अद्यतनित करा' : 'प्रकाशित करा'}</button>
        {id && f.status !== 'archived' && <button type="button" disabled={busy} onClick={() => save('archived')} className="sec">आर्काइव्ह</button>}
        {id && <button type="button" disabled={busy} onClick={remove} className="danger">हटवा</button>}
        <span role="status">{msg}</span>
      </div>
      {id && (
        <div className="f" style={{ marginTop: '1.5rem' }}>
          <label>सुधारणा जोडा (वाचकांना बातमीखाली दिसेल)</label>
          {corrections.map((c, i) => <p key={i} className="corr">{c.note}</p>)}
          <textarea rows={3} value={note} onChange={(x) => setNote(x.target.value)} />
          <button type="button" className="sec" onClick={addCorrection} disabled={!note.trim()}>सुधारणा प्रकाशित करा</button>
        </div>
      )}
    </div>
  );
}
