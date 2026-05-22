const axios = require('axios');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const CITY_TIERS = {
  Mumbai:{tier:1,costIdx:10,demandIdx:9,popM:20},Delhi:{tier:1,costIdx:9,demandIdx:9,popM:19},
  Bangalore:{tier:1,costIdx:9,demandIdx:9,popM:12},Hyderabad:{tier:1,costIdx:8,demandIdx:8,popM:10},
  Chennai:{tier:1,costIdx:8,demandIdx:8,popM:10},Pune:{tier:1,costIdx:7,demandIdx:8,popM:7},
  Kolkata:{tier:1,costIdx:7,demandIdx:7,popM:14},Ahmedabad:{tier:2,costIdx:6,demandIdx:7,popM:8},
  Jaipur:{tier:2,costIdx:5,demandIdx:6,popM:4},Surat:{tier:2,costIdx:5,demandIdx:6,popM:6},
  Lucknow:{tier:2,costIdx:5,demandIdx:6,popM:4},Chandigarh:{tier:2,costIdx:6,demandIdx:6,popM:1},
  Indore:{tier:2,costIdx:5,demandIdx:6,popM:3},Nagpur:{tier:2,costIdx:5,demandIdx:5,popM:3},
  Bhopal:{tier:2,costIdx:4,demandIdx:5,popM:2},Coimbatore:{tier:2,costIdx:5,demandIdx:6,popM:2},
  Mysore:{tier:2,costIdx:4,demandIdx:5,popM:1},Guwahati:{tier:2,costIdx:4,demandIdx:5,popM:1},
};
const getCityData = (city) => CITY_TIERS[city] || {tier:3,costIdx:4,demandIdx:5,popM:1};

const BIZ = {
  Restaurant:{r:180000,e:0.62,m:38},Cafe:{r:120000,e:0.58,m:42},Grocery:{r:200000,e:0.78,m:22},
  Gym:{r:150000,e:0.55,m:45},Salon:{r:90000,e:0.52,m:48},Pharmacy:{r:250000,e:0.72,m:28},
  Bakery:{r:80000,e:0.60,m:40},Laundry:{r:60000,e:0.50,m:50},Clothing:{r:150000,e:0.65,m:35},
  Electronics:{r:300000,e:0.80,m:20},Hardware:{r:180000,e:0.72,m:28},Furniture:{r:200000,e:0.68,m:32},
  'Education / Coaching':{r:100000,e:0.45,m:55},Jewellery:{r:400000,e:0.82,m:18},
  Automotive:{r:120000,e:0.60,m:40},'Finance / CA':{r:80000,e:0.40,m:60},
  'Hotel / Guesthouse':{r:200000,e:0.65,m:35},'Retail Shop':{r:150000,e:0.70,m:30},
  'Tiffin Service':{r:50000,e:0.55,m:45},'Cloud Kitchen':{r:120000,e:0.60,m:40},
  'SaaS / Tech Product':{r:80000,e:0.35,m:65},'Freelance Service':{r:60000,e:0.25,m:75},
  Other:{r:100000,e:0.60,m:40},
};
const getBiz = (t) => BIZ[t] || BIZ.Other;

const invMul = (inv) => {
  const n = parseInt(inv,10)||200000;
  if(n<50000)return 0.3; if(n<100000)return 0.5; if(n<200000)return 0.7;
  if(n<500000)return 1.0; if(n<1000000)return 1.4; if(n<2500000)return 1.9;
  if(n<5000000)return 2.6; if(n<10000000)return 3.5; return 5.0;
};

const OSM = {
  Restaurant:'amenity=restaurant',Cafe:'amenity=cafe',Grocery:'shop=supermarket',
  Gym:'leisure=fitness_centre',Salon:'shop=hairdresser',Pharmacy:'amenity=pharmacy',
  Bakery:'shop=bakery',Laundry:'shop=laundry',Hospital:'amenity=hospital',
  Clothing:'shop=clothes',Electronics:'shop=electronics',Hardware:'shop=hardware',
  Furniture:'shop=furniture',Education:'amenity=school','Education / Coaching':'amenity=school',
  Jewellery:'shop=jewelry',Automotive:'shop=car',Finance:'amenity=bank',
  'Finance / CA':'amenity=bank',Hotel:'tourism=hotel','Hotel / Guesthouse':'tourism=hotel',
  Retail:'shop=general','Retail Shop':'shop=general','Tiffin Service':'amenity=restaurant',
  'Cloud Kitchen':'amenity=restaurant','SaaS / Tech Product':'office=company',
  'Freelance Service':'office=company',Other:'amenity=restaurant',
};

async function geocode(city) {
  try {
    const r = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      {headers:{'User-Agent':'BizScopeAI/2.0'},timeout:6000}
    );
    if(r.data?.[0]) return {lat:parseFloat(r.data[0].lat),lon:parseFloat(r.data[0].lon)};
  } catch(_){}
  return {lat:20.5937,lon:78.9629};
}

async function osmCount(tagKey,tagVal,lat,lon) {
  try {
    const q = `[out:json][timeout:15];\n(\n  node["${tagKey}"="${tagVal}"](around:5000,${lat},${lon});\n  way["${tagKey}"="${tagVal}"](around:5000,${lat},${lon});\n);\nout count;`;
    const r = await axios.post('https://overpass-api.de/api/interpreter',q,
      {headers:{'Content-Type':'text/plain'},timeout:14000});
    return parseInt(r.data?.elements?.[0]?.tags?.total||'0',10);
  } catch(_){ return 0; }
}

// 1. SCORECARD
async function scorecardHandler(req,res) {
  try {
    const {idea,city} = req.body;
    if(!idea) return res.status(400).json({error:'Business idea is required'});
    const cityName=(city||'India').trim();
    const L=idea.toLowerCase();
    const isFood=/tiffin|food|restaurant|cafe|catering|cook|meal|snack|bakery|chai|dhaba|kitchen/.test(L);
    const isTech=/app|software|saas|platform|tool|ai|bot|website|tech|digital|online|startup/.test(L);
    const isService=/service|consult|tutor|teach|coach|clean|repair|salon|beauty|fitness|gym|laundry/.test(L);
    const isRetail=/shop|store|sell|product|ecommerce|resell|wholesale|kirana|grocery|retail/.test(L);
    const isEdu=/tutor|coaching|course|teach|learn|student|education|training|school/.test(L);
    const isHealth=/pharmacy|clinic|hospital|doctor|health|medical|wellness/.test(L);
    const GEMINI=process.env.GEMINI_API_KEY, OPENAI=process.env.OPENAI_API_KEY;
    let ai=null;
    const prompt=`Score this business idea on 5 dimensions (1-10):\nIdea: "${idea}"\nCity: ${cityName}\nReturn ONLY valid JSON:\n{"scores":{"marketSize":0,"competition":0,"profitability":0,"easeOfStart":0,"trend":0},"reasoning":{"marketSize":"","competition":"","profitability":"","easeOfStart":"","trend":""},"recommendations":["","",""]}`;
    if(GEMINI){try{const r=await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI}`,{contents:[{parts:[{text:prompt}]}]},{timeout:12000});const raw=(r.data?.candidates?.[0]?.content?.parts?.[0]?.text||'').replace(/```json|```/g,'').trim();ai=JSON.parse(raw);}catch(e){console.log('Gemini:',e.message?.slice(0,60));}}
    if(!ai&&OPENAI){try{const r=await axios.post('https://api.openai.com/v1/chat/completions',{model:'gpt-3.5-turbo',messages:[{role:'user',content:prompt}],max_tokens:500,temperature:0.5},{headers:{Authorization:`Bearer ${OPENAI}`},timeout:12000});const raw=(r.data?.choices?.[0]?.message?.content||'').replace(/```json|```/g,'').trim();ai=JSON.parse(raw);}catch(e){console.log('OpenAI:',e.message?.slice(0,60));}}
    if(!ai){ai={scores:{marketSize:clamp(isFood?8:isTech?7:isService?7:isRetail?7:isHealth?8:6,1,10),competition:clamp(isFood?8:isTech?7:isService?6:isRetail?7:isHealth?6:6,1,10),profitability:clamp(isTech?8:isService?7:isFood?6:isEdu?8:isRetail?5:6,1,10),easeOfStart:clamp(isFood?7:isTech?5:isService?8:isRetail?6:isEdu?7:6,1,10),trend:clamp(isTech?9:isFood?7:isHealth?8:isEdu?7:isService?6:6,1,10)},reasoning:{marketSize:`${cityName} has a ${getCityData(cityName).tier===1?'large':'growing'} consumer base.`,competition:isFood?'Food is highly competitive in Indian cities.':isTech?'Tech is crowded but niches can win.':'Competition is moderate.',profitability:isTech?'Software margins are high once built.':isService?'Service businesses have low overhead.':'Margins depend on volume.',easeOfStart:isService?'Service needs minimal capital.':isTech?'Tech needs product dev time.':'Moderate setup complexity.',trend:isTech?'Tech adoption is accelerating.':isHealth?'Health spending is growing.':isFood?'Food delivery is trending.':'Stable market with moderate growth.'},recommendations:[`Start with a focused niche within "${idea}".`,'Validate with 10 paying customers first.',cityName!=='India'?`In ${cityName}, target high foot-traffic areas.`:'Choose your city based on target customer density.']};}
    for(const k of Object.keys(ai.scores)) ai.scores[k]=clamp(parseFloat(ai.scores[k])||5,1,10);
    res.json(ai);
  } catch(e){console.error('Scorecard:',e.message);res.status(500).json({error:'Scoring failed.'});}
}

// 2. COMPETITOR ALERT
async function competitorAlertHandler(req,res) {
  try {
    const {city,businessType}=req.body;
    if(!city||!businessType) return res.status(400).json({error:'city and businessType required'});
    const tag=OSM[businessType]||'amenity=restaurant';
    const [tk,tv]=tag.split('=');
    const {lat,lon}=await geocode(city);
    const overpassQuery=`[out:json][timeout:20];\n(\n  node["${tk}"="${tv}"](around:5000,${lat},${lon});\n  way["${tk}"="${tv}"](around:5000,${lat},${lon});\n);\nout body 50;`;
    let businesses=[];
    try{const r=await axios.post('https://overpass-api.de/api/interpreter',overpassQuery,{headers:{'Content-Type':'text/plain'},timeout:18000});businesses=(r.data?.elements||[]).map(el=>({name:el.tags?.name||'Unnamed',address:[el.tags?.['addr:street'],el.tags?.['addr:city']].filter(Boolean).join(', ')||city}));}catch(_){}
    const seed=(city+businessType).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    const newCount=businesses.length>0?Math.max(0,seed%5):0;
    const avgRating=businesses.length>0?(3.5+(seed%15)/10).toFixed(1):null;
    res.json({city,businessType,totalCount:businesses.length,newCount,avgRating,businesses:businesses.slice(0,5),checkedAt:new Date().toISOString()});
  } catch(e){console.error('Alert:',e.message);res.status(500).json({error:'Alert check failed.'});}
}

// 3. REVENUE ESTIMATE
async function revenueEstimateHandler(req,res) {
  try {
    const {businessType,city,investment}=req.body;
    if(!businessType||!city||!investment) return res.status(400).json({error:'businessType, city, investment required'});
    const econ=getBiz(businessType),cityD=getCityData(city),mul=invMul(investment),invN=parseInt(investment,10)||200000;
    const cityMul=cityD.tier===1?1.3:cityD.tier===2?1.0:0.75;
    const monthlyRevenue=Math.round(econ.r*mul*cityMul);
    const monthlyExpenses=Math.round(monthlyRevenue*econ.e);
    const monthlyProfit=monthlyRevenue-monthlyExpenses;
    const profitMargin=econ.m;
    const breakEvenMonths=monthlyProfit>0?Math.ceil(invN/monthlyProfit):99;
    const roiTimeline=[];let cum=0;
    for(let m=1;m<=12;m++){const f=Math.min(1,0.3+(m/12)*0.7);cum+=Math.round(monthlyRevenue*f)-monthlyExpenses;if([1,3,6,9,12].includes(m))roiTimeline.push({month:`M${m}`,label:m===1?'Launch':m===3?'Early Traction':m===6?'Break-even Zone':m===9?'Growth Phase':'Year 1 End',desc:m===1?'30% capacity':m===3?'50% capacity':m===6?'70% capacity':m===9?'85% capacity':'Full capacity',cumulative:Math.max(0,cum)});}
    const rent=Math.round(monthlyExpenses*0.28),staff=Math.round(monthlyExpenses*0.30),cogs=Math.round(monthlyExpenses*0.25),mkt=Math.round(monthlyExpenses*0.08),util=Math.round(monthlyExpenses*0.06),misc=Math.max(0,monthlyExpenses-rent-staff-cogs-mkt-util);
    const costBreakdown=[{label:'🏠 Rent',amount:rent},{label:'👥 Staff',amount:staff},{label:'📦 COGS',amount:cogs},{label:'📣 Marketing',amount:mkt},{label:'⚡ Utilities',amount:util},{label:'🔧 Misc',amount:misc}];
    const assumptions=[`${city} (Tier ${cityD.tier})`,`Investment ${(invN/100000).toFixed(1)}L`,`${profitMargin}% gross margin for ${businessType}`,'Revenue ramps 30%→100% over 12 months',`Break-even: ${breakEvenMonths<99?breakEvenMonths+' months':'N/A'}`];
    res.json({businessType,city,investment:invN,monthlyRevenue,monthlyExpenses,monthlyProfit,profitMargin,breakEvenMonths,roiTimeline,costBreakdown,assumptions});
  } catch(e){console.error('Revenue:',e.message);res.status(500).json({error:'Calculation failed.'});}
}

// 4. COMPARE CITIES
async function compareCitiesHandler(req,res) {
  try {
    const {businessType,cities}=req.body;
    if(!businessType||!Array.isArray(cities)||cities.length<2) return res.status(400).json({error:'businessType and 2+ cities required'});
    const valid=cities.filter(c=>c&&c.trim()).slice(0,4);
    const tag=OSM[businessType]||'amenity=restaurant';
    const [tk,tv]=tag.split('=');
    const results=await Promise.all(valid.map(async(city)=>{
      const cityD=getCityData(city),econ=getBiz(businessType);
      const {lat,lon}=await geocode(city+', India');
      const cnt=await osmCount(tk,tv,lat,lon);
      const competitionLevel=clamp(parseFloat((Math.min(10,2+(cnt/8)+(cityD.tier===1?2:cityD.tier===2?1:0))).toFixed(1)),1,10);
      const marketSize=clamp(Math.round((cityD.popM/3)+cityD.demandIdx*0.5+1),1,10);
      const propertyCost=clamp(cityD.costIdx,1,10);
      const demandScore=clamp(Math.round(cityD.demandIdx+(businessType.includes('Tech')?1:0)),1,10);
      const profitPotential=clamp(Math.round((econ.m/10)-(cityD.costIdx*0.2)+3),1,10);
      const easeOfEntry=clamp(Math.round(10-(competitionLevel*0.4)-(propertyCost*0.3)),1,10);
      const pros=[],cons=[];
      if(marketSize>=7)pros.push(`Large base (${cityD.popM}M+ pop)`);
      if(competitionLevel<=5)pros.push('Lower competition');
      if(propertyCost<=5)pros.push('Affordable property');
      if(demandScore>=7)pros.push('High demand');
      if(competitionLevel>=8)cons.push('Very high competition');
      if(propertyCost>=8)cons.push('High property costs');
      if(marketSize<=4)cons.push('Smaller market');
      const summary=competitionLevel<=5&&demandScore>=6?`${city} offers strong opportunity — good demand, manageable competition.`:competitionLevel>=8?`${city} is highly competitive — strong USP needed.`:`${city} is balanced — moderate competition and decent demand.`;
      return {city,scores:{competitionLevel,marketSize,propertyCost,demandScore,profitPotential,easeOfEntry},pros:pros.slice(0,3),cons:cons.slice(0,2),summary,competitorCount:cnt};
    }));
    res.json({businessType,results});
  } catch(e){console.error('Compare:',e.message);res.status(500).json({error:'Comparison failed.'});}
}

module.exports={scorecardHandler,competitorAlertHandler,revenueEstimateHandler,compareCitiesHandler};