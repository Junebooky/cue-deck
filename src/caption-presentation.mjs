// Presentation only: never rewrite the imported canonical frame or its source rows.
// An overlap with one singing column uses the same fit and layout as a solo.
export function presentCaption(view){
 if(view?.kind!=='overlap')return view;
 const active=view.columns.filter(c=>c.lines.some(line=>typeof line==='string'&&line.trim().length>0));
 if(active.length!==1)return view;
 return {...view,kind:'solo',columns:[active[0]]};
}
