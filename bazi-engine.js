/* =========================================================
   BAZI ENGINE v3 — Dynamic Ten-God Color & Guidance System
   
   Emily's natal chart:
     Day Master: Geng Metal (Yang), stem index 6
     Chart: STRONG Metal
     Year: Wu Chen (4,4) Month: Jia Zi (0,0)
     Day: Geng Xu (6,10) Hour: Geng Chen (6,4)
     Luck: Geng Shen (6,8)
     Peach Blossom: Rabbit(3) Clash: Dragon(4)
     Three Harmony: Tiger-Horse-Dog (2,6,10)
     Anchor: Dec 21 1988 = sexagenary idx 46

   Ten Gods (Geng Metal DM):
     Metal same=Friend diff=Rob Wealth
     Water same=Eating God diff=Hurting Officer
     Wood  same=Direct Wealth diff=Indirect Wealth
     Fire  same=Direct Officer diff=Seven Killings
     Earth same=Direct Resource diff=Indirect Resource

   STRONG Metal => Favorable: Water,Wood,Fire (drain/control)
                   Unfavorable: Metal,Earth (strengthen)

   v3: Colors scored per-day by ten-god relationships active
   in today's pillar. Every day = unique prioritized palette.
   ========================================================= */

var BZ_STEMS=[
  {c:'\u7532',el:'Wood',yy:'Yang'},{c:'\u4E59',el:'Wood',yy:'Yin'},
  {c:'\u4E19',el:'Fire',yy:'Yang'},{c:'\u4E01',el:'Fire',yy:'Yin'},
  {c:'\u620A',el:'Earth',yy:'Yang'},{c:'\u5DF1',el:'Earth',yy:'Yin'},
  {c:'\u5E9A',el:'Metal',yy:'Yang'},{c:'\u8F9B',el:'Metal',yy:'Yin'},
  {c:'\u58EC',el:'Water',yy:'Yang'},{c:'\u7678',el:'Water',yy:'Yin'},
];
var BZ_BRANCHES=[
  {c:'\u5B50',el:'Water',an:'Rat',start:23},{c:'\u4E11',el:'Earth',an:'Ox',start:1},
  {c:'\u5BC5',el:'Wood',an:'Tiger',start:3},{c:'\u536F',el:'Wood',an:'Rabbit',start:5},
  {c:'\u8FB0',el:'Earth',an:'Dragon',start:7},{c:'\u5DF3',el:'Fire',an:'Snake',start:9},
  {c:'\u5348',el:'Fire',an:'Horse',start:11},{c:'\u672A',el:'Earth',an:'Goat',start:13},
  {c:'\u7533',el:'Metal',an:'Monkey',start:15},{c:'\u9149',el:'Metal',an:'Rooster',start:17},
  {c:'\u620C',el:'Earth',an:'Dog',start:19},{c:'\u4EA5',el:'Water',an:'Pig',start:21},
];
var BZ_HIDDEN={0:[9],1:[5,9,7],2:[0,2,4],3:[1],4:[4,1,9],5:[2,6,4],6:[3,5],7:[5,3,1],8:[6,8,4],9:[7],10:[4,7,3],11:[8,0]};
var BZ_EMILY={
  year:{stem:4,branch:4},month:{stem:0,branch:0},day:{stem:6,branch:10},hour:{stem:6,branch:4},
  luck:{stem:6,branch:8},dmStem:6,
  luckyAnimalsIdx:[2,3,5,6],peachBlossom:3,clash:4,threeHarmony:[2,6,10],
};
var BZ_ANCHOR={date:new Date(1988,11,21),idx:46};

// Ten God lookup
var BZ_TEN_GODS={
  Metal:{same:'Friend',diff:'Rob Wealth'},
  Water:{same:'Eating God',diff:'Hurting Officer'},
  Wood:{same:'Direct Wealth',diff:'Indirect Wealth'},
  Fire:{same:'Direct Officer',diff:'Seven Killings'},
  Earth:{same:'Direct Resource',diff:'Indirect Resource'},
};
function bzTenGod(stemIdx){
  var s=BZ_STEMS[stemIdx],dm=BZ_STEMS[BZ_EMILY.dmStem];
  return BZ_TEN_GODS[s.el][(s.yy===dm.yy)?'same':'diff'];
}

// Day pillar
function bzDayPillar(date){
  var d0=new Date(date.getFullYear(),date.getMonth(),date.getDate());
  var diff=Math.round((d0-BZ_ANCHOR.date)/86400000);
  var idx=((BZ_ANCHOR.idx+diff)%60+60)%60;
  return{stem:idx%10,branch:idx%12};
}
function bzHourPillar(dayStemIdx,hour){
  var base=[0,2,4,6,8][dayStemIdx%5];
  var branch=(hour===23||hour===0)?0:Math.floor((hour+1)/2)%12;
  return{stem:(base+branch)%10,branch:branch};
}

// Day analysis — scores all elements by ten-god weight
function bzAnalyzeDay(dp){
  var stemEl=BZ_STEMS[dp.stem].el,branchEl=BZ_BRANCHES[dp.branch].el;
  var stemTG=bzTenGod(dp.stem),animal=BZ_BRANCHES[dp.branch].an;
  var els={};
  function add(el,src,w){if(!els[el])els[el]={weight:0,sources:[]};els[el].weight+=w;els[el].sources.push(src);}
  add(stemEl,'Stem ('+BZ_STEMS[dp.stem].c+')',3);
  add(branchEl,'Branch ('+animal+')',2);
  var hid=BZ_HIDDEN[dp.branch]||[];
  for(var h=0;h<hid.length;h++)add(BZ_STEMS[hid[h]].el,'Hidden ('+BZ_STEMS[hid[h]].c+')',h===0?1.5:0.5);

  var BASE={Water:4,Wood:4,Fire:3,Metal:-3,Earth:-2};
  var scored=[],all=['Fire','Wood','Water','Metal','Earth'];
  for(var i=0;i<all.length;i++){
    var el=all[i],present=!!els[el],dw=present?els[el].weight:0;
    var base=BASE[el],score=present?(base>0?base+dw:base-dw):base;
    var tg=null;
    if(present){
      if(stemEl===el)tg=stemTG;
      else for(var j=0;j<hid.length;j++){if(BZ_STEMS[hid[j]].el===el){tg=bzTenGod(hid[j]);break;}}
    }
    scored.push({element:el,score:score,present:present,dayWeight:dw,tenGod:tg,sources:present?els[el].sources:[]});
  }
  scored.sort(function(a,b){return b.score-a.score;});
  return{stem:BZ_STEMS[dp.stem],branch:BZ_BRANCHES[dp.branch],stemTenGod:stemTG,animal:animal,elements:scored,
    isClash:dp.branch===BZ_EMILY.clash,isPeachBlossom:dp.branch===BZ_EMILY.peachBlossom,
    isThreeHarmony:BZ_EMILY.threeHarmony.indexOf(dp.branch)>=0};
}

// Color + style data
var BZ_COLORS={
  Fire:{colors:['Red','Orange','Pink','Purple','Maroon'],hexes:['#c0392b','#e67e22','#e84393','#8e44ad','#7b241c']},
  Wood:{colors:['Green','Teal','Olive','Lime','Emerald'],hexes:['#27ae60','#1abc9c','#6b8e23','#7cb518','#1e6e3e']},
  Water:{colors:['Black','Navy','Blue','DkGray','Charcoal'],hexes:['#1a1a2e','#1b3a5c','#2471a3','#3d3d3d','#2c3e50']},
  Metal:{colors:['White','Gold','Silver','Cream','Champagne'],hexes:['#f5f5f5','#d4a017','#c0c0c0','#f5f0e1','#d4c5a9']},
  Earth:{colors:['Yellow','Brown','Beige','Tan','Khaki'],hexes:['#d4ac0d','#8b5e3c','#d2b48c','#c4a35a','#bdb76b']},
};
var BZ_LIGHT=['#f5f5f5','#f5f0e1','#d4c5a9','#d2b48c','#c0c0c0','#bdb76b','#d4ac0d','#c4a35a'];

var BZ_STYLE_MAP={
  Fire:{colors:'reds, oranges, pinks, purples',vibe:'Bold & magnetic',tip:'Warm statement tones. Power colors.',
    tenGodTips:{'Direct Officer':'Authority day \u2014 dress like you own the room. Structured reds, power pinks.','Seven Killings':'Raw power \u2014 bold, intense. Don\u2019t play safe.'}},
  Wood:{colors:'greens, teals, olives, emeralds',vibe:'Fresh & grounded',tip:'Natural greens, organic textures, flowy shapes.',
    tenGodTips:{'Direct Wealth':'Money energy \u2014 dress prosperously. Rich greens, quality fabrics.','Indirect Wealth':'Windfall vibes \u2014 unexpected green combos. Try something new.'}},
  Water:{colors:'blacks, navys, blues, charcoals',vibe:'Sleek & expressive',tip:'Dark fluid looks. Monochrome or tonal.',
    tenGodTips:{'Eating God':'Creative output \u2014 artistic, unconventional deep tones.','Hurting Officer':'Bold self-expression \u2014 statement pieces in blues/blacks. Be seen.'}},
  Metal:{colors:'whites, golds, silvers, creams',vibe:'Polished & minimal',tip:'Clean lines, metallics.',
    tenGodTips:{'Friend':'Too much of your energy today. Soften with Water or Wood instead.','Rob Wealth':'Competition energy \u2014 stand out with non-Metal colors.'}},
  Earth:{colors:'yellows, browns, beiges, tans',vibe:'Warm & stable',tip:'Warm neutrals, layered textures.',
    tenGodTips:{'Direct Resource':'Comfort trap \u2014 earth tones keep you stuck. Accent only.','Indirect Resource':'Overthinking energy \u2014 counter with Fire or Water.'}},
};

var BZ_DAY_NARRATIVES={
  Output:'Water dominates \u2014 creative channels open. Dark fluid tones for output and performance.',
  Wealth:'Wood activates Wealth. Greens and naturals attract prosperity. Quality over quantity.',
  Authority:'Fire refines Metal \u2014 visibility heightened. Commanding warm tones: reds, pinks, power colors.',
  Companion:'Metal reinforces your strong chart. Counter with Water (blacks/blues) or Wood (greens).',
  Resource:'Earth feeds Metal, adding weight. Antidote: Water (blacks/blues) to drain, Fire (reds) to cut through.',
};
var BZ_TG_THEME={'Eating God':'Output','Hurting Officer':'Output','Direct Wealth':'Wealth','Indirect Wealth':'Wealth',
  'Direct Officer':'Authority','Seven Killings':'Authority','Friend':'Companion','Rob Wealth':'Companion',
  'Direct Resource':'Resource','Indirect Resource':'Resource'};

// Main dynamic color recommendation
function bzDailyColors(dp){
  var a=bzAnalyzeDay(dp),rec=[],sof=[];
  for(var i=0;i<a.elements.length;i++){
    var el=a.elements[i],st=BZ_STYLE_MAP[el.element],cd=BZ_COLORS[el.element];
    var tip=st.tip;
    if(el.tenGod&&st.tenGodTips&&st.tenGodTips[el.tenGod])tip=st.tenGodTips[el.tenGod];
    var e={element:el.element,score:el.score,present:el.present,tenGod:el.tenGod,
      vibe:st.vibe,tip:tip,colorNames:st.colors,colors:cd.colors,hexes:cd.hexes,sources:el.sources,
      strength:el.score>0?(el.present?'primary':'accent'):(el.present?'avoid':'soften')};
    if(el.score>0)rec.push(e);else sof.push(e);
  }
  var tg=a.stemTenGod,theme=BZ_TG_THEME[tg]||'Mixed';
  return{analysis:a,recommend:rec,soften:sof,narrative:BZ_DAY_NARRATIVES[theme]||'Mixed energy. Listen to your Solar Plexus.',
    dayTheme:theme,stemTenGod:tg,animal:a.animal};
}

// UI-friendly wrapper
function bzWhatToWear(dp){
  var c=bzDailyColors(dp);
  return{animal:c.animal,dayTheme:c.dayTheme,stemTenGod:c.stemTenGod,narrative:c.narrative,
    primary:c.recommend.length?c.recommend[0]:null,accents:c.recommend.slice(1),
    avoid:c.soften,allRecommend:c.recommend,allSoften:c.soften};
}

// Best hours
function bzBestHoursFor(dp,mode){
  var sc=[];
  for(var b=0;b<12;b++){
    var hp=bzHourPillar(dp.stem,BZ_BRANCHES[b].start);
    var se=BZ_STEMS[hp.stem].el,be=BZ_BRANCHES[hp.branch].el,s=0;
    if(mode==='exercise'){if(se==='Fire'||be==='Fire')s+=3;if(se==='Wood'||be==='Wood')s+=2;if(se==='Water'||be==='Water')s+=1;if(BZ_EMILY.luckyAnimalsIdx.indexOf(b)>=0)s+=1;}
    else if(mode==='romance'){if(b===BZ_EMILY.peachBlossom)s+=4;if(BZ_EMILY.threeHarmony.indexOf(b)>=0)s+=2;if(se==='Fire'||be==='Fire')s+=2;if(se==='Wood'||be==='Wood')s+=1;if(BZ_EMILY.luckyAnimalsIdx.indexOf(b)>=0)s+=1;if(b===BZ_EMILY.clash)s-=3;}
    else if(mode==='travel'){if(se==='Water'||be==='Water')s+=3;if(se==='Wood'||be==='Wood')s+=2;if(se==='Fire'||be==='Fire')s+=1;if(BZ_EMILY.luckyAnimalsIdx.indexOf(b)>=0)s+=1;if(b===BZ_EMILY.clash)s-=3;}
    sc.push({b:b,s:s,start:BZ_BRANCHES[b].start});
  }
  sc.sort(function(a,b){return b.s-a.s;});
  var top=sc.slice(0,3).filter(function(x){return x.s>0;});
  if(!top.length)return'No strong windows today';
  var fmt=function(h){var p=h%12||12;return p+(h<12?'AM':'PM');};
  return top.map(function(t){var e=(t.start+2)%24;return BZ_BRANCHES[t.b].an+' '+fmt(t.start)+'\u2013'+fmt(e);}).join(' \u00b7 ');
}

// Guidance generators
function bzExerciseFor(dp){
  var se=BZ_STEMS[dp.stem].el,be=BZ_BRANCHES[dp.branch].el,bt=bzBestHoursFor(dp,'exercise'),tg=bzTenGod(dp.stem);
  if(se==='Fire'||be==='Fire')return{headline:'Cardio & intensity',bestTime:bt,body:tg+' (Fire) \u2014 push it: HIIT, dance, hot yoga.',tags:[{t:tg,k:'good'},{t:'Cardio',k:''},{t:'Heat',k:''}]};
  if(se==='Wood'||be==='Wood')return{headline:'Yoga & flow',bestTime:bt,body:tg+' (Wood) \u2014 range of motion, breath work.',tags:[{t:tg,k:'good'},{t:'Yoga',k:''},{t:'Flow',k:''}]};
  if(se==='Water'||be==='Water')return{headline:'Fluid & expressive',bestTime:bt,body:tg+' (Water) \u2014 swimming, vinyasa, dance.',tags:[{t:tg,k:'good'},{t:'Swim',k:''},{t:'Expressive',k:''}]};
  if(se==='Metal'&&be==='Metal')return{headline:'Go gentle',bestTime:bt,body:tg+' \u2014 chart overloaded. Restorative yoga, walking.',tags:[{t:tg,k:'warn'},{t:'Gentle',k:''}]};
  if(se==='Earth'&&be==='Earth')return{headline:'Break inertia',bestTime:bt,body:tg+' \u2014 stagnation risk. Brisk walk, jump rope.',tags:[{t:tg,k:'warn'},{t:'Brisk',k:''}]};
  return{headline:'Balanced',bestTime:bt,body:tg+' \u2014 mixed. Walk + stretch.',tags:[{t:tg,k:''},{t:'Moderate',k:''}]};
}
function bzTravelFor(dp){
  var se=BZ_STEMS[dp.stem].el,be=BZ_BRANCHES[dp.branch].el,d=[],av=[];
  if(se==='Fire'||be==='Fire')d.push('South');if(se==='Wood'||be==='Wood')d.push('East');
  if(se==='Water'||be==='Water')d.push('North');if(se==='Metal'||be==='Metal')av.push('West');
  if(se==='Earth'||be==='Earth')av.push('SW/NE');
  var f=d.length?d.join(' or '):'North',bt=bzBestHoursFor(dp,'travel');
  var body='Favor '+f+'. '+(av.length?'Soften toward '+av.join(' & ')+'. ':'')+BZ_BRANCHES[dp.branch].an+' day'+(dp.branch===BZ_EMILY.clash?' \u2014 clashes Dog.':'.');
  return{headline:f,bestTime:bt,body:body,tags:d.map(function(x){return{t:x,k:'good'};}).concat(av.map(function(x){return{t:x,k:'warn'};}))};
}
function bzWorkEnvFor(dp){
  var tg=bzTenGod(dp.stem),f=[];
  if(tg==='Eating God'||tg==='Hurting Officer')f.push('creative output','writing','performance');
  else if(tg==='Direct Wealth'||tg==='Indirect Wealth')f.push('money work','deals','proposals');
  else if(tg==='Direct Officer'||tg==='Seven Killings')f.push('career moves','visibility','leadership');
  else if(tg==='Friend'||tg==='Rob Wealth')f.push('solo work','minimize meetings','heads down');
  else f.push('learning','research','gather info');
  var exp=['Eating God','Hurting Officer','Direct Wealth','Indirect Wealth','Direct Officer'].indexOf(tg)>=0;
  var bt=bzBestHoursFor(dp,'exercise');
  return{headline:f[0].charAt(0).toUpperCase()+f[0].slice(1),bestTime:bt,
    body:tg+' \u2014 '+(exp?'outward':'inward')+' energy. '+f.join(', ')+'. Hermit 6\u20137 PM.',
    tags:[{t:tg,k:exp?'good':'warn'}].concat(f.slice(0,2).map(function(x){return{t:x,k:''};}))};
}
function bzRomanceFor(dp){
  var r=3,tg=bzTenGod(dp.stem);
  if(dp.branch===BZ_EMILY.peachBlossom)r+=2;
  if(BZ_EMILY.threeHarmony.indexOf(dp.branch)>=0)r+=1.5;
  if(dp.branch===BZ_EMILY.clash)r-=2;
  if(tg==='Direct Officer'||tg==='Seven Killings')r+=1;
  if(tg==='Direct Wealth'||tg==='Indirect Wealth')r+=0.5;
  if(tg==='Friend'||tg==='Rob Wealth')r-=1;
  r=Math.max(1,Math.min(5,Math.round(r)));
  var bt=bzBestHoursFor(dp,'romance'),note;
  if(dp.branch===BZ_EMILY.peachBlossom)note='Peach Blossom + '+tg+' \u2014 romantic charge high. Let it come to you.';
  else if(dp.branch===BZ_EMILY.clash)note='Dragon clashes Dog \u2014 '+tg+'. Low-stakes only.';
  else if(tg==='Direct Officer'||tg==='Seven Killings')note=tg+' (Fire) \u2014 attraction up. Meet people through visibility.';
  else if(tg==='Friend'||tg==='Rob Wealth')note=tg+' \u2014 competition. Focus inward.';
  else note=tg+'. Steady. Jupiter 7H keeps opportunity open.';
  return{rating:r,note:note,bestTime:bt,tenGod:tg};
}
