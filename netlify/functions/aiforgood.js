const SOURCES = {
  events: 'https://aiforgood.itu.int/ai-events-calendar/',
  posts: 'https://aiforgood.itu.int/ai-for-good-blog/',
  reports: 'https://aiforgood.itu.int/newsroom/publications-and-reports/'
};

const FALLBACKS = {
  events: [],
  posts: [],
  reports: [
    { title: 'AI for Good Innovate for Impact Interim Report 2026', date: '2 October 2026', url: 'https://aiforgood.itu.int/newsroom/publications-and-reports/', sourcePage: SOURCES.reports, source: 'AI for Good', type: 'Report' },
    { title: 'From principles to practice: Standards for interoperable and inclusive AI', date: '18 September 2026', url: 'https://aiforgood.itu.int/newsroom/publications-and-reports/', sourcePage: SOURCES.reports, source: 'AI for Good', type: 'Report' },
    { title: 'AI in Education, Research and Skills Development Roundtable', date: '', url: 'https://aiforgood.itu.int/newsroom/publications-and-reports/', sourcePage: SOURCES.reports, source: 'AI for Good', type: 'Report' }
  ]
};

function decode(value = '') {
  return value
    .replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8217;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(value = '') {
  return decode(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href) {
  try { return new URL(decode(href), 'https://aiforgood.itu.int').href; } catch { return ''; }
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return m ? m[1] : '';
}

function extractImage(fragment = '') {
  const imgs = [...fragment.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
  for (let i = imgs.length - 1; i >= 0; i--) {
    const tag = imgs[i];
    const raw = attr(tag, 'data-lazy-src') || attr(tag, 'data-src') || attr(tag, 'src') || attr(tag, 'srcset').split(/\s+/)[0];
    const url = absoluteUrl(raw);
    if (!url) continue;
    if (/icon|logo|avatar|spinner|search|filter/i.test(url)) continue;
    return url;
  }
  return '';
}

function nearbyDate(fragment = '') {
  const text = stripTags(fragment);
  const m = text.match(/\b(?:[0-3]?\d)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\b/i);
  return m ? m[0] : '';
}

function nearestHeading(fragment = '') {
  const matches = [...fragment.matchAll(/<h[2-5]\b[^>]*>([\s\S]*?)<\/h[2-5]>/gi)];
  if (!matches.length) return '';
  return stripTags(matches[matches.length - 1][1]);
}

function nearestParagraph(fragment = '') {
  const matches = [...fragment.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
  for (let i = matches.length - 1; i >= 0; i--) {
    const text = stripTags(matches[i][1]);
    if (text.length > 40 && text.length < 700) return text;
  }
  return '';
}

function extractReports(html) {
  const downloadRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?Download\s+Report[\s\S]*?)<\/a>/gi;
  const items = [];
  const seen = new Set();
  let match;
  while ((match = downloadRe.exec(html)) && items.length < 12) {
    const before = html.slice(Math.max(0, match.index - 5000), match.index);
    const title = nearestHeading(before);
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    const card = before.slice(Math.max(0, before.lastIndexOf('<article')));
    const context = card.length > 300 ? card : before.slice(-3200);
    items.push({
      title,
      date: nearbyDate(context),
      excerpt: nearestParagraph(context),
      image: extractImage(context),
      url: absoluteUrl(match[1]),
      sourcePage: SOURCES.reports,
      source: 'AI for Good',
      type: 'Report'
    });
  }
  return items;
}

function extractLinkedCards(html, type) {
  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const items = [];
  const seen = new Set();
  let match;
  while ((match = linkRe.exec(html)) && items.length < 16) {
    const url = absoluteUrl(match[1]);
    if (!url || !url.includes('aiforgood.itu.int')) continue;
    if (type === 'events' && !/\/event\//i.test(url)) continue;
    if (type === 'posts' && (/\/event\//i.test(url) || /ai-for-good-blog\/?(?:\?|$)/i.test(url))) continue;

    const inner = match[2];
    const around = html.slice(Math.max(0, match.index - 1400), Math.min(html.length, match.index + inner.length + 1600));
    let title = nearestHeading(inner) || stripTags(inner);
    if (!title || title.length < 12 || title.length > 190) title = nearestHeading(around);
    if (!title || title.length < 12 || title.length > 190) continue;
    if (/^(read more|view all|learn more|register|watch replay|latest from blog)$/i.test(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      title,
      date: nearbyDate(around),
      excerpt: nearestParagraph(around),
      image: extractImage(inner) || extractImage(around),
      url,
      sourcePage: SOURCES[type],
      source: 'AI for Good',
      type: type === 'events' ? 'Event' : 'Article'
    });
  }
  return items;
}

function extractItems(html, type) {
  if (type === 'reports') return extractReports(html);
  return extractLinkedCards(html, type);
}

exports.handler = async (event) => {
  const type = event.queryStringParameters?.type || 'posts';
  if (!SOURCES[type]) return { statusCode: 400, body: JSON.stringify({ error: 'Unsupported feed type' }) };

  try {
    const response = await fetch(SOURCES[type], { headers: { 'User-Agent': 'AI-for-Good-Kampala-Hub/1.1 (+https://aiforgood.itu.int/)' } });
    if (!response.ok) throw new Error(`Upstream ${response.status}`);
    const html = await response.text();
    const items = extractItems(html, type);
    const payload = items.length ? items : FALLBACKS[type];
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ type, live: items.length > 0, source: SOURCES[type], updatedAt: new Date().toISOString(), items: payload })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=900' },
      body: JSON.stringify({ type, live: false, source: SOURCES[type], updatedAt: new Date().toISOString(), items: FALLBACKS[type], warning: error.message })
    };
  }
};
