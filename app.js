/* مصاريفي - منطق التطبيق (JavaScript). يعمل بالكامل داخل الهاتف ولا يتصل بأي خادم. */
'use strict';
(function(){
const CUR='ر.ع.';
const EXP_CATS=[
 {id:'food',n:'بقالة وطعام',c:'#D08A2E'},{id:'rest',n:'مطاعم ومقاهي',c:'#C2562F'},
 {id:'fuel',n:'وقود ومواصلات',c:'#3E7CB1'},{id:'car',n:'صيانة وتأمين السيارة',c:'#5B6F8A'},{id:'bills',n:'فواتير (كهرباء، ماء، إنترنت)',c:'#6B5CA5'},
 {id:'home',n:'سكن وإيجار',c:'#2F7F7A'},{id:'loan',n:'أقساط والتزامات',c:'#8A4F7D'},
 {id:'health',n:'صحة',c:'#C0445A'},{id:'shop',n:'تسوق وملابس',c:'#B0662F'},
 {id:'edu',n:'تعليم ودورات',c:'#3B8F5A'},{id:'fun',n:'ترفيه وسفر',c:'#4E68C7'},
 {id:'family',n:'أهل وهدايا',c:'#A0527B'},{id:'charity',n:'صدقات وزكاة',c:'#2E8B72'},
 {id:'other',n:'أخرى',c:'#7A8494'}];
const INC_CATS=[{id:'salary',n:'راتب',c:'#1C7F55'},{id:'freelance',n:'عمل إضافي',c:'#2A8F7A'},
 {id:'business',n:'مبيعات المشروع',c:'#3A7D9A'},{id:'gift',n:'هدايا ومكافآت',c:'#7A6CC0'},{id:'iother',n:'دخل آخر',c:'#6C7A70'}];
const METHODS=[['cash','نقدًا'],['card','بطاقة'],['transfer','تحويل']];
const MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const catOf=id=>EXP_CATS.find(c=>c.id===id)||INC_CATS.find(c=>c.id===id)||EXP_CATS[EXP_CATS.length-1];

const S={quick:[],del:{},tx:{},settings:{monthlyBudget:0,budgets:{}},mode:'local',tab:'home',month:ym(new Date()),q:'',ftype:'all',fcat:''};
const txCol=null;

function ym(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function today(){const d=new Date();return ym(d)+'-'+String(d.getDate()).padStart(2,'0')}
function money(v){return (Number(v)||0).toLocaleString('en-US',{minimumFractionDigits:3,maximumFractionDigits:3})}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function parseAmt(s){s=String(s||'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,،]/g,'.').replace(/[^\d.]/g,'');const n=parseFloat(s);return isFinite(n)?Math.round(n*1000)/1000:0}
function monthName(m){const [y,mm]=m.split('-');return MONTHS[+mm-1]+' '+y}
function shiftMonth(m,k){const [y,mm]=m.split('-').map(Number);return ym(new Date(y,mm-1+k,1))}
function uidGen(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function list(){return Object.values(S.tx)}
function inMonth(m){return list().filter(t=>t.date&&t.date.slice(0,7)===m)}
function sum(a,type){return a.filter(t=>t.type===type).reduce((s,t)=>s+(+t.amount||0),0)}

/* ---------- storage ---------- */
function cacheSave(){try{localStorage.setItem('masareef:v1',JSON.stringify({tx:S.tx,del:S.del,settings:S.settings}))}catch(e){toast('تعذّر الحفظ في ذاكرة الهاتف')}}
function cacheLoad(){try{const r=JSON.parse(localStorage.getItem('masareef:v1')||'null');if(r){S.tx=r.tx||{};S.del=r.del||{};S.settings=Object.assign({monthlyBudget:0,budgets:{}},r.settings||{})}}catch(e){}}
async function putTx(t){delete t.localOnly;t.u=Date.now();S.tx[t.id]=t;cacheSave();render();Sync.soon()}
async function delTx(id){delete S.tx[id];S.del[id]=Date.now();cacheSave();render();Sync.soon()}
async function putSettings(){S.settings._u=Date.now();cacheSave();Sync.soon()}
function saveFile(name,text,type){try{const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1500);return true}catch(e){return false}}

/* ---------- views ---------- */
function txRow(t){const c=catOf(t.cat);const cls=t.type==='inc'?'amt-inc':'amt-exp';
  return `<button class="tx" data-edit="${esc(t.id)}"><span class="ic" style="background:${c.c}1f;color:${c.c}">${catIcon(t.cat)}</span>
  <span class="t"><b>${esc(t.note||c.n)}</b><small>${esc(c.n)}${t.note?'':''} · ${esc((METHODS.find(m=>m[0]===t.method)||['',''])[1])}${t.person?' · لـ'+esc(personName(t.person)):''}${t.sample?' · مثال':''}</small></span>
  <span class="num ${cls}">${t.type==='inc'?'+':'−'}${money(t.amount)}</span></button>`}

function vHome(){
  const m=S.month,a=inMonth(m),inc=sum(a,'inc'),exp=sum(a,'exp'),left=inc-exp;
  const B=+S.settings.monthlyBudget||0;
  let budgetHtml='';
  if(B>0){const pct=Math.min(100,exp/B*100);const cls=exp>B?'over':pct>80?'near':'';
    const isCur=m===ym(new Date());const d=new Date();const dim=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();const daysLeft=dim-d.getDate()+1;
    const per=Math.max(0,(B-exp)/daysLeft);
    budgetHtml=`<h2>الميزانية الشهرية</h2><div class="panel"><div class="meter"><i class="${cls}" style="width:${pct}%"></i></div>
    <div class="budgetline"><span>صرفت <b class="num">${money(exp)}</b> من <b class="num">${money(B)}</b></span><span>${exp>B?'تجاوزت بـ <b class="num amt-exp">'+money(exp-B)+'</b>':'متبقٍ <b class="num">'+money(B-exp)+'</b>'}</span></div>
    ${isCur&&exp<=B?`<div class="budgetline"><span>يمكنك صرف حتى <b class="num">${money(per)}</b> ${CUR} يوميًا لبقية الشهر (${daysLeft} يوم)</span></div>`:''}</div>`}
  else budgetHtml=`<h2>الميزانية الشهرية</h2><div class="panel"><div class="budgetline" style="margin:0;align-items:center"><span>حدد سقفًا لمصاريفك الشهرية لتعرف كم تستطيع أن تصرف يوميًا.</span><button class="chip" data-go="budget">تحديد الميزانية</button></div></div>`;
  const byCat={};a.filter(t=>t.type==='exp').forEach(t=>byCat[t.cat]=(byCat[t.cat]||0)+(+t.amount));
  const cats=Object.entries(byCat).sort((x,y)=>y[1]-x[1]);const max=cats.length?cats[0][1]:1;
  const catHtml=cats.length?`<div class="panel">${cats.map(([id,v])=>{const c=catOf(id);return `<div class="catrow">${cbadge(c.id)}<div class="name">${esc(c.n)} <small class="num">${exp?Math.round(v/exp*100):0}%</small><div class="meter"><i style="width:${v/max*100}%;background:${c.c}"></i></div></div><span class="num">${money(v)}</span></div>`}).join('')}</div>`:'';
  const recent=a.slice().sort((x,y)=>(y.date+y.createdAt).localeCompare(x.date+x.createdAt)).slice(0,5);
  const empty=!list().length?`<div class="panel empty"><b>ابدأ بتسجيل أول عملية</b>اضغط زر + في الأسفل وسجّل راتبك أو أول مصروف. يمكنك أيضًا تجربة التطبيق ببيانات مثال ثم حذفها.<div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn" data-open-add>إضافة عملية</button><button class="btn ghost" id="loadSample">تجربة ببيانات مثال</button></div></div>`:'';
  return `<section class="hero"><div class="lbl">المتبقي في ${esc(MONTHS[+m.slice(5)-1])}</div>
   <div class="big"><span class="num">${left<0?'−':''}${money(Math.abs(left))}</span> <small>${CUR}</small></div>
   <div class="row"><div class="cell"><span><span class="ar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7 7 17M7 9v8h8"/></svg></span>الدخل</span><b class="num">${money(inc)}</b></div><div class="cell"><span><span class="ar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg></span>المصاريف</span><b class="num">${money(exp)}</b></div></div></section>
   ${empty}${quickHtml()}<h2>أقسامي</h2>${dashHtml()}
   ${recent.length?`<h2>آخر العمليات</h2><div class="panel" style="padding:6px 10px">${recent.map(txRow).join('')}</div><div style="margin-top:8px"><button class="chip" data-tab="log">عرض كل العمليات</button></div>`:''}
   ${cats.length?'<h2>أين ذهبت أموالك</h2>'+catHtml:''}`;
}

function vLog(){
  let a=inMonth(S.month);
  if(S.ftype!=='all')a=a.filter(t=>t.type===S.ftype);
  if(S.q){const q=S.q.trim();a=a.filter(t=>(t.note||'').includes(q)||catOf(t.cat).n.includes(q)||String(t.amount).includes(q)||(t.person&&personName(t.person).includes(q)))}
  a.sort((x,y)=>(y.date+(y.createdAt||'')).localeCompare(x.date+(x.createdAt||'')));
  const groups={};a.forEach(t=>(groups[t.date]=groups[t.date]||[]).push(t));
  const body=a.length?Object.entries(groups).map(([d,arr])=>{const dt=new Date(d+'T12:00');const tot=sum(arr,'exp');
    return `<div class="daygroup"><div class="dayhead"><span>${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}</span><span>${tot?'صرف <span class="num">'+money(tot)+'</span>':''}</span></div><div class="panel" style="padding:6px 10px">${arr.map(txRow).join('')}</div></div>`}).join('')
   :`<div class="panel empty"><b>لا توجد عمليات</b>${S.q||S.ftype!=='all'?'جرّب تغيير البحث أو الفلتر.':'لم تسجّل شيئًا في هذا الشهر بعد.'}</div>`;
  return `<input class="search" id="q" type="search" placeholder="ابحث بالملاحظة أو الفئة أو المبلغ" value="${esc(S.q)}">
  <div class="chips">${[['all','الكل'],['exp','المصاريف'],['inc','الدخل']].map(([k,n])=>`<button class="chip" data-ftype="${k}" aria-pressed="${S.ftype===k}">${n}</button>`).join('')}</div>${body}`;
}

function vBudget(){
  const a=inMonth(S.month);const spent={};a.filter(t=>t.type==='exp').forEach(t=>spent[t.cat]=(spent[t.cat]||0)+(+t.amount));
  const b=S.settings.budgets||{};
  return goalsHtml()+`<h2>سقف المصاريف الشهري</h2>
  <div class="panel stack"><div class="field"><label for="mb">المبلغ بالريال العُماني</label><input class="inp num" id="mb" inputmode="decimal" placeholder="مثال: 450.000" value="${S.settings.monthlyBudget?money(S.settings.monthlyBudget):''}" style="text-align:left"></div>
  <div class="note">يُستخدم لحساب المبلغ اليومي المتاح في الصفحة الرئيسية.</div></div>
  <h2>حدود الفئات (اختياري)</h2>
  <div class="panel">${EXP_CATS.map(c=>{const lim=+b[c.id]||0,s=spent[c.id]||0;const pct=lim?Math.min(100,s/lim*100):0;const cls=lim&&s>lim?'over':pct>80?'near':'';
   return `<div class="brow"><div style="min-width:0"><div style="display:flex;align-items:center;gap:8px">${cbadge(c.id)}${esc(c.n)}</div>
   <div class="note">صرفت <span class="num">${money(s)}</span>${lim?' من <span class="num">'+money(lim)+'</span>':''}</div>${lim?`<div class="meter" style="height:5px;margin-top:4px"><i class="${cls}" style="width:${pct}%"></i></div>`:''}</div>
   <input class="inp num" data-bcat="${c.id}" inputmode="decimal" placeholder="—" value="${lim?money(lim):''}" aria-label="حد ${esc(c.n)}"></div>`}).join('')}</div>
  <div style="margin-top:14px"><button class="btn block" id="saveBudget">حفظ الميزانية</button></div>`;
}

function vReports(){const seg=`<div class="seg" style="margin-bottom:4px"><button class="n" data-rmode="month" aria-pressed="${S.rmode!=='year'}">تقرير شهري</button><button class="n" data-rmode="year" aria-pressed="${S.rmode==='year'}">تقرير سنوي</button></div>`;
  const mm=vReportsMonth();const i=mm.indexOf('<h2>بياناتك</h2>');
  return seg+(S.rmode==='year'?vYear():mm.slice(0,i)+reportsMonthExtras())+mm.slice(i)+versionHtml()}
function vReportsMonth(){
  const months=[];for(let k=5;k>=0;k--)months.push(shiftMonth(S.month,-k));
  const data=months.map(m=>{const a=inMonth(m);return{m,inc:sum(a,'inc'),exp:sum(a,'exp')}});
  const maxV=Math.max(1,...data.map(d=>Math.max(d.inc,d.exp)));
  const step=niceStep(maxV/4),top=Math.ceil(maxV/step)*step;
  const W=340,H=190,L=44,R=8,T=10,Bm=26,ch=H-T-Bm,cw=(W-L-R)/6;
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="الدخل والمصاريف لآخر ستة أشهر" style="direction:ltr">`;
  for(let v=0;v<=top+1e-9;v+=step){const y=T+ch-v/top*ch;svg+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--muted)" font-family="-apple-system,sans-serif">${fmtK(v)}</text>`}
  data.forEach((d,i)=>{const x0=L+i*cw+cw*0.18,bw=cw*0.3;const hi=d.inc/top*ch,he=d.exp/top*ch;
    svg+=`<rect x="${x0}" y="${T+ch-hi}" width="${bw}" height="${hi}" rx="3" fill="var(--inc)"/><rect x="${x0+bw+2}" y="${T+ch-he}" width="${bw}" height="${he}" rx="3" fill="var(--exp)"/>`;
    svg+=`<text x="${L+i*cw+cw/2}" y="${H-8}" text-anchor="middle" font-size="10.5" fill="${d.m===S.month?'var(--fg)':'var(--muted)'}" font-family="-apple-system,sans-serif" font-weight="${d.m===S.month?600:400}">${MONTHS[+d.m.slice(5)-1]}</text>`});
  svg+='</svg>';
  const withData=data.filter(d=>d.inc||d.exp);const avgExp=withData.length?withData.reduce((s,d)=>s+d.exp,0)/withData.length:0;
  const cur=data[5],prev=data[4];const diff=prev.exp?((cur.exp-prev.exp)/prev.exp*100):0;
  const saveRate=cur.inc?((cur.inc-cur.exp)/cur.inc*100):0;
  const byCat={};inMonth(S.month).filter(t=>t.type==='exp').forEach(t=>byCat[t.cat]=(byCat[t.cat]||0)+(+t.amount));
  const topCat=Object.entries(byCat).sort((x,y)=>y[1]-x[1])[0];
  return `<h2 style="margin-top:4px">آخر ستة أشهر</h2><div class="panel">${svg}<div class="legend"><span><i style="background:var(--inc)"></i>الدخل</span><span><i style="background:var(--exp)"></i>المصاريف</span></div></div>
  <h2>ملخص ${esc(monthName(S.month))}</h2>
  <div class="stats">
   <div class="stat"><span>نسبة الادخار</span><b class="num ${saveRate<0?'amt-exp':''}">${cur.inc?Math.round(saveRate)+'%':'—'}</b></div>
   <div class="stat"><span>مقارنة بالشهر السابق</span><b class="num ${diff>0?'amt-exp':'amt-inc'}">${prev.exp?(diff>0?'+':'')+Math.round(diff)+'%':'—'}</b></div>
   <div class="stat"><span>متوسط المصاريف الشهري</span><b class="num">${money(avgExp)}</b></div>
   <div class="stat"><span>أكبر فئة صرف</span><b style="font-size:15px">${topCat?esc(catOf(topCat[0]).n):'—'}</b></div>
  </div>
  <h2>بياناتك</h2>${syncHtml()}
  <div class="panel stack">
   <button class="btn ghost block" id="csvBtn" data-x="1">${S.rmode==='year'?'تنزيل عمليات السنة كملف Excel (CSV)':'تنزيل عمليات الشهر كملف Excel (CSV)'}</button>
   <button class="btn ghost block" id="fileBackup">حفظ نسخة احتياطية كملف</button>
   <label class="btn ghost block" for="restoreFile" style="text-align:center;cursor:pointer">استعادة من ملف نسخة احتياطية</label>
   <input type="file" id="restoreFile" accept=".json,application/json" hidden>
   <button class="btn ghost block" id="copyBackup">نسخ النسخة الاحتياطية كنص</button>
   <details><summary class="note" style="cursor:pointer">استعادة من نص منسوخ</summary>
     <div class="stack" style="margin-top:10px"><textarea class="inp" id="restoreTxt" placeholder="الصق النسخة الاحتياطية هنا"></textarea><button class="btn ghost" id="restoreBtn">استعادة</button></div></details>
   ${list().some(t=>t.sample)?'<button class="btn ghost block" id="clearSample">حذف بيانات المثال</button>':''}
   <div id="wipeArea"><button class="btn ghost block" id="wipeAsk" style="color:var(--exp)">حذف كل البيانات</button></div>
   <p class="note" style="margin:0">${Sync.linked()?'بياناتك محفوظة في جهازك، وتُنسخ إلى مجلد خفي خاص بالتطبيق في Google Drive الخاص بك فقط. لا يتصل التطبيق بأي جهة غير Google Drive الخاص بك.':'التطبيق لا يتصل بالإنترنت ولا يرسل بياناتك لأي جهة، وكل شيء محفوظ داخل هاتفك فقط. لذلك احفظ نسخة احتياطية كملف بين حين وآخر، لأن حذف التطبيق من الهاتف يحذف بياناته.'}</p>
  </div>`;
}
function niceStep(x){const p=Math.pow(10,Math.floor(Math.log10(x)));const f=x/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p}
function fmtK(v){return v>=1000?(v/1000).toLocaleString('en-US',{maximumFractionDigits:1})+'k':String(Math.round(v))}

/* ---------- render ---------- */
function render(){
  document.getElementById('mLabel').textContent=monthName(S.month);
  document.getElementById('monthbar').hidden=false;
  const v=document.getElementById('view');
  const keepQ=document.activeElement&&document.activeElement.id==='q';
  const focusedB=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.bcat;
  if(S.tab==='budget'&&(focusedB||document.activeElement?.id==='mb'))return; // don't clobber typing
  v.innerHTML=S.tab==='home'?vHome():S.tab==='log'?vLog():S.tab==='budget'?vBudget():S.tab==='house'?vHouse():S.tab==='cars'?vCars():vReports();
  document.querySelectorAll('nav.tabs [data-tab]').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===S.tab?'page':'false'));
  if(keepQ){const q=document.getElementById('q');if(q){q.focus();q.setSelectionRange(q.value.length,q.value.length)}}
}

/* ---------- category icons ---------- */
const CI={
 food:'<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2"/>',
 rest:'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/>',
 fuel:'<path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M3 21h13"/><path d="M7 7h5v4H7z"/><path d="M15 9h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V8l-3-3"/>',
 car:'<path d="M5 16v-5l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><path d="M7 19v2M17 19v2"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>',
 bills:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
 home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
 loan:'<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/>',
 health:'<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2A5 5 0 0 0 3.2 8.6c0 5.4 8.8 11 8.8 11s8.8-5.6 8.8-11z"/><path d="M6.5 12h2.5l1.5-2.5 2 5 1.5-2.5h2.5"/>',
 shop:'<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
 edu:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/>',
 fun:'<path d="M2.5 11.5 21 4l-6 17-3.5-7.5z"/><path d="M11.5 13.5 21 4"/>',
 family:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',
 charity:'<path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z"/><path d="M12 2.5v2.5M7.5 3.5l1 1.6M16.5 3.5l-1 1.6"/>',
 other:'<circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/>',
 salary:'<path d="M3 7a2 2 0 0 1 2-2h12v3"/><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 13.5h2"/>',
 freelance:'<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
 business:'<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>',
 gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12"/><path d="M12 8c-1.5-3-5-3.5-5-1.5S10 8 12 8zM12 8c1.5-3 5-3.5 5-1.5S14 8 12 8z"/>',
 iother:'<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'
};
function catIcon(id){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CI[id]||CI.other}</svg>`}
function cbadge(id){const c=catOf(id);return `<span class="cbadge" style="background:${c.c}1f;color:${c.c}">${catIcon(id)}</span>`}

/* ---------- add / edit sheet ---------- */
const SHORT={food:'بقالة',rest:'مطاعم',fuel:'وقود',car:'السيارة',bills:'فواتير',home:'سكن',loan:'أقساط',health:'صحة',shop:'تسوق',edu:'تعليم',fun:'ترفيه',family:'أهل',charity:'صدقات',other:'أخرى',salary:'راتب',freelance:'عمل إضافي',business:'المشروع',gift:'هدايا',iother:'أخرى'};
function freqCats(type){const cnt={};list().forEach(x=>{if(x.type===type)cnt[x.cat]=(cnt[x.cat]||0)+1});const base=type==='inc'?INC_CATS:EXP_CATS;return base.map((c,i)=>[c,i]).sort((a,b)=>((cnt[b[0].id]||0)-(cnt[a[0].id]||0))||a[1]-b[1]).map(x=>x[0])}
function guessCat(note){const l=(note||'').toLowerCase().trim();if(l.length<2)return '';const learned=(S.settings.merchantCats||{})[mkey(note)];if(learned)return learned;for(const [c,w] of Object.entries(KW))if(w.some(x=>l.includes(x)))return c;return ''}
function openSheet(t,pre){
  const isNew=!t;
  const blank=()=>Object.assign({id:uidGen(),type:'exp',amount:'',cat:'',date:today(),method:S.settings.lastMethod||'card',note:'',person:''},pre||{});
  t=t?Object.assign({},t):blank();
  let manualCat=!!t.cat,askDel=false,showAll=false;
  const L=document.getElementById('layer');
  const yest=()=>isoD(new Date(Date.now()-864e5));
  const draw=(focusAmt,focusNote)=>{const all=freqCats(t.type);let cats=showAll?all:all.slice(0,7);if(t.cat&&!cats.find(c=>c.id===t.cat))cats=cats.slice(0,6).concat(all.find(c=>c.id===t.cat)||[]);const P=people();const td=today(),yd=yest();
   L.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${isNew?'إضافة عملية':'تعديل عملية'}"><div class="in">
    <div class="grab"></div>
    <div class="seg"><button class="e" data-type="exp" aria-pressed="${t.type==='exp'}">مصروف</button><button class="i" data-type="inc" aria-pressed="${t.type==='inc'}">دخل</button></div>
    <div class="amtbox"><input id="fAmt" inputmode="decimal" placeholder="0.000" value="${t.amount!==''?esc(t.amount):''}" aria-label="المبلغ" autocomplete="off"><span>${CUR}</span></div>
    <div class="stack">
     <div class="catgrid" role="group" aria-label="الفئة">${cats.map(c=>`<button class="cg" data-cat="${c.id}" aria-pressed="${t.cat===c.id}" title="${esc(c.n)}"><i style="background:${c.c}1f;color:${c.c}">${catIcon(c.id)}</i>${esc(SHORT[c.id]||c.n)}</button>`).join('')}${showAll?'':'<button class="cg" id="catMore"><i style="background:var(--surface-2);color:var(--muted)">…</i>المزيد</button>'}</div>
     <input class="inp" id="fNote" placeholder="ملاحظة (اختياري): ${t.type==='inc'?'راتب أكتوبر':'لولو، وقود، قهوة'}" value="${esc(t.note)}" maxlength="80" autocomplete="off" aria-label="ملاحظة">
     <div class="chips" role="group" aria-label="التاريخ" style="align-items:center"><button class="chip" data-dset="${td}" aria-pressed="${t.date===td}">اليوم</button><button class="chip" data-dset="${yd}" aria-pressed="${t.date===yd}">أمس</button><input class="inp" type="date" id="fDate" value="${esc(t.date)}" style="width:auto;flex:1;min-width:130px;padding:6px 10px" aria-label="تاريخ آخر"></div>
     <div class="seg seg3" role="group" aria-label="طريقة الدفع">${METHODS.map(m=>`<button class="n" data-meth="${m[0]}" aria-pressed="${t.method===m[0]}">${m[1]}</button>`).join('')}</div>
     ${t.type==='exp'&&P.length?`<div class="chips" role="group" aria-label="لمن هذا المصروف"><button class="chip" data-person="" aria-pressed="${!t.person}">لي / للبيت</button>${P.map(p=>`<button class="chip" data-person="${esc(p.id)}" aria-pressed="${t.person===p.id}"><span class="dot" style="background:${personColor(p.id)}"></span>${esc(p.name)}</button>`).join('')}</div>`:''}
     <p class="note" id="fErr" hidden style="color:var(--exp);margin:0"></p>
     ${isNew?`<div class="actions"><div class="row2"><button class="btn" id="fSave">حفظ</button><button class="btn ghost" id="fSaveMore">حفظ وإضافة أخرى</button></div>
       <div class="row2"><button class="btn ghost" id="openImp">لصق رسالة البنك</button><button class="btn ghost" data-close>إلغاء</button></div></div>`
      :`<div class="actions"><button class="btn block" id="fSave">حفظ التعديل</button></div>${askDel?'<div class="confirm"><span>هل تريد حذف هذه العملية نهائيًا؟</span><div class="row2"><button class="btn danger" id="fDel">نعم، احذف</button><button class="btn ghost" id="fDelNo">تراجع</button></div></div>':'<button class="btn ghost block" id="fDelAsk" style="color:var(--exp)">حذف العملية</button>'}`}
    </div></div></div>`;
   if(focusAmt||focusNote)setTimeout(()=>{const i=document.getElementById(focusAmt?'fAmt':'fNote');if(i){i.focus();if(focusNote)i.setSelectionRange(i.value.length,i.value.length)}},40);
  };
  const grab=()=>{const g=i=>document.getElementById(i);if(g('fAmt'))t.amount=g('fAmt').value;if(g('fDate'))t.date=g('fDate').value;if(g('fNote'))t.note=g('fNote').value};
  const press=(sel,fn)=>L.querySelectorAll(sel).forEach(b=>b.setAttribute('aria-pressed',fn(b)));
  L.oninput=e=>{if(e.target.id==='fNote'&&!manualCat){const g=guessCat(e.target.value);if(g&&(t.type==='inc')===!!INC_CATS.find(c=>c.id===g)&&g!==t.cat){t.cat=g;if(L.querySelector('.cg[data-cat="'+g+'"]'))press('.cg',b=>b.dataset.cat===g);else{grab();draw(false,true)}}}};
  L.onchange=e=>{if(e.target.id==='fDate'){t.date=e.target.value;press('[data-dset]',b=>b.dataset.dset===t.date)}};
  const save=async more=>{grab();const amt=parseAmt(t.amount);const err=document.getElementById('fErr');
    if(!amt){err.hidden=false;err.textContent='اكتب المبلغ أولًا، مثل 3.500';return}
    if(!t.cat){err.hidden=false;err.textContent='اختر الفئة';return}
    const rec={id:t.id,type:t.type,amount:amt,cat:t.cat,date:t.date||today(),method:t.method,note:(t.note||'').trim(),createdAt:t.createdAt||new Date().toISOString()};
    if(t.sample)rec.sample=true; if(!txCol)rec.localOnly=true; if(t.type==='exp'&&t.person)rec.person=t.person; ['rec','src','car'].forEach(k=>{if(t[k])rec[k]=t[k]});
    let setChanged=false;
    if(S.settings.lastMethod!==t.method){S.settings.lastMethod=t.method;setChanged=true}
    if(rec.note&&manualCat){const k=mkey(rec.note);if(k&&(S.settings.merchantCats||{})[k]!==rec.cat){S.settings.merchantCats=Object.assign({},S.settings.merchantCats||{},{[k]:rec.cat});setChanged=true}}
    if(setChanged)putSettings();
    if(more){await putTx(rec);const keep={type:t.type,date:t.date,method:t.method};t=Object.assign(blank(),keep);manualCat=false;draw(true);toast('حُفظت، أضف التالية',()=>delTx(rec.id));return}
    L.innerHTML='';L.oninput=L.onchange=null;await putTx(rec);
    if(rec.date.slice(0,7)!==S.month){S.month=rec.date.slice(0,7);render()}
    isNew?toast('حُفظت العملية',()=>delTx(rec.id)):toast('حُفظ التعديل')};
  L.onclick=async e=>{const x=e.target.closest('button,[data-close]');if(!x)return;
    if(x.hasAttribute('data-close')){L.innerHTML='';L.oninput=L.onchange=null;return}
    if(x.id==='openImp'){openImport();return}
    if(x.dataset.type){grab();if(t.type!==x.dataset.type){t.type=x.dataset.type;t.cat='';manualCat=false}draw();return}
    if(x.id==='catMore'){grab();showAll=true;draw();return}
    if(x.dataset.cat){t.cat=x.dataset.cat;manualCat=true;press('.cg',b=>b===x);return}
    if(x.dataset.dset){t.date=x.dataset.dset;document.getElementById('fDate').value=t.date;press('[data-dset]',b=>b===x);return}
    if(x.dataset.meth){t.method=x.dataset.meth;press('[data-meth]',b=>b===x);return}
    if(x.dataset.person!==undefined){t.person=x.dataset.person;press('[data-person]',b=>b===x);return}
    if(x.id==='fDelAsk'){grab();askDel=true;draw();return}
    if(x.id==='fDelNo'){grab();askDel=false;draw();return}
    if(x.id==='fDel'){const old=S.tx[t.id]&&Object.assign({},S.tx[t.id]);L.innerHTML='';L.oninput=L.onchange=null;await delTx(t.id);toast('حُذفت العملية',old?()=>putTx(old):null);return}
    if(x.id==='fSave'){await save(false);return}
    if(x.id==='fSaveMore'){await save(true);return}
  };
  draw(isNew&&t.amount==='');
}

/* ---------- quick entry ---------- */
function quickList(){const since=isoD(new Date(Date.now()-120*864e5));const g={};
  list().forEach(t=>{if(!t.date||t.date<since||t.rec)return;const k=[t.type,t.cat,(t.note||'').trim(),t.amount,t.person||''].join('|');const o=g[k]||(g[k]={t,n:0,last:''});o.n++;if(t.date>=o.last){o.last=t.date;o.t=t}});
  return Object.values(g).filter(x=>x.n>=2).sort((a,b)=>b.n-a.n||b.last.localeCompare(a.last)).slice(0,6).map(x=>x.t)}
function quickHtml(){if(!list().length)return '';const q=quickList();S.quick=q;
  if(!q.length)return `<h2>تسجيل سريع</h2><div class="panel note" style="margin:0">العمليات التي تكررها (مثل القهوة أو الوقود) ستظهر هنا تلقائيًا لتسجيلها بضغطة واحدة.</div>`;
  return `<h2>تسجيل سريع</h2><div class="quick">${q.map((t,i)=>{const c=catOf(t.cat);return `<button class="qbtn" data-quick="${i}" aria-label="تسجيل ${esc(t.note||c.n)} ${money(t.amount)}">${cbadge(t.cat)}<span class="qn">${esc(t.note||SHORT[t.cat]||c.n)}</span><b class="num ${t.type==='inc'?'amt-inc':''}">${money(t.amount)}</b></button>`}).join('')}</div>
  <p class="note" style="margin:6px 2px 0">ضغطة واحدة تسجّلها بتاريخ اليوم.</p>`}
function quickAdd(i){const s=(S.quick||[])[+i];if(!s)return;const t=Object.assign({},s,{id:uidGen(),date:today(),createdAt:new Date().toISOString()});delete t.sample;delete t.src;delete t.localOnly;if(!txCol)t.localOnly=true;
  putTx(t);toast('سُجّل '+(t.note||catOf(t.cat).n)+' '+money(t.amount),()=>delTx(t.id))}

/* ---------- cars ---------- */
const SVC_TYPES=['تغيير زيت','إطارات','بطارية','فرامل','فحص دوري','تكييف','غسيل وتلميع','قطع غيار','أخرى'];
function cars(){return S.settings.cars||[]}
function carName(id){const c=cars().find(x=>x.id===id);return c?c.name:'سيارة محذوفة'}
function daysTo(iso){if(!iso)return null;return Math.ceil((new Date(iso+'T12:00')-new Date())/864e5)}
function expPill(iso){const d=daysTo(iso);if(d===null)return '<span class="pill soon">لم يُحدَّد</span>';
  if(d<0)return `<span class="pill late">انتهى منذ ${daysWord(-d)}</span>`;if(d<=30)return `<span class="pill warn">بعد ${daysWord(d)}</span>`;return `<span class="pill soon">بعد ${daysWord(d)}</span>`}
function fmtD(iso){if(!iso)return '—';const d=new Date(iso+'T12:00');return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear()}
function plusYear(iso){const d=new Date((iso||today())+'T12:00');d.setFullYear(d.getFullYear()+1);return isoD(d)}
function svcDue(car){const out=[];const last={};(car.services||[]).forEach(s=>{if(!last[s.type]||s.date>=last[s.type].date)last[s.type]=s});
  Object.values(last).forEach(s=>{let due=false,why='';const dd=daysTo(s.nextDate);
    if(s.nextDate&&dd<=14){due=true;why=dd<0?'متأخرة '+daysWord(-dd):'بعد '+daysWord(dd)}
    if(s.nextOdo&&car.odo){const left=s.nextOdo-car.odo;if(left<=500){due=true;why=left<0?'تجاوزت بـ '+(-left).toLocaleString('en-US')+' كم':'باقي '+left.toLocaleString('en-US')+' كم'}}
    if(s.nextDate||s.nextOdo)out.push({s,due,why:why||(s.nextDate?'في '+fmtD(s.nextDate):'عند '+(+s.nextOdo).toLocaleString('en-US')+' كم')})});
  return out}
function carAlerts(){const al=[];cars().forEach(c=>{
  [['ins','التأمين'],['reg','الملكية']].forEach(([k,n])=>{const d=daysTo(c[k+'Expiry']);if(d!==null&&d<=30)al.push({car:c,text:(d<0?'انتهت ':'')+n+' '+c.name+(d<0?'':' بعد '+daysWord(d)),d})});
  svcDue(c).filter(x=>x.due).forEach(x=>al.push({car:c,text:'صيانة '+x.s.type+' لـ'+c.name,d:0}))});
  return al.sort((a,b)=>a.d-b.d)}
function carGoal(car,k){return (S.settings.goals||[]).find(g=>g.carRef===car.id+':'+k)}
function vCars(){
  const y=S.month.slice(0,4);const C=cars();
  const cards=C.map(c=>{
    const yr=list().filter(t=>t.car===c.id&&t.date&&t.date.slice(0,4)===y);const tot=yr.reduce((s,t)=>s+(+t.amount||0),0);
    const row=(k,n)=>{const g=carGoal(c,k);return `<div class="recrow"><div><b>${n}</b><small>ينتهي ${fmtD(c[k+'Expiry'])}${c[k+'Cost']?' · <span class="num">'+money(c[k+'Cost'])+'</span> '+CUR:''}</small></div>
      <div class="recact">${expPill(c[k+'Expiry'])}<button class="chip pay" data-crenew="${esc(c.id)}:${k}">جدّدت</button>${c[k+'Expiry']&&c[k+'Cost']?(g?'<button class="chip" data-go="budget">في الخطة</button>':`<button class="chip" data-csave="${esc(c.id)}:${k}">ادّخر له</button>`):''}</div></div>`};
    const due=svcDue(c);const svcs=(c.services||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
    return `<div class="carcard"><div class="carhead"><div><b>${esc(c.name)}</b><span class="note">${[c.plate?'لوحة '+esc(c.plate):'',c.year?esc(c.year):'',c.odo?'<span class="num">'+(+c.odo).toLocaleString('en-US')+'</span> كم':''].filter(Boolean).join(' · ')}</span></div>
      <div class="gm"><span>تكاليف ${y}</span><b class="num" style="font-size:17px">${money(tot)}</b></div></div>
      ${row('ins','التأمين')}${row('reg','تجديد الملكية')}
      <div class="recrow"><div><b>الصيانة القادمة</b><small>${due.length?due.map(x=>esc(x.s.type)+': '+esc(x.why)).join('، '):'سجّل صيانة وحدد موعدها القادم ليذكّرك التطبيق'}</small></div>
      <div class="recact">${due.some(x=>x.due)?'<span class="pill late">مستحقة</span>':due.length?'<span class="pill paid">لا شيء مستحق</span>':''}</div></div>
      ${svcs.length?`<details style="margin-top:4px"><summary class="note" style="cursor:pointer">سجل الصيانة (${svcs.length})</summary><div style="margin-top:6px">${svcs.map(s=>`<button class="svc" data-sedit="${esc(c.id)}:${esc(s.id)}"><span><b style="font-weight:500">${esc(s.type)}</b><small>${fmtD(s.date)}${s.odo?' · <span class="num">'+(+s.odo).toLocaleString('en-US')+'</span> كم':''}${s.note?' · '+esc(s.note):''}</small></span><span class="num amt-exp">${s.cost?money(s.cost):''}</span></button>`).join('')}</div></details>`:''}
      <div class="gbtns" style="margin-top:8px"><button class="chip pay" data-sadd="${esc(c.id)}">+ صيانة</button><button class="chip" data-cedit="${esc(c.id)}">تعديل السيارة</button></div></div>`}).join('');
  return `<div class="backrow"><h2 style="margin:4px 0">سياراتي</h2><button class="chip" data-tab="home">الرئيسية ‹</button></div>
   ${C.length?cards:`<div class="panel empty"><b>تابع تأمين سيارتك وملكيتها وصيانتها</b>أضف سيارتك مع تاريخ انتهاء التأمين والملكية، وسيذكّرك التطبيق قبل الموعد بشهر، ويحسب لك كم تدّخر لهما شهريًا.</div>`}
   <div class="chips" style="margin-top:12px"><button class="chip" data-cadd="1">+ إضافة سيارة</button></div>`;
}
function openCar(id){
  const L=document.getElementById('layer');const C=S.settings.cars||(S.settings.cars=[]);const ex=id?C.find(x=>x.id===id):null;
  const c=ex?Object.assign({},ex):{id:uidGen(),name:'',plate:'',year:'',odo:'',insExpiry:'',insCost:'',insCo:'',regExpiry:'',regCost:'',services:[]};let askDel=false;
  const f=(idn,lab,val,extra)=>`<div class="field"><label for="${idn}">${lab}</label><input class="inp${extra&&extra.num?' num':''}" id="${idn}" value="${esc(val)}" ${extra&&extra.attrs||''}></div>`;
  const draw=()=>{L.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="سيارة"><div class="in"><div class="grab"></div>
   <h2 style="margin-top:0">${ex?'تعديل '+esc(ex.name):'إضافة سيارة'}</h2><div class="stack">
   ${f('cName','اسم السيارة',c.name,{attrs:'placeholder="مثال: لاندكروزر 2019" maxlength="30"'})}
   <div class="row2">${f('cPlate','رقم اللوحة (اختياري)',c.plate,{attrs:'maxlength="15"'})}${f('cOdo','قراءة العداد (كم)',c.odo,{num:1,attrs:'inputmode="numeric" style="text-align:left"'})}</div>
   <h2 style="margin:6px 0 0;font-size:15px">التأمين</h2>
   <div class="row2">${f('cInsExp','تاريخ انتهاء التأمين',c.insExpiry,{attrs:'type="date"'})}${f('cInsCost','قيمة التجديد',c.insCost?money(c.insCost):'',{num:1,attrs:'inputmode="decimal" placeholder="0.000" style="text-align:left"'})}</div>
   ${f('cInsCo','شركة التأمين (اختياري)',c.insCo,{attrs:'maxlength="30"'})}
   <h2 style="margin:6px 0 0;font-size:15px">الملكية</h2>
   <div class="row2">${f('cRegExp','تاريخ انتهاء الملكية',c.regExpiry,{attrs:'type="date"'})}${f('cRegCost','رسوم التجديد والفحص',c.regCost?money(c.regCost):'',{num:1,attrs:'inputmode="decimal" placeholder="0.000" style="text-align:left"'})}</div>
   <p class="note" id="cErr" hidden style="color:var(--exp);margin:0"></p>
   <button class="btn block" id="cSave">حفظ</button>
   ${ex?(askDel?'<div class="confirm"><span>حذف هذه السيارة؟ تبقى مصاريفها المسجلة في السجل.</span><div class="row2"><button class="btn danger" id="cDel">نعم، احذف</button><button class="btn ghost" id="cDelNo">تراجع</button></div></div>':'<button class="btn ghost block" id="cDelAsk" style="color:var(--exp)">حذف السيارة</button>'):'<button class="btn ghost block" data-close>إلغاء</button>'}
   </div></div></div>`};
  const v=i=>document.getElementById(i).value;
  const grab=()=>{c.name=v('cName');c.plate=v('cPlate');c.odo=v('cOdo');c.insExpiry=v('cInsExp');c.insCost=v('cInsCost');c.insCo=v('cInsCo');c.regExpiry=v('cRegExp');c.regCost=v('cRegCost')};
  L.onchange=L.oninput=null;
  L.onclick=e=>{const x=e.target.closest('button,[data-close]');if(!x)return;
    if(x.hasAttribute('data-close')){L.innerHTML='';return}
    if(x.id==='cDelAsk'){grab();askDel=true;draw();return}
    if(x.id==='cDelNo'){grab();askDel=false;draw();return}
    if(x.id==='cDel'){S.settings.cars=C.filter(y=>y.id!==c.id);L.innerHTML='';putSettings();render();toast('حُذفت السيارة');return}
    if(x.id==='cSave'){grab();if(!c.name.trim()){const er=document.getElementById('cErr');er.hidden=false;er.textContent='اكتب اسم السيارة';return}
      const rec=Object.assign({},c,{name:c.name.trim(),plate:c.plate.trim(),odo:parseInt(String(c.odo).replace(/[^\d]/g,''))||0,insCost:parseAmt(c.insCost),regCost:parseAmt(c.regCost),insCo:c.insCo.trim(),services:c.services||[]});
      const i=C.findIndex(y=>y.id===c.id);if(i>=0)C[i]=rec;else C.push(rec);
      ['ins','reg'].forEach(k=>{const g=carGoal(rec,k);if(g&&rec[k+'Expiry']){g.due=rec[k+'Expiry'];g.target=rec[k+'Cost']||g.target}});
      L.innerHTML='';putSettings();render();toast('حُفظت '+rec.name)}};
  draw();
}
function openRenew(ref){
  const [cid,k]=ref.split(':');const c=cars().find(x=>x.id===cid);if(!c)return;const L=document.getElementById('layer');const n=k==='ins'?'التأمين':'الملكية';
  L.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="تجديد"><div class="in"><div class="grab"></div>
   <h2 style="margin-top:0">جدّدت ${n} لـ${esc(c.name)}</h2>
   <div class="amtbox"><input id="nAmt" inputmode="decimal" placeholder="0.000" value="${c[k+'Cost']?money(c[k+'Cost']):''}" aria-label="المبلغ المدفوع"><span>${CUR}</span></div>
   <div class="stack"><div class="row2"><div class="field"><label for="nDate">تاريخ الدفع</label><input class="inp" type="date" id="nDate" value="${today()}"></div>
   <div class="field"><label for="nExp">ينتهي الجديد في</label><input class="inp" type="date" id="nExp" value="${plusYear(c[k+'Expiry']&&daysTo(c[k+'Expiry'])>-60?c[k+'Expiry']:today())}"></div></div>
   <p class="note" style="margin:0">يُسجَّل المبلغ كمصروف في فئة السيارة، ويُحدَّث تاريخ الانتهاء.</p>
   <button class="btn block" id="nSave">حفظ</button><button class="btn ghost block" data-close>إلغاء</button></div></div></div>`;
  L.onchange=L.oninput=null;
  L.onclick=async e=>{const x=e.target.closest('button,[data-close]');if(!x)return;
    if(x.hasAttribute('data-close')){L.innerHTML='';return}
    if(x.id==='nSave'){const amt=parseAmt(document.getElementById('nAmt').value);const d=document.getElementById('nDate').value||today();const exp=document.getElementById('nExp').value;
      c[k+'Expiry']=exp;if(amt)c[k+'Cost']=amt;
      const g=carGoal(c,k);if(g){g.due=exp;g.saved=0;g.log={};if(amt)g.target=amt}
      L.innerHTML='';await putSettings();
      if(amt){const t={id:uidGen(),type:'exp',amount:amt,cat:'car',date:d,method:'card',note:'تجديد '+n+' - '+c.name,createdAt:new Date().toISOString(),car:c.id};if(!txCol)t.localOnly=true;await putTx(t)}else render();
      toast('جُدِّد '+n+' حتى '+fmtD(exp))}};
}
function carToGoal(ref){const [cid,k]=ref.split(':');const c=cars().find(x=>x.id===cid);if(!c)return;
  const G=S.settings.goals||(S.settings.goals=[]);if(carGoal(c,k))return;
  G.push({id:uidGen(),kind:k==='ins'?'insurance':'mulkiya',name:(k==='ins'?'تأمين ':'ملكية ')+c.name,target:c[k+'Cost'],saved:0,due:c[k+'Expiry'],repeat:'yearly',log:{},carRef:c.id+':'+k});
  putSettings();render();toast('أُضيف إلى خطة الادخار')}
function openSvc(cid,sid){
  const c=cars().find(x=>x.id===cid);if(!c)return;c.services=c.services||[];const ex=sid?c.services.find(x=>x.id===sid):null;
  const s=ex?Object.assign({},ex):{id:uidGen(),type:'',date:today(),odo:c.odo||'',cost:'',note:'',nextDate:'',nextOdo:''};let askDel=false;
  const L=document.getElementById('layer');
  const draw=()=>{L.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="صيانة"><div class="in"><div class="grab"></div>
   <h2 style="margin-top:0">${ex?'تعديل الصيانة':'صيانة جديدة'} · ${esc(c.name)}</h2><div class="stack">
   <div class="field"><label>نوع الصيانة</label><div class="chips">${SVC_TYPES.map(t=>`<button class="chip" data-stype="${t}" aria-pressed="${s.type===t}">${t}</button>`).join('')}</div></div>
   <div class="row2"><div class="field"><label for="sDate">التاريخ</label><input class="inp" type="date" id="sDate" value="${esc(s.date)}"></div>
   <div class="field"><label for="sCost">التكلفة (${CUR})</label><input class="inp num" id="sCost" inputmode="decimal" value="${s.cost?money(s.cost):''}" placeholder="0.000" style="text-align:left"></div></div>
   <div class="row2"><div class="field"><label for="sOdo">العداد وقتها (كم)</label><input class="inp num" id="sOdo" inputmode="numeric" value="${esc(s.odo)}" style="text-align:left"></div>
   <div class="field"><label for="sNote">الورشة / ملاحظة</label><input class="inp" id="sNote" value="${esc(s.note)}" maxlength="40"></div></div>
   <h2 style="margin:6px 0 0;font-size:15px">الموعد القادم (اختياري)</h2>
   <div class="row2"><div class="field"><label for="sNextD">بتاريخ</label><input class="inp" type="date" id="sNextD" value="${esc(s.nextDate)}"></div>
   <div class="field"><label for="sNextO">أو عند العداد (كم)</label><input class="inp num" id="sNextO" inputmode="numeric" value="${esc(s.nextOdo)}" style="text-align:left"></div></div>
   <p class="note" style="margin:0">يذكّرك التطبيق قبل الموعد بأسبوعين، أو قبل الوصول للعداد بـ500 كم.</p>
   <p class="note" id="sErr" hidden style="color:var(--exp);margin:0"></p>
   <button class="btn block" id="sSave">حفظ</button>
   ${ex?(askDel?'<div class="confirm"><span>حذف هذه الصيانة ومصروفها من السجل؟</span><div class="row2"><button class="btn danger" id="sDel">نعم، احذف</button><button class="btn ghost" id="sDelNo">تراجع</button></div></div>':'<button class="btn ghost block" id="sDelAsk" style="color:var(--exp)">حذف</button>'):'<button class="btn ghost block" data-close>إلغاء</button>'}
   </div></div></div>`};
  const v=i=>document.getElementById(i).value;
  const grab=()=>{s.date=v('sDate');s.cost=v('sCost');s.odo=v('sOdo');s.note=v('sNote');s.nextDate=v('sNextD');s.nextOdo=v('sNextO')};
  L.onchange=L.oninput=null;
  L.onclick=async e=>{const x=e.target.closest('button,[data-close]');if(!x)return;
    if(x.hasAttribute('data-close')){L.innerHTML='';return}
    if(x.dataset.stype){grab();s.type=x.dataset.stype;draw();return}
    if(x.id==='sDelAsk'){grab();askDel=true;draw();return}
    if(x.id==='sDelNo'){grab();askDel=false;draw();return}
    if(x.id==='sDel'){c.services=c.services.filter(y=>y.id!==s.id);L.innerHTML='';await putSettings();if(s.txId&&S.tx[s.txId])await delTx(s.txId);else render();toast('حُذفت');return}
    if(x.id==='sSave'){grab();if(!s.type){const er=document.getElementById('sErr');er.hidden=false;er.textContent='اختر نوع الصيانة';return}
      const num=q=>parseInt(String(q||'').replace(/[^\d]/g,''))||0;
      const rec={id:s.id,type:s.type,date:s.date||today(),cost:parseAmt(s.cost),odo:num(s.odo),note:(s.note||'').trim(),nextDate:s.nextDate||'',nextOdo:num(s.nextOdo),txId:s.txId||''};
      if(rec.odo>(+c.odo||0))c.odo=rec.odo;
      let txp=null;
      if(rec.cost){const old=rec.txId&&S.tx[rec.txId];const t=Object.assign({},old||{id:uidGen(),createdAt:new Date().toISOString(),method:'card'},{type:'exp',amount:rec.cost,cat:'car',date:rec.date,note:'صيانة: '+rec.type+' - '+c.name,car:c.id});if(!txCol)t.localOnly=true;rec.txId=t.id;txp=t}
      else if(rec.txId&&S.tx[rec.txId]){await delTx(rec.txId);rec.txId=''}
      const i=c.services.findIndex(y=>y.id===rec.id);if(i>=0)c.services[i]=rec;else c.services.push(rec);
      L.innerHTML='';await putSettings();if(txp)await putTx(txp);else render();toast('حُفظت الصيانة')}};
  draw();
}

/* ---------- home dashboard ---------- */
const TI={
 car:'<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM7 19v2M17 19v2"/><circle cx="7.5" cy="13.5" r="1"/><circle cx="16.5" cy="13.5" r="1"/>',
 bills:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4M16 2v4M4 10h16M9 15l2 2 4-4"/>',
 family:'<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',
 plan:'<path d="M5 11a7 6 0 0 1 13-2h2v4l-2 1-1 3h-2v-1h-5v1H8l-1-3a6 6 0 0 1-2-3z"/>',
 budget:'<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 5"/>',
 log:'<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
 rep:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 sms:'<path d="M4 5h16v11H8l-4 4z"/><path d="M8 10h8M8 13h5"/>'
};
function tile(o){return `<button class="tile${o.st?' '+o.st:''}" ${o.attr}><span class="ti" style="background:${o.c}22;color:${o.c}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${TI[o.i]}</svg></span><b>${o.t}</b><small>${o.s}</small></button>`}
function dashHtml(){
  const m=S.month,a=inMonth(m),exp=sum(a,'exp');const T=[];
  const C=cars(),al=carAlerts();
  T.push({i:'car',c:'#3E7CB1',attr:'data-tab="cars"',t:'السيارات',st:al.length?'alert':C.length?'good':'',s:!C.length?'أضف سيارتك لمتابعة التأمين والملكية والصيانة':al.length?esc(al[0].text)+(al.length>1?' (+'+(al.length-1)+')':''):(C.length===1?'سيارة واحدة':C.length+' سيارات')+' · كل شيء ساري'});
  const st=recStatus(m);const late=st.R.filter(r=>!recPaid(r,m)&&(m<ym(new Date())||(m===ym(new Date())&&new Date().getDate()>(+r.day||1))));
  T.push({i:'bills',c:'#6B5CA5',attr:'data-tab="house"',t:'الالتزامات الشهرية',st:late.length?'alert':st.R.length&&!st.left?'good':'',s:!st.R.length?'الإنترنت والكهرباء والإيجار في مكان واحد':!st.left?'دفعت كلها هذا الشهر':'باقي '+st.left+' من '+st.R.length+(late.length?' · '+late.length+' متأخر':'')});
  const P=people(),po=byPerson(a);const pt=P.reduce((s,p)=>s+(po[p.id]||0),0);const over=P.filter(p=>+p.allowance&&(po[p.id]||0)>+p.allowance);
  T.push({i:'family',c:'#2F7F7A',attr:'data-tab="house"',t:'الأهل والبيت',st:over.length?'alert':'',s:!P.length?'وزّع المصاريف على أفراد أسرتك':over.length?'تجاوزت مخصص '+esc(over[0].name):P.length+' أشخاص · صُرف <span class="num">'+money(pt)+'</span>'});
  const gs=goalsSummary();
  T.push({i:'plan',c:'#2E8B72',attr:'data-tab="budget"',t:'خطة الادخار',st:gs.G.length&&gs.total<0.0005?'good':'',s:!gs.G.length?'خطط لرمضان والعيدين والتأمين':gs.total>0.0005?'ادّخر <span class="num">'+money(gs.total)+'</span> هذا الشهر'+(gs.near?' · أقربها '+esc(gs.near.g.name):''):'حصة هذا الشهر مكتملة'});
  const B=+S.settings.monthlyBudget||0;let bs='حدّد سقفًا شهريًا لمصاريفك',bst='';
  if(B){const d=new Date();const dl=new Date(d.getFullYear(),d.getMonth()+1,0).getDate()-d.getDate()+1;bs=exp>B?'تجاوزت بـ <span class="num">'+money(exp-B)+'</span>':'صرفت '+Math.round(exp/B*100)+'%'+(m===ym(d)?' · يوميًا <span class="num">'+money((B-exp)/dl)+'</span>':'');bst=exp>B?'alert':''}
  T.push({i:'budget',c:'#B0662F',attr:'data-tab="budget"',t:'الميزانية',st:bst,s:bs});
  T.push({i:'log',c:'#24508C',attr:'data-tab="log"',t:'السجل',s:a.length?a.length+' عملية في '+MONTHS[+m.slice(5)-1]:'لا عمليات هذا الشهر بعد'});
  T.push({i:'rep',c:'#C2562F',attr:'data-tab="reports"',t:'التقارير',s:'شهري وسنوي، وتنزيل Excel'});
  T.push({i:'sms',c:'#7A6CC0',attr:'id="openImp2"',t:'رسائل البنك',s:'الصق رسالة الخصم لتسجيلها'});
  return `<div class="dash">${T.map(tile).join('')}</div>`;
}

/* ---------- house: people & monthly bills ---------- */
const REC_KINDS={
 wifi:{n:'واي فاي وإنترنت المنزل',cat:'bills'},phone:{n:'باقة الهاتف',cat:'bills'},
 elec:{n:'فاتورة الكهرباء',cat:'bills',variable:1},water:{n:'فاتورة المياه',cat:'bills',variable:1},
 rent:{n:'إيجار المنزل',cat:'home'},maid:{n:'راتب العاملة المنزلية',cat:'home'},
 loan:{n:'قسط شهري',cat:'loan'},family:{n:'مصروف شهري للأهل',cat:'family'},custom:{n:'التزام آخر',cat:'other'}
};
const AV_COLORS=['#2F7F7A','#8A4F7D','#B0662F','#3E7CB1','#6B5CA5','#C2562F','#3B8F5A','#A0527B'];
function people(){return S.settings.people||[]}
function recs(){return S.settings.recurring||[]}
function personName(id){const p=people().find(x=>x.id===id);return p?p.name:'شخص محذوف'}
function personColor(id){const i=people().findIndex(x=>x.id===id);return AV_COLORS[(i<0?0:i)%AV_COLORS.length]}
function recPaid(r,m){return list().find(t=>t.rec===r.id&&t.date&&t.date.slice(0,7)===m)}
function recDate(r,m){const [y,mm]=m.split('-').map(Number);const dim=new Date(y,mm,0).getDate();const d=Math.min(Math.max(1,+r.day||1),dim);return m+'-'+String(d).padStart(2,'0')}
function recStatus(m){const R=recs();const paid=R.filter(r=>recPaid(r,m));const total=R.reduce((s,r)=>s+(+r.amount||0),0);
  const paidAmt=paid.reduce((s,r)=>s+(+recPaid(r,m).amount||0),0);return{R,paid,total,paidAmt,left:R.length-paid.length}}
function byPerson(a){const o={};a.filter(t=>t.type==='exp').forEach(t=>{const k=t.person||'';o[k]=(o[k]||0)+(+t.amount||0)});return o}
function personSplitHtml(a,title){const o=byPerson(a);const tot=Object.values(o).reduce((s,v)=>s+v,0);if(!tot)return '';
  const rows=[['', 'لي وللبيت']].concat(people().map(p=>[p.id,p.name])).concat(Object.keys(o).filter(k=>k&&!people().find(p=>p.id===k)).map(k=>[k,'شخص محذوف']));
  return `<h2>${title}</h2><div class="panel">${rows.filter(([k])=>o[k]).sort((x,y)=>o[y[0]]-o[x[0]]).map(([k,n])=>{const v=o[k];const col=k?personColor(k):'var(--accent)';
    return `<div class="catrow"><span class="dot" style="background:${col}"></span><div class="name">${esc(n)} <small class="num">${Math.round(v/tot*100)}%</small><div class="meter"><i style="width:${v/tot*100}%;background:${col}"></i></div></div><span class="num">${money(v)}</span></div>`}).join('')}</div>`}

function vHouse(){
  const m=S.month,a=inMonth(m);const st=recStatus(m);const cur=m===ym(new Date());const todayD=new Date().getDate();
  const recRows=st.R.slice().sort((x,y)=>(+x.day||0)-(+y.day||0)).map(r=>{const p=recPaid(r,m);
    const late=!p&&(m<ym(new Date())||(cur&&todayD>(+r.day||1)));
    const pill=p?`<span class="pill paid">دُفع <span class="num">${money(p.amount)}</span></span>`:late?'<span class="pill late">متأخر</span>':`<span class="pill soon">يوم ${+r.day||1}</span>`;
    return `<div class="recrow"><div><b>${esc(r.name)}</b><small><span class="num">${money(r.amount)}</span> ${CUR}${REC_KINDS[r.kind]&&REC_KINDS[r.kind].variable?' تقريبًا':''} · كل شهر يوم ${+r.day||1}${r.person?' · لـ'+esc(personName(r.person)):''}</small></div>
      <div class="recact">${pill}${p?'':`<button class="chip pay" data-rpay="${esc(r.id)}">دفعت</button>`}<button class="chip" data-redit="${esc(r.id)}" aria-label="تعديل ${esc(r.name)}">تعديل</button></div></div>`}).join('');
  const have=new Set(st.R.map(r=>r.kind));
  const recAdds=Object.entries(REC_KINDS).filter(([k])=>k==='custom'||k==='family'||!have.has(k)).map(([k,v])=>`<button class="chip" data-radd="${k}">+ ${esc(v.n)}</button>`).join('');
  const P=people();const po=byPerson(a);
  const pCards=P.map(p=>{const spent=po[p.id]||0;const al=+p.allowance||0;const pct=al?Math.min(100,spent/al*100):0;
    return `<div class="person"><div class="top2"><div style="display:flex;gap:10px;align-items:center;min-width:0"><span class="avatar" style="background:${personColor(p.id)}22;color:${personColor(p.id)}">${esc(p.name.charAt(0))}</span><div style="min-width:0"><b style="font-weight:600">${esc(p.name)}</b><div class="note">${esc(p.rel||'')}</div></div></div>
      <div class="gm"><span>صُرف هذا الشهر</span><b class="num" style="font-size:17px">${money(spent)}</b></div></div>
      ${al?`<div class="meter"><i class="${spent>al?'over':pct>80?'near':''}" style="width:${pct}%"></i></div><div class="budgetline" style="margin:0"><span>المخصص الشهري <b class="num">${money(al)}</b></span><span>${spent>al?'تجاوز بـ <b class="num amt-exp">'+money(spent-al)+'</b>':'متبقٍ <b class="num">'+money(al-spent)+'</b>'}</span></div>`:''}
      <div class="gbtns"><button class="chip" data-pspend="${esc(p.id)}">+ مصروف لـ${esc(p.name)}</button><button class="chip" data-pedit="${esc(p.id)}">تعديل</button></div></div>`}).join('');
  return `<h2 style="margin-top:4px">الالتزامات الشهرية</h2>
  ${st.R.length?`<div class="planbox"><span class="note" style="color:var(--fg)">${st.left?'دفعت '+st.paid.length+' من '+st.R.length+' التزامات هذا الشهر':'دفعت كل التزامات هذا الشهر'}</span>
    <span class="big2"><span class="num">${money(st.paidAmt)}</span> <small style="font-size:14px;font-weight:400">من <span class="num">${money(st.total)}</span> ${CUR}</small></span></div>
    <div class="panel" style="margin-top:10px;padding-block:4px">${recRows}</div>
    ${st.left>1?`<button class="btn ghost block" id="payAll" style="margin-top:10px">تسجيل كل المتبقي بنفس المبالغ</button>`:''}`
   :`<div class="panel empty" style="padding:18px 12px"><b>رتّب فواتيرك الشهرية في مكان واحد</b>أضف الإنترنت والكهرباء والإيجار وأي التزام يتكرر كل شهر. كل شهر تضغط «دفعت» فيُسجَّل المصروف تلقائيًا، وتعرف ما بقي عليك.</div>`}
  <div class="chips" style="margin-top:12px">${recAdds}</div>
  <h2>الأهل والبيت</h2>
  ${P.length?`<div class="panel" style="padding-block:2px">${pCards}</div>`:`<div class="panel empty" style="padding:18px 12px"><b>وزّع مصاريفك على أفراد أسرتك</b>أضف أسماء من تصرف عليهم، مثل الوالدة أو الزوجة أو الأبناء، وحدّد لكل واحد مبلغًا شهريًا إن أردت. بعدها اختر الاسم عند تسجيل أي مصروف.</div>`}
  <div class="chips" style="margin-top:12px"><button class="chip" data-padd="1">+ إضافة شخص</button></div>
  ${personSplitHtml(a,'توزيع مصاريف '+esc(MONTHS[+m.slice(5)-1]))}`;
}

function openPerson(id){
  const L=document.getElementById('layer');const P=S.settings.people||(S.settings.people=[]);const ex=id?P.find(x=>x.id===id):null;
  const p=ex?Object.assign({},ex):{id:uidGen(),name:'',rel:'',allowance:''};let askDel=false;
  const draw=()=>{L.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="شخص"><div class="in"><div class="grab"></div>
   <h2 style="margin-top:0">${ex?'تعديل '+esc(ex.name):'إضافة شخص'}</h2><div class="stack">
   <div class="field"><label for="pName">الاسم</label><input class="inp" id="pName" value="${esc(p.name)}" placeholder="مثال: أم محمد" maxlength="30"></div>
   <div class="field"><label for="pRel">صلة القرابة (اختياري)</label><input class="inp" id="pRel" value="${esc(p.rel)}" placeholder="الوالدة، الزوجة، الابن، الأخ…" maxlength="30" list="relList"><datalist id="relList">${['الوالدة','الوالد','الزوجة','الابن','الابنة','الأخ','الأخت','الجدة','العاملة المنزلية'].map(r=>`<option value="${r}">`).join('')}</datalist></div>
   <div class="field"><label for="pAl">المخصص الشهري (اختياري)</label><input class="inp num" id="pAl" inputmode="decimal" value="${p.allowance?money(p.allowance):''}" placeholder="0.000" style="text-align:left"></div>
   <p class="note" style="margin:0">المخصص يساعدك تعرف هل تجاوزت ما حددته لهذا الشخص في الشهر.</p>
   <p class="note" id="pErr" hidden style="color:var(--exp);margin:0"></p>
   <button class="btn block" id="pSave">حفظ</button>
   ${ex?(askDel?'<div class="confirm"><span>حذف هذا الشخص؟ تبقى مصاريفه المسجلة كما هي.</span><div class="row2"><button class="btn danger" id="pDel">نعم، احذف</button><button class="btn ghost" id="pDelNo">تراجع</button></div></div>':'<button class="btn ghost block" id="pDelAsk" style="color:var(--exp)">حذف</button>'):'<button class="btn ghost block" data-close>إلغاء</button>'}
   </div></div></div>`};
  const grab=()=>{p.name=document.getElementById('pName').value;p.rel=document.getElementById('pRel').value;p.allowance=document.getElementById('pAl').value};
  L.onchange=L.oninput=null;
  L.onclick=e=>{const x=e.target.closest('button,[data-close]');if(!x)return;
    if(x.hasAttribute('data-close')){L.innerHTML='';return}
    if(x.id==='pDelAsk'){grab();askDel=true;draw();return}
    if(x.id==='pDelNo'){grab();askDel=false;draw();return}
    if(x.id==='pDel'){S.settings.people=P.filter(y=>y.id!==p.id);L.innerHTML='';putSettings();render();toast('حُذف');return}
    if(x.id==='pSave'){grab();if(!p.name.trim()){const er=document.getElementById('pErr');er.hidden=false;er.textContent='اكتب الاسم';return}
      const rec={id:p.id,name:p.name.trim(),rel:p.rel.trim(),allowance:parseAmt(p.allowance)};const i=P.findIndex(y=>y.id===p.id);if(i>=0)P[i]=rec;else P.push(rec);
      L.innerHTML='';putSettings();render();toast('حُفظ '+rec.name)}};
  draw();
}
function openRec(id,kind){
  const L=document.getElementById('layer');const R=S.settings.recurring||(S.settings.recurring=[]);const ex=id?R.find(x=>x.id===id):null;
  const k=REC_KINDS[ex?ex.kind:kind]||REC_KINDS.custom;
  const r=ex?Object.assign({},ex):{id:uidGen(),kind:kind,name:kind==='custom'?'':k.n,amount:'',cat:k.cat,day:kind==='rent'?1:5,person:''};let askDel=false;
  const draw=()=>{L.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="التزام شهري"><div class="in"><div class="grab"></div>
   <h2 style="margin-top:0">${ex?'تعديل الالتزام':'التزام شهري جديد'}</h2><div class="stack">
   <div class="field"><label for="rName">الاسم</label><input class="inp" id="rName" value="${esc(r.name)}" placeholder="مثال: اشتراك النادي" maxlength="40"></div>
   <div class="row2"><div class="field"><label for="rAmt">المبلغ الشهري${k.variable?' (تقريبي)':''}</label><input class="inp num" id="rAmt" inputmode="decimal" value="${r.amount!==''?esc(r.amount):''}" placeholder="0.000" style="text-align:left"></div>
   <div class="field"><label for="rDay">يوم الدفع في الشهر</label><input class="inp num" id="rDay" type="number" min="1" max="31" value="${esc(r.day)}" style="text-align:left"></div></div>
   <div class="row2"><div class="field"><label for="rCat">الفئة</label><select class="inp" id="rCat">${EXP_CATS.map(c=>`<option value="${c.id}" ${r.cat===c.id?'selected':''}>${esc(c.n)}</option>`).join('')}</select></div>
   <div class="field"><label for="rPerson">لمن؟</label><select class="inp" id="rPerson"><option value="">لي / للبيت</option>${people().map(p=>`<option value="${esc(p.id)}" ${r.person===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div></div>
   ${k.variable?'<p class="note" style="margin:0">المبلغ يتغير كل شهر، لذلك عند الضغط على «دفعت» تكتب المبلغ الفعلي من الفاتورة.</p>':''}
   <p class="note" id="rErr" hidden style="color:var(--exp);margin:0"></p>
   <button class="btn block" id="rSave">حفظ</button>
   ${ex?(askDel?'<div class="confirm"><span>حذف هذا الالتزام؟ تبقى الدفعات السابقة في السجل.</span><div class="row2"><button class="btn danger" id="rDel">نعم، احذف</button><button class="btn ghost" id="rDelNo">تراجع</button></div></div>':'<button class="btn ghost block" id="rDelAsk" style="color:var(--exp)">حذف الالتزام</button>'):'<button class="btn ghost block" data-close>إلغاء</button>'}
   </div></div></div>`};
  const grab=()=>{r.name=document.getElementById('rName').value;r.amount=document.getElementById('rAmt').value;r.day=document.getElementById('rDay').value;r.cat=document.getElementById('rCat').value;r.person=document.getElementById('rPerson').value};
  L.onchange=L.oninput=null;
  L.onclick=e=>{const x=e.target.closest('button,[data-close]');if(!x)return;
    if(x.hasAttribute('data-close')){L.innerHTML='';return}
    if(x.id==='rDelAsk'){grab();askDel=true;draw();return}
    if(x.id==='rDelNo'){grab();askDel=false;draw();return}
    if(x.id==='rDel'){S.settings.recurring=R.filter(y=>y.id!==r.id);L.innerHTML='';putSettings();render();toast('حُذف الالتزام');return}
    if(x.id==='rSave'){grab();const er=document.getElementById('rErr');const amt=parseAmt(r.amount);const day=Math.min(31,Math.max(1,parseInt(r.day)||1));
      if(!r.name.trim()){er.hidden=false;er.textContent='اكتب اسم الالتزام';return}
      if(!amt){er.hidden=false;er.textContent='اكتب المبلغ الشهري، مثل 25.000';return}
      const rec={id:r.id,kind:r.kind,name:r.name.trim(),amount:amt,cat:r.cat,day,person:r.person||''};const i=R.findIndex(y=>y.id===r.id);if(i>=0)R[i]=rec;else R.push(rec);
      L.innerHTML='';putSettings();render();toast('حُفظ '+rec.name)}};
  draw();
}
function recTx(r,m){const tx={id:uidGen(),type:'exp',amount:+r.amount,cat:r.cat,date:m===ym(new Date())?today():recDate(r,m),method:'transfer',note:r.name,createdAt:new Date().toISOString(),rec:r.id};if(r.person)tx.person=r.person;if(!txCol)tx.localOnly=true;return tx}
function payRec(id){const r=recs().find(x=>x.id===id);if(!r)return;const t=recTx(r,S.month);t.amount=String(r.amount);openSheet(null,t)}
async function payAll(){const m=S.month;let n=0;for(const r of recs()){if(recPaid(r,m))continue;await putTx(recTx(r,m));n++}toast('سُجّلت '+n+' دفعات')}

/* ---------- yearly report ---------- */
function vYear(){
  const y=S.month.slice(0,4);const ms=[...Array(12)].map((_,i)=>y+'-'+String(i+1).padStart(2,'0'));
  const data=ms.map(m=>{const a=inMonth(m);return{m,inc:sum(a,'inc'),exp:sum(a,'exp'),n:a.length}});
  const ya=list().filter(t=>t.date&&t.date.slice(0,4)===y);
  const inc=sum(ya,'inc'),exp=sum(ya,'exp'),active=data.filter(d=>d.n).length;
  const maxV=Math.max(1,...data.map(d=>Math.max(d.inc,d.exp)));const step=niceStep(maxV/4),top=Math.ceil(maxV/step)*step;
  const W=340,H=180,L=40,R=6,T=10,Bm=22,ch=H-T-Bm,cw=(W-L-R)/12;
  let svg=`<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="الدخل والمصاريف لكل شهر في ${y}" style="direction:ltr;font-family:var(--f-body)">`;
  for(let v=0;v<=top+1e-9;v+=step){const yy=T+ch-v/top*ch;svg+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="var(--line)" stroke-width="1"/><text x="${L-5}" y="${yy+4}" text-anchor="end" font-size="9.5" fill="var(--muted)">${fmtK(v)}</text>`}
  data.forEach((d,i)=>{const bw=cw*0.34,x0=L+i*cw+cw*0.14;const hi=d.inc/top*ch,he=d.exp/top*ch;
    svg+=`<rect x="${x0}" y="${T+ch-hi}" width="${bw}" height="${hi}" rx="2" fill="var(--inc)"/><rect x="${x0+bw+1}" y="${T+ch-he}" width="${bw}" height="${he}" rx="2" fill="var(--exp)"/>`;
    svg+=`<text x="${L+i*cw+cw/2}" y="${H-6}" text-anchor="middle" font-size="10" fill="${d.m===S.month?'var(--fg)':'var(--muted)'}" font-weight="${d.m===S.month?700:400}">${i+1}</text>`});
  svg+='</svg>';
  const byCat={};ya.filter(t=>t.type==='exp').forEach(t=>byCat[t.cat]=(byCat[t.cat]||0)+(+t.amount));
  const cats=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const maxM=data.filter(d=>d.exp).sort((a,b)=>b.exp-a.exp)[0];
  const recYear={};ya.filter(t=>t.rec).forEach(t=>{const r=recs().find(x=>x.id===t.rec);const n=r?r.name:(t.note||'التزام');recYear[n]=(recYear[n]||0)+(+t.amount)});
  const recTot=Object.values(recYear).reduce((s,v)=>s+v,0);
  const monthRows=data.filter(d=>d.n).map(d=>`<div class="sumrow"><span>${MONTHS[+d.m.slice(5)-1]}</span><span><span class="num amt-inc">+${money(d.inc)}</span> &nbsp; <span class="num amt-exp">−${money(d.exp)}</span> &nbsp; <b class="num">${money(d.inc-d.exp)}</b></span></div>`).join('');
  return `<div class="monthbar" style="margin-bottom:0"><button data-yshift="1" aria-label="السنة التالية">›</button><strong>سنة ${y}</strong><button data-yshift="-1" aria-label="السنة السابقة">‹</button></div>
  <h2>ملخص السنة</h2>
  <div class="stats">
   <div class="stat"><span>إجمالي الدخل</span><b class="num amt-inc">${money(inc)}</b></div>
   <div class="stat"><span>إجمالي المصاريف</span><b class="num amt-exp">${money(exp)}</b></div>
   <div class="stat"><span>الصافي (المدّخر)</span><b class="num ${inc-exp<0?'amt-exp':''}">${money(inc-exp)}</b></div>
   <div class="stat"><span>متوسط الصرف الشهري</span><b class="num">${money(active?exp/active:0)}</b></div>
   <div class="stat"><span>نسبة الادخار</span><b class="num">${inc?Math.round((inc-exp)/inc*100)+'%':'—'}</b></div>
   <div class="stat"><span>أعلى شهر صرفًا</span><b style="font-size:15px">${maxM?MONTHS[+maxM.m.slice(5)-1]:'—'}</b></div>
  </div>
  <h2>كل شهر في ${y}</h2><div class="panel">${svg}<div class="legend"><span><i style="background:var(--inc)"></i>الدخل</span><span><i style="background:var(--exp)"></i>المصاريف</span></div></div>
  ${monthRows?`<div class="panel" style="margin-top:10px">${monthRows}</div>`:''}
  ${cats.length?`<h2>المصاريف حسب الفئة</h2><div class="panel">${cats.map(([id,v])=>{const c=catOf(id);return `<div class="catrow">${cbadge(c.id)}<div class="name">${esc(c.n)} <small class="num">${exp?Math.round(v/exp*100):0}%</small><div class="meter"><i style="width:${v/cats[0][1]*100}%;background:${c.c}"></i></div></div><span class="num">${money(v)}</span></div>`}).join('')}</div>`:''}
  ${personSplitHtml(ya,'المصاريف حسب الأشخاص')}
  ${(()=>{const o={};ya.filter(t=>t.car&&t.type==='exp').forEach(t=>o[t.car]=(o[t.car]||0)+(+t.amount));const e=Object.entries(o);if(!e.length)return '';const tt=e.reduce((s,x)=>s+x[1],0);return `<h2>تكاليف السيارات خلال السنة</h2><div class="panel">${e.sort((a,b)=>b[1]-a[1]).map(([id,v])=>`<div class="sumrow"><span>${esc(carName(id))}</span><b class="num">${money(v)}</b></div>`).join('')}${e.length>1?`<div class="sumrow"><b>المجموع</b><b class="num">${money(tt)}</b></div>`:''}</div>`})()}
  ${recTot?`<h2>الالتزامات الشهرية خلال السنة</h2><div class="panel">${Object.entries(recYear).sort((a,b)=>b[1]-a[1]).map(([n,v])=>`<div class="sumrow"><span>${esc(n)}</span><b class="num">${money(v)}</b></div>`).join('')}<div class="sumrow"><b>المجموع</b><b class="num">${money(recTot)}</b></div></div>`:''}`;
}
function reportsMonthExtras(){const m=S.month,a=inMonth(m),st=recStatus(m);
  return personSplitHtml(a,'المصاريف حسب الأشخاص')+(st.R.length?`<h2>الالتزامات الشهرية</h2><div class="panel"><div class="sumrow"><span>المدفوع</span><b class="num">${money(st.paidAmt)}</b></div><div class="sumrow"><span>عدد المدفوع</span><b>${st.paid.length} من ${st.R.length}</b></div><div class="sumrow"><span>المتوقع شهريًا</span><b class="num">${money(st.total)}</b></div></div>`:'')}

/* ---------- savings goals ---------- */
const GOAL_KINDS={
 ramadan:{n:'رمضان',hint:'مقاضي رمضان والإفطارات والصدقات',hijri:[9,1]},
 fitr:{n:'عيد الفطر',hint:'ملابس العيد والعيادي والهدايا',hijri:[10,1]},
 adha:{n:'عيد الأضحى',hint:'الأضحية والعيادي والملابس',hijri:[12,10]},
 insurance:{n:'تأمين المركبة',hint:'تجديد التأمين السنوي'},
 mulkiya:{n:'تجديد ملكية المركبة',hint:'رسوم التجديد والفحص'},
 custom:{n:'هدف آخر',hint:'مثل: سفر، جهاز، رسوم دراسية'}
};
const HIJRI_FALLBACK={'9-1':['2027-02-08','2028-01-28','2029-01-16','2030-01-05'],'10-1':['2027-03-09','2028-02-26','2029-02-14','2030-02-04'],'12-10':['2027-05-16','2028-05-05','2029-04-24','2030-04-13']};
function isoD(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
let hijriFmt=null;try{hijriFmt=new Intl.DateTimeFormat('en-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric'});if(hijriFmt.resolvedOptions().calendar!=='islamic-umalqura')hijriFmt=null}catch(e){hijriFmt=null}
const hijriCache={};
function nextHijri(m,d,fromIso){const ck=m+'-'+d+'@'+fromIso;if(hijriCache[ck])return hijriCache[ck];let r=null;
  if(hijriFmt){const x=new Date(fromIso+'T12:00');for(let i=0;i<400;i++){const p=hijriFmt.formatToParts(x);const hm=+(p.find(q=>q.type==='month')||{}).value,hd=+(p.find(q=>q.type==='day')||{}).value;if(hm===m&&hd===d){r=isoD(x);break}x.setDate(x.getDate()+1)}}
  if(!r){const l=HIJRI_FALLBACK[m+'-'+d]||[];r=l.find(s=>s>=fromIso)||l[l.length-1]}
  return hijriCache[ck]=r}
function monthsWord(n){return n===1?'شهر واحد':n===2?'شهران':n<=10?n+' أشهر':n+' شهرًا'}
function daysWord(n){return n===1?'يوم واحد':n===2?'يومان':n<=10?n+' أيام':n+' يومًا'}
function goalCalc(g){const tgt=+g.target||0,sv=+g.saved||0,rem=Math.max(0,tgt-sv);
  const due=new Date(g.due+'T12:00');const dl=new Date(due);const k=GOAL_KINDS[g.kind]||GOAL_KINDS.custom;if(k.hijri)dl.setDate(dl.getDate()-7);
  const now=new Date();const days=Math.ceil((due-now)/864e5);
  let months=(dl.getFullYear()*12+dl.getMonth())-(now.getFullYear()*12+now.getMonth())+1;if(months<1)months=1;
  const stm=Math.min(sv,+((g.log||{})[ym(now)])||0);const plan=(rem+stm)/months;const left=Math.max(0,plan-stm);
  return{tgt,sv,rem,days,months,monthly:plan,left,stm,done:tgt>0&&sv>=tgt,past:days<0,pct:tgt?Math.min(100,sv/tgt*100):0,dl}}
function goalDate(g){const d=new Date(g.due+'T12:00');return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear()+((GOAL_KINDS[g.kind]||{}).hijri?' (تقريبًا)':'')}
function goalsSummary(){const G=(S.settings.goals||[]).map(g=>({g,c:goalCalc(g)})).filter(x=>!x.c.past);
  const total=G.reduce((s,x)=>s+x.c.left,0),plan=G.reduce((s,x)=>s+x.c.monthly,0);const near=G.slice().sort((a,b)=>a.g.due.localeCompare(b.g.due))[0];return{G,total,plan,near}}
function goalsHtml(){
  const all=(S.settings.goals||[]).slice().sort((a,b)=>a.due.localeCompare(b.due));
  const {total:leftNow,plan:total}=goalsSummary();
  const ms=[1,2,3].map(k=>shiftMonth(ym(new Date()),-k)).map(m=>{const a=inMonth(m);return a.length?sum(a,'inc')-sum(a,'exp'):null}).filter(v=>v!==null);
  const avg=ms.length?ms.reduce((a,b)=>a+b,0)/ms.length:null;
  let advice='';
  if(all.length&&total>0){
    if(avg===null)advice='<div class="note">بعد أن تسجّل دخلك ومصاريفك لشهر كامل، سأقارن الخطة بما يتبقى لك فعلًا كل شهر.</div>';
    else if(total>avg)advice=`<div class="warnbox">تحتاج إلى ادخار <b class="num">${money(total)}</b> شهريًا، بينما متوسط ما تبقّى لك في آخر ${ms.length===1?'شهر':monthsWord(ms.length)} هو <b class="num">${money(avg)}</b>. خفّض مبلغ بعض الأهداف، أو قلّل الصرف في أكبر فئة عندك.</div>`;
    else advice=`<div class="okbox">خطتك ممكنة: يتبقى لك في المتوسط <b class="num">${money(avg)}</b> شهريًا، والخطة تحتاج منه <b class="num">${money(total)}</b> (${Math.round(total/avg*100)}%).</div>`}
  const have=new Set(all.map(g=>g.kind));
  const adds=Object.entries(GOAL_KINDS).filter(([k])=>k==='custom'||!have.has(k)).map(([k,v])=>`<button class="chip" data-gadd="${k}">+ ${esc(v.n)}</button>`).join('');
  const cards=all.map(g=>{const c=goalCalc(g);
    const status=c.past?'حان موعده':c.days===0?'اليوم':'بعد '+daysWord(c.days);
    return `<div class="goal${c.done?' done':''}"><div class="ghead"><div><b>${esc(g.name)}</b><small>${esc(goalDate(g))} · ${status}</small></div>
      <div class="gm">${!c.tgt?'<span>المبلغ المطلوب</span><b style="font-size:14px">لم يُحدَّد</b>':c.done?'<span>الحالة</span><b class="amt-inc" style="font-size:15px">اكتمل</b>':c.past?'<span>المتبقي</span><b class="num">'+money(c.rem)+'</b>':'<span>ادّخر شهريًا</span><b class="num">'+money(c.monthly)+'</b>'}</div></div>
      ${c.tgt?`<div class="meter"><i style="width:${c.pct}%;${c.done?'background:var(--inc)':''}"></i></div>
      <div class="budgetline" style="margin:0"><span>ادّخرت <b class="num">${money(c.sv)}</b> من <b class="num">${money(c.tgt)}</b></span><span>${c.past||c.done?'':c.stm&&c.left<0.0005?'حصة هذا الشهر مكتملة':c.stm?'باقٍ هذا الشهر '+money(c.left):'خلال '+monthsWord(c.months)}</span></div>`:''}
      <div class="gbtns">${c.tgt?`<button class="chip" data-gdep="${esc(g.id)}">+ أضفت مبلغًا للادخار</button>`:''}<button class="chip" data-gedit="${esc(g.id)}">${c.tgt?'تعديل':'تحديد المبلغ'}</button>${c.past&&g.repeat!=='once'?`<button class="chip" data-gnext="${esc(g.id)}">ابدأ خطة العام القادم</button>`:''}</div></div>`}).join('');
  return `<h2 style="margin-top:4px">خطة الادخار للمناسبات</h2>
  ${all.length?`<div class="planbox"><span class="note" style="color:var(--fg)">${leftNow>0.0005?"المتبقي لتدّخره هذا الشهر لكل أهدافك":"ادّخرت حصة هذا الشهر لكل أهدافك"}</span><span class="big2"><span class="num">${money(leftNow)}</span> <small style="font-size:14px;font-weight:400">${CUR}</small></span>${advice}</div>
  <div class="stack" style="margin-top:10px">${cards}</div>`:`<div class="panel empty" style="padding:18px 12px"><b>خطط لمصاريف المناسبات قبل وقتها</b>اختر هدفًا، وحدّد المبلغ الذي تحتاجه، وسأحسب لك كم تدّخر كل شهر حتى موعده. مواعيد رمضان والعيدين تُحسب تلقائيًا.</div>`}
  <div class="chips" style="margin-top:12px">${adds}</div>`;
}
function openGoal(id,kind){
  const L=document.getElementById('layer');const G=S.settings.goals||(S.settings.goals=[]);
  const ex=id?G.find(x=>x.id===id):null;
  const k=GOAL_KINDS[ex?ex.kind:kind]||GOAL_KINDS.custom;
  const g=ex?Object.assign({},ex):{id:uidGen(),kind:kind,name:kind==='custom'?'':k.n,target:'',saved:'',due:k.hijri?nextHijri(k.hijri[0],k.hijri[1],today()):'',repeat:kind==='custom'?'once':'yearly'};
  let askDel=false;
  const draw=()=>{L.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(k.n)}"><div class="in"><div class="grab"></div>
   <h2 style="margin-top:0">${ex?'تعديل الهدف':'هدف جديد: '+esc(k.n)}</h2>
   <div class="stack">
    <div class="field"><label for="gName">اسم الهدف</label><input class="inp" id="gName" value="${esc(g.name)}" placeholder="${esc(k.hint)}" maxlength="40"></div>
    <div class="row2"><div class="field"><label for="gTarget">المبلغ المطلوب (${CUR})</label><input class="inp num" id="gTarget" inputmode="decimal" value="${g.target!==''?esc(g.target):''}" placeholder="0.000" style="text-align:left"></div>
    <div class="field"><label for="gSaved">ادّخرت منه حتى الآن</label><input class="inp num" id="gSaved" inputmode="decimal" value="${g.saved!==''?esc(g.saved):''}" placeholder="0.000" style="text-align:left"></div></div>
    <div class="field"><label for="gDue">${k.hijri?'تاريخ المناسبة':kind==='insurance'||g.kind==='insurance'?'تاريخ انتهاء التأمين':g.kind==='mulkiya'||kind==='mulkiya'?'تاريخ انتهاء الملكية':'الموعد'}</label><input class="inp" type="date" id="gDue" value="${esc(g.due)}"></div>
    ${k.hijri?'<p class="note" style="margin:0">التاريخ محسوب بتقويم أم القرى وقد يختلف يومًا حسب رؤية الهلال. أحسب الادخار ليكتمل قبل المناسبة بأسبوع لتتسوّق مبكرًا.</p>':''}
    <div class="field"><label for="gRepeat">التكرار</label><select class="inp" id="gRepeat"><option value="yearly" ${g.repeat!=='once'?'selected':''}>يتكرر كل سنة</option><option value="once" ${g.repeat==='once'?'selected':''}>مرة واحدة</option></select></div>
    <p class="note" id="gErr" hidden style="color:var(--exp);margin:0"></p>
    <button class="btn block" id="gSave">حفظ الهدف</button>
    ${ex?(askDel?'<div class="confirm"><span>حذف هذا الهدف؟</span><div class="row2"><button class="btn danger" id="gDel">نعم، احذف</button><button class="btn ghost" id="gDelNo">تراجع</button></div></div>':'<button class="btn ghost block" id="gDelAsk" style="color:var(--exp)">حذف الهدف</button>'):'<button class="btn ghost block" data-close>إلغاء</button>'}
   </div></div></div>`};
  const grab=()=>{g.name=document.getElementById('gName').value;g.target=document.getElementById('gTarget').value;g.saved=document.getElementById('gSaved').value;g.due=document.getElementById('gDue').value;g.repeat=document.getElementById('gRepeat').value};
  L.onchange=L.oninput=null;
  L.onclick=e=>{const x=e.target.closest('button,[data-close]');if(!x)return;
    if(x.hasAttribute('data-close')){L.innerHTML='';return}
    if(x.id==='gDelAsk'){grab();askDel=true;draw();return}
    if(x.id==='gDelNo'){grab();askDel=false;draw();return}
    if(x.id==='gDel'){S.settings.goals=G.filter(y=>y.id!==g.id);L.innerHTML='';putSettings();render();toast('حُذف الهدف');return}
    if(x.id==='gSave'){grab();const err=document.getElementById('gErr');const t=parseAmt(g.target);
      if(!g.name.trim()){err.hidden=false;err.textContent='اكتب اسمًا للهدف';return}
      if(!t){err.hidden=false;err.textContent='اكتب المبلغ الذي تحتاجه، مثل 300.000';return}
      if(!g.due){err.hidden=false;err.textContent='اختر تاريخ الموعد';return}
      const rec={id:g.id,kind:g.kind,name:g.name.trim(),target:t,saved:parseAmt(g.saved),due:g.due,repeat:g.repeat,log:g.log||{}};
      const i=G.findIndex(y=>y.id===g.id);if(i>=0)G[i]=rec;else G.push(rec);
      L.innerHTML='';putSettings();render();toast('حُفظ الهدف');}
  };
  draw();
}
function openDeposit(id){
  const L=document.getElementById('layer');const g=(S.settings.goals||[]).find(x=>x.id===id);if(!g)return;const c=goalCalc(g);
  L.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="إضافة للادخار"><div class="in"><div class="grab"></div>
   <h2 style="margin-top:0">أضفت مبلغًا لادخار ${esc(g.name)}</h2>
   <div class="amtbox"><input id="dAmt" inputmode="decimal" placeholder="0.000" value="${c.left>0.0005&&!c.done?money(c.left):''}" aria-label="المبلغ"><span>${CUR}</span></div>
   <p class="note" style="text-align:center;margin:0 0 12px">المتبقي لهذا الشهر: <span class="num">${money(c.left)}</span></p>
   <div class="stack"><button class="btn block" id="dSave">حفظ</button><button class="btn ghost block" data-close>إلغاء</button></div></div></div>`;
  L.onchange=L.oninput=null;
  L.onclick=e=>{const x=e.target.closest('button,[data-close]');if(!x)return;
    if(x.hasAttribute('data-close')){L.innerHTML='';return}
    if(x.id==='dSave'){const v=parseAmt(document.getElementById('dAmt').value);if(!v){L.innerHTML='';return}
      g.saved=Math.round(((+g.saved||0)+v)*1000)/1000;g.log=Object.assign({},g.log||{});const mk=ym(new Date());g.log[mk]=Math.round(((+g.log[mk]||0)+v)*1000)/1000;L.innerHTML='';putSettings();render();
      toast(g.saved>=g.target?'اكتمل ادخار '+g.name:'أُضيف '+money(v)+' إلى '+g.name)}};
}
function nextCycle(id){const g=(S.settings.goals||[]).find(x=>x.id===id);if(!g)return;const k=GOAL_KINDS[g.kind]||{};
  if(k.hijri){const d=new Date(g.due+'T12:00');d.setDate(d.getDate()+20);g.due=nextHijri(k.hijri[0],k.hijri[1],isoD(d))}
  else{const d=new Date(g.due+'T12:00');d.setFullYear(d.getFullYear()+1);g.due=isoD(d)}
  g.saved=0;g.log={};putSettings();render();toast('بدأت خطة '+g.name+' للعام القادم')}

/* ---------- bank SMS import ---------- */
const KW={
 food:['lulu','لولو','carrefour','كارفور','nesto','نستو','al fair','الفير','hypermarket','supermarket','سوبرماركت','هايبر','بقالة','grocery','safeer','سفير','khimji','ramez','رامز','bakery','مخبز'],
 rest:['cafe','café','coffee','كافيه','مقهى','قهوة','restaurant','مطعم','starbucks','mcdonald','kfc','talabat','طلبات','akeed','pizza','burger','tim hortons','costa','shawarma','شاورما','karak','كرك'],
 fuel:['shell','شل','oman oil','omanoil','al maha','المها','petrol','fuel','وقود','بترول','otaxi','mwasalat','مواصلات','parking','موقف'],
 bills:['nama','نماء','omantel','عمانتل','ooredoo','اوريدو','أوريدو','vodafone','فودافون','awasr','أوامر','electric','كهرباء','water','مياه','internet','انترنت','إنترنت','mazoon','مزون','majan','مجان','بلدية','municipality'],
 health:['pharmacy','صيدلية','hospital','مستشفى','clinic','عيادة','medical','طبي','dental','أسنان'],
 shop:['amazon','noon','نون','centrepoint','shein','zara','mall','مول','ikea','sharaf','lifestyle','نمشي','namshi','splash','shoes','ملابس'],
 loan:['loan','قرض','قسط','installment','instalment','تمويل'],
 edu:['school','مدرسة','university','جامعة','college','كلية','course','دورة','udemy','coursera','institute','معهد'],
 fun:['cinema','vox','سينما','oman air','salam air','salamair','طيران','booking.com','hotel','فندق','airbnb','netflix','spotify','playstation','shahid','شاهد','osn','steam'],
 charity:['zakat','زكاة','صدقة','charity','خيرية','donation','تبرع'],
 home:['rent','إيجار','ايجار'],
 car:['tyre','tire','إطارات','اطارات','garage','ورشة','قطع غيار','spare parts','service center','car wash','غسيل سيارات','insurance','تأمين','royal oman police','شرطة عمان']
};
function normDigits(s){return String(s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/٫/g,'.').replace(/٬/g,',')}
function hashStr(s){let h=5381;for(const c of s.replace(/\s+/g,' ').trim())h=((h<<5)+h+c.charCodeAt(0))|0;return 'h'+(h>>>0).toString(36)}
function mkey(s){return String(s||'').toLowerCase().replace(/[^a-z؀-ۿ]+/g,' ').trim().slice(0,30)}
const AMT_RE=/(?:\bOMR(?![A-Za-z])|\bR\.?O\.?(?![A-Za-z])|ر\.?\s?ع\.?|ريال(?:\s*عماني)?)\s*([0-9][0-9,]*(?:\.[0-9]{1,3})?)|([0-9][0-9,]*(?:\.[0-9]{1,3})?)\s*(?:OMR(?![A-Za-z])|R\.?O\.?(?![A-Za-z])|ر\.?\s?ع\.?|ريال)/gi;
const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function pickDate(t){
  let m=t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/),y,mo,d;
  if(m){y=+m[1];mo=+m[2];d=+m[3]}
  else if((m=t.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))){d=+m[1];mo=+m[2];y=+m[3]}
  else if((m=t.match(/(\d{1,2})[\s\-]?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-,]*(\d{2,4})/i))){d=+m[1];mo=MON[m[2].toLowerCase()];y=+m[3]}
  if(!m)return today();
  if(y<100)y+=2000;
  if(mo>12&&d<=12){const k=mo;mo=d;d=k}
  const dt=new Date(y,mo-1,d);if(isNaN(dt)||dt.getMonth()!==mo-1||dt>new Date())return today();
  return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function pickMerchant(t){
  const pats=[/(?:\bat|@)\s+([A-Za-z0-9&'.*\- ]{2,40}?)(?=\s+(?:on|in|dated|ref|card|with|using|for|avl|available|bal)\b|[,;:\n]|\.(?:\s|$)|$)/i,
    /(?:لدى|عند)\s+([^\n،,:]{2,40}?)(?=\s+(?:بتاريخ|في\s+تاريخ|يوم|في\s+\d|بطاقة|الرصيد|رصيد)|[،,:\n]|\.(?:\s|$)|$)/,
    /\b(?:from|to)\s+([A-Za-z][A-Za-z0-9&'.\- ]{1,40}?)(?=\s+(?:on|in|dated|ref|via|avl|bal)\b|[,;:\n]|\.(?:\s|$)|$)/i,
    /(?:من|إلى|الى)\s+([^\n،,:]{2,40}?)(?=\s+(?:بتاريخ|في\s+تاريخ|يوم|في\s+\d|الرصيد|رصيد)|[،,:\n]|\.(?:\s|$)|$)/];
  for(const p of pats){const m=t.match(p);if(m){const v=m[1].trim().replace(/\s{2,}/g,' ');
    if(v.length>=2&&!/account|a\/c|acct|card|حساب|بطاقت|your|customer|عميل|xx/i.test(v)&&!/^\d/.test(v))return v}}
  return '';
}
function parseSms(raw){
  const t=normDigits(raw).replace(/‏|‎/g,'');
  const key=hashStr(t);
  const base={raw:raw.trim(),key,ok:false};
  if(/\bOTP\b|رمز التحقق|رمز التفعيل|كلمة المرور|one[- ]time|verification code|الرمز السري/i.test(t))return Object.assign(base,{reason:'رسالة رمز تحقق وليست عملية'});
  let amount=0;AMT_RE.lastIndex=0;let m;
  while((m=AMT_RE.exec(t))){const pre=t.slice(Math.max(0,m.index-32),m.index);
    if(/bal|رصيد|available|avl|المتاح|المتوفر|limit|الحد/i.test(pre))continue;
    amount=parseFloat((m[1]||m[2]).replace(/,/g,''));if(amount)break}
  if(!amount){const f=t.match(/(?:amount|amt|مبلغ|بمبلغ)\s*:?\s*([0-9][0-9,]*\.[0-9]{1,3})/i)||t.match(/\b([0-9][0-9,]*\.[0-9]{3})\b/);if(f)amount=parseFloat(f[1].replace(/,/g,''))}
  if(!amount)return Object.assign(base,{reason:'لم أجد مبلغًا في الرسالة'});
  const isDebit=/debit|purchase|spent|withdraw|paid|payment|\bPOS\b|خصم|شراء|سحب|دفع|مشتريات/i.test(t);
  const isCredit=/\bcredited\b|deposit|received|salary|payroll|refund|reversal|إيداع|ايداع|إضافة|اضافة|أضيف|اضيف|استلام|راتب|استرداد|مسترد|حوالة واردة|تحويل وارد/i.test(t);
  const type=isCredit&&!(isDebit&&!/salary|راتب|refund|استرداد/i.test(t))?'inc':'exp';
  const atm=/\bATM\b|صراف|cash withdrawal|سحب نقدي/i.test(t);
  const method=atm?'cash':(type==='inc'||/transfer|تحويل|حوالة/i.test(t))?'transfer':'card';
  let merchant=atm?'':pickMerchant(t);
  const low=(merchant+' '+t).toLowerCase();
  const learned=(S.settings.merchantCats||{})[mkey(merchant)];
  let cat;
  if(learned&&((type==='inc')===!!INC_CATS.find(c=>c.id===learned)))cat=learned;
  else if(type==='inc')cat=/salary|payroll|راتب/i.test(t)?'salary':'iother';
  else if(atm)cat='other';
  else{cat='other';for(const [c,words] of Object.entries(KW)){if(words.some(w=>low.includes(w))){cat=c;break}}}
  const note=merchant||(atm?'سحب نقدي من الصراف':type==='inc'?(cat==='salary'?'راتب':'إيداع في الحساب'):'');
  const dup=list().some(x=>x.src===key);
  return Object.assign(base,{ok:true,on:!dup,dup,amount:amount.toFixed(3),type,cat,date:pickDate(t),method,note,merchant});
}
function splitMsgs(text){
  const parts=normDigits(text).split(/\n\s*\n+/).map(s=>s.trim()).filter(Boolean);
  return parts.flatMap(p=>{const lines=p.split('\n').map(s=>s.trim()).filter(Boolean);
    const hasAmt=l=>{AMT_RE.lastIndex=0;return AMT_RE.test(l)};
    const withAmt=lines.filter(l=>hasAmt(l)&&/debit|credit|purchase|withdraw|paid|خصم|شراء|سحب|إيداع|ايداع|راتب|deposit/i.test(l));
    return withAmt.length>1&&withAmt.length===lines.filter(hasAmt).length?lines:[p]});
}
const DEMO_SMS=`Your a/c XXX1234 has been debited with OMR 23.450 at LULU HYPERMARKET on 12/10/2026. Avl Bal OMR 512.300

تم خصم مبلغ 4.200 ر.ع من بطاقتك المنتهية بـ 5678 لدى STARBUCKS بتاريخ 12/10/2026. الرصيد المتاح 488.100 ر.ع

Dear Customer, your a/c XXX1234 has been credited with OMR 850.000 SALARY on 01/10/2026.

Your OTP for online purchase is 482913. Do not share it.`;
let IMP={text:'',items:[]};
function openImport(){
  const L=document.getElementById('layer');
  const pasteHtml=()=>`<p class="note" style="margin:0 0 10px">انسخ رسالة البنك من تطبيق الرسائل والصقها هنا. يمكنك لصق عدة رسائل مرة واحدة، مع ترك سطر فارغ بين كل رسالة وأخرى.</p>
    <div class="stack"><textarea class="inp msgs" id="iTxt" dir="auto" placeholder="مثال: تم خصم مبلغ 12.500 ر.ع من حسابك لدى ...">${esc(IMP.text)}</textarea>
    <p class="note" id="iErr" hidden style="color:var(--exp);margin:0"></p>
    <button class="btn block" id="iParse">قراءة الرسائل</button>
    <div class="row2"><button class="btn ghost" id="iDemo">جرّب برسائل مثال</button><button class="btn ghost" data-close>إلغاء</button></div>
    <p class="note" style="margin:0">القراءة تتم داخل هذه الصفحة. لا يُحفظ نص الرسالة ولا رقم حسابك، فقط المبلغ والجهة والتاريخ.</p></div>`;
  const itemsHtml=()=>{const okN=IMP.items.filter(i=>i.ok).length;
    return `<p class="note" style="margin:0 0 10px">قرأت ${IMP.items.length} رسالة ووجدت ${okN} عملية. راجع الفئة والمبلغ قبل الإضافة.</p><div class="stack">`+
    IMP.items.map((it,i)=>{
      if(!it.ok)return `<div class="impcard skip"><div class="note" style="color:var(--fg)">تجاهلت هذه الرسالة: ${esc(it.reason)}</div><div class="snip" dir="auto">${esc(it.raw.slice(0,110))}${it.raw.length>110?'…':''}</div></div>`;
      const cats=it.type==='inc'?INC_CATS:EXP_CATS;
      return `<div class="impcard"><label class="head"><input type="checkbox" data-i="${i}" data-f="on" ${it.on?'checked':''}>
        <span class="num ${it.type==='inc'?'amt-inc':'amt-exp'}">${it.type==='inc'?'+':'−'}${money(parseAmt(it.amount))}</span><span>${esc(it.note||catOf(it.cat).n)}</span>
        ${it.dup?'<span class="badge">مسجّلة سابقًا</span>':''}</label>
        <div class="row2"><select class="inp" data-i="${i}" data-f="type" aria-label="النوع"><option value="exp" ${it.type==='exp'?'selected':''}>مصروف</option><option value="inc" ${it.type==='inc'?'selected':''}>دخل</option></select>
        <input class="inp num" data-i="${i}" data-f="amount" inputmode="decimal" value="${esc(it.amount)}" aria-label="المبلغ" style="text-align:left"></div>
        <div class="row2"><select class="inp" data-i="${i}" data-f="cat" aria-label="الفئة">${cats.map(c=>`<option value="${c.id}" ${it.cat===c.id?'selected':''}>${esc(c.n)}</option>`).join('')}</select>
        <input class="inp" type="date" data-i="${i}" data-f="date" value="${esc(it.date)}" aria-label="التاريخ"></div>
        <input class="inp" data-i="${i}" data-f="note" value="${esc(it.note)}" placeholder="ملاحظة" aria-label="ملاحظة" maxlength="80"></div>`}).join('')+
    `<button class="btn block" id="iAdd">إضافة العمليات المحددة</button><button class="btn ghost block" id="iBack">رجوع للصق رسائل أخرى</button></div>`};
  const draw=()=>{L.innerHTML=`<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-label="استيراد من رسائل البنك"><div class="in"><div class="grab"></div>
    <h2 style="margin-top:0">استيراد من رسائل البنك</h2>${IMP.items.length?itemsHtml():pasteHtml()}</div></div>`};
  L.onchange=e=>{const el=e.target;if(el.dataset.i==null)return;const it=IMP.items[+el.dataset.i];const f=el.dataset.f;
    if(f==='on')it.on=el.checked;else it[f]=el.value;
    if(f==='type'){it.cat=it.type==='inc'?'iother':'other';draw()}};
  L.oninput=e=>{if(e.target.id==='iTxt')IMP.text=e.target.value};
  L.onclick=async e=>{const x=e.target.closest('button,[data-close]');if(!x)return;
    if(x.hasAttribute('data-close')){L.innerHTML='';L.onchange=L.oninput=null;return}
    if(x.id==='iDemo'){IMP.text=DEMO_SMS;draw();return}
    if(x.id==='iBack'){IMP.items=[];draw();return}
    if(x.id==='iParse'){const v=(document.getElementById('iTxt').value||'').trim();IMP.text=v;
      if(!v){const er=document.getElementById('iErr');er.hidden=false;er.textContent='الصق رسالة البنك أولًا';return}
      IMP.items=splitMsgs(v).map(parseSms);draw();return}
    if(x.id==='iAdd'){let n=0;const mc=Object.assign({},S.settings.merchantCats||{});
      for(const it of IMP.items){if(!it.ok||!it.on)continue;const amt=parseAmt(it.amount);if(!amt)continue;
        const rec={id:uidGen(),type:it.type,amount:amt,cat:it.cat,date:it.date||today(),method:it.method,note:(it.note||'').trim(),createdAt:new Date().toISOString(),src:it.key};
        if(!txCol)rec.localOnly=true;
        if(it.merchant)mc[mkey(it.merchant)]=it.cat;
        await putTx(rec);n++}
      S.settings.merchantCats=mc;putSettings();
      L.innerHTML='';L.onchange=L.oninput=null;IMP={text:'',items:[]};
      toast(n?'أُضيفت '+n+' عملية':'لم تُحدَّد أي عملية');return}
  };
  draw();
}

/* ---------- sample data ---------- */
function loadSample(){
  const m=S.month,d=n=>m+'-'+String(n).padStart(2,'0'),p=shiftMonth(m,-1),pd=n=>p+'-'+String(n).padStart(2,'0');
  const rows=[['inc',850,'salary',d(1),'transfer','راتب الشهر'],['exp',180,'home',d(2),'transfer','إيجار الشقة'],['exp',22.5,'fuel',d(3),'card','تعبئة وقود'],
   ['exp',31.75,'food',d(4),'card','مقاضي البيت'],['exp',4.2,'rest',d(5),'cash','قهوة وفطور'],['exp',38.4,'bills',d(6),'card','فاتورة الكهرباء'],
   ['exp',15,'charity',d(7),'cash','صدقة'],['exp',12.9,'bills',d(8),'card','باقة الإنترنت'],['inc',60,'business',d(8),'cash','مبيعات المواد الغذائية'],
   ['inc',850,'salary',pd(1),'transfer','راتب الشهر'],['exp',180,'home',pd(2),'transfer','إيجار الشقة'],['exp',210.3,'food',pd(10),'card','مقاضي'],['exp',95,'shop',pd(18),'card','ملابس'],['exp',60,'fuel',pd(20),'card','وقود']];
  rows.forEach(r=>putTx({id:uidGen(),type:r[0],amount:r[1],cat:r[2],date:r[3],method:r[4],note:r[5],createdAt:new Date().toISOString(),sample:true,...(txCol?{}:{localOnly:true})}));
  toast('أُضيفت بيانات مثال، يمكنك حذفها من التقارير');
}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b||b.closest('#layer'))return;
  if(b.dataset.tab){S.tab=b.dataset.tab;render();window.scrollTo(0,0);return}
  if(b.dataset.go){S.tab=b.dataset.go;render();return}
  if(b.id==='addBtn'||b.hasAttribute('data-open-add')){openSheet();return}
  if(b.id==='openImp2'){openImport();return}
  if(b.id==='sync'){if(Sync.linked())Sync.now();else{S.tab='reports';render();setTimeout(()=>{const x=document.getElementById('syncCid');x&&x.scrollIntoView({block:'center'})},50)}return}
  if(b.id==='syncNow'){Sync.now();return}
  if(b.id==='checkUpd'){if(!('serviceWorker' in navigator)){toast('أنت على آخر إصدار');return}toast('جارٍ البحث عن تحديث…');try{const r=await navigator.serviceWorker.getRegistration();if(r){await r.update();if(r.installing||r.waiting){toast('وُجد تحديث، جارٍ تحميله…');return}}toast('أنت على آخر إصدار ('+APP_VERSION+')')}catch(e){toast('تعذّر البحث، تأكد من الإنترنت')}return}
  if(b.id==='syncUnlink'){Sync.unlink();toast('أُلغي الربط على هذا الجهاز، وبياناتك باقية فيه');return}
  if(b.id==='syncLink'){const v=(document.getElementById('syncCid').value||'').trim();const er=document.getElementById('syncErr');if(!/\.apps\.googleusercontent\.com$/.test(v)){er.hidden=false;er.textContent='الرمز غير صحيح. يجب أن ينتهي بـ .apps.googleusercontent.com';return}await Sync.link(v);render();return}
  if(b.dataset.quick!==undefined){quickAdd(b.dataset.quick);return}
  if(b.dataset.rmode){S.rmode=b.dataset.rmode;render();return}
  if(b.dataset.yshift){S.month=shiftMonth(S.month,12*(+b.dataset.yshift));render();return}
  if(b.dataset.cadd){openCar();return}
  if(b.dataset.cedit){openCar(b.dataset.cedit);return}
  if(b.dataset.crenew){openRenew(b.dataset.crenew);return}
  if(b.dataset.csave){carToGoal(b.dataset.csave);return}
  if(b.dataset.sadd){openSvc(b.dataset.sadd);return}
  if(b.dataset.sedit){const [c1,s1]=b.dataset.sedit.split(':');openSvc(c1,s1);return}
  if(b.dataset.padd){openPerson();return}
  if(b.dataset.pedit){openPerson(b.dataset.pedit);return}
  if(b.dataset.pspend){openSheet(null,{person:b.dataset.pspend,cat:'family'});return}
  if(b.dataset.radd){openRec(null,b.dataset.radd);return}
  if(b.dataset.redit){openRec(b.dataset.redit);return}
  if(b.dataset.rpay){payRec(b.dataset.rpay);return}
  if(b.id==='payAll'){await payAll();return}
  if(b.dataset.gadd){openGoal(null,b.dataset.gadd);return}
  if(b.dataset.gedit){openGoal(b.dataset.gedit);return}
  if(b.dataset.gdep){openDeposit(b.dataset.gdep);return}
  if(b.dataset.gnext){nextCycle(b.dataset.gnext);return}
  if(b.id==='mPrev'){S.month=shiftMonth(S.month,-1);render();return}
  if(b.id==='mNext'){S.month=shiftMonth(S.month,1);render();return}
  if(b.dataset.edit){openSheet(S.tx[b.dataset.edit]);return}
  if(b.dataset.ftype){S.ftype=b.dataset.ftype;render();return}
  if(b.id==='loadSample'){loadSample();return}
  if(b.id==='saveBudget'){S.settings.monthlyBudget=parseAmt(document.getElementById('mb').value);const bb={};document.querySelectorAll('[data-bcat]').forEach(i=>{const v=parseAmt(i.value);if(v)bb[i.dataset.bcat]=v});S.settings.budgets=bb;document.activeElement.blur();await putSettings();render();toast('حُفظت الميزانية');return}
  if(b.id==='clearSample'){list().filter(t=>t.sample).forEach(t=>delTx(t.id));toast('حُذفت بيانات المثال');return}
  if(b.id==='wipeAsk'){document.getElementById('wipeArea').innerHTML=`<div class="confirm"><span>سيُحذف كل ما سجلته من عمليات وميزانيات. لا يمكن التراجع.</span><div class="row2"><button class="btn danger" id="wipe">احذف الكل</button><button class="btn ghost" id="wipeNo">تراجع</button></div></div>`;return}
  if(b.id==='wipeNo'){render();return}
  if(b.id==='wipe'){for(const t of list())await delTx(t.id);S.settings={monthlyBudget:0,budgets:{}};await putSettings();render();toast('حُذفت كل البيانات');return}
  if(b.id==='copyBackup'){const txt=backupText();
    try{await navigator.clipboard.writeText(txt);toast('نُسخت النسخة الاحتياطية، الصقها في ملاحظاتك أو أرسلها لنفسك')}
    catch(err){const ta=document.getElementById('restoreTxt');ta.closest('details').open=true;ta.value=txt;ta.select();toast('حدّد النص الظاهر وانسخه يدويًا')}return}
  if(b.id==='restoreBtn'){await restoreFrom(document.getElementById('restoreTxt').value);return}
  if(b.id==='fileBackup'){saveFile('masareef-backup-'+today()+'.json',backupText(),'application/json')?toast('حُفظت النسخة الاحتياطية في الملفات'):toast('تعذّر حفظ الملف');return}
  if(b.id==='csvBtn'){const yr=S.rmode==='year';const a=(yr?list().filter(t=>t.date&&t.date.slice(0,4)===S.month.slice(0,4)):inMonth(S.month)).sort((x,y)=>x.date.localeCompare(y.date));
    const rows=[['التاريخ','النوع','الفئة','المبلغ','طريقة الدفع','ملاحظة','الشخص']].concat(a.map(t=>[t.date,t.type==='inc'?'دخل':'مصروف',catOf(t.cat).n,money(t.amount),(METHODS.find(m=>m[0]===t.method)||['',''])[1],t.note||'',t.person?personName(t.person):'']));
    const csv='\ufeff'+rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    saveFile('masareef-'+(yr?S.month.slice(0,4):S.month)+'.csv',csv,'text/csv');return}
});
document.addEventListener('input',e=>{if(e.target.id==='q'){S.q=e.target.value;render()}});
document.addEventListener('change',e=>{if(e.target.id==='restoreFile'&&e.target.files[0]){const r=new FileReader();r.onload=()=>restoreFrom(r.result);r.readAsText(e.target.files[0]);e.target.value=''}});
function backupText(){return JSON.stringify({app:'masareef',v:1,at:new Date().toISOString(),settings:S.settings,tx:list()})}
async function restoreFrom(txt){try{const o=JSON.parse(txt);if(!o||o.app!=='masareef'||!Array.isArray(o.tx))throw 0;
  const now=Date.now();o.tx.forEach(t=>{if(t&&t.id&&t.amount){const c=Object.assign({},t);delete c.localOnly;c.u=now;S.tx[c.id]=c;delete S.del[c.id]}});
  if(o.settings){S.settings=Object.assign({monthlyBudget:0,budgets:{}},o.settings);S.settings._u=Date.now()}
  cacheSave();render();Sync.soon();toast('استُعيدت '+o.tx.length+' عملية')}
 catch(err){toast('هذا الملف ليس نسخة احتياطية من مصاريفي')}}

let tt;function toast(msg,undo){let el=document.querySelector('.toast');if(!el){el=document.createElement('div');el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}el.innerHTML='';const s=document.createElement('span');s.textContent=msg;el.appendChild(s);if(undo){const b=document.createElement('button');b.textContent='تراجع';b.onclick=()=>{el.hidden=true;undo()};el.appendChild(b)}el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>el.hidden=true,undo?5000:2600)}


/* ---------- Google Drive sync (between your own devices) ---------- */
function mergeData(r){
  const del=Object.assign({},r.del||{});for(const [k,v] of Object.entries(S.del||{}))if(!del[k]||v>del[k])del[k]=v;
  const rt=r.tx||{};const tx={};const ids=new Set([...Object.keys(S.tx),...Object.keys(rt)]);
  ids.forEach(id=>{const a=S.tx[id],b=rt[id];const w=!a?b:!b?a:((+b.u||0)>(+a.u||0)?b:a);if(!w)return;if(del[id]&&del[id]>=(+w.u||0))return;tx[id]=w});
  const cut=Date.now()-180*864e5;for(const k in del)if(del[k]<cut)delete del[k];
  S.tx=tx;S.del=del;
  if(r.settings&&(+r.settings._u||0)>(+S.settings._u||0))S.settings=Object.assign({monthlyBudget:0,budgets:{}},r.settings);
}
const Sync=(()=>{
  const CFG_KEY='masareef:sync',FILE='masareef-data.json',SCOPE='https://www.googleapis.com/auth/drive.appdata',API='https://www.googleapis.com';
  let cfg={};try{cfg=JSON.parse(localStorage.getItem(CFG_KEY)||'{}')||{}}catch(e){cfg={}}
  const saveCfg=()=>{try{localStorage.setItem(CFG_KEY,JSON.stringify(cfg))}catch(e){}};
  let timer=null,busy=false,pending=false,state=cfg.linked?'idle':'off';
  const LOCK='<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const CLOUD='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5z"/></svg>';
  function hhmm(t){const d=new Date(t);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
  function paint(){const el=document.getElementById('sync');if(!el)return;
    const map={off:[LOCK,'محفوظ في هاتفك فقط',''],idle:[CLOUD,'مرتبط بـ Google Drive',''],busy:[CLOUD,'جارٍ المزامنة…',''],
      ok:[CLOUD,'متزامن '+(cfg.last?hhmm(cfg.last):''),'good'],needtap:[CLOUD,'اضغط للمزامنة','warn'],offline:[CLOUD,'بدون إنترنت، سيتزامن لاحقًا',''],error:[CLOUD,'تعذّرت المزامنة، اضغط','warn']};
    const m=map[state]||map.off;el.className='sync '+m[2];el.innerHTML=m[0]+'<span>'+m[1]+'</span>';
    if(S.tab==='reports'){const st=document.getElementById('syncState');if(st)st.textContent=m[1]}}
  function set(s){state=s;paint()}
  function loadGsi(){return new Promise((res,rej)=>{if(window.google&&google.accounts&&google.accounts.oauth2)return res();
    const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.onload=()=>res();s.onerror=()=>rej(new Error('net'));document.head.appendChild(s)})}
  function tokenValid(){return cfg.token&&cfg.exp&&Date.now()<cfg.exp-60000}
  async function getToken(interactive){if(tokenValid())return cfg.token;if(!interactive)return null;await loadGsi();
    return new Promise((res,rej)=>{const tc=google.accounts.oauth2.initTokenClient({client_id:cfg.clientId,scope:SCOPE,prompt:cfg.linked?'':'consent',
      callback:r=>{if(r&&r.access_token){cfg.token=r.access_token;cfg.exp=Date.now()+(+r.expires_in||3600)*1000;cfg.linked=true;saveCfg();res(cfg.token)}else rej(new Error((r&&r.error)||'auth'))},
      error_callback:e=>rej(new Error((e&&e.type)||'popup'))});tc.requestAccessToken()})}
  async function api(url,opt){opt=opt||{};const r=await fetch(url,Object.assign({},opt,{headers:Object.assign({Authorization:'Bearer '+cfg.token},opt.headers||{})}));
    if(r.status===401){cfg.token='';saveCfg();throw new Error('auth')}if(!r.ok)throw new Error('http '+r.status);return r}
  async function findFile(){if(cfg.fileId)return cfg.fileId;
    const r=await api(API+'/drive/v3/files?spaces=appDataFolder&fields=files(id)&q='+encodeURIComponent("name='"+FILE+"'"));const j=await r.json();
    if(j.files&&j.files[0]){cfg.fileId=j.files[0].id;saveCfg()}return cfg.fileId||null}
  async function pull(){const id=await findFile();if(!id)return null;try{const r=await api(API+'/drive/v3/files/'+id+'?alt=media');return await r.json()}catch(e){if(/404/.test(e.message)){cfg.fileId='';saveCfg();return null}throw e}}
  async function push(data){const body=JSON.stringify(data);const id=await findFile();
    if(id){try{await api(API+'/upload/drive/v3/files/'+id+'?uploadType=media',{method:'PATCH',headers:{'Content-Type':'application/json'},body});return}catch(e){if(!/404/.test(e.message))throw e;cfg.fileId='';saveCfg()}}
    const bd='masareef'+Date.now();
    const mp='--'+bd+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name:FILE,parents:['appDataFolder']})+'\r\n--'+bd+'\r\nContent-Type: application/json\r\n\r\n'+body+'\r\n--'+bd+'--';
    const r=await api(API+'/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+bd},body:mp});
    const j=await r.json();cfg.fileId=j.id;saveCfg()}
  async function run(interactive){
    if(!cfg.clientId||(!cfg.linked&&!interactive))return;
    if(busy){pending=true;return}
    if(!navigator.onLine){set('offline');return}
    busy=true;set('busy');
    try{const tok=await getToken(interactive);
      if(!tok){busy=false;set('needtap');return}
      const remote=await pull();if(remote)mergeData(remote);
      await push({app:'masareef',v:2,at:new Date().toISOString(),tx:S.tx,del:S.del,settings:S.settings});
      cfg.last=Date.now();saveCfg();cacheSave();render();set('ok');
      if(interactive)toast('تمت المزامنة مع Google Drive')}
    catch(e){set(e.message==='auth'||e.message==='popup_closed'||e.message==='popup_failed_to_open'?'needtap':'error');if(interactive)toast(e.message==='net'?'تعذّر الاتصال بـ Google، تأكد من الإنترنت':e.message==='auth'||/popup/.test(e.message)?'لم يكتمل تسجيل الدخول إلى Google':'تعذّرت المزامنة، حاول مرة أخرى')}
    busy=false;if(pending){pending=false;setTimeout(()=>run(false),400)}}
  return{
    cfg:()=>cfg,linked:()=>!!cfg.linked,paint,
    soon(){if(!cfg.linked)return;clearTimeout(timer);timer=setTimeout(()=>run(false),2500)},
    now:()=>run(true),
    async link(id){cfg={clientId:id.trim()};saveCfg();await run(true)},
    unlink(){const t=cfg.token;cfg={};saveCfg();try{if(t&&window.google&&google.accounts&&google.accounts.oauth2)google.accounts.oauth2.revoke(t,()=>{})}catch(e){}set('off');render()},
    start(){paint();if(cfg.linked)run(false);
      addEventListener('online',()=>run(false));
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')run(false)})}
  };
})();
function syncHtml(){const c=Sync.cfg();
  if(c.linked)return `<div class="panel stack" style="margin-bottom:10px"><div style="display:flex;align-items:center;gap:10px"><span class="cbadge" style="background:var(--inc-soft);color:var(--inc)">${catIcon('iother').replace('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>','<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5z"/>')}</span><div style="min-width:0"><b>المزامنة مع Google Drive مفعّلة</b><div class="note" id="syncState">${c.last?'آخر مزامنة '+fmtD(isoD(new Date(c.last)))+' '+String(new Date(c.last).getHours()).padStart(2,'0')+':'+String(new Date(c.last).getMinutes()).padStart(2,'0'):'لم تتم مزامنة بعد'}</div></div></div>
    <div class="row2"><button class="btn" id="syncNow">مزامنة الآن</button><button class="btn ghost" id="syncUnlink">إلغاء الربط هنا</button></div>
    <p class="note" style="margin:0">ثبّت التطبيق على أجهزتك الأخرى من نفس الرابط، واربطه بنفس حساب Google ونفس الرمز، فتظهر نفس البيانات عليها كلها.</p></div>`;
  return `<div class="panel stack" style="margin-bottom:10px"><b>استخدم التطبيق على أكثر من جهاز</b>
    <p class="note" style="margin:0">اربط التطبيق بحسابك في Google Drive، فتتزامن بياناتك بين الهاتف وMacBook وHP تلقائيًا. تُحفظ في مجلد خفي خاص بهذا التطبيق داخل حسابك، ولا يراها غيرك.</p>
    <div class="field"><label for="syncCid">رمز Google (Client ID)</label><input class="inp" id="syncCid" dir="ltr" value="${esc(c.clientId||'')}" placeholder="xxxx.apps.googleusercontent.com" autocomplete="off" style="font-size:13px"></div>
    <p class="note" id="syncErr" hidden style="color:var(--exp);margin:0"></p>
    <button class="btn block" id="syncLink">ربط Google Drive</button>
    <details><summary class="note" style="cursor:pointer">من أين أحصل على الرمز؟</summary><div class="note" style="margin-top:8px;line-height:1.8">
      إن كان عندك رمز برنامج «الزمرة الملكية» فاستخدم نفس الرمز، لأن التطبيقين على نفس الرابط في GitHub.<br>
      وإن لم يكن عندك: ادخل console.cloud.google.com ← أنشئ مشروعًا ← فعّل Google Drive API ← APIs &amp; Services ← Credentials ← Create credentials ← OAuth client ID ← النوع Web application ← في Authorized JavaScript origins أضف رابط موقعك مثل https://اسمك.github.io ← انسخ الرمز والصقه هنا.</div></details></div>`;
}


/* ---------- version & what's new ---------- */
const APP_VERSION='1.1.0';
const CHANGELOG=[
 {v:'1.1.0',d:'2026-10-13',items:['خانة الإصدار و«ما الجديد» في صفحة التقارير','إشعار بعد كل تحديث، وزر «البحث عن تحديث»','تحميل النسخة الجديدة تلقائيًا عند فتح التطبيق']},
 {v:'1.0.0',d:'2026-10-13',items:['تسجيل المصاريف والدخل مع أيقونة لكل فئة، والتسجيل السريع والتراجع','الميزانية الشهرية وحدود الفئات','خطة الادخار لرمضان والعيدين والتأمين','البيت: الالتزامات الشهرية والأهل','السيارات: التأمين والملكية والصيانة','التقارير الشهرية والسنوية وتنزيل Excel','قراءة رسائل البنك','المزامنة بين أجهزتك عبر Google Drive']}
];
function versionHtml(){
  return `<h2>عن التطبيق</h2><div class="panel stack">
   <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><b>مصاريفي</b><div class="note">الإصدار <span class="num">${APP_VERSION}</span> · ${fmtD(CHANGELOG[0].d)}</div></div><button class="chip" id="checkUpd">البحث عن تحديث</button></div>
   <details${S.showNew?' open':''}><summary class="note" style="cursor:pointer">ما الجديد</summary><div style="margin-top:8px">${CHANGELOG.map(c=>`<div style="padding-block:6px"><b class="num" style="font-size:13px">${c.v}</b> <span class="note">${fmtD(c.d)}</span><ul style="margin:4px 0 0;padding-inline-start:18px;font-size:13px;line-height:1.7">${c.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}</div></details></div>`;
}
function checkVersion(){let last=null;try{last=localStorage.getItem('masareef:ver')}catch(e){}
  if(last&&last!==APP_VERSION){S.showNew=true;setTimeout(()=>toast('تم التحديث إلى الإصدار '+APP_VERSION+'. اطّلع على الجديد في التقارير'),600)}
  try{localStorage.setItem('masareef:ver',APP_VERSION)}catch(e){}}

checkVersion();cacheLoad();render();Sync.start();
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
if('serviceWorker' in navigator&&location.protocol!=='file:'){const hadCtl=!!navigator.serviceWorker.controller;let reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadCtl&&!reloaded){reloaded=true;location.reload()}});
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').then(r=>r.update()).catch(()=>{}))}
})();
