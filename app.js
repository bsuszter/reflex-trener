const CATALOG_URL = './data/index.json';
const KEY = 'reflex-trener-progress-v1';
const DAY = 86400000;
const $ = s => document.querySelector(s);
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const today = () => new Date().toISOString().slice(0,10);
const defaultState = () => ({version:1,learned:[],records:{},history:[],completedStages:[]});
let lesson, catalog, state, tab = 'today', session = null, learningIndex = 0, practiceFilter = 'all', exerciseFilter = 'mixed';

function loadState(){try {const data=JSON.parse(localStorage.getItem(KEY));return validState(data)?data:defaultState();}catch{return defaultState();}}
function validState(data){return !!data && data.version===1 && Array.isArray(data.learned) && data.learned.every(x=>typeof x==='string') && data.records && typeof data.records==='object' && !Array.isArray(data.records) && Array.isArray(data.history);}
function save(){localStorage.setItem(KEY,JSON.stringify(state));updateDue();}
function patternFor(card){return lesson.patterns.find(p=>p.id===card.pattern);}
function phaseName(form){return ({statement:'Állítás',negative:'Tagadás',question:'Kérdés'})[form];}
function learnedCards(){return lesson.cards.filter(c=>state.learned.includes(c.id));}
function canTransform(card){return !!card.transformFrom&&lesson.cards.some(source=>state.learned.includes(source.id)&&[source.answer,...(source.accepted||[])].some(value=>normalize(value)===normalize(card.transformFrom)));}
function stageCards(stage){return stage.scope==='learned'?learnedCards():lesson.cards.filter(c=>(stage.cardIds||[]).includes(c.id));}
function stageKey(stage){return `${lesson.id}:${stage.id}`;}
function stageComplete(stage){return stage.type==='teach'?stageCards(stage).length>0&&stageCards(stage).every(c=>state.learned.includes(c.id)):(state.completedStages||[]).includes(stageKey(stage));}
function stageUnlocked(stage){return (stage.requires||[]).every(id=>{const prerequisite=lesson.stages.find(s=>s.id===id);return prerequisite&&stageComplete(prerequisite);});}
function record(card){return state.records[card.id] || {level:0,streak:0,days:[],due:0};}
function dueCards(){const now=Date.now();return learnedCards().filter(c=>record(c).due<=now);}
function updateDue(){$('#dueCount').textContent=dueCards().length;}
function setTab(name){tab=name;session=null;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));render();}
function render(){const root=$('#app');if(session){renderSession(root);return;}if(tab==='learn')return renderLearn(root);if(tab==='free')return renderFree(root);if(tab==='progress')return renderProgress(root);renderToday(root);}
function renderToday(root){const available=learnedCards(),due=dueCards();const next=available.filter(c=>record(c).due>Date.now()).sort((a,b)=>record(a).due-record(b).due)[0];const nextText=next?new Date(record(next).due).toLocaleDateString('hu-HU',{month:'long',day:'numeric'}):'';root.innerHTML=`<section class="panel"><span class="tag">Ajánlott napi útvonal</span><h2>${!available.length?'Kezdjünk az első mondattal!':due.length?'Kezdhetjük a mai gyakorlást?':'A mai ismétlésekkel kész vagy!'}</h2><p>${!available.length?'Előbb megismerkedünk a mintával, és csak utána kérünk önálló választ.':due.length?`Ma ${due.length} mondat vár ismétlésre. Most ezekből válogatunk, a többit a következő alkalomra hagyjuk.`:`Jelenleg nincs esedékes mondatod.${nextText?' A következő ismétlés: '+nextText+'.':''} Ha van kedved, szabadon tovább gyakorolhatsz.`}</p><div class="actions"><button id="mainAction">${!available.length?'Első lecke megnyitása':due.length?'Mai gyakorlás indítása':'Szabad gyakorlás'}</button>${available.length?'<button id="learnMore" class="secondary">Tananyag áttekintése</button>':''}</div></section><div class="grid"><div class="panel"><span class="stat">${state.learned.length}/${lesson.cards.length}</span><p>Bemutatott mondat</p></div><div class="panel"><span class="stat">${available.filter(c=>record(c).level>=3).length}</span><p>Önállóan előhívott mondat</p></div><div class="panel"><span class="stat">${available.filter(c=>record(c).level===4).length}</span><p>Késleltetve is stabil mondat</p></div></div>`;$('#mainAction').onclick=()=>!available.length?setTab('learn'):due.length?startSession('today'):setTab('free');if($('#learnMore'))$('#learnMore').onclick=()=>setTab('learn');}
function renderLearn(root){
  const stages=lesson.stages||[];
  learningIndex=Math.max(0,Math.min(learningIndex,stages.length-1));
  const stage=stages[learningIndex],cards=stageCards(stage),available=stageUnlocked(stage);
  const learnedCount=cards.filter(c=>state.learned.includes(c.id)).length;
  root.innerHTML=`<section class="panel">
    <div class="intro"><div><span class="tag">Tanulás · ${learningIndex+1}/${stages.length} szakasz</span><h2>${escapeHtml(stage.title)}</h2></div><span class="muted">${state.learned.filter(id=>lesson.cards.some(c=>c.id===id)).length} / ${lesson.cards.length} bemutatva</span></div>
    <label class="muted" for="lessonSelect">Tananyag</label>
    <select id="lessonSelect" class="lesson-select">${catalog.lessons.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===lesson.id?'selected':''}>${escapeHtml(item.title)}</option>`).join('')}</select>
    <div class="choice pattern-navigation">${stages.map((item,i)=>`<button data-stage="${i}" class="${learningIndex===i?'selected':''}" ${!stageUnlocked(item)?'disabled':''}>${i+1}. ${escapeHtml(item.title)} ${stageComplete(item)?'✓':''}</button>`).join('')}</div>
    <p>${escapeHtml(stage.intro||'')}</p>
    ${stage.type==='teach'? `<div class="grid lesson-cards">${cards.map(card=>`<div class="mini lesson-card"><span class="tag">${phaseName(card.form)}</span><h3>${escapeHtml(card.answer)}</h3><p>${escapeHtml(card.hu)}</p><div class="actions"><button class="secondary" data-listen="${card.id}">🔊 Meghallgatom</button>${state.learned.includes(card.id)?'<span class="learned-label">✓ Már megismerted</span>':`<button data-learn="${card.id}">Megismertem</button>`}</div></div>`).join('')}</div>`:`<div class="prompt"><small>${stage.type==='review'?'Hosszú távú gyakorlás':'Vegyes feladatok'}</small><h2>${stage.type==='review'?'Visszatérő mondatok':'Ismert minták új helyzetben'}</h2><p>Mindig csak korábban megismert mondatokkal gyakorolsz.</p></div><button id="practiceStage">${stage.type==='review'?'Ismétlés indítása':'Vegyes gyakorlás indítása'}</button>`}
    <p class="detail">A korábban megismert mondatok bármikor visszanézhetők. Az ismételt olvasás nem módosítja a tudásszintet.</p>
    <div class="actions"><button id="previousStage" class="secondary" ${learningIndex===0?'disabled':''}>← Előző</button><button id="nextStage" class="secondary" ${learningIndex===stages.length-1||!stageUnlocked(stages[learningIndex+1])?'disabled':''}>Következő →</button>${stage.type==='teach'?'<button id="practiceStage">Az eddig tanultakat gyakorlom</button>':''}</div>
    ${!available?'<p class="feedback">Előbb az előző szakaszt kell megismerned.</p>':''}
  </section>`;
  $('#lessonSelect').onchange=async event=>{await loadLesson(event.target.value);render();};
  document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>{learningIndex=Number(b.dataset.stage);render();});
  document.querySelectorAll('[data-listen]').forEach(b=>b.onclick=()=>speak(lesson.cards.find(c=>c.id===b.dataset.listen).answer));
  document.querySelectorAll('[data-learn]').forEach(b=>b.onclick=()=>{const id=b.dataset.learn;if(!state.learned.includes(id)){state.learned.push(id);state.records[id]??={level:1,streak:0,days:[],due:Date.now()};save();}render();});
  $('#previousStage').onclick=()=>{learningIndex--;render();};
  $('#nextStage').onclick=()=>{learningIndex++;render();};
  $('#practiceStage').onclick=()=>startSession('stage',stage.id);
}

function speak(message){if(!('speechSynthesis'in window)){alert('Ebben a böngészőben nem érhető el a felolvasás.');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(message);u.lang='en-GB';u.rate=.85;speechSynthesis.speak(u);}
function renderFree(root){root.innerHTML=`<section class="panel"><span class="tag">Szabad gyakorlás</span><h2>Mit szeretnél most erősíteni?</h2><p>Csak már bemutatott mondatokkal dolgozunk. A feladattípusokat is szabadon választhatod.</p><h3>Mondatfajta</h3><div class="choice">${[['all','Vegyes'],['statement','Állítás'],['negative','Tagadás'],['question','Kérdés']].map(([v,t])=>`<button data-filter="${v}" class="${practiceFilter===v?'selected':''}">${t}</button>`).join('')}</div><h3>Feladattípus</h3><div class="choice">${[['mixed','Vegyes'],['translation','Magyar → angol'],['situation','Élethelyzet'],['transform','Mondatátalakítás']].map(([v,t])=>`<button data-exercise="${v}" class="${exerciseFilter===v?'selected':''}">${t}</button>`).join('')}</div><button id="freeStart">Gyakorlás indítása</button></section>`;document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{practiceFilter=b.dataset.filter;render();});document.querySelectorAll('[data-exercise]').forEach(b=>b.onclick=()=>{exerciseFilter=b.dataset.exercise;render();});$('#freeStart').onclick=()=>startSession('free');}
function startSession(mode,familyId=null){
  const stage=mode==='stage'?lesson.stages.find(s=>s.id===familyId):null;
  if(mode==='stage'&&(!stage||!stageUnlocked(stage))){alert('Ez a tanulási szakasz még nem érhető el.');return;}
  const stageIds=stage?new Set(stageCards(stage).map(c=>c.id)):null;
  const all=learnedCards().filter(c=>(mode!=='free'||practiceFilter==='all'||c.form===practiceFilter)&&(mode!=='family'||c.pattern===familyId)&&(!stageIds||stageIds.has(c.id))&&(mode!=='free'||exerciseFilter!=='transform'||canTransform(c)));
  if(!all.length){alert('Ehhez előbb ismerkedj meg legalább egy mondattal ebből a csoportból!');return;}
  const due=all.filter(c=>record(c).due<=Date.now());
  if(mode==='today'&&!due.length){setTab('today');return;}
  const others=all.filter(c=>!due.includes(c));
  const shuffle=a=>a.sort(()=>Math.random()-.5);
  const cards=(mode==='today'?shuffle(due):[...shuffle(due),...shuffle(others)]).slice(0,10);
  session={mode,familyId,cards,index:0,answer:'',hint:false,revealed:false,results:[],retries:{},currentKind:null,maxQuestions:18,assessment:{correctness:null,recall:null}};render();
}
function normalize(v){return v.trim().toLowerCase().replace(/[‘’´`]/g,"'").replace(/[.!?]+$/g,'').replace(/\s+/g,' ');}
function evaluate(card,answer){const entered=normalize(answer);if(!entered)return 'blank';const options=[card.answer,...(card.accepted||[])].map(normalize);if(options.includes(entered))return 'correct';const noPunct=entered.replace(/'/g,'');if(options.some(o=>o.replace(/'/g,'')===noPunct))return 'minor';return 'unknown';}
function explainAnswer(card,answer,result){
  if(result==='correct')return 'A beírt változat helyes.';
  if(result==='minor')return 'Az aposztróf használatára figyelj. A mondat szerkezete egyébként helyes.';
  if(result==='blank')return 'Most megnézted a megoldást. Mondd ki hangosan, és később próbáld újra önállóan!';
  const input=normalize(answer),p=patternFor(card);
  if(card.pattern.startsWith('past-')){
    if(/\bi (?:was|were) (?:have|had|know|knew|work|worked)\b/.test(input))return 'A múlt időt itt maga az ige fejezi ki: had, knew vagy worked. Nem teszünk elé was-t.';
    if(/\b(?:didn't|did not) (?:had|knew|worked)\b/.test(input))return 'A didn’t után az ige alapalakja következik: have, know vagy work.';
    if(/\bdid you (?:had|knew|worked)\b/.test(input))return 'A Did you után az ige alapalakját használjuk: have, know vagy work.';
    if(p.group==='be'){
      if(card.form==='negative'&&/^i (?:not|no|didn't|did not)\b/.test(input))return 'A was tagadó alakja wasn’t: I wasn’t…';
      if(card.form==='question'&&/^(?:did|do|are|was) you\b/.test(input))return 'A you alannyal a be múlt idejű kérdése Were you…?';
      if(card.form==='statement'&&/^i (?:tired|at home)\b/.test(input))return 'Múlt idejű állításnál az I után was áll: I was…';
    }else{
      if(card.form==='negative'&&/^i (?:not|no|wasn't|was not|don't|do not)\b/.test(input))return 'Múlt idejű tagadásban didn’t + alapige szerepel: I didn’t have/know/work…';
      if(card.form==='question'&&/^(?:do|are|were) you\b/.test(input))return 'Ezeknél az igéknél a múlt idejű kérdés Did you + alapige…?';
    }
    return 'A múlt idejű mintát hasonlítsd össze a megadott mondattal! Ha más, de helyes megoldást írtál, te jelölheted annak.';
  }
  if(p.group==='be'){
    if(card.form==='statement'&&/^i (?:tired|at home)$/.test(input))return 'Az I után szükség van az am szóra: I am…';
    if(card.form==='negative'&&/^i (?:not|no) (?:tired|at home)$/.test(input))return 'A tagadó mondatban is kell az am: I am not…';
    if(card.form==='question'&&/^you (?:are )?(?:tired|at home)$/.test(input))return 'Kérdésben az are kerül előre: Are you…?';
    if(card.form==='question'&&input.startsWith('do you '))return 'Az are igével kérdezünk, nem a do segédigével: Are you…?';
  }else{
    if(card.form==='negative'&&/^i (?:haven't|have not) (?:time|the time)\b/.test(input))return 'A tanult szerkezetben így tagadunk: I don’t have time.';
    if(card.form==='negative'&&/^i (?:no|not) (?:have|know|need)\b/.test(input))return 'Az ige elé a don’t kerül: I don’t…';
    if(card.form==='question'&&/^you (?:have|know|need)\b/.test(input))return 'A kérdés elejére a Do kerül: Do you…?';
    if(card.form==='question'&&input.startsWith('are you '))return 'Ezzel az igével a do segédigét használjuk kérdésben: Do you…?';
  }
  return 'Ezt a változatot nem tudom biztosan megítélni. Hasonlítsd össze a tanulandó mondattal! Ha helyesnek tartod, ezt te jelölheted.';
}
function exercisePrompt(card,s){
  const choice=s.mode==='free'?exerciseFilter:'mixed';
  const available=canTransform(card)?['translation','situation','transform']:['translation','situation'];
  if(!s.currentKind){s.currentKind=choice==='mixed'?available[s.index%available.length]:(available.includes(choice)?choice:'translation');}
  if(s.currentKind==='transform')return {kind:'Mondatátalakítás',label:card.form==='negative'?'Alakítsd tagadó mondattá!':'Alakítsd kérdéssé!',prompt:card.transformFrom,detail:'Az alany maradjon ugyanaz. Írd le a teljes angol mondatot.'};
  if(s.currentKind==='situation')return {kind:'Élethelyzet',label:'Mit mondanál angolul?',prompt:card.situation||card.hu,detail:'A helyzethez tanult rövid mondatot hívd elő.'};
  return {kind:'Magyar → angol',label:'Hogyan mondanád angolul?',prompt:card.hu,detail:'Fordítsd le a magyar gondolatot.'};
}
function renderSession(root){const s=session;if(s.index>=s.cards.length){renderSummary(root);return;}const card=s.cards[s.index],p=patternFor(card),result=s.revealed?evaluate(card,s.answer):null,task=exercisePrompt(card,s);root.innerHTML=`<section class="panel"><div class="intro"><span class="tag">${s.mode==='today'?'Mai gyakorlás':'Szabad gyakorlás'} · ${task.kind} · ${phaseName(card.form)}</span><span class="muted">${s.index+1} / ${s.cards.length}</span></div><div class="progress-track"><div style="width:${100*s.index/s.cards.length}%"></div></div><div class="prompt"><small>${escapeHtml(task.label)}</small><h2>${escapeHtml(task.prompt)}</h2><p>${escapeHtml(task.detail)}</p></div><label for="response" class="muted">A te mondatod</label><textarea id="response" class="response" placeholder="Írd be, vagy mondd ki hangosan…" ${s.revealed?'disabled':''}>${escapeHtml(s.answer)}</textarea>${s.hint?`<div class="feedback">Kapaszkodó: <strong>${escapeHtml(card.answer.split(' ').slice(0,2).join(' '))}…</strong></div>`:''}${s.revealed?`<div class="answer"><div class="muted">A rögzítendő mondat</div><strong>${escapeHtml(card.answer)}</strong><p>${escapeHtml(p.explanation)}</p><p class="note">${escapeHtml(explainAnswer(card,s.answer,result))}</p><button id="hear" class="secondary">🔊 Meghallgatom</button></div><h3>1. Milyen lett a válaszod?</h3><p class="muted">Te döntesz a helyességről. Az automatikus ellenőrzés csak támpont.</p><div class="choice assessment-choice">${[['correct','✓ Helyes'],['minor','✎ Apró elírás'],['structure','⚙ Szerkezeti hiba'],['other','↻ Más hiba']].map(([value,label])=>`<button type="button" data-assess-correct="${value}" class="${s.assessment.correctness===value?'selected':''}">${label}</button>`).join('')}</div><h3>2. Hogyan jutott eszedbe?</h3><div class="choice assessment-choice">${[['instant','⚡ Azonnal, önállóan'],['thought','🧠 Gondolkodva, önállóan'],['help','💡 Segítséggel'],['solution','📖 A megoldásból tanultam']].map(([value,label])=>`<button type="button" data-assess-recall="${value}" class="${s.assessment.recall===value?'selected':''}">${label}</button>`).join('')}</div><p class="detail">Az elírás nem ugyanaz, mint a mondatszerkezeti hiba. A bizonytalan vagy hibás mondat hamarabb visszatér.</p><button id="saveAssessment" ${!s.assessment.correctness||!s.assessment.recall?'disabled':''}>Értékelés mentése és tovább →</button>`:`<div class="actions"><button id="hintButton" class="secondary">Segítséget kérek</button><button id="checkButton">Megnézem a megoldást</button></div><p class="detail">Hangosan is válaszolhatsz, mikrofon nélkül. Utána nézd meg a megoldást, és jelöld az eredményt.</p>`}</section>`;
if(!s.revealed){const field=$('#response');field.focus();field.oninput=()=>s.answer=field.value;$('#hintButton').onclick=()=>{s.hint=true;render();};$('#checkButton').onclick=()=>{s.answer=field.value;s.revealed=true;render();};field.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#checkButton').click();}};}else{
  $('#hear').onclick=()=>speak(card.answer);
  document.querySelectorAll('[data-assess-correct]').forEach(b=>b.onclick=()=>{s.assessment.correctness=b.dataset.assessCorrect;render();});
  document.querySelectorAll('[data-assess-recall]').forEach(b=>b.onclick=()=>{s.assessment.recall=b.dataset.assessRecall;render();});
  $('#saveAssessment').onclick=()=>{
    const {correctness,recall}=s.assessment;
    if(!correctness||!recall)return;
    if(s.hint&&(recall==='instant'||recall==='thought')){alert('Kapaszkodót használtál, ezért a „Segítséggel” lehetőséget válaszd.');return;}
    if(correctness==='correct'&&result==='blank'){if(!confirm('Nem írtál be választ. Biztosan helyesen mondtad ki hangosan?'))return;}
    if(correctness==='correct'&&result==='unknown'&&s.answer.trim()){if(!confirm('Az ellenőrző ezt a változatot nem ismerte fel. Ellenőrizted, hogy helyes?'))return;}
    gradeCard(card,correctness,recall);
    s.results.push({card:card.id,correctness,recall});
    if((correctness!=='correct'||recall!=='instant')&&(s.retries[card.id]||0)<2&&s.cards.length<s.maxQuestions){
      s.retries[card.id]=(s.retries[card.id]||0)+1;
      s.cards.splice(Math.min(s.index+3,s.cards.length),0,card);
    }
    s.index++;s.answer='';s.hint=false;s.revealed=false;s.currentKind=null;
    s.assessment={correctness:null,recall:null};render();
  };
}}

function gradeCard(card,correctness,recall){
  const previous=record(card),now=Date.now(),date=today();
  let days=Array.isArray(previous.days)?[...previous.days]:[];
  const independentlyCorrect=correctness==='correct'&&(recall==='instant'||recall==='thought');
  let streak=previous.streak||0,level=previous.level||1,due;
  if(independentlyCorrect){
    if(!days.includes(date))days.push(date);
    if(previous.lastIndependentDay!==date)streak++;
    const span=days[0]?Math.floor((new Date(date+'T12:00:00')-new Date(days[0]+'T12:00:00'))/DAY):0;
    level=days.length>=3&&span>=7?4:3;
    const interval=streak<=1?DAY:streak===2?3*DAY:7*DAY;
    due=now+(recall==='thought'?Math.min(DAY,interval):interval);
  }else{
    streak=0;
    if(correctness==='structure'||correctness==='other'||recall==='help'||recall==='solution')days=[];
    level=previous.level===4?3:(recall==='solution'?1:2);
    // A komoly hibák hamarabb, az elírások és a segítséggel megoldott mondatok később térnek vissza.
    due=now+(correctness==='structure'||correctness==='other'||recall==='solution'?5*60000:
      correctness==='minor'?4*3600000:DAY);
  }
  state.records[card.id]={...previous,level,streak,days,due,last:now,
    lastIndependentDay:independentlyCorrect?date:previous.lastIndependentDay,
    lastCorrectness:correctness,lastRecall:recall};
  const grade=independentlyCorrect?'independent':recall==='help'?'help':'again';
  state.history.push({card:card.id,date:now,grade,correctness,recall});
  if(state.history.length>1500)state.history=state.history.slice(-1500);
  save();
}
function renderSummary(root){
  if(session.mode==='stage'&&session.familyId==='mixed'){
    state.completedStages??=[];
    const key=stageKey(lesson.stages.find(s=>s.id==='mixed'));
    if(!state.completedStages.includes(key)){state.completedStages.push(key);save();}
  }
  const counts={correct:0,minor:0,structure:0,other:0,independent:0};
  session.results.forEach(r=>{counts[r.correctness]++;if(r.correctness==='correct'&&(r.recall==='instant'||r.recall==='thought'))counts.independent++;});
  root.innerHTML=`<section class="panel empty"><span class="tag">Gyakorlás vége</span><h2>Szép munka, mára ennyi!</h2><p>A helyességet és az előhívás módját külön rögzítettük. A bizonytalan mondatok visszatérnek.</p><div class="grid"><div class="mini"><span class="stat">${counts.correct}</span><p>Helyes</p></div><div class="mini"><span class="stat">${counts.independent}</span><p>Helyes és önálló</p></div><div class="mini"><span class="stat">${counts.minor+counts.structure+counts.other}</span><p>Javítandó</p></div></div><div class="actions"><button id="endSession">Vissza a kezdőlapra</button><button id="newSession" class="secondary">Még egy kör</button></div></section>`;
  $('#endSession').onclick=()=>{session=null;setTab('today');};
  $('#newSession').onclick=()=>startSession(session.mode,session.familyId);
}
function renderProgress(root){const cards=learnedCards();const groups=[{label:'Bemutatott',test:r=>r.level===1},{label:'Segítséggel',test:r=>r.level===2},{label:'Önálló',test:r=>r.level===3},{label:'Stabil',test:r=>r.level===4}];root.innerHTML=`<section class="panel"><h2>Tanulási térkép</h2><p>Egy mai jó válasz még nem jelent tartós tudást. A stabil szinthez három külön napon, legalább hét nap időközzel kell önállóan sikerülnie.</p><div class="grid">${groups.map(g=>`<div class="mini"><span class="stat">${cards.filter(c=>g.test(record(c))).length}</span><p>${g.label}</p></div>`).join('')}</div></section><section class="panel"><h2>Mondatcsaládok</h2><div class="stack">${lesson.patterns.map(p=>`<div class="mini"><h3>${escapeHtml(p.title)}</h3>${lesson.cards.filter(c=>c.pattern===p.id).map(c=>`<p>${escapeHtml(c.answer)} <span class="detail">· ${!state.learned.includes(c.id)?'Még nem tanult':['','Bemutatott','Segítséggel','Önálló','Stabil'][record(c).level]||'Bemutatott'}</span></p>`).join('')}</div>`).join('')}</div></section>`;}

function initSettings(){const dialog=$('#settingsDialog');$('#settingsButton').onclick=()=>dialog.showModal();$('#closeSettings').onclick=()=>dialog.close();$('#exportButton').onclick=()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),progress:state},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`reflex-trener-mentes-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('#importInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=JSON.parse(await file.text()),candidate=parsed.progress;if(!validState(candidate))throw new Error('Nem megfelelő mentési formátum.');if(!confirm('A betöltés felülírja az ezen az eszközön tárolt előrehaladást. Folytatod?'))return;state=candidate;save();session=null;render();$('#settingsStatus').textContent='A mentés sikeresen betöltve.';}catch(err){$('#settingsStatus').textContent='Nem sikerült a betöltés: '+err.message;}finally{e.target.value='';}};}
async function loadLesson(id){
  const entry=catalog.lessons.find(item=>item.id===id);
  if(!entry||!/^[a-z0-9-]+\.json$/i.test(entry.file))throw Error('Érvénytelen tananyag-hivatkozás.');
  const response=await fetch('./data/'+entry.file);
  if(!response.ok)throw Error('A kiválasztott tananyag nem érhető el.');
  const loaded=await response.json();
  if(loaded.id!==entry.id||!Array.isArray(loaded.cards)||!Array.isArray(loaded.patterns)||!Array.isArray(loaded.stages))throw Error('A tananyag szerkezete hibás.');
  lesson=loaded;learningIndex=0;session=null;
  state.activeLessonId=id;save();
}
async function init(){
  try{
    state=loadState();
    const response=await fetch(CATALOG_URL);
    if(!response.ok)throw Error('A leckelista nem érhető el.');
    catalog=await response.json();
    if(!Array.isArray(catalog.lessons)||!catalog.lessons.length)throw Error('A leckelista üres.');
    const wanted=catalog.lessons.some(item=>item.id===state.activeLessonId)?state.activeLessonId:catalog.lessons[0].id;
    await loadLesson(wanted);
    document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
    initSettings();updateDue();render();
  }catch(err){$('#app').innerHTML=`<section class="panel"><h2>Nem sikerült betölteni a tananyagot</h2><p>${escapeHtml(err.message)} A programot webszerveren vagy GitHub Pagesen nyisd meg.</p></section>`;}
}
init();
