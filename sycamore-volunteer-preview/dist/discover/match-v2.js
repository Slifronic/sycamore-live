/* Evidence-linked matching, using user-reviewed statements rather than inferred proficiency. */
(function(root){const M=root.SycamoreMatch;const original=M.evaluate;
function evaluate(o,p){if(!p.taxonomyV2)return original(o,p);
 let reasons=[];const remote=o.format==='remote',travel=remote?0:o.travel[p.transport],cost=remote?0:o.cost;
 if(o.status!=='open')reasons.push('This sample opportunity is closed.');
 if(p.day!=='any'&&p.day!==o.day)reasons.push('The event conflicts with your selected day.');
 if(o.weeks>p.weeks)reasons.push('The commitment exceeds your selected maximum.');
 if(travel!==null&&travel>p.maxTravel)reasons.push('The sample journey exceeds your travel limit.');
 if(cost!==null&&cost>p.maxCost)reasons.push('Travel costs exceed your selected budget.');
 if(p.format!=='any'&&p.format!==o.format)reasons.push('The format differs from your selected format.');
 let profile=p.reviewed?p.roles.flatMap(role=>role.skills.map(skill=>({skill,role:role.title,evidence:role.evidence[skill]||role.description}))):[];
 let allSkills=[...new Set(profile.map(x=>x.skill))],required=o.required||[],practice=o.practice||[],tasks=[...new Set([...required,...practice])];
 const matched=profile.filter(x=>tasks.includes(x.skill));
 const use=p.useSkills||[],learn=p.learnSkills||[];
 const scoreOverlap=(wanted,offered)=>wanted.length?Math.round(5*wanted.filter(s=>offered.includes(s)).length/wanted.length):3;
 const direct=p.reviewed?(required.length?Math.round(5*required.filter(s=>allSkills.includes(s)).length/required.length):3):null;
 const transfer=p.reviewed?Math.min(5,allSkills.filter(s=>!tasks.includes(s)&&tasks.some(t=>M.adjacent(s,t))).length*2):null;
 const current=p.mode==='interests'?(p.cause==='any'?3:p.cause===o.cause?5:0):p.mode==='learn'?scoreOverlap(learn,practice):scoreOverlap(use,tasks);
 const goal=p.roleArea==='any'?3:p.roleArea===o.area?5:0;
 // Current direction combines the explicit skill choice with optional role-area choice, not the student's major.
 const intent=(p.mode==='interests'||p.roleArea==='any')?current:Math.round((current+goal)/2);
 const learning=scoreOverlap(learn,practice);
 const ratings=[intent,direct,transfer,learning,o.support,p.day==='any'?3:5,travel===null?null:remote?5:travel<=p.maxTravel*.5?5:travel<=p.maxTravel*.8?4:3,o.weeks<=p.weeks*.5?5:4,p.cause==='any'?3:p.cause===o.cause?5:0];
 const useMatches=use.filter(s=>tasks.includes(s)),learnMatches=learn.filter(s=>practice.includes(s));
 let explanations=[p.mode==='interests'?(p.cause==='any'?'No cause selected; all causes remain open.':p.cause===o.cause?'Matches the cause you chose.':'A different cause from your selection.'):`Selected ${p.mode==='learn'?'learning':'contribution'} skills: ${(p.mode==='learn'?learn:use).join(', ')||'none yet'}. Role area: ${p.roleArea==='any'?'open to any':M.groups[p.roleArea].name}.`,p.reviewed?(required.length?`Required-skill overlap: ${required.filter(s=>allSkills.includes(s)).join(', ')||'none confirmed in your profile'}. Statements are self-reported, not proof of proficiency.`:'No prior skills are required; beginners receive a neutral rating, not an experience bonus.'):'Background is unreviewed; experience is unknown.',p.reviewed?'Related skills are compared using the small, inspectable prototype adjacency map.':'Transferable experience is unknown.',learn.length?`Skills offered for practice: ${learnMatches.join(', ')||'no exact matches to your selected learning skills'}.`:'No learning skills selected; neutral rating.',o.supportNote,`${o.day} · ${o.time}. ${p.day==='any'?'No preferred day selected.':'Matches your selected day.'}`,remote?'Fully remote: no commute or travel cost is assumed.':travel===null?'Journey is unconfirmed for your transport mode.':`${travel} minutes one way by ${p.transport}; sample route estimate.`,`${o.weeks===1?'One event':o.weeks+' weeks'} against your maximum of ${p.weeks} weeks.`,p.cause==='any'?'Open to any cause.':p.cause===o.cause?'Matches your selected cause.':'Different cause; remains browsable.'];
 const w=M.weights[p.mode];let low=0,unknown=0;const components=ratings.map((r,i)=>{let points=r===null?null:w[i]*r/5;if(points===null)unknown+=w[i];else low+=points;return {name:M.criteria[i],weight:w[i],rating:r,points,explanation:explanations[i]}});
 const gaps=required.filter(s=>!allSkills.includes(s));
 let status=reasons.length?'excluded':travel===null||cost===null?'conditional':o.training?'training':required.length&&(!p.reviewed||gaps.length)?'review':'ready';
 return {opportunity:o,status,reasons,components,low:Math.round(low),high:Math.round(low+unknown),knownWeight:100-unknown,sortScore:low,travel,matched,useMatches,learnMatches,gaps};
}
M.evaluate=evaluate;M.rank=(data,p)=>data.map(o=>evaluate(o,p)).filter(x=>x.status!=='excluded').sort((a,b)=>b.sortScore-a.sortScore||a.opportunity.id.localeCompare(b.opportunity.id));
})(window);
