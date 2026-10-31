const SOURCES = {
  events: 'https://aiforgood.itu.int/ai-events-calendar/',
  posts: 'https://aiforgood.itu.int/ai-for-good-blog/',
  reports: 'https://aiforgood.itu.int/newsroom/publications-and-reports/'
};

const FALLBACKS = {
  events: [
    { title: 'From trusted knowledge to accountable action', date: '29 October 2026', url: 'https://aiforgood.itu.int/event/from-trusted-knowledge-to-accountable-action/', source: 'AI for Good' },
    { title: 'Introducing the AI agents for RAN challenge: From diagnosis to optimization', date: '18 November 2026', url: 'https://aiforgood.itu.int/ai-events-calendar/', source: 'AI for Good' },
    { title: 'Robotics for Good Youth Challenge South Korea', date: '21 November 2026', url: 'https://aiforgood.itu.int/ai-events-calendar/', source: 'AI for Good' }
  ],
  posts: [
    { title: 'Capacity building, investment and collaboration: Turning AI standards into practice', date: '23 October 2026', url: 'https://aiforgood.itu.int/ai-for-good-blog/', source: 'AI for Good' },
    { title: 'For AI to do good, people must remain in control', date: '22 October 2026', url: 'https://aiforgood.itu.int/for-ai-to-do-good-people-must-remain-in-control/', source: 'AI for Good' },
    { title: 'Artificial intelligence skills for everyone', date: '19 October 2026', url: 'https://aiforgood.itu.int/ai-for-good-blog/', source: 'AI for Good' },
    { title: 'From open data to local impact', date: '7 October 2026', url: 'https://aiforgood.itu.int/ai-for-good-blog/', source: 'AI for Good' }
  ],
  reports: [
    { title: 'AI for Good Innovate for Impact Interim Report 2026', date: '2 October 2026', url: 'https://aiforgood.itu.int/newsroom/publications-and-reports/', source: 'AI for Good' },
    { title: 'From principles to practice: Standards for interoperable and inclusive AI', date: '18 September 2026', url: 'https://aiforgood.itu.int/newsroom/publications-and-reports/', source: 'AI for Good' },
    { title: 'AI in Education, Research and Skills Development Roundtable', date: '', url: 'https://aiforgood.itu.int/newsroom/publications-and-reports/', source: 'AI for Good' }
  ]
};

function stripTags(value = '') {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '–').replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8217;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href) {
  try { return new URL(href, 'https://aiforgood.itu.int').href; } catch { return ''; }
}

function nearbyDate(html, index) {
  const chunk = stripTags(html.slice(Math.max(0, index - 450), Math.min(html.length, index + 450)));
  const match = chunk.match(/\b(?:[0-3]?\d)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\b/i);
  return match ? match[0] : '';
}

function extractLinks(html, type) {
  const linkRe = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set();
  const items = [];
  let match;
  while ((match = linkRe.exec(html)) && items.length < 30) {
    const href = match[1];
    const title = stripTags(match[2]);
    if (!title || title.length < 12 || title.length > 180) continue;
    const url = absoluteUrl(href);
    if (!url || !url.includes('aiforgood.itu.int')) continue;

    let valid = false;
    if (type === 'events') valid = /\/event\//i.test(url);
    if (type === 'posts') valid = !/\/event\//i.test(url) && !/ai-for-good-blog\/?$/i.test(url) && /aiforgood\.itu\.int\//i.test(url);
    if (type === 'reports') valid = /publications-and-reports|report|publication|download/i.test(url + ' ' + title);
    if (!valid) continue;

    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ title, date: nearbyDate(html, match.index), url, source: 'AI for Good' });
  }

  if (type === 'posts') {
    return items.filter(item => !/^(view all|read more|latest|newsroom|blog)$/i.test(item.title)).slice(0, 8);
  }
  return items.slice(0, 8);
}

exports.handler = async (event) => {
  const type = event.queryStringParameters?.type || 'posts';
  if (!SOURCES[type]) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unsupported feed type' }) };
  }

  try {
    const response = await fetch(SOURCES[type], {
      headers: {
        'User-Agent': 'AI-for-Good-Kampala-Hub/1.0 (+https://aiforgood.itu.int/)'
      }
    });
    if (!response.ok) throw new Error(`Upstream ${response.status}`);
    const html = await response.text();
    const items = extractLinks(html, type);
    const payload = items.length >= 2 ? items : FALLBACKS[type];
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ type, live: items.length >= 2, source: SOURCES[type], updatedAt: new Date().toISOString(), items: payload })
    };
  } catch (error) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=900' },
      body: JSON.stringify({ type, live: false, source: SOURCES[type], updatedAt: new Date().toISOString(), items: FALLBACKS[type], warning: error.message })
    };
  }
};
