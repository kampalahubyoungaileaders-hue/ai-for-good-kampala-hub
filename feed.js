function escapeHtml(value=''){return String(value).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}

function renderFeed(container, items, type){
  if(!container) return;
  if(!Array.isArray(items)||!items.length){container.innerHTML='<p class="feed-empty">No items are available right now.</p>';return;}
  container.innerHTML=items.map(item=>{
    const meta=[item.date,item.source].filter(Boolean).join(' · ');
    const label=type==='events'?'View event':type==='reports'?'Open report':'Read story';
    return `<article class="live-card"><div>${meta?`<p class="live-meta">${escapeHtml(meta)}</p>`:''}<h3>${escapeHtml(item.title)}</h3></div><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${label} ↗</a></article>`;
  }).join('');
}

async function loadFeed(type, selector){
  const container=document.querySelector(selector);
  if(!container) return;
  container.setAttribute('aria-busy','true');
  try{
    const response=await fetch(`/.netlify/functions/aiforgood?type=${encodeURIComponent(type)}`,{headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error(`Feed ${response.status}`);
    const payload=await response.json();
    renderFeed(container,payload.items,type);
    const status=document.querySelector(`[data-feed-status="${type}"]`);
    if(status) status.textContent=payload.live?'Live from AI for Good':'Showing cached AI for Good items';
  }catch(error){
    container.innerHTML='<p class="feed-empty">The AI for Good feed could not be loaded right now. Use the official source link below.</p>';
  }finally{container.removeAttribute('aria-busy');}
}

document.addEventListener('DOMContentLoaded',()=>{
  loadFeed('events','#aiforgood-events');
  loadFeed('posts','#aiforgood-posts');
  loadFeed('reports','#aiforgood-reports');
});
