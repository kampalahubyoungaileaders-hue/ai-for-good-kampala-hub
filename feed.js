function escapeHtml(value=''){return String(value).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}

function cardMedia(item,type){
  if(!item.image) return '<div class="live-media live-media-placeholder" aria-hidden="true"></div>';
  const cls=type==='reports'?'report-cover':'feed-image';
  return `<div class="live-media ${cls}"><img src="${escapeHtml(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('live-media-placeholder');this.remove()"></div>`;
}

function renderFeed(container,items,type){
  if(!container)return;
  if(!Array.isArray(items)||!items.length){container.innerHTML='<p class="feed-empty">No items are available right now.</p>';return;}
  container.innerHTML=items.map(item=>{
    const meta=[item.date,item.type||item.source].filter(Boolean).join(' · ');
    const primaryLabel=type==='events'?'View event':type==='reports'?'Open / download report':'Read article';
    const sourceLink=item.sourcePage?`<a class="source-link" href="${escapeHtml(item.sourcePage)}" target="_blank" rel="noreferrer">View on AI for Good ↗</a>`:'';
    return `<article class="live-card live-card-media">
      ${cardMedia(item,type)}
      <div class="live-card-body">
        ${meta?`<p class="live-meta">${escapeHtml(meta)}</p>`:''}
        <h3>${escapeHtml(item.title)}</h3>
        ${item.excerpt?`<p class="live-excerpt">${escapeHtml(item.excerpt)}</p>`:''}
        <div class="live-actions"><a class="primary-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${primaryLabel} ↗</a>${sourceLink}</div>
      </div>
    </article>`;
  }).join('');
}

async function loadFeed(type,selector){
  const container=document.querySelector(selector);
  if(!container)return;
  container.setAttribute('aria-busy','true');
  try{
    const response=await fetch(`/.netlify/functions/aiforgood?type=${encodeURIComponent(type)}`,{headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error(`Feed ${response.status}`);
    const payload=await response.json();
    renderFeed(container,payload.items,type);
    const status=document.querySelector(`[data-feed-status="${type}"]`);
    if(status)status.textContent=payload.live?'Live from AI for Good · official order':'Showing recent AI for Good items';
  }catch(error){
    container.innerHTML='<p class="feed-empty">The AI for Good feed could not be loaded right now. Use the official source link below.</p>';
  }finally{container.removeAttribute('aria-busy');}
}

document.addEventListener('DOMContentLoaded',()=>{
  loadFeed('events','#aiforgood-events');
  loadFeed('posts','#aiforgood-posts');
  loadFeed('reports','#aiforgood-reports');
});
