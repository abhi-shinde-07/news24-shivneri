"""Turns NEWS24 SHIVNERI YouTube videos into portal articles + video entries (SQL file).

Usage:  python scripts/youtube-import.py <out.sql> <videoId> [<videoId> ...]
Then:   npx wrangler d1 execute news24-db --remote --file=<out.sql>

Each article: video title as headline, the channel's own description (cleaned) as text, exact upload time,
place from the description, category guessed from keywords. Re-running is safe (existing slugs/videos are skipped).
"""
import html, json, re, sys, urllib.request
from datetime import datetime, timezone

# Sensitive cases (sexual violence against a child, suicide) are imported as drafts for the editor to review.
DRAFT = {'13RA4fLHrn0', 'VuMGGoW7Iz8', 'pJSMAB8dFvo', 'OACvtra_0Hw', 'OqTJX8Emz9o', 'cW0nOuV-q9k', 'dtSujgND1I8'}

CATEGORIES = [  # first match wins; checked against title + description
    ('crime', r'पोलीस|पोलिस|चोरी|चोरट|अटक|गुन्ह|अपघात|दरोड|गांजा|गुटखा|छापा|जप्त|पिस्टल|आग |आगीत|आग!|अत्याचार|खून|फसवणूक|गंडा|ट्रकला आग'),
    ('agriculture', r'शेतकरी|शेती|गाय बाजार|गायींच|कांदा|वाटाणा|ऊस|चारा|दूध|पशुपाल|पीक'),
    ('politics', r'आमदार|खासदार|निवडणूक|सरपंच|उपसरपंच|ग्रामसभा|पक्ष|मनसे|भाजप|शिवसेना|राष्ट्रवादी|आंदोलन|उपोषण|निवेदन|रास्ता रोको|रस्ता रोको|तहसील'),
    ('education', r'शाळा|विद्यार्थी|विद्यालय|महाविद्यालय|शिक्षण|कॉलेज'),
    ('business', r'सोसायटी|पतसंस्था|बँक|व्यवसाय|बाजारभाव|दर कोसळ'),
    ('sports', r'क्रिकेट|स्पर्धा|कुस्ती|खेळ'),
    ('entertainment', r'चित्रपट|मुलाखत|गाणे|कलाकार'),
]
# Where the keyword guess is wrong (checked by hand for the first import).
CATEGORY_OVERRIDE = {
    'f0HH48gNx8c': 'entertainment', 'Oo5SWBJuAfI': 'social', 'bkv8X8hzBxk': 'social', 'FH_73ucLmQ0': 'social',
    '5X9NmMOgnGA': 'social', 'Yr6C0mRCIYk': 'social', '-Dma_EA9AjU': 'social', 'C38VP6dS9uc': 'social',
    '13RA4fLHrn0': 'crime', 'dElkumlS0Xk': 'social', 'SuvabEbepiE': 'social',
}
PLACES = ['आळेफाटा', 'आळेखिंड', 'वडगाव आनंद', 'वडगाव कांदळी', 'पिंपळवंडी', 'पिंपरी पेंढार', 'राजुरी', 'उंब्रज', 'ओतूर',
          'बेल्हे', 'नारायणगाव', 'माळवाडी', 'आळे', 'जुन्नर']
PROMO = re.compile(r'(?i)like|share|subscribe|सबस्क्राइब|कमेंट|comment|bell|चॅनेल|channel|संपर्क\s*:|\d{10}|news\s*24|शिवनेरी ला|पाहा संपूर्ण|व्हिडिओ शेवटपर्यंत|व्हिडिओ आवडल्यास|जोडलेले रहा|जोडलेले राहा')
EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿️‍⭐⬆↔-⇿⤴⤵]+')
BULLET = re.compile(r'^\s*([\U0001F000-\U0001FAFF☀-➿️]+|[-•*]|\d+[.)])\s*')

def fetch(vid):
    req = urllib.request.Request(f'https://www.youtube.com/watch?v={vid}', headers={'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'mr,en'})
    h = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', 'replace')
    desc = json.loads('"' + re.search(r'"shortDescription":"((?:[^"\\]|\\.)*)"', h).group(1) + '"')
    title = json.loads('"' + re.search(r'"title":"((?:[^"\\]|\\.)*)","lengthSeconds"', h).group(1) + '"')
    date = re.search(r'"publishDate":"([^"]+)"', h).group(1)
    return title, desc, date

def clean(text):
    return re.sub(r'\s+', ' ', EMOJI.sub('', text.replace('**', ''))).strip(' |–-')

def to_html(title, desc):
    """Returns (body_html, location)."""
    location = None
    blocks, cur = [], []
    for raw in desc.split('\n'):
        line = raw.strip()
        if not line:
            if cur: blocks.append(cur); cur = []
            continue
        if line.startswith('#') or PROMO.search(line): continue
        if line.startswith('📍'):
            if not location:
                location = clean(line.split(':', 1)[-1] if ':' in line else line)[:100] or None
            continue
        cur.append(line)
    if cur: blocks.append(cur)
    t_norm = clean(title).strip('"“”')
    out = []
    for b in blocks:
        bullets = [l for l in b if BULLET.match(l) and len(b) > 1 and not clean(l).endswith(':')]  # 'पाहा:' lines head the list
        if len(bullets) >= 2 and len(bullets) >= len(b) - 1:
            head = [clean(l) for l in b if l not in bullets]
            items = [clean(BULLET.sub('', l)) for l in bullets]
            if head: out.append(f'<p><strong>{html.escape(head[0])}</strong></p>')
            out.append('<ul>' + ''.join(f'<li>{html.escape(i)}</li>' for i in items if i) + '</ul>')
            continue
        para = clean(' '.join(b))
        if not para or para.strip('"“”!') == t_norm.strip('!'): continue  # skip a repeat of the headline
        if len(para) < 90 and para.endswith(('!', '?')) and not out:  # short teaser line before the story
            continue
        out.append(f'<p>{html.escape(para)}</p>')
    return '\n'.join(out), location

def place_of(title, desc, loc):
    if 'आळेफाट' in title: return 'आळेफाटा'  # आळेफाट्यात / आळेफाट्याचे etc. (not the village आळे)
    for p in PLACES:
        if p in title: return p
    if loc and any(p in loc for p in PLACES): return loc.split('|')[0].split(',')[0].strip()[:60]
    if 'आळेफाट' in desc: return 'आळेफाटा'
    for p in PLACES:
        if p in desc: return p
    return None

def category_of(text):
    for slug, pat in CATEGORIES:
        if re.search(pat, text): return slug
    return 'social'

q = lambda s: "NULL" if s is None else "'" + str(s).replace("'", "''") + "'"

def main():
    sys.stdout.reconfigure(encoding="utf-8")
    out_path, ids = sys.argv[1], sys.argv[2:]
    rows = []
    for vid in ids:
        try:
            title, desc, date = fetch(vid)
        except Exception as e:
            print('skip', vid, e); continue
        body, loc = to_html(title, desc)
        if not body: body = f'<p>{html.escape(clean(title))}</p>'
        published = datetime.fromisoformat(date).astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        headline = clean(title).strip('"“”')
        if headline.count('”') > headline.count('“'): headline = '“' + headline  # keep quotes balanced
        rows.append(dict(id=vid, headline=headline, body=body, place=place_of(title, desc, loc),
                         cat=CATEGORY_OVERRIDE.get(vid) or category_of(title + ' ' + desc), published=published,
                         status='draft' if vid in DRAFT else 'published'))
        print(f"{vid} {rows[-1]['status']:9} {rows[-1]['cat']:13} {rows[-1]['place']} | {headline[:50]}")
    rows.sort(key=lambda r: r['published'], reverse=True)
    lead = next((r['id'] for r in rows if r['status'] == 'published'), None)
    sql = ['-- Generated by scripts/youtube-import.py from the NEWS24 SHIVNERI YouTube channel.']
    for r in rows:
        pub = r['status'] == 'published'
        sql.append(
            "INSERT INTO articles (slug, headline, subtitle, body_html, category_id, location_label, byline, source, youtube_id, "
            "is_featured, is_breaking, status, published_at, created_at, updated_at) VALUES ("
            f"{q('yt-' + r['id'])}, {q(r['headline'])}, NULL, {q(r['body'])}, "
            f"(SELECT id FROM categories WHERE slug = {q(r['cat'])}), {q(r['place'])}, 'NEWS24 SHIVNERI प्रतिनिधी', "
            f"'NEWS24 SHIVNERI (व्हिडिओ वृत्त)', {q(r['id'])}, {1 if r['id'] == lead else 0}, 0, {q(r['status'])}, "
            f"{q(r['published']) if pub else 'NULL'}, {q(r['published'])}, {q(r['published'])}) ON CONFLICT(slug) DO NOTHING;")
    featured = [r['id'] for r in rows if r['status'] == 'published'][:4]
    for r in rows:
        sql.append(
            "INSERT INTO videos (youtube_id, title, description, is_featured, status, published_at) VALUES ("
            f"{q(r['id'])}, {q(r['headline'])}, NULL, {1 if r['id'] in featured else 0}, "
            f"{q('published' if r['status'] == 'published' else 'draft')}, {q(r['published'])}) ON CONFLICT(youtube_id) DO NOTHING;")
    open(out_path, 'w', encoding='utf-8').write('\n'.join(sql) + '\n')
    print(f'{len(rows)} videos -> {out_path} ({sum(r["status"] == "draft" for r in rows)} drafts)')

if __name__ == '__main__':
    main()
