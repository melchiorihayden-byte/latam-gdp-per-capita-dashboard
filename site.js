const DATA_FILE = 'data.csv';
const DEFAULT_START = 2000;
const DEFAULT_END = 2023;
const $ = (id) => document.getElementById(id);
const money = (x, digits = 0) => x == null || !Number.isFinite(x) ? '—' : '$' + x.toLocaleString('en-US', {maximumFractionDigits:digits, minimumFractionDigits:digits});
const pct = (x, digits = 1) => x == null || !Number.isFinite(x) ? '—' : `${x.toLocaleString('en-US',{maximumFractionDigits:digits,minimumFractionDigits:digits})}%`;

function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted && c === '"' && text[i+1] === '"') { field += '"'; i++; }
    else if (c === '"') quoted = !quoted;
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i+1] === '\n') i++; row.push(field); if (row.some(v=>v!=='')) rows.push(row); row=[]; field=''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map(x=>x.replace(/^\uFEFF/,''));
  return rows.map(r => Object.fromEntries(headers.map((h,i)=>[h,r[i]]))).map(r=>({country:r.country,iso3:r.iso3,year:+r.year,value:+r.gdp_per_capita_constant_2015_usd})).filter(r=>r.country && r.iso3 && Number.isFinite(r.value));
}

function analyze(rows, start, end, selected) {
  const codes = selected && selected.size ? selected : null;
  const group = new Map();
  for (const r of rows) if (r.year >= start && r.year <= end && (!codes || codes.has(r.iso3))) {
    if (!group.has(r.iso3)) group.set(r.iso3,{country:r.country,years:new Map()});
    group.get(r.iso3).years.set(r.year,r.value);
  }
  const paired=[];
  for (const [iso3,g] of group) if (g.years.has(start) && g.years.has(end)) {
    const a=g.years.get(start),b=g.years.get(end);
    paired.push({iso3,country:g.country,start:a,end:b,changePct:(b/a-1)*100,changeUsd:b-a,years:g.years});
  }
  paired.sort((a,b)=>b.changePct-a.changePct);
  const mean = key => paired.reduce((s,r)=>s+r[key],0)/(paired.length||1);
  const startMean=paired.length?mean('start'):null, endMean=paired.length?mean('end'):null;
  const series=[];
  for(let year=start;year<=end;year++) { const vals=paired.map(r=>r.years.get(year)).filter(Number.isFinite); series.push({year,mean:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,n:vals.length}); }
  return {start,end,paired,series,n:paired.length,startMean,endMean,changePct:paired.length?(endMean/startMean-1)*100:null,gainers:paired.filter(r=>r.end>r.start).length};
}

function svgBar(el, items, unit='%') {
  if(!items.length){el.innerHTML='<div class="no-data">No countries have observations at both selected endpoints.</div>';return;}
  const W=820,rowH=29,H=Math.max(100,items.length*rowH+24),left=220,right=70,plot=W-left-right;
  const lo=Math.min(0,...items.map(d=>d.value)),hi=Math.max(0,...items.map(d=>d.value)); const span=hi-lo||1;
  const x=v=>left+(v-lo)/span*plot, zero=x(0);
  const bars=items.map((d,i)=>{const y=12+i*rowH,w=Math.abs(x(d.value)-zero), bx=Math.min(zero,x(d.value)), cls=d.value<0?'bar neg':'bar';return `<text x="${left-9}" y="${y+17}" text-anchor="end">${esc(d.label)}</text><rect class="${cls}" x="${bx}" y="${y+2}" width="${Math.max(1,w)}" height="17" rx="4"/><text x="${d.value>=0?Math.min(W-2,x(d.value)+7):Math.max(left,x(d.value)-7)}" y="${y+16}" text-anchor="${d.value>=0?'start':'end'}">${d.value.toFixed(1)}${unit}</text>`}).join('');
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Country percentage changes"><line class="axis" x1="${zero}" x2="${zero}" y1="6" y2="${H-4}"/>${bars}</svg>`;
}

function svgLine(el, series) {
  const valid=series.filter(d=>d.mean!=null); if(!valid.length){el.innerHTML='<div class="no-data">No annual observations for this selection.</div>';return;}
  const W=820,H=280,L=64,R=24,T=18,B=36,PW=W-L-R,PH=H-T-B,min=Math.min(...valid.map(d=>d.mean)),max=Math.max(...valid.map(d=>d.mean)),pad=(max-min)*.12||1;
  const ymin=min-pad,ymax=max+pad,x=d=>L+(d.year-series[0].year)/(series[series.length-1].year-series[0].year||1)*PW,y=v=>T+(ymax-v)/(ymax-ymin)*PH;
  const pts=valid.map(d=>`${x(d)} ${y(d.mean)}`).join(' '); const grid=[0,1,2,3].map(i=>{const v=ymin+(ymax-ymin)*i/3,yy=y(v);return `<line class="grid" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text x="${L-8}" y="${yy+4}" text-anchor="end">${(v/1000).toFixed(0)}k</text>`}).join('');
  const marks=valid.filter((d,i)=>i%Math.max(1,Math.floor(valid.length/7))===0||d.year===valid.at(-1).year).map(d=>`<circle class="dot" cx="${x(d)}" cy="${y(d.mean)}" r="4"><title>${d.year}: ${money(d.mean)} across ${d.n} matched countries</title></circle>`).join('');
  const years=[series[0].year,Math.round((series[0].year+series.at(-1).year)/2),series.at(-1).year].map(yr=>`<text x="${x({year:yr})}" y="${H-8}" text-anchor="middle">${yr}</text>`).join('');
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Annual mean real GDP per capita"><text x="4" y="12">US$ thousands</text>${grid}<polyline class="line" points="${pts}"/>${marks}${years}</svg>`;
}

function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function metricsHTML(a){return `<div class="metric"><div class="label">${a.start} mean GDP per capita</div><div class="value">${money(a.startMean)}</div><div class="note">Matched countries, constant 2015 US$</div></div><div class="metric"><div class="label">${a.end} mean GDP per capita</div><div class="value">${money(a.endMean)}</div><div class="note">Same matched country set</div></div><div class="metric"><div class="label">Change in equal-country mean</div><div class="value">${pct(a.changePct,2)}</div><div class="note">End mean ÷ start mean − 1</div></div><div class="metric"><div class="label">Countries with an increase</div><div class="value">${a.n?a.gainers+' / '+a.n:'—'}</div><div class="note">End value greater than start value</div></div>`;}

async function startApp(){
  const target=$('app-status');
  try{
    const response=await fetch(DATA_FILE); if(!response.ok) throw new Error(`Could not load ${DATA_FILE} (${response.status})`);
    const rows=parseCSV(await response.text());
    const allYears=[...new Set(rows.map(r=>r.year))].sort((a,b)=>a-b),allCodes=[...new Set(rows.map(r=>r.iso3))].sort();
    if($('report-app')) renderReport(rows);
    if($('dashboard-app')) renderDashboard(rows,allYears,allCodes);
    if(target) target.textContent=`Loaded ${rows.length.toLocaleString()} country-year rows.`;
  }catch(e){ if(target) target.textContent=`Data load error: ${e.message}. Use a local web server or the published website.`; console.error(e); }
}

function renderReport(rows){
  const a=analyze(rows,DEFAULT_START,DEFAULT_END,null); $('report-metrics').innerHTML=metricsHTML(a);
  const top=a.paired[0],bottom=[...a.paired].sort((x,y)=>x.changePct-y.changePct)[0];
  $('source-row-count').textContent=rows.length.toLocaleString(); $('source-country-count').textContent=new Set(rows.map(r=>r.iso3)).size; $('source-paired-count').textContent=a.n; $('source-paired-count-2').textContent=a.n;
  $('cohort-tag').textContent=`${a.n} matched countries`;
  $('answer').innerHTML=`<strong>Across ${a.n} countries with data in both endpoint years, the equally weighted mean of real GDP per capita rose ${pct(a.changePct,1)} from ${a.start} to ${a.end}; ${a.gainers} countries gained.</strong> ${esc(top.country)} had the largest percentage increase, while ${esc(bottom.country)} had the largest decline.`;
  $('finding-top').innerHTML=`${esc(top.country)} (${top.iso3}) rose ${pct(top.changePct,2)}, from ${money(top.start)} to ${money(top.end)} per person. This is the largest percentage gain among ${a.n} countries with endpoint values.`;
  $('finding-bottom').innerHTML=`${esc(bottom.country)} (${bottom.iso3}) fell ${pct(bottom.changePct,2)}, from ${money(bottom.start)} to ${money(bottom.end)} per person, the largest decline among the matched countries.`;
  $('finding-breadth').innerHTML=`${a.gainers} of ${a.n} countries (${pct(a.gainers/a.n*100,1)}) ended above their 2000 level. The mean of this same group rose ${pct(a.changePct,2)} over the period.`;
  svgBar($('report-top-chart'),a.paired.slice(0,10).map(r=>({label:r.country,value:r.changePct})));
  svgBar($('report-bottom-chart'),[...a.paired].sort((x,y)=>x.changePct-y.changePct).slice(0,10).map(r=>({label:r.country,value:r.changePct})));
  svgLine($('report-trend-chart'),a.series);
  $('agreement-values').innerHTML=`<tr><td>${DEFAULT_START} equal-country mean</td><td>${money(a.startMean)}</td><td class="pending">Pending Tableau build</td></tr><tr><td>${DEFAULT_END} equal-country mean</td><td>${money(a.endMean)}</td><td class="pending">Pending Tableau build</td></tr><tr><td>Change in equal-country mean</td><td>${pct(a.changePct,2)}</td><td class="pending">Pending Tableau build</td></tr><tr><td>Countries with an increase</td><td>${a.gainers} / ${a.n}</td><td class="pending">Pending Tableau build</td></tr>`;
}

function renderDashboard(rows,years,codes){
  const country=$('country-filter'),start=$('start-filter'),end=$('end-filter');
  for(const code of codes){const item=rows.find(r=>r.iso3===code);country.add(new Option(`${item.country} (${code})`,code));}
  years.forEach(y=>{start.add(new Option(y,y));end.add(new Option(y,y));}); start.value=DEFAULT_START;end.value=DEFAULT_END;
  const params=new URLSearchParams(location.search);if(params.has('start')&&years.includes(+params.get('start')))start.value=params.get('start');if(params.has('end')&&years.includes(+params.get('end')))end.value=params.get('end');
  if(params.has('countries')){const wanted=new Set(params.get('countries').split(','));for(const o of country.options)o.selected=wanted.has(o.value);}
  function update(){
    let s=+start.value,e=+end.value;if(s>e){[s,e]=[e,s];start.value=s;end.value=e;}
    const selected=new Set([...country.selectedOptions].map(o=>o.value));const a=analyze(rows,s,e,selected);
    $('dashboard-metrics').innerHTML=metricsHTML(a);
    $('filter-summary').textContent=`${a.n} countries have observations in both ${s} and ${e}; filters include ${rows.filter(r=>r.year>=s&&r.year<=e&&(!selected.size||selected.has(r.iso3))).length.toLocaleString()} observed rows.`;
    svgLine($('dashboard-trend'),a.series);
    svgBar($('dashboard-ranking'),a.paired.slice(0,12).map(r=>({label:r.country,value:r.changePct})));
    const body=a.paired.slice(0,12).map(r=>`<tr><td>${esc(r.country)}</td><td>${r.iso3}</td><td>${money(r.start)}</td><td>${money(r.end)}</td><td>${pct(r.changePct,1)}</td></tr>`).join('');
    $('dashboard-table').innerHTML=body||'<tr><td colspan="5">No complete country pairs in this view.</td></tr>';
    const q=new URLSearchParams();q.set('start',s);q.set('end',e);if(selected.size)q.set('countries',[...selected].sort().join(','));history.replaceState(null,'',`${location.pathname}?${q}`);
  }
  $('apply-filters').addEventListener('click',update); $('reset-filters').addEventListener('click',()=>{for(const o of country.options)o.selected=false;start.value=DEFAULT_START;end.value=DEFAULT_END;update();});country.addEventListener('change',update);start.addEventListener('change',update);end.addEventListener('change',update);update();
}
document.addEventListener('DOMContentLoaded',startApp);
