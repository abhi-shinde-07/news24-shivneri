import xss from 'xss';

// Allow-list for article HTML. Everything else (scripts, styles, event handlers) is removed.
const filter = new xss.FilterXSS({
  whiteList: {
    p: [], h2: [], h3: [], strong: [], b: [], em: [], i: [], u: [], ul: [], ol: [], li: [],
    blockquote: [], br: [], a: ['href', 'title'], figure: [], figcaption: [], img: ['src', 'alt'],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  // Images may only come from our own media route (Phase 6).
  safeAttrValue(tag, name, value, cssFilter) {
    if (tag === 'img' && name === 'src') return value.startsWith('/media/') ? xss.escapeAttrValue(value) : '';
    return xss.safeAttrValue(tag, name, value, cssFilter);
  },
});
export const sanitizeBody = (html: string) => filter.process(html);
