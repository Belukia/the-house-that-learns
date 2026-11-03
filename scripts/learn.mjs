import {readFile} from 'node:fs/promises';
import {improve} from './trueforge.mjs';
const i=process.argv.indexOf('--feedback');
if(i<0)throw Error('Pass --feedback <development.json>. Do not pass a holdout file.');
const feedback=JSON.parse(await readFile(process.argv[i+1],'utf8'));
if(!feedback.policy||!Array.isArray(feedback.cases)||feedback.cases.some(c=>c.holdout))throw Error('Only development cases are accepted.');
const proposal=await improve(null,feedback.policy,feedback);
console.log(JSON.stringify({sessionId:proposal.sessionId,evidenceDirectory:proposal.evidenceDirectory,lesson:proposal.lesson,status:'candidate; not evaluated or promoted'},null,2));
