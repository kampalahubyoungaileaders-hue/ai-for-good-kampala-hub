function escapeHtml(value=''){return String(value).replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}

function cardMedia(item){
  if(!item.image) return '<div class="live-media live-media-placeholder" aria-hidden="true"></div>';
  return `<div class="live-media report-cover"><img src="${escapeHtml(item.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.classList.add('live-media-placeholder');this.remove()"></div>`;
}

function renderReports(container,items){
  if(!container)return;
  if(!Array.isArray(items)||!items.length){container.innerHTML='<p class="feed-empty">No reports are available right now.</p>';return;}
  container.innerHTML=items.map(item=>{
    const meta=[item.date,item.type||item.source].filter(Boolean).join(' · ');
    const sourceLink=item.sourcePage?`<a class="source-link" href="${escapeHtml(item.sourcePage)}" target="_blank" rel="noreferrer">View on AI for Good ↗</a>`:'';
    return `<article class="live-card live-card-media">${cardMedia(item)}<div class="live-card-body">${meta?`<p class="live-meta">${escapeHtml(meta)}</p>`:''}<h3>${escapeHtml(item.title)}</h3>${item.excerpt?`<p class="live-excerpt">${escapeHtml(item.excerpt)}</p>`:''}<div class="live-actions"><a class="primary-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">Open / download report ↗</a>${sourceLink}</div></div></article>`;
  }).join('');
}

async function fetchReports(){
  const endpoints=['/api/aiforgood?type=reports','/.netlify/functions/aiforgood?type=reports'];
  let lastError;
  for(const endpoint of endpoints){
    try{
      const response=await fetch(endpoint,{headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(`Feed ${response.status}`);
      return await response.json();
    }catch(error){lastError=error;}
  }
  throw lastError||new Error('Reports feed unavailable');
}

async function loadReports(){
  const container=document.querySelector('#aiforgood-reports');
  if(!container)return;
  container.setAttribute('aria-busy','true');
  try{
    const payload=await fetchReports();
    renderReports(container,payload.items);
    const status=document.querySelector('[data-feed-status="reports"]');
    if(status)status.textContent=payload.live?'Live from AI for Good · official order':'Showing recent AI for Good reports';
  }catch(error){
    container.innerHTML='<p class="feed-empty">The AI for Good reports feed could not be loaded right now.</p>';
  }finally{container.removeAttribute('aria-busy');}
}

document.addEventListener('DOMContentLoaded',loadReports);
