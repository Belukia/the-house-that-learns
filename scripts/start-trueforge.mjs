import {mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {ROOT} from './trueforge.mjs';
const state=join(ROOT,'.runtime','trueforge');mkdirSync(state,{recursive:true});
const child=spawn(process.execPath,[join(ROOT,'node_modules/@truefoundry/trueforge/dist/cli.js')],{
 cwd:ROOT,stdio:'inherit',env:{...process.env,HOST:'127.0.0.1',PORT:'8790',SQLITE_PATH:join(state,'db.sqlite'),APP_DATA_DIR_SUFFIX:'blackthorn',SENTRY_ENABLED:'false'}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
