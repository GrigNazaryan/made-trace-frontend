// Explicit aliases describe the same place; fuzzy matching never invents a workshop.
export const normalize=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[-–—]/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const countryAliases={
 US:['US','USA','United States','United States of America','America','États-Unis','Vereinigte Staaten','Stati Uniti','Estados Unidos','США','Соединённые Штаты'],
 GB:['UK','United Kingdom','Britain','Great Britain','Royaume-Uni','Großbritannien','Regno Unito','Reino Unido','Великобритания','Британия'],
 DE:['DE','Germany','Deutschland','Allemagne','Germania','Alemania','Германия'],FR:['FR','France','Frankreich','Francia','Франция'],
 IT:['IT','Italy','Italia','Italien','Italie','Италия'],ES:['ES','Spain','España','Spanien','Espagne','Spagna','Испания'],
 IE:['IE','Ireland','Éire','Irland','Irlande','Irlanda','Ирландия'],NL:['NL','Netherlands','Nederland','Holland','Pays-Bas','Niederlande','Paesi Bassi','Países Bajos','Нидерланды'],
 PL:['PL','Poland','Polska','Pologne','Polen','Polonia','Польша'],PT:['PT','Portugal','Portogallo','Португалия']
};
const cityAliases={Brooklyn:['Brooklyn','NYC','New York','New York City','Бруклин','Нью-Йорк'],Cologne:['Cologne','Köln','Koeln','Кёльн'],Milan:['Milan','Milano','Mailand','Милан'],Lyon:['Lyon','Лион'],Manchester:['Manchester','Манчестер'],Portland:['Portland','Портленд'],Valencia:['Valencia','València','Валенсия'],Dublin:['Dublin','Baile Átha Cliath','Дублин'],Utrecht:['Utrecht','Утрехт']};
export const serviceAliases={DTF:['DTF','Direct to Film','film transfer','transfert film','transferencia','плёночный перенос','ДТФ'],Embroidery:['Embroidery','embroidered','stitching','Broderie','Stickerei','Ricamo','Bordado','Вышивка'], 'Screen printing':['Screen printing','screenprint','silkscreen','Sérigraphie','Siebdruck','Serigrafia','Serigrafía','Трафаретная печать','Шелкография']};
const apparelWords=['T-shirt printing','tshirt','tees','apparel','garment','clothing','custom','print','printing','impression','textile','Druck','Textildruck','bedrucken','stampa','abbigliamento','camisetas','impresión','печать','одежда','футболки','футболка','на','печат'];
export function distance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return row[b.length];}
function terms(w){const fields=[{text:w.name,weight:6},{text:[w.city,...(cityAliases[w.city]||[])].join(' '),weight:5},{text:[w.country,...(countryAliases[w.country]||[])].join(' '),weight:4},{text:(w.services||[]).flatMap(s=>[s,...(serviceAliases[Object.keys(serviceAliases).find(key=>normalize(key)===normalize(s))]||[])]).join(' '),weight:3},{text:[...(w.categories||[]),...apparelWords,w.serviceArea].join(' '),weight:1}];return fields.flatMap(f=>normalize(f.text).split(' ').filter(Boolean).map(token=>({token,weight:f.weight})));}
function match(w,query){const fields=terms(w),corrections=[];let score=0;for(const token of normalize(query).split(' ').filter(Boolean)){
 let best=fields.filter(f=>f.token===token).sort((a,b)=>b.weight-a.weight)[0];if(best){score+=best.weight*10;continue;}
 const prefix=fields.find(f=>token.length>=2&&f.token.startsWith(token));if(prefix){score+=prefix.weight*6;continue;}
 // Short place names and abbreviations require an exact match (York is not Cork).
 const limit=token.length>=9?2:token.length>=5?1:0;
 const fuzzy=limit?fields.filter(f=>Math.abs(f.token.length-token.length)<=limit).map(f=>({...f,d:distance(token,f.token)})).filter(f=>f.d<=limit).sort((a,b)=>a.d-b.d||b.weight-a.weight)[0]:null;
 if(!fuzzy)return null;score+=fuzzy.weight*3-fuzzy.d;corrections.push({from:token,to:fuzzy.token});
 }return {workshop:w,score,corrections};}
export function searchWorkshops(workshops,filters={}){
 const {search='',country='all',city='all',service='all'}=filters;
 const candidates=workshops.filter(w=>(country==='all'||w.country===country)&&(city==='all'||w.city===city)&&(service==='all'||w.services?.includes(service)));
 const matches=candidates.map(w=>match(w,search)).filter(Boolean).sort((a,b)=>b.score-a.score||a.workshop.name.localeCompare(b.workshop.name));
 const tokens=normalize(search).split(' '),corrections=matches[0]?.corrections||[];
 const suggestion=corrections.length?tokens.map(token=>corrections.find(c=>c.from===token)?.to||token).join(' '):null;
 return {rows:matches.map(m=>m.workshop),suggestion};
}
