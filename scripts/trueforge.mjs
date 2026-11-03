import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validatePolicy,MAP} from '../dist/engine.mjs';
export const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
export function configured(){return Boolean(process.env.TRUEFORGE_BASE_URL&&process.env.TF_MODEL&&process.env.SKILL_REPO_URL&&process.env.SKILL_GIT_REF);}
export function validateRewrite(output){
 const policy=validatePolicy(output.policy);
 if(typeof output.skill!=='string'||output.skill.length>16000||!/^---\r?\nname: blackthorn-warden\r?\ndescription: [^\n]+\r?\n---/.test(output.skill))throw Error('The proposed skill lost its required frontmatter.');
 if(/(?:evals\/|run-\d+|task[_ -]?id|session[_ -]?id|score\s*[:=]\s*\d)/i.test(output.skill))throw Error('The skill contains task/evaluation identifiers instead of general tactics.');
 if(typeof output.lesson!=='string'||output.lesson.length>240)throw Error('Invalid learning summary.');
 return {skill:output.skill,policy,lesson:output.lesson};
}
export async function prepareAgent(){
 if(!configured())throw Error('Configure TrueForge, model, public skill repository and immutable git ref first.');
 const {TrueForge}=await import('@truefoundry/trueforge-sdk');
 const tf=new TrueForge({baseUrl:process.env.TRUEFORGE_BASE_URL,token:process.env.TRUEFORGE_TOKEN||undefined,timeoutInSeconds:180});
 const skill=await readFile(join(ROOT,'agent/skills/warden/SKILL.md'),'utf8');
 const instructions=await readFile(join(ROOT,'agent/instructions.md'),'utf8');
 const {data:caps}=await tf.server.getCapabilities();
 if(!caps.skill?.enabled)throw Error('This TrueForge runtime does not have real skill/sandbox support enabled.');
 await tf.settings.skills.createOrUpdate({manifest:{type:'git',name:'blackthorn-warden',description:'Mansion guardian strategy',url:process.env.SKILL_REPO_URL,path:'agent/skills/warden',ref:process.env.SKILL_GIT_REF}});
 const spec={model:{name:process.env.TF_MODEL},instructions,skills:[{name:'blackthorn-warden'}],config:{sandbox:{enabled:true},askUserQuestions:{enabled:false},generativeUi:{enabled:false},iterationLimit:12}};
 return {tf,spec,skill};
}
export async function improve(episode,policy,feedback=null){
 const {tf,spec,skill}=await prepareAgent();
 const {data:session}=await tf.sessions.create({agent:{spec},metadata:{purpose:'blackthorn-skill-improvement',skill_ref:process.env.SKILL_GIT_REF}});
 const prompt=`Load your registered skill. Improve it based on this completed heist or development feedback. Read no holdout files. Return the required JSON object.\nCurrent skill:\n${skill}\nLegal map (# wall, . floor):\n${MAP.join('\n')}\nCurrent policy:\n${JSON.stringify(policy)}\nCompleted episode:\n${JSON.stringify(episode)}\nDevelopment feedback (if any):\n${JSON.stringify(feedback)}`;
 const stream=await tf.sessions.createTurnStream(session.id,{input:[{type:'user.message',content:prompt}],previousTurnId:'none'},{maxRetries:0});
 const events=[];let reply='',done=false;
 for await(const {data:e} of stream.withMetadata()){
  events.push(e);
  if(e.type==='turn.done'){
   if(e.state.status!=='done')throw Error(`TrueForge turn ended with ${e.state.status}. Session ${session.id}`);
   const content=e.state.output?.content;reply=typeof content==='string'?content:(content||[]).map(p=>p.text||'').join('');done=true;
  }
 }
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const dir=join(ROOT,'runs/private',stamp);await mkdir(dir,{recursive:true});
 await writeFile(join(dir,'response.json'),JSON.stringify({sessionId:session.id,events,reply,previousPolicy:policy,model:process.env.TF_MODEL,skillRef:process.env.SKILL_GIT_REF},null,2));
 if(!done)throw Error(`Incomplete TrueForge stream. Session ${session.id}`);
 let output;try{output=JSON.parse(reply.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{throw Error(`TrueForge returned invalid JSON. Evidence saved for ${session.id}`);}
 const checked=validateRewrite(output);
 // A candidate only: a second eval, not the improver, establishes whether it is better.
 await writeFile(join(dir,'candidate-policy.json'),JSON.stringify(checked.policy,null,2));
 await writeFile(join(dir,'candidate-SKILL.md'),checked.skill);
 await writeFile(join(dir,'proposal.json'),JSON.stringify({sessionId:session.id,lesson:checked.lesson,previousSkillSha256:createHash('sha256').update(skill).digest('hex'),newSkillSha256:createHash('sha256').update(checked.skill).digest('hex')},null,2));
 return {...checked,sessionId:session.id,evidenceDirectory:dir};
}
