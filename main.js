(() => {
  if (!document.querySelector('link[href="pages.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'pages.css';
    document.head.appendChild(link);
  }
})();

let members = window.KAMPALA_MEMBERS || [];

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function safePhoto(value) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^assets\//i.test(value)) return value;
  return '';
}

function portrait(person, className = 'portrait') {
  const photo = safePhoto(person.photo);
  if (photo) {
    return `<img class="${className}" src="${photo}" alt="Portrait of ${person.name}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${className} portrait-fallback',textContent:'${initials(person.name)}'}))">`;
  }
  return `<span class="${className} portrait-fallback" aria-hidden="true">${initials(person.name)}</span>`;
}

function normalizeMember(row) {
  return {
    name: row.name,
    slug: row.slug,
    role: row.role || 'Member',
    profession: row.profession || '',
    organization: row.organization || '',
    photo: safePhoto(row.photo_path),
    profile: row.profile_url || '',
    bio: row.bio || ''
  };
}

async function loadMembers() {
  const cfg = window.KAMPALA_CONFIG;
  if (!cfg?.supabaseUrl || !cfg?.supabasePublishableKey) return members;
  try {
    const response = await fetch(`${cfg.supabaseUrl}/rest/v1/members?select=*&is_active=eq.true&order=sort_order.asc`, {
      headers: { apikey: cfg.supabasePublishableKey }
    });
    if (!response.ok) throw new Error(`Supabase returned ${response.status}`);
    const rows = await response.json();
    if (Array.isArray(rows) && rows.length) members = rows.map(normalizeMember);
  } catch (error) {
    console.warn('Using bundled member directory fallback.', error);
  }
  return members;
}

function personCard(person) {
  const summary = person.profession || 'Kampala Hub member';
  return `<article class="person-card">
    <a class="portrait-wrap" href="profile.html?member=${person.slug}" aria-label="View ${person.name}'s profile">${portrait(person)}</a>
    <div class="person-copy"><span class="role-chip">${person.role}</span><h3><a href="profile.html?member=${person.slug}">${person.name}</a></h3><p>${summary}${person.organization ? ` · ${person.organization}` : ''}</p><a class="arrow-link" href="profile.html?member=${person.slug}">View profile <span>↗</span></a></div>
  </article>`;
}

function renderLeadership() {
  const leadership = document.querySelector('#leadership-grid');
  if (leadership) leadership.innerHTML = members.filter(person => person.role !== 'Member').map(personCard).join('');
}

function renderDirectory() {
  const directory = document.querySelector('#member-directory');
  const search = document.querySelector('#member-search');
  const filter = document.querySelector('#member-filter');
  if (!directory) return;
  const render = () => {
    const term = (search?.value || '').trim().toLowerCase();
    const role = filter?.value || 'all';
    const filtered = members.filter(person => {
      const haystack = [person.name, person.role, person.profession, person.organization].filter(Boolean).join(' ').toLowerCase();
      return (!term || haystack.includes(term)) && (role === 'all' || person.role === role);
    });
    directory.innerHTML = filtered.map(personCard).join('') || '<p class="directory-empty">No matching members found.</p>';
  };
  search?.addEventListener('input', render);
  filter?.addEventListener('change', render);
  render();
}

function renderProfile() {
  const profileRoot = document.querySelector('#member-profile');
  if (!profileRoot) return;
  const slug = new URLSearchParams(location.search).get('member');
  const person = members.find(item => item.slug === slug);
  if (!person) {
    profileRoot.innerHTML = `<section class="profile-missing"><p class="eyebrow dark">Member directory</p><h1>Profile not found.</h1><p>This link may be incomplete or the member record may have changed.</p><a class="button dark" href="members.html">Return to members</a></section>`;
    return;
  }
  const bio = person.bio || `${person.name} is listed with the AI for Good Young AI Leaders Kampala Hub.`;
  profileRoot.innerHTML = `<section class="profile-hero">
      <div class="profile-visual">${portrait(person, 'profile-portrait')}<div class="ring-mark"></div></div>
      <div class="profile-content"><p class="eyebrow dark">${person.role} · Kampala Hub</p><h1>${person.name}</h1><p class="profile-title">${person.profession || 'AI for Good Young AI Leaders Community member'}${person.organization ? `<br><span>${person.organization}</span>` : ''}</p><p class="profile-bio">${bio}</p><div class="profile-actions">${person.profile ? `<a class="button dark" href="${person.profile}" target="_blank" rel="noreferrer">Official AI for Good profile ↗</a>` : ''}<a class="button outline" href="members.html">All members</a></div><p class="source-note">Profile details are maintained for the Kampala Hub and linked to official AI for Good profiles where available.</p></div>
    </section>`;
}

function initNav() {
  const button = document.querySelector('.menu-button');
  const nav = document.querySelector('#site-nav');
  button?.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    nav?.classList.toggle('open', !open);
  });
  document.querySelectorAll('.current-year').forEach(el => el.textContent = new Date().getFullYear());
}

(async function init() {
  initNav();
  await loadMembers();
  renderLeadership();
  renderDirectory();
  renderProfile();
})();
