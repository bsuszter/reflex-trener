const DATA_URL = './data/lesson-01.json';
const KEY = 'reflex-trener-progress-v1';
const DAY = 86400000;
const $ = s => document.querySelector(s);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const today = () => new Date().toISOString().slice(0,10);
const defaultState = () => ({version:1,learned:[],records:{},history:[]});
let lesson, state, tab = 'today', session = null, learningIndex = 0, practiceFilter = 'all', exerciseFilter = 'mixed';

function loadState(){try {const data=JSON.parse(localStorage.getItem(KEY));return validState(data)?data:defaultState();}catch{return defaultState();}}
function validState(data){return !!data && data.version===1 && Array.isArray(data.learned) && data.learned.every(x=>typeof x==='string') && data.records && typeof data.records==='object' && !Array.isArray(data.records) && Array.isArray(data.history);}
function save(){localStorage.setItem(KEY,JSON.stringify(state));updateDue();}
function patternFor(card){return lesson.patterns.find(p=>p.id===card.pattern);}
function phaseName(form){return ({statement:'Állítás',negative:'Tagadás',question:'Kérdés'})[form];}
function learnedCards(){return lesson.cards.filter(c=>state.learned.includes(c.id));}
function record(card){return state.records[card.id] || {level:0,streak:0,days:[],due:0};}
function dueCards(){const now=Date.now();return learnedCards().filter(c=>record(c).due<=now);}
function updateDue(){$('#dueCount').textContent=dueCards().length;}
function setTab(name){tab=name;session=null;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));render();}
function render(){const root=$('#app');if(session){renderSession(root);return;}if(tab==='learn')return renderLearn(root);if(tab==='free')return renderFree(root);if(tab==='progress')return renderProgress(root);renderToday(root);}
function renderToday(root){const available=learnedCards(),due=dueCards();const next=available.filter(c=>record(c).due>Date.now()).sort((a,b)=>record(a).due-record(b).due)[0];const nextText=next?new Date(record(next).due).toLocaleDateString('hu-HU',{month:'long',day:'numeric'}):'';root.innerHTML=`<section class="panel"><span class="tag">Ajánlott napi útvonal</span><h2>${!available.length?'Kezdjünk az első mondattal!':due.length?'Kezdhetjük a mai gyakorlást?':'A mai ismétlésekkel kész vagy!'}</h2><p>${!available.length?'Előbb megismerkedünk a mintával, és csak utána kérünk önálló választ.':due.length?`Ma ${due.length} mondat vár ismétlésre. Most ezekből válogatunk, a többit a következő alkalomra hagyjuk.`:`Jelenleg nincs esedékes mondatod.${nextText?' A következő ismétlés: '+nextText+'.':''} Ha van kedved, szabadon tovább gyakorolhatsz.`}</p><div class="actions"><button id="mainAction">${!available.length?'Első lecke megnyitása':due.length?'Mai gyakorlás indítása':'Szabad gyakorlás'}</button>${available.length?'<button id="learnMore" class="secondary">Tananyag áttekintése</button>':''}</div></section><div class="grid"><div class="panel"><span class="stat">${state.learned.length}/${lesson.cards.length}</span><p>Bemutatott mondat</p></div><div class="panel"><span class="stat">${available.filter(c=>record(c).level>=3).length}</span><p>Önállóan előhívott mondat</p></div><div class="panel"><span class="stat">${available.filter(c=>record(c).level===4).length}</span><p>Késleltetve is stabil mondat</p></div></div>`;$('#mainAction').onclick=()=>!available.length?setTab('learn'):due.length?startSession('today'):setTab('free');if($('#learnMore'))$('#learnMore').onclick=()=>setTab('learn');}
function renderLearn(root){
  const patterns=lesson.patterns;
  learningIndex=Math.max(0,Math.min(learningIndex,patterns.length-1));
  const p=patterns[learningIndex],cards=lesson.cards.filter(c=>c.pattern===p.id);
  const count=cards.filter(c=>state.learned.includes(c.id)).length;
  root.innerHTML=`<section class="panel"><div class="intro"><div><span class="tag">Tanulás · ${learningIndex+1}/${patterns.length} mondatcsalád</span><h2>${escapeHtml(p.title)}</h2></div><span class="muted">${state.learned.length} / ${lesson.cards.length} bemutatva</span></div>
    <div class="choice pattern-navigation">${patterns.map((item,i)=>`<button data-pattern="${i}" class="${learningIndex===i?'selected':''}">${i+1}. ${escapeHtml(item.title)}</button>`).join('')}</div>
    <p>${escapeHtml(p.explanation)}</p>
    <div class="grid lesson-cards">${cards.map(card=>`<div class="mini lesson-card"><span class="tag">${phaseName(card.form)}</span><h3>${escapeHtml(card.answer)}</h3><p>${escapeHtml(card.hu)}</p><div class="actions"><button class="secondary" data-listen="${card.id}">🔊 Meghallgatom</button>${state.learned.includes(card.id)?'<span class="learned-label">✓ Már megismerted</span>':`<button data-learn="${card.id}">Megismertem</button>`}</div></div>`).join('')}</div>
    <p class="detail">Bármikor visszanézheted ezeket a mondatokat. A magyarázat újraolvasása nem változtatja meg a megszerzett tudásszintedet.</p>
    <div class="actions"><button id="previousPattern" class="secondary" ${learningIndex===0?'disabled':''}>← Előző</button><button id="nextPattern" class="secondary" ${learningIndex===patterns.length-1?'disabled':''}>Következő →</button><button id="practicePattern">Ezt a mondatcsaládot gyakorlom</button></div>
    ${count===0?'<p class="muted">Előbb jelöld meg, mely mondatokat ismerted meg; csak ezek kerülnek a gyakorlásba.</p>':''}</section>`;
  document.querySelectorAll('[data-pattern]').forEach(b=>b.onclick=()=>{learningIndex=Number(b.dataset.pattern);render();});
  document.querySelectorAll('[data-listen]').forEach(b=>b.onclick=()=>speak(lesson.cards.find(c=>c.id===b.dataset.listen).answer));
  document.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{const id=b.dataset.learn;if(!state.learned.includes(id)){state.learned.push(id);state.records[id]??={level:1,streak:0,days:[],due:Date.now()};save();}render();});
  $('#previousPattern').onclick=()=>{learningIndex--;render();};
  $('#nextPattern').onclick=()=>{learningIndex++;render();};
  $('#practicePattern').onclick=()=>startSession('family',p.id);
}

function speak(message){if(!('speechSynthesis'in window)){alert('Ebben a böngészőben nem érhető el a felolvasás.');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(message);u.lang='en-GB';u.rate=.85;speechSynthesis.speak(u);}
function renderFree(root){root.innerHTML=`<section class="panel"><span class="tag">Szabad gyakorlás</span><h2>Mit szeretnél most erősíteni?</h2><p>Csak már bemutatott mondatokkal dolgozunk. A feladattípusokat is szabadon választhatod.</p><h3>Mondatfajta</h3><div class="choice">${[['all','Vegyes'],['statement','Állítás'],['negative','Tagadás'],['question','Kérdés']].map(([v,t])=>`<button data-filter="${v}" class="${practiceFilter===v?'selected':''}">${t}</button>`).join('')}</div><h3>Feladattípus</h3><div class="choice">${[['mixed','Vegyes'],['translation','Magyar → angol'],['situation','Élethelyzet'],['transform','Mondatátalakítás']].map(([v,t])=>`<button data-exercise="${v}" class="${exerciseFilter===v?'selected':''}">${t}</button>`).join('')}</div><button id="freeStart">Gyakorlás indítása</button></section>`;document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{practiceFilter=b.dataset.filter;render();});document.querySelectorAll('[data-exercise]').forEach(b=>b.onclick=()=>{exerciseFilter=b.dataset.exercise;render();});$('#freeStart').onclick=()=>startSession('free');}
function startSession(mode,familyId=null){const all=learnedCards().filter(c=>(mode!=='free'||practiceFilter==='all'||c.form===practiceFilter)&&(mode!=='family'||c.pattern===familyId)&&(mode!=='free'||exerciseFilter!=='transform'||!!c.transformFrom));if(!all.length){alert('Ehhez előbb ismerkedj meg legalább egy mondattal ebből a csoportból!');return;}const due=all.filter(c=>record(c).due<=Date.now());if(mode==='today'&&!due.length){setTab('today');return;}const others=all.filter(c=>!due.includes(c));const shuffle=a=>a.sort(()=>Math.random()-.5);const cards=(mode==='today'?shuffle(due):[...shuffle(due),...shuffle(others)]).slice(0,10);session={mode,familyId,cards,index:0,answer:'',hint:false,revealed:false,results:[],retries:{},currentKind:null,maxQuestions:18};render();}
function normalize(v){return v.trim().toLowerCase().replace(/[‘’´`]/g,"'").replace(/[.!?]+$/g,'').replace(/\s+/g,' ');}
function evaluate(card,answer){const entered=normalize(answer);if(!entered)return 'blank';const options=[card.answer,...(card.accepted||[])].map(normalize);if(options.includes(entered))return 'correct';const noPunct=entered.replace(/'/g,'');if(options.some(o=>o.replace(/'/g,'')===noPunct))return 'minor';return 'unknown';}
function explainAnswer(card,answer,result){
  if(result==='correct')return 'A beírt változat helyes.';
  if(result==='minor')return 'Az aposztróf használatára figyelj. A mondat szerkezete egyébként helyes.';
  if(result==='blank')return 'Most megnézted a megoldást. Mondd ki hangosan, és később próbáld újra önállóan!';
  const input=normalize(answer),p=patternFor(card);
  if(p.group==='be'){
    if(card.form==='statement'&&/^i (?:tired|at home)$/.test(input))return 'Az I után szükség van az am szóra: I am…';
    if(card.form==='negative'&&/^i (?:not|no) (?:tired|at home)$/.test(input))return 'A tagadó mondatban is kell az am: I am not…';
    if(card.form==='question'&&/^you (?:are )?(?:tired|at home)$/.test(input))return 'Kérdésben az are kerül előre: Are you…?';
    if(card.form==='question'&&input.startsWith('do you '))return 'Az are igével kérdezünk, nem a do segédigével: Are you…?';
  }else{
    if(card.form==='negative'&&/^i (?:no|not) (?:have|know|need)\b/.test(input))return 'Az ige elé a don’t kerül: I don’t…';
    if(card.form==='question'&&/^you (?:have|know|need)\b/.test(input))return 'A kérdés elejére a Do kerül: Do you…?';
    if(card.form==='question'&&input.startsWith('are you '))return 'Ezzel az igével a do segédigét használjuk kérdésben: Do you…?';
  }
  return 'Ezt a változatot nem tudom biztosan megítélni. Hasonlítsd össze a tanulandó mondattal! Ha helyesnek tartod, ezt te jelölheted.';
}
function exercisePrompt(card,s){
  const choice=s.mode==='free'?exerciseFilter:'mixed';
  const available=card.transformFrom?['translation','situation','transform']:['translation','situation'];
  if(!s.currentKind){s.currentKind=choice==='mixed'?available[s.index%available.length]:(available.includes(choice)?choice:'translation');}
  if(s.currentKind==='transform')return {kind:'Mondatátalakítás',label:card.form==='negative'?'Alakítsd tagadó mondattá!':'Alakítsd kérdéssé!',prompt:card.transformFrom,detail:'Az alany maradjon ugyanaz. Írd le a teljes angol mondatot.'};
  if(s.currentKind==='situation')return {kind:'Élethelyzet',label:'Mit mondanál angolul?',prompt:card.situation||card.hu,detail:'A helyzethez tanult rövid mondatot hívd elő.'};
  return {kind:'Magyar → angol',label:'Hogyan mondanád angolul?',prompt:card.hu,detail:'Fordítsd le a magyar gondolatot.'};
}
function renderSession(root){const s=session;if(s.index>=s.cards.length){renderSummary(root);return;}const card=s.cards[s.index],p=patternFor(card),result=s.revealed?evaluate(card,s.answer):null,task=exercisePrompt(card,s);root.innerHTML=`<section class="panel"><div class="intro"><span class="tag">${s.mode==='today'?'Mai gyakorlás':'Szabad gyakorlás'} · ${task.kind} · ${phaseName(card.form)}</span><span class="muted">${s.index+1} / ${s.cards.length}</span></div><div class="progress-track"><div style="width:${100*s.index/s.cards.length}%"></div></div><div class="prompt"><small>${escapeHtml(task.label)}</small><h2>${escapeHtml(task.prompt)}</h2><p>${escapeHtml(task.detail)}</p></div><label for="response" class="muted">A te mondatod</label><textarea id="response" class="response" placeholder="Írd be, vagy mondd ki hangosan…" ${s.revealed?'disabled':''}>${escapeHtml(s.answer)}</textarea>${s.hint?`<div class="feedback">Kapaszkodó: <strong>${escapeHtml(card.answer.split(' ').slice(0,2).join(' '))}…</strong></div>`:''}${s.revealed?`<div class="answer"><div class="muted">A rögzítendő mondat</div><strong>${escapeHtml(card.answer)}</strong><p>${escapeHtml(p.explanation)}</p><p class="note">${escapeHtml(explainAnswer(card,s.answer,result))}</p><button id="hear" class="secondary">🔊 Meghallgatom</button></div><h3>Hogyan sikerült?</h3><p class="muted">Őszintén jelöld: ez határozza meg, mikor térünk vissza rá.</p><div class="actions"><button data-grade="again" class="secondary">Még gyakorolnom kell</button><button data-grade="help" class="secondary">Segítséggel ment</button><button data-grade="independent">Önállóan ment</button></div>`:`<div class="actions"><button id="hintButton" class="secondary">Segítséget kérek</button><button id="checkButton">Megnézem a megoldást</button></div><p class="detail">Hangosan is válaszolhatsz, mikrofon nélkül. Utána nézd meg a megoldást, és jelöld az eredményt.</p>`}</section>`;
if(!s.revealed){const field=$('#response');field.focus();field.oninput=()=>s.answer=field.value;$('#hintButton').onclick=()=>{s.hint=true;render();};$('#checkButton').onclick=()=>{s.answer=field.value;s.revealed=true;render();};field.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#checkButton').click();}};}else{$('#hear').onclick=()=>speak(card.answer);document.querySelectorAll('[data-grade]').forEach(b=>b.onclick=()=>{const grade=b.dataset.grade;if(grade==='independent'&&s.hint){alert('Segítséget használtál, ezért ez a próbálkozás nem számít önállónak. Válaszd a „Segítséggel ment” lehetőséget.');return;}if(grade==='independent'&&result!=='correct'&&result!=='minor'){if(!confirm('Az ellenőrző nem ismerte fel biztosan a válaszodat. Biztosan helyesnek és önállónak értékeled?'))return;}gradeCard(card,grade,s.hint);s.results.push({card:card.id,grade});if(grade!=='independent'&&(s.retries[card.id]||0)<2&&s.cards.length<s.maxQuestions){s.retries[card.id]=(s.retries[card.id]||0)+1;s.cards.splice(Math.min(s.index+3,s.cards.length),0,card);}s.index++;s.answer='';s.hint=false;s.revealed=false;s.currentKind=null;render();});}}

function gradeCard(card,grade,usedHint){
  const previous=record(card),now=Date.now(),date=today();
  const days=Array.isArray(previous.days)?[...previous.days]:[];
  let streak=previous.streak||0,level=previous.level||1,due;
  if(grade==='independent'&&!usedHint){
    if(!days.includes(date))days.push(date);
    // Többszöri siker ugyanazon a napon nem növeli a késleltetett ismétlési fokozatot.
    const newDay=previous.lastIndependentDay!==date;
    if(newDay)streak++;
    const firstDay=days[0];
    const span=firstDay?Math.floor((new Date(date+'T12:00:00')-new Date(firstDay+'T12:00:00'))/DAY):0;
    level=days.length>=3&&span>=7?4:3;
    due=now+(streak<=1?DAY:streak===2?3*DAY:7*DAY);
  }else if(grade==='help'){
    streak=0;level=previous.level===4?3:2;due=now+DAY;
  }else{
    streak=0;level=previous.level===4?3:2;due=now+5*60000;
  }
  state.records[card.id]={...previous,level,streak,days,due,last:now,lastIndependentDay:grade==='independent'&&!usedHint?date:previous.lastIndependentDay};
  state.history.push({card:card.id,date:now,grade});if(state.history.length>1500)state.history=state.history.slice(-1500);save();
}
function renderSummary(root){const counts={again:0,help:0,independent:0};session.results.forEach(r=>counts[r.grade]++);root.innerHTML=`<section class="panel empty"><span class="tag">Gyakorlás vége</span><h2>Szép munka, mára ennyi!</h2><p>A hibák a következő gyakorlás feladatait segítenek kiválasztani.</p><div class="grid"><div class="mini"><span class="stat">${counts.independent}</span><p>Önálló</p></div><div class="mini"><span class="stat">${counts.help}</span><p>Segítséggel</p></div><div class="mini"><span class="stat">${counts.again}</span><p>Ismétlendő</p></div></div><div class="actions"><button id="endSession">Vissza a kezdőlapra</button><button id="newSession" class="secondary">Még egy kör</button></div></section>`;$('#endSession').onclick=()=>{session=null;setTab('today');};$('#newSession').onclick=()=>startSession(session.mode,session.familyId);}
function renderProgress(root){const cards=learnedCards();const groups=[{label:'Bemutatott',test:r=>r.level===1},{label:'Segítséggel',test:r=>r.level===2},{label:'Önálló',test:r=>r.level===3},{label:'Stabil',test:r=>r.level===4}];root.innerHTML=`<section class="panel"><h2>Tanulási térkép</h2><p>Egy mai jó válasz még nem jelent tartós tudást. A stabil szinthez három külön napon, legalább hét nap időközzel kell önállóan sikerülnie.</p><div class="grid">${groups.map(g=>`<div class="mini"><span class="stat">${cards.filter(c=>g.test(record(c))).length}</span><p>${g.label}</p></div>`).join('')}</div></section><section class="panel"><h2>Mondatcsaládok</h2><div class="stack">${lesson.patterns.map(p=>`<div class="mini"><h3>${escapeHtml(p.title)}</h3>${lesson.cards.filter(c=>c.pattern===p.id).map(c=>`<p>${escapeHtml(c.answer)} <span class="detail">· ${!state.learned.includes(c.id)?'Még nem tanult':['','Bemutatott','Segítséggel','Önálló','Stabil'][record(c).level]||'Bemutatott'}</span></p>`).join('')}</div>`).join('')}</div></section>`;}

function initSettings(){const dialog=$('#settingsDialog');$('#settingsButton').onclick=()=>dialog.showModal();$('#closeSettings').onclick=()=>dialog.close();$('#exportButton').onclick=()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),progress:state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`reflex-trener-mentes-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('#importInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),candidate=parsed.progress;if(!validState(candidate))throw new Error('Nem megfelelő mentési formátum.');if(!confirm('A betöltés felülírja az ezen az eszközön tárolt előrehaladást. Folytatod?'))return;state=candidate;save();session=null;render();$('#settingsStatus').textContent='A mentés sikeresen betöltve.';}catch(err){$('#settingsStatus').textContent='Nem sikerült a betöltés: '+err.message;}finally{e.target.value='';}};}
async function init(){try{const response=await fetch(DATA_URL);if(!response.ok)throw Error('A tananyag nem érhető el.');lesson=await response.json();state=loadState();document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));initSettings();updateDue();render();}catch(err){$('#app').innerHTML=`<section class="panel"><h2>Nem sikerült betölteni a tananyagot</h2><p>${escapeHtml(err.message)} A programot webszerveren vagy GitHub Pagesen nyisd meg.</p></section>`;}}
init();
