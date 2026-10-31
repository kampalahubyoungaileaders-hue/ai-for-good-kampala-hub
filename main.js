(() => {
  if (!document.querySelector('link[href="responsive-fixes.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'responsive-fixes.css';
    document.head.appendChild(link);
  }
})();

function hydrateBrandLogos() {
  document.querySelectorAll('.brand-mark').forEach(mark => {
    const img = document.createElement('img');
    img.src = 'assets/kampala-hub-logo.png';
    img.alt = 'Young AI Leaders Community Kampala Hub';
    img.className = 'brand-logo';
    mark.replaceWith(img);
  });
}

function renderSiteFooter() {
  const footer = document.querySelector('footer');
  if (!footer) return;
  footer.className = 'site-footer';
  footer.innerHTML = `
    <div class="footer-motif" aria-hidden="true">A</div>
    <div class="footer-inner">
      <section class="footer-topline">
        <div class="footer-lead">
          <p class="eyebrow">Young AI Leaders Community · Kampala</p>
          <h2>Build with us.</h2>
          <p>Learn, collaborate and help shape responsible AI for local impact.</p>
        </div>
        <div class="footer-contact-strip">
          <div>
            <span class="footer-contact-label">Kampala Hub</span>
            <a href="mailto:kampalahub.youngaileaders@gmail.com">kampalahub.youngaileaders@gmail.com</a>
          </div>
          <a class="footer-cta" href="contact.html">Contact the Hub</a>
        </div>
      </section>

      <section class="footer-links-grid footer-links-grid-simple">
        <div class="footer-column">
          <h3>Kampala Hub</h3>
          <a href="our-work.html">Our work</a>
          <a href="events.html">Events</a>
          <a href="members.html">Community</a>
          <a href="insights.html">Insights</a>
          <a href="reports.html">Reports & resources</a>
        </div>
        <div class="footer-column">
          <h3>AI for Good</h3>
          <a href="https://aiforgood.itu.int/" target="_blank" rel="noreferrer">AI for Good ↗</a>
          <a href="https://aiforgood.itu.int/young-ai-leaders-community/" target="_blank" rel="noreferrer">Young AI Leaders Community ↗</a>
          <a href="https://aiforgood.itu.int/ai-events-calendar/" target="_blank" rel="noreferrer">Global events calendar ↗</a>
          <a href="https://aiforgood.itu.int/newsroom/publications-and-reports/" target="_blank" rel="noreferrer">Publications & reports ↗</a>
        </div>
      </section>

      <section class="footer-bottom">
        <div class="footer-identity">
          <img src="assets/kampala-hub-logo.png" alt="Young AI Leaders Community Kampala Hub">
          <span>Kampala, Uganda</span>
        </div>
        <div class="footer-bottom-links">
          <span>© <span class="current-year"></span> Kampala Hub</span>
        </div>
      </section>
    </div>`;
}

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
      <div class="profile-visual">${portrait(person, 'profile-portrait')}</div>
      <div class="profile-content"><p class="eyebrow dark">${person.role} · Kampala Hub</p><h1>${person.name}</h1><p class="profile-title">${person.profession || 'AI for Good Young AI Leaders Community member'}${person.organization ? `<br><span>${person.organization}</span>` : ''}</p><p class="profile-bio">${bio}</p><div class="profile-actions">${person.profile ? `<a class="button dark" href="${person.profile}" target="_blank" rel="noreferrer">Official AI for Good profile ↗</a>` : ''}<a class="button outline" href="members.html">All members</a></div><p class="source-note">Profile details are maintained for the Kampala Hub and linked to official AI for Good profiles where available.</p></div>
    </section>`;
}

function ensurePrimaryNavLinks() {
  document.querySelectorAll('.site-nav').forEach(nav => {
    const insights = nav.querySelector('a[href="insights.html"]');
    const navCta = nav.querySelector('.nav-cta');

    if (!nav.querySelector('a[href="reports.html"]')) {
      const reports = document.createElement('a');
      reports.href = 'reports.html';
      reports.textContent = 'Reports';
      if (location.pathname.endsWith('reports.html')) reports.setAttribute('aria-current', 'page');
      if (insights) insights.insertAdjacentElement('afterend', reports);
      else if (navCta) nav.insertBefore(reports, navCta);
      else nav.appendChild(reports);
    }

    if (!nav.querySelector('a[href="contact.html"]')) {
      const contact = document.createElement('a');
      contact.href = 'contact.html';
      contact.textContent = 'Contact';
      if (location.pathname.endsWith('contact.html')) contact.setAttribute('aria-current', 'page');
      if (navCta) nav.insertBefore(contact, navCta);
      else nav.appendChild(contact);
    }
  });
}

function initNav() {
  hydrateBrandLogos();
  renderSiteFooter();
  ensurePrimaryNavLinks();
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
