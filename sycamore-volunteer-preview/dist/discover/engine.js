/* Transparent recommendation prototype. Scores are fit points, never probabilities. */
(function(root){
'use strict';
const criteria=['Current goal','Direct experience','Transferable experience','Learning opportunity','Training & support','Schedule','Travel feasibility','Commitment','Cause alignment'];
const weights={experience:[25,15,5,15,10,10,10,5,5],learn:[20,0,5,25,20,10,10,5,5],interests:[35,0,0,20,15,10,10,5,5]};
const modes={experience:'Use my experience',learn:'Learn something new',interests:'Follow my interests'};
const topics={accounting:{name:'Accounting & finance',tags:['budgeting','accounting','excel','tax'],adjacent:['logistics','analysis']},outdoors:{name:'Nature & outdoors',tags:['planting','conservation','fieldwork'],adjacent:['logistics','leadership']},teaching:{name:'Teaching & mentoring',tags:['tutoring','teaching','mentoring'],adjacent:['communication','leadership']},creative:{name:'Creative & outreach',tags:['design','outreach','writing'],adjacent:['communication','events']},community:{name:'Community & food access',tags:['logistics','distribution','community'],adjacent:['events','leadership']}};
const skillRules={budgeting:/\bbudget(?:ing|s)?\b/i,accounting:/\baccount(?:ing|ant|ants)\b|bookkeep/i,excel:/\bexcel\b|spreadsheet/i,tax:/\btax(?:es|ation)?\b/i,logistics:/\blogistics\b|inventory|supply/i,analysis:/\banalys(?:is|t)\b|financial model/i,leadership:/\bchair\b|team lead|president|managed a team/i,events:/\bevents?\b|coordinat/i,tutoring:/\btutor(?:ing)?\b/i,teaching:/\bteach(?:ing|er)?\b/i,mentoring:/\bmentor(?:ing)?\b/i,communication:/\bcommunication\b|present(?:ation|ing)/i,design:/\bdesign\b|canva|figma/i,outreach:/\boutreach\b|marketing/i,writing:/\bwriting\b|copywriting/i,planting:/\bplanting\b|tree care/i,conservation:/\bconservation\b|restoration/i,fieldwork:/\bfieldwork\b/i,distribution:/\bdistribution\b|food bank/i,community:/\bcommunity\b/i};
function extract(text){return Object.entries(skillRules).filter(([,r])=>r.test(text)).map(([s])=>s)}
function evaluate(o,p){
 const reason=[];let status='ready';
 if(o.status!=='open')reason.push('This sample opportunity is closed.');
 if(p.day!=='any'&&p.day!==o.day)reason.push('The event conflicts with your selected day.');
 if(o.weeks>p.weeks)reason.push('The commitment exceeds your selected maximum.');
 const travel=o.travel[p.transport];
 if(travel!==null&&travel>p.maxTravel)reason.push('The sample journey exceeds your travel limit.');
 if(o.cost!==null&&o.cost>p.maxCost)reason.push('Travel costs exceed your selected budget.');
 if(reason.length)status='excluded';else if(travel===null||o.cost===null)status='conditional';else if(o.training)status='training';
 const t=topics[p.topic],match=o.tags.filter(x=>t.tags.includes(x)),adj=o.tags.filter(x=>t.adjacent.includes(x));
 const direct=p.reviewed?Math.min(5,Math.round(5*o.tags.filter(x=>p.skills.includes(x)).length/Math.min(3,o.tags.length))):null;
 const transfer=p.reviewed?Math.min(5,p.skills.filter(x=>(topics[o.topic]?.adjacent||[]).includes(x)).length*2):null;
 const interest=o.topic===p.topic?5:match.length?3:adj.length?2:0;
 const learning=o.topic===p.topic?5:match.length?3:adj.length?2:0;
 const ratings=[interest,direct,transfer,learning,o.support,p.day==='any'?3:5,travel===null?null:travel<=p.maxTravel*.5?5:travel<=p.maxTravel*.8?4:3,o.weeks<=p.weeks*.5?5:4,p.cause==='any'?3:p.cause===o.cause?5:0];
 const explanations=[`${match.length?'Related tasks: '+match.join(', '):o.topic===p.topic?'This role is in your selected area.':'This role is outside your selected area.'}`,p.reviewed?`Your reviewed tags match ${o.tags.filter(x=>p.skills.includes(x)).join(', ')||'none of the listed tasks'}.`:'Your background has not been reviewed; no experience was assumed.',p.reviewed?`Transfer uses the published prototype skill map for ${topics[o.topic].name.toLowerCase()}.`:'Transferable experience is unknown until you review your background.',`Practice offered: ${o.tasks[0]}. ${o.topic===p.topic?'Directly aligned with your selected learning area.':'Outside or adjacent to your selected learning area.'}`,o.supportNote,`${o.day}, ${o.time}. ${p.day==='any'?'You have not selected a preferred day.':'Matches your selected day.'}`,travel===null?'Journey time is unknown for this transport mode.':`${travel} minutes one way by ${p.transport}; illustrative estimate, not a live route.`,`${o.weeks===1?'One event':o.weeks+' weeks'}; your maximum is ${p.weeks} weeks.`,p.cause==='any'?'No cause preference selected.':p.cause===o.cause?'Matches your selected cause.':'Different from your selected cause.'];
 const w=weights[p.mode];let low=0,unknown=0;const components=ratings.map((r,i)=>{let points=r===null?null:w[i]*r/5;if(points===null)unknown+=w[i];else low+=points;return {name:criteria[i],weight:w[i],rating:r,points,explanation:explanations[i]}});
 return {opportunity:o,status,reasons:reason,components,low:Math.round(low),high:Math.round(low+unknown),knownWeight:100-unknown,sortScore:low,travel};
}
function rank(data,p){return data.map(o=>evaluate(o,p)).filter(x=>x.status!=='excluded').sort((a,b)=>b.sortScore-a.sortScore||a.opportunity.id.localeCompare(b.opportunity.id));}
const api={criteria,weights,modes,topics,skillRules,extract,evaluate,rank};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SycamoreMatch=api;
})(typeof window!=='undefined'?window:globalThis);
