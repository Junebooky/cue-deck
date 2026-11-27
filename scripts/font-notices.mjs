import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
const packages=['pretendard','@fontsource/noto-sans-kr','@fontsource/noto-serif-kr','@fontsource/ibm-plex-sans-kr'];
await mkdir('dist/font-licenses',{recursive:true});
for(const name of packages){
 const dir=path.join('node_modules',name);
 const files=await readdir(dir);
 const notice=files.find(f=>/^(license|ofl|copying)(\..*)?$/i.test(f));
 if(!notice&&name!=='pretendard')throw new Error('Missing font license: '+name);
 const meta=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));
 await writeFile(path.join('dist/font-licenses',name.replace(/[@/]/g,'-')+'.txt'),'Package: '+name+' '+meta.version+'\n\n'+await readFile(name==='pretendard'?'licenses/pretendard-1.3.9.txt':path.join(dir,notice),'utf8'));
}
