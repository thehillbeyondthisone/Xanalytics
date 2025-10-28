(function(){
  const short=(s,n=120)=>{if(s==null)return"";s=String(s);return s.length<=n?s:s.slice(0,n-1)+'…'};
  const pad=(s,w)=>{s=s==null?'':String(s);if(s.length>=w)return s.slice(0,w);return s+' '.repeat(w-s.length)};
  const htmlDecode=s=>{const t=document.createElement('textarea');t.innerHTML=s;return t.value};
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const fmt=n=>Number(n||0).toLocaleString();
  const toNum=s=>{if(s==null)return 0;if(typeof s==='number')return Math.floor(s);return parseInt(String(s).replace(/[,_\s]/g,''),10)||0};
  const now=()=>Date.now();
  function gid(id){return document.getElementById(id)}

  const styleSel=gid('styleSel');
  const btnAttach = gid('btnAttach');
  const btnInfo   = gid('btnInfo');
  const btnReset  = gid('btnReset');

  const toggleParsed = gid('toggleParsed');
  const toggleRaw = gid('toggleRaw');
  const toggleDebug = gid('toggleDebug');

  const fileInfo = gid('fileInfo');
  const cutoffLabel = gid('cutoffLabel');
  const modeLabel = gid('modeLabel');
  const pathLabel = gid('pathLabel');

  const parsedLog = gid('parsedLog');
  const rawPane = gid('rawPane');
  const debugPane = gid('debugPane');
  const tableEl = gid('table');
  const metricsInline = gid('metricsInline');
  const dot = gid('dot');

  const inclDiscardedChk = gid('inclDiscarded');
  const normalizeVisibleChk = gid('normalizeVisible');
  const dimDiscardedOnlyChk = gid('dimDiscardedOnly');
  const combineQLChk = gid('combineQL');

  const eventSortBySel = gid('eventSortBy');
  const eventSortDirSel = gid('eventSortDir');
  const eventSearchInp = gid('eventSearch');

  const viewAll=gid('viewAll');
  const viewKept=gid('viewKept');
  const viewDiscarded=gid('viewDiscarded');

  const sumLine=gid('sumLine');

  const fxp=gid('fxp'), faxp=gid('faxp'), fsk=gid('fsk'), frxp=gid('frxp');

  const exportStateLink = gid('exportStateLink');
  const exportCSVLink   = gid('exportCSVLink');

  const xpd={
    total:{xp:gid('xpTotal'),axp:gid('axpTotal'),sk:gid('skTotal'),rxp:gid('rxpTotal')},
    rate10:{xp:gid('xpRate10'),axp:gid('axpRate10'),sk:gid('skRate10'),rxp:gid('rxpRate10')},
    rateS:{xp:gid('xpRateSess'),axp:gid('axpRateSess'),sk:gid('skRateSess'),rxp:gid('rxpRateSess')},
    last:{xp:gid('xpLast'),axp:gid('axpLast'),sk:gid('skLast'),rxp:gid('rxpLast')},
    need:{xp:gid('xpNeed'),axp:gid('axpNeed'),sk:gid('skNeed')},
    needL:{xp:gid('xpNeedLabel'),axp:gid('axpNeedLabel'),sk:gid('skNeedLabel')},
    eta:{xp:gid('xpETA'),axp:gid('axpETA'),sk:gid('skETA')},
    bar:{xp:gid('barXP'),axp:gid('barAXP'),sk:gid('barSK')},
    uptime:gid('xpUptime'),events:gid('xpEvents'),feed:gid('xpFeed')
  };

  const infoPanel = gid('infoPanel');
  const infoCloseBtn = gid('infoCloseBtn');
  const infoTabBtns = Array.from(document.querySelectorAll('.infoTabBtn'));
  const infoTabs = {
    howto: gid('tab-howto'),
    notes: gid('tab-notes')
  };

  const state={fileHandle:null,fileObj:null,offset:0,tailTimer:null,reading:false,paused:false,startTs:0};
  let linesRead=0,parseHits=0,parseMisses=0,rotationCount=0,readErrors=0,totalKept=0,totalDiscarded=0;
  const stats={}; const debugLog=[]; const rawLines=[]; let eventView='all';
  const xpInclude={xp:true,axp:true,sk:true,rxp:true};
  const xpState={start:null,totals:{xp:0,axp:0,sk:0,rxp:0},last:{xp:0,axp:0,sk:0,rxp:0},events:0,samples:{xp:[],axp:[],sk:[],rxp:[]},sess:{xp:0,axp:0,sk:0,rxp:0},goals:{xp:0,axp:0,sk:0}};

  // Regexes for XP / loot

  // Bonus XP lines like:
  // ["#..."]181 xp was gained as a side bonus!
  const rxXPBonus=/^\s*(?:\[[^\]]*\])?\s*([0-9][0-9,]*)\s+xp\s+was\s+gained\s+as\s+a\s+side\s+bonus/i;

  // Normal XP:
  // You gained 12345 XP / You received 12345 experience
  const rxXP=/You\s+(?:gained|received)\s+([\d,]+)\s+(?:XP|experience)\b(?!.*Alien)/i;

  // Alien XP:
  // You gained 150 Alien Experience Points.
  // Capture the number before "Alien Experience Points".
  const rxAXP=/You\s+gained\s+([\d,]+)\s+Alien\s+Experience\s+Points/i;

  // Shadowknowledge (SK):
  // You gained 1279 points of Shadowknowledge.
  // Also allow "You gained 50 SK"
  const rxSK=/(?:You\s+gained\s+)?([\d,]+)\s+(?:points\s+of\s+)?(?:Shadowknowledge|SK)\b/i;

  // Research XP:
  // 1234 of your XP were allocated to your personal research
  const rxRXP=/([\d,]+)\s+of\s+your\s+XP\s+were\s+allocated\s+to\s+your\s+personal\s+research/i;

  // Loot parsing
  const rxItemref=/<a\s+href\s*=\s*"itemref:\/\/(\d+)(?:\/(\d+))?(?:\/(\d+))?">(.*?)<\/a>/ig;
  const rxAction=/(?:^|\W)(deleted|looted|picked up|picked|received|acquired|added to your inventory|added)(?:\W|$)/i;
  const rxLoose=/\b(deleted|looted|picked up|picked|received|acquired|added)\b/i;
  const rxSource=/\bfrom\s+([A-Za-z0-9 '\-\.]{2,80})/i;

  function rarityOf(p){
    if(p>=5)return'Common';
    if(p>=1)return'Uncommon';
    if(p>=0.2)return'Rare';
    return'Epic';
  }

  function pushDebug(s){
    const t=`[${new Date().toISOString()}] ${s}`;
    debugLog.push(t);
    if (debugLog.length > 2000) {
      debugLog.splice(0, debugLog.length - 2000);
    }
    if(debugPane.style.display!=='none'){
      const pre=debugPane.querySelector('pre')||document.createElement('pre');
      pre.textContent=debugLog.join('\n');
      debugPane.innerHTML='';
      debugPane.appendChild(pre);
      debugPane.scrollTop=debugPane.scrollHeight;
    }
  }

  function pushRaw(ln){
    rawLines.push(ln);
    if (rawLines.length > 2000) {
      rawLines.splice(0, rawLines.length - 2000);
    }
    if(rawPane.style.display!=='none'){
      const pre=rawPane.querySelector('pre');
      pre.textContent=rawLines.slice(-200).join('\n');
      rawPane.scrollTop=rawPane.scrollHeight;
    }
  }

  function pushParsed(tag,text){
    if (parsedLog.style.display === 'none') return;
    const line=document.createElement('div'); line.className='line';
    const pill=document.createElement('span'); pill.className='pill '+tag; pill.textContent=tag.toUpperCase();
    const span=document.createElement('span'); span.textContent=' '+text;
    line.appendChild(pill); line.appendChild(span);
    parsedLog.appendChild(line);
    while(parsedLog.childNodes.length > 300) {
      parsedLog.removeChild(parsedLog.firstChild);
    }
    parsedLog.scrollTop=parsedLog.scrollHeight;
  }

  function xpPush(key,val){
    const t=now();
    xpState.totals[key]+=val;
    xpState.last[key]=val;
    xpState.events++;
    xpState.samples[key].push({t,v:val});
    xpState.sess[key]+=val;

    const cut=t-10*60*1000;
    ['xp','axp','sk','rxp'].forEach(k=>{
      const a=xpState.samples[k];
      while(a.length && a[0].t<cut) a.shift();
    });

    refreshXPUI();
    pushXPFeed(key,val,t);
  }

  function rate10(k){
    const a=xpState.samples[k];
    if(!a.length) return 0;
    const sum=a.reduce((x,y)=>x+y.v,0);
    const span=(a[a.length-1].t-a[0].t)/1000||1;
    return sum/span*3600;
  }

  function rateSess(k){
    if(!xpState.start)return 0;
    const h=(now()-xpState.start)/3600000;
    return h>0?xpState.sess[k]/h:0;
  }

  function setBar(el,need,have,lbl){
    const N=toNum(need),H=toNum(have);
    if(!N){
      el.style.width='0%';
      if(lbl) lbl.textContent='—';
      return;
    }
    const pct=Math.max(0,Math.min(100,H/N*100));
    el.style.width=pct.toFixed(2)+'%';
    if(lbl) lbl.textContent=`${fmt(H)} / ${fmt(N)} (${pct.toFixed(1)}%)`;
  }

  function etaStr(need,have,perHour){
    const rem=Math.max(0,toNum(need)-toNum(have));
    if(!rem||!perHour)return'ETA —';
    const hours=rem/perHour;
    const h=Math.floor(hours),
          m=Math.round((hours-h)*60);
    return `ETA — ${h? h+'h ' : ''}${m}m`;
  }

  function refreshXPUI(){
    ['xp','axp','sk','rxp'].forEach(k=>{
      if(xpd.total[k]) xpd.total[k].textContent=fmt(xpState.totals[k]);
      if(xpd.last[k]) xpd.last[k].textContent=fmt(xpState.last[k]);
      if(xpd.rate10[k]) xpd.rate10[k].textContent=fmt(Math.round(rate10(k)))+'/hr';
      if(xpd.rateS[k]) xpd.rateS[k].textContent=fmt(Math.round(rateSess(k)))+'/hr';
    });

    setBar(xpd.bar.xp,xpState.goals.xp,xpState.totals.xp,xpd.needL.xp);
    setBar(xpd.bar.axp,xpState.goals.axp,xpState.totals.axp,xpd.needL.axp);
    setBar(xpd.bar.sk,xpState.goals.sk,xpState.totals.sk,xpd.needL.sk);

    xpd.eta.xp.textContent=etaStr(xpState.goals.xp,xpState.totals.xp,rate10('xp'));
    xpd.eta.axp.textContent=etaStr(xpState.goals.axp,xpState.totals.axp,rate10('axp'));
    xpd.eta.sk.textContent=etaStr(xpState.goals.sk,xpState.totals.sk,rate10('sk'));

    if(xpState.start){
      const mins=Math.floor((now()-xpState.start)/60000);
      xpd.uptime.textContent=`Uptime — ${mins}m`;
    }
    xpd.events.textContent=`XP events — ${fmt(xpState.events)}`;
  }

  function xpReset(){
    xpState.start=new Date();
    xpState.totals={xp:0,axp:0,sk:0,rxp:0};
    xpState.last={xp:0,axp:0,sk:0,rxp:0};
    xpState.events=0;
    xpState.samples={xp:[],axp:[],sk:[],rxp:[]};
    xpState.sess={xp:0,axp:0,sk:0,rxp:0};
    refreshXPUI();
    xpd.feed.innerHTML='<div class="small dim">(XP feed populates as you tail)</div>';
  }

  function pushXPFeed(type,val,t){
    if(!xpInclude[type]) return;
    const row=document.createElement('div');
    row.className='line';

    const pill=document.createElement('span');
    pill.className='pill '+type;
    pill.textContent=type.toUpperCase();

    const amt=document.createElement('span');
    amt.textContent=' +'+fmt(val);

    const when=document.createElement('span');
    when.className='when';
    when.textContent=new Date(t).toLocaleTimeString();

    row.appendChild(pill);
    row.appendChild(amt);
    row.appendChild(when);

    xpd.feed.prepend(row);
    while(xpd.feed.childNodes.length>40)
      xpd.feed.removeChild(xpd.feed.lastChild);
  }

  function makeKey(h,l,n){
    if((!h||h===0)&&(!l||l===0)){
      let x=0;
      for(let i=0;i<n.length;i++){
        x=((x<<5)-x)+n.charCodeAt(i);
        x=x&x;
      }
      return 'N:'+Math.abs(x)+':'+n;
    }
    return h+':'+l+':'+n;
  }

  function upsert(ev){
    const key=makeKey(ev.high,ev.low,ev.name);
    let s=stats[key];
    if(!s) s=stats[key]={
      key,
      name:ev.name,high:ev.high,low:ev.low,
      events:0,kept:0,discarded:0,
      minql:99999,maxql:0,sampleqls:[],
      lastSource:null,lastSeen:null
    };

    if(ev.ql&&ev.ql>0){
      if(ev.ql<s.minql)s.minql=ev.ql;
      if(ev.ql>s.maxql)s.maxql=ev.ql;
      if(s.sampleqls.length<6)s.sampleqls.push(ev.ql);
    }

    if(ev.isKept){s.kept++; totalKept++;}
    if(ev.isDiscarded){s.discarded++; totalDiscarded++;}

    s.events=s.kept+s.discarded;
    s.lastSource=ev.source||s.lastSource;
    s.lastSeen=new Date().toISOString();
  }

  // Build table rows (optionally merged by item name if "Combine all QLs" is checked)
  function buildStatArray() {
    const arr = Object.values(stats);

    if (!combineQLChk.checked) {
      return arr.slice();
    }

    const merged = {};
    for (const s of arr) {
      const nm = s.name || '(unknown)';
      let M = merged[nm];
      if (!M) {
        M = merged[nm] = {
          key: nm,
          name: nm,
          events: 0,
          kept: 0,
          discarded: 0,
          minql: 99999,
          maxql: 0,
          sampleqls: [],
          lastSource: null,
          lastSeen: null
        };
      }

      M.kept      += s.kept||0;
      M.discarded += s.discarded||0;
      M.events     = M.kept + M.discarded;

      if (s.minql && s.minql < M.minql) M.minql = s.minql;
      if (s.maxql && s.maxql > M.maxql) M.maxql = s.maxql;
      for (const q of (s.sampleqls||[])) {
        if (M.sampleqls.length < 6 && !M.sampleqls.includes(q)) {
          M.sampleqls.push(q);
        }
      }

      if (!M.lastSeen || (s.lastSeen && Date.parse(s.lastSeen) > Date.parse(M.lastSeen||0))) {
        M.lastSeen = s.lastSeen;
        M.lastSource = s.lastSource;
      }
    }

    return Object.values(merged);
  }

  function renderTable(){
    const includeDiscardedInPct=inclDiscardedChk.checked;
    let pctBase=(includeDiscardedInPct?(totalKept+totalDiscarded):totalKept)||1;

    const q=(eventSearchInp.value||'').toLowerCase().trim();

    let arr=buildStatArray();

    arr.forEach(s=>{
      s.events=s.kept+s.discarded;
      s.percent=100*s.events/pctBase;
      s.rarity=rarityOf(s.percent);
      s.discardedOnly=(s.kept===0&&s.discarded>0);
      s.keptOnly=(s.discarded===0&&s.kept>0);
    });

    if(eventView==='kept') arr=arr.filter(s=>s.kept>0);
    if(eventView==='discarded') arr=arr.filter(s=>s.discarded>0);

    if(q)
      arr=arr.filter(s=>(s.name||'').toLowerCase().includes(q)||
                        (s.lastSource||'').toLowerCase().includes(q));

    const visibleBase = normalizeVisibleChk.checked
      ? Math.max(1, arr.reduce((a,s)=>a+s.events,0))
      : pctBase;

    const sortBy=eventSortBySel.value,
          dir=eventSortDirSel.value==='asc'?1:-1;

    arr.sort((a,b)=>{
      const K={
        events:[a.events,b.events],
        percent:[a.events/visibleBase,b.events/visibleBase],
        kept:[a.kept,b.kept],
        discarded:[a.discarded,b.discarded],
        name:[a.name||'',b.name||''],
        last:[a.lastSeen?Date.parse(a.lastSeen):0,
              b.lastSeen?Date.parse(b.lastSeen):0]
      }[sortBy];

      if(sortBy==='name')
        return K[0].localeCompare(K[1])*dir;

      if(K[0]===K[1])
        return (a.name||'').localeCompare(b.name||'')*dir;

      return (K[0]<K[1]?-1:1)*dir;
    });

    const H={
      name:36,events:7,kept:8,discarded:8,
      pct:7,rarity:10,ql:12,src:26
    };

    const hdr=
      pad('Name',H.name)+
      pad('Events',H.events)+
      pad('Kept',H.kept)+
      pad('Discarded',H.discarded)+
      pad('%',H.pct)+
      pad('Rarity',H.rarity)+
      pad('QL',H.ql)+
      ' Last Source | Last\n';

    const sep='-'.repeat(H.name)+' '+
      '-'.repeat(H.events-1)+' '+
      '-'.repeat(H.kept-1)+' '+
      '-'.repeat(H.discarded-1)+' '+
      '-'.repeat(H.pct-1)+' '+
      '-'.repeat(H.rarity-1)+' '+
      '-'.repeat(H.ql-1)+' '+
      '-'.repeat(H.src)+' '+'-----\n';

    let html=`<pre class="mono">${esc(hdr+sep)}`;

    let sumPct=0;
    if(!arr.length){
      html+=esc('(no rows match filters)\n');
    } else {
      const dim=dimDiscardedOnlyChk.checked;
      for(const s of arr){
        const pct=(100*s.events/visibleBase);
        sumPct+=pct;

        const ql = (s.minql===99999 && !s.maxql)
          ? (s.sampleqls && s.sampleqls.length ? s.sampleqls[0] : '-')
          : (s.minql===s.maxql || s.maxql===0
              ? (s.minql===99999?'-':String(s.minql))
              : `${s.minql===99999?'-':s.minql}-${s.maxql}`);

        const row=
          pad((s.name||'').slice(0,H.name),H.name)+
          pad(fmt(s.events),H.events)+
          pad(fmt(s.kept),H.kept)+
          pad(fmt(s.discarded),H.discarded)+
          pad(pct.toFixed(2),H.pct)+
          pad(s.rarity,H.rarity)+
          pad(ql,H.ql)+
          pad((s.lastSource||'-').slice(0,H.src),H.src)+' '+
          (s.lastSeen?new Date(s.lastSeen).toLocaleTimeString():'-');

        html += (dim && s.discardedOnly)
          ? `<span class="dim">${esc(row)}</span>\n`
          : `${esc(row)}\n`;
      }
    }
    html+='</pre>';
    tableEl.innerHTML=html;

    sumLine.textContent = `Visible % sum: ${
      arr.length? (sumPct.toFixed(2)+'%'): '—'
    }`;
  }

  function parseLine(line){
    linesRead++;
    pushRaw(line);
    pushDebug(`LINE_RX: ${short(line,140)}`);

    let m=null;

    // Bonus XP (counts as normal XP)
    if((m=line.match(rxXPBonus))){
      const v=toNum(m[1]);
      if(v){
        if(xpInclude.xp)pushParsed('xp','+'+fmt(v)+' XP (bonus)');
        xpPush('xp',v);
      }
    }
    // Alien XP
    else if((m=line.match(rxAXP))){
      const v=toNum(m[1]);if(v){
        if(xpInclude.axp)pushParsed('axp','+'+fmt(v)+' AXP');
        xpPush('axp',v);
      }
    }
    // Shadowknowledge / SK
    else if((m=line.match(rxSK))){
      const v=toNum(m[1]);if(v){
        if(xpInclude.sk)pushParsed('sk','+'+fmt(v)+' SK');
        xpPush('sk',v);
      }
    }
    // Research XP
    else if((m=line.match(rxRXP))){
      const v=toNum(m[1]);if(v){
        if(xpInclude.rxp)pushParsed('rxp','+'+fmt(v)+' Research');
        xpPush('rxp',v);
      }
    }
    // Normal XP
    else if((m=line.match(rxXP))){
      const v=toNum(m[1]);if(v){
        if(xpInclude.xp)pushParsed('xp','+'+fmt(v)+' XP');
        xpPush('xp',v);
      }
    }

    // Loot parsing
    const body=line.replace(/^\s*\[[^\]]*\]\s*/, '').trim();

    let matches=[],mm;
    while((mm=rxItemref.exec(body))!==null){
      const p1=parseInt(mm[1]||'0',10),
            p2=parseInt(mm[2]||'0',10),
            ql=parseInt(mm[3]||'0',10),
            raw=mm[4]||'';

      let high=0,low=0;
      if(p2>0){
        high=Math.max(p1,p2);low=Math.min(p1,p2);
      } else {
        high=p1;low=0;
      }

      matches.push({
        high,low,ql,
        name:htmlDecode(raw).trim()
      });
    }

    if(!matches.length){
      parseMisses++;
      updateMetrics();
      return;
    }

    let actionM=body.match(rxAction);
    let action=actionM?actionM[1].toLowerCase():null;
    if(!action){
      const lm=body.match(rxLoose);
      if(lm) action=lm[1].toLowerCase();
    }
    if(!action) action='looted';

    let srcM=body.match(rxSource);
    let source=srcM?srcM[1].trim().replace(/[.,;:]$/,''):null;

    for(const it of matches){
      const isDiscarded=/delete/i.test(action);
      const isKept=/loot|pick|receiv|acquir|add/i.test(action);

      const ev={
        name:it.name,
        ql:it.ql||0,
        high:it.high,
        low:it.low,
        isDiscarded,
        isKept,
        source,
        when:new Date().toISOString()
      };

      parseHits++;
      pushParsed(isDiscarded?'discard':'keep',
        `${ev.name} | QL:${ev.ql||'-'} | src:${ev.source||'-'}`
      );
      upsert(ev);
    }

    updateMetrics();
    renderTable();
  }

  function updateMetrics(){
    metricsInline.textContent=
      `lines=${linesRead} hits=${parseHits} misses=${parseMisses} `+
      `rot=${rotationCount} err=${readErrors} kept=${totalKept} discarded=${totalDiscarded}`;
  }

  async function startTailWithHandle(handle){
    state.fileHandle=handle; state.fileObj=null;
    try{
      const f=await handle.getFile();
      state.offset=f.size;
      state.startTs=now();

      cutoffLabel.textContent=new Date(state.startTs).toLocaleString();
      modeLabel.textContent='Live tail (FSA)';
      fileInfo.style.display='block';
      fileInfo.textContent=`${f.name} — starting at EOF (${fmt(f.size)} bytes)`;
      pathLabel.textContent=f.name;

      xpReset();
      setReading(true);

      if(state.tailTimer) clearInterval(state.tailTimer);
      const poll=800;
      state.tailTimer=setInterval(async ()=>{
        if(!state.reading||state.paused) return;
        try{
          const nf=await handle.getFile();
          const size=nf.size;
          if(size>state.offset){
            const slice=nf.slice(state.offset,size);
            const txt=await slice.text();
            state.offset=size;
            txt.split(/\r?\n/).forEach(ln=>{
              if(ln&&ln.trim())parseLine(ln)
            });
          }
          else if(size<state.offset){
            rotationCount++;
            state.offset=0;
            const slice=nf.slice(0,size);
            const txt=await slice.text();
            state.offset=size;
            txt.split(/\r?\n/).forEach(ln=>{
              if(ln&&ln.trim())parseLine(ln)
            });
          }
        }catch(e){
          readErrors++;
          pushDebug('READ_HANDLE_ERR: '+e);
        }
      },poll);

    }catch(e){
      readErrors++;
      pushDebug('OPEN_HANDLE_ERR: '+e);
      alert('Failed to open file handle: '+e);
    }
  }

  async function startTailWithFile(file){
    state.fileObj=file; state.fileHandle=null;
    try{
      const size=file.size;
      state.offset=size;
      state.startTs=now();

      cutoffLabel.textContent=new Date(state.startTs).toLocaleString();
      modeLabel.textContent='Polling fallback';
      fileInfo.style.display='block';
      fileInfo.textContent=`${file.name} — starting at EOF (${fmt(size)} bytes)`;
      pathLabel.textContent=file.name;

      xpReset();
      setReading(true);

      if(state.tailTimer) clearInterval(state.tailTimer);
      const poll=1200;
      state.tailTimer=setInterval(async ()=>{
        if(!state.reading||state.paused) return;
        try{
          const buf=await file.arrayBuffer();
          const txt=new TextDecoder().decode(buf);

          if(txt.length>state.offset){
            const append=txt.slice(state.offset);
            state.offset=txt.length;
            append.split(/\r?\n/).forEach(ln=>{
              if(ln&&ln.trim())parseLine(ln)
            });
          }
          else if(txt.length<state.offset){
            rotationCount++;
            state.offset=txt.length;
            txt.split(/\r?\n/).forEach(ln=>{
              if(ln&&ln.trim())parseLine(ln)
            });
          }
        }catch(e){
          readErrors++;
          pushDebug('POLL_READ_ERR: '+e);
        }
      },poll);

    }catch(e){
      readErrors++;
      pushDebug('START_FALLBACK_ERR: '+e);
    }
  }

  function setReading(on){
    state.reading=on&&!state.paused;
    gid('statusText').textContent=state.reading?'Parsing':(state.paused?'Paused':'Idle');
    dot.classList.toggle('ok',state.reading);
    dot.classList.toggle('err',!state.reading);
    updateMetrics();
  }

  function stopTail(){
    if(state.tailTimer) clearInterval(state.tailTimer);
    state.tailTimer=null;
    state.reading=false;
    state.paused=false;
    modeLabel.textContent='Stopped';
    setReading(false);
  }

  function exportState(){
    const prefs={
      inclDiscarded:inclDiscardedChk.checked,
      normalizeVisible:normalizeVisibleChk.checked,
      dimDiscardedOnly:dimDiscardedOnlyChk.checked,
      sortBy:eventSortBySel.value,
      sortDir:eventSortDirSel.value,
      search:eventSearchInp.value,
      view:eventView,
      xpInclude:{...xpInclude},
      style:styleSel.value,
      combineQL:combineQLChk.checked
    };
    const events=Object.values(stats);
    const out={
      when:new Date().toISOString(),
      totals:{totalKept,totalDiscarded,linesRead,parseHits,parseMisses,rotationCount,readErrors},
      prefs,
      events,
      xp:xpState
    };
    const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='xanalytics_state.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportCSV(){
    const includeDiscardedInPct=inclDiscardedChk.checked;
    let pctBase=(includeDiscardedInPct?(totalKept+totalDiscarded):totalKept)||1;
    const rows=[[
      'High','Low','Name','Events','Kept','Discarded',
      'Percent','Rarity','MinQL','MaxQL','Samples','LastSource','LastSeen'
    ]];
    for(const k in stats){
      const s=stats[k];
      const events=s.kept+s.discarded;
      const pct=(100.0*events)/pctBase;
      rows.push([
        s.high||0,
        s.low||0,
        s.name,
        events,
        s.kept,
        s.discarded,
        pct.toFixed(2)+'%',
        s.rarity||rarityOf(pct),
        s.minql===99999?'':s.minql,
        s.maxql||'',
        (s.sampleqls||[]).join(' '),
        s.lastSource||'',
        s.lastSeen||''
      ]);
    }
    const csv=rows.map(r=>r.map(c=>{
      const t=String(c??'');
      return (t.includes('"')||t.includes(',')||t.includes('\n'))
        ? `"${t.replace(/"/g,'""')}"`
        : t;
    }).join(',')).join('\n');

    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='xanalytics_session.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function resetSession(clearStats){
    stopTail();
    state.fileHandle=null;
    state.fileObj=null;
    state.offset=0;
    state.startTs=0;

    if(clearStats){
      for(const k in stats) delete stats[k];
      totalKept=totalDiscarded=0;
      linesRead=parseHits=parseMisses=rotationCount=readErrors=0;
      debugLog.length=0;
      rawLines.length=0;
      xpReset();

      if(parsedLog.style.display !== 'none')
        parsedLog.innerHTML='<div class="small dim">(parsed lines will appear here)</div>';

      if(rawPane.style.display !== 'none')
        rawPane.querySelector('pre').textContent = '(cleared)';

      if(debugPane.style.display !== 'none')
        debugPane.querySelector('pre').textContent = '(cleared)';
    }

    renderTable();
    updateMetrics();

    fileInfo.style.display='none';
    pathLabel.textContent='—';
    cutoffLabel.textContent='—';
    modeLabel.textContent='Idle';

    setReading(false);
  }

  const dropEl=gid('drop');

  dropEl.addEventListener('click',()=>btnAttach.click());

  ['dragenter','dragover'].forEach(eName=>{
    dropEl.addEventListener(eName,ev=>{
      ev.preventDefault();ev.stopPropagation();
      dropEl.classList.add('dragover');
    });
  });
  ['dragleave','drop'].forEach(eName=>{
    dropEl.addEventListener(eName,ev=>{
      ev.preventDefault();ev.stopPropagation();
      dropEl.classList.remove('dragover');
    });
  });

  async function startFromDrop(file) {
    resetSession(true);
    if (typeof file.getFile === 'function') {
      await startTailWithHandle(file);
    } else {
      await startTailWithFile(file);
    }
  }

  dropEl.addEventListener('drop',async e=>{
    e.preventDefault(); e.stopPropagation();
    let fileToProcess = null;

    if (e.dataTransfer?.items?.length) {
      const item = e.dataTransfer.items[0];
      if (item.kind === 'file' && typeof item.getAsFileSystemHandle === 'function') {
        try {
          const handle = await item.getAsFileSystemHandle();
          if (handle && handle.kind === 'file') {
            fileToProcess = handle;
          }
        } catch (err) {
          pushDebug('DROP_HANDLE_ERR: '+err);
        }
      }
    }

    if (!fileToProcess && e.dataTransfer?.files?.length) {
      fileToProcess = e.dataTransfer.files[0];
    }

    if (fileToProcess) {
      startFromDrop(fileToProcess);
    } else {
      pushDebug('DROP_ERR: No valid file found.');
    }
  });

  btnAttach.addEventListener('click',async ()=>{
    if('showOpenFilePicker' in window){
      try{
        const [h]=await window.showOpenFilePicker({multiple:false});
        await startFromDrop(h);
      }catch(e){
        if(e.name !== 'AbortError')
          pushDebug('PICK_CANCEL/ERR: '+e);
      }
    }else{
      const input=document.createElement('input');
      input.type='file';
      input.accept='.txt,text/plain';
      input.addEventListener('change',()=>{
        const f=input.files?.[0];
        if(f) startFromDrop(f);
      });
      input.click();
    }
  });

  btnInfo.addEventListener('click',()=>{
    infoPanel.style.display = (infoPanel.style.display==='none'||infoPanel.style.display==='') ? 'block' : 'none';
  });

  infoCloseBtn.addEventListener('click',()=>{
    infoPanel.style.display='none';
  });

  infoTabBtns.forEach(btn=>{
    btn.addEventListener('click',()=>{
      infoTabBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');

      const tabKey = btn.dataset.tab.replace('tab-','');
      infoTabs.howto.style.display = (tabKey==='howto')?'block':'none';
      infoTabs.notes.style.display = (tabKey==='notes')?'block':'none';
    });
  });

  btnReset.addEventListener('click',()=>{
    if(confirm('Reset session (clear stats and XP)?')) resetSession(true);
  });

  toggleParsed.addEventListener('click',()=>{
    const off=parsedLog.style.display!=='none';
    parsedLog.style.display=off?'none':'';
    toggleParsed.textContent=off?'Show':'Hide';
    if(!parsedLog.innerHTML && !off)
      parsedLog.innerHTML='<div class="small dim">(parsed lines will appear here)</div>';
  });

  toggleRaw.addEventListener('click',()=>{
    const off=rawPane.style.display!=='none';
    rawPane.style.display=off?'none':'';
    toggleRaw.textContent=off?'Show':'Hide';
    if(!off){
      const pre=rawPane.querySelector('pre') || document.createElement('pre');
      pre.textContent=rawLines.slice(-200).join('\n');
      rawPane.innerHTML='';
      rawPane.appendChild(pre);
      rawPane.scrollTop = rawPane.scrollHeight;
    }
  });

  toggleDebug.addEventListener('click',()=>{
    const off=debugPane.style.display!=='none';
    debugPane.style.display=off?'none':'';
    toggleDebug.textContent=off?'Show':'Hide';
    if(!off){
      const pre=debugPane.querySelector('pre')||document.createElement('pre');
      pre.textContent=debugLog.join('\n');
      debugPane.innerHTML='';
      debugPane.appendChild(pre);
      debugPane.scrollTop = debugPane.scrollHeight;
    }
  });

  [inclDiscardedChk,normalizeVisibleChk,dimDiscardedOnlyChk,combineQLChk,
   eventSortBySel,eventSortDirSel,
   eventSearchInp].forEach(el=>{
    el.addEventListener('input',renderTable);
  });

  [viewAll,viewKept,viewDiscarded].forEach(btn=>{
    btn.addEventListener('click',()=>{
      [viewAll,viewKept,viewDiscarded].forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      eventView =
        (btn===viewAll)?'all' :
        (btn===viewKept)?'kept' :
        'discarded';
      renderTable();
    });
  });

  ['xp','axp','sk'].forEach(k=>{
    xpd.need[k].addEventListener('change',()=>{
      xpState.goals[k]=toNum(xpd.need[k].value);
      refreshXPUI();
    });
  });

  [fxp,faxp,fsk,frxp].forEach(ch=>{
    ch.addEventListener('change',()=>{
      xpInclude.xp = fxp.checked;
      xpInclude.axp= faxp.checked;
      xpInclude.sk = fsk.checked;
      xpInclude.rxp= frxp.checked;
    });
  });

  styleSel.addEventListener('change',()=>{
    document.body.classList.toggle('classic', styleSel.value==='classic');
  });

  document.body.classList.remove('classic');

  exportStateLink.addEventListener('click',(e)=>{
    e.preventDefault();
    exportState();
  });

  exportCSVLink.addEventListener('click',(e)=>{
    e.preventDefault();
    exportCSV();
  });

  resetSession(true);
  pushDebug('Xanalytics ready — drop or attach a file');
})();
