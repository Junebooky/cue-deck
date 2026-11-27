// Use physical keyboard positions for B/E (Korean layout included).
// Ctrl is an optional alias, not a second playback command.
export function shortcutLetter(input){
 if(input.altKey||input.metaKey||input.shiftKey)return null;
 if(input.code==='KeyB')return 'black';
 if(input.code==='KeyE')return 'error';
 if(input.code&&input.code!=='Unidentified')return null;
 const key=String(input.key??'').toLowerCase();
 return key==='b'?'black':key==='e'?'error':null;
}
export function blockedShortcutTarget(target){
 return !!(target?.isContentEditable||target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="spinbutton"],[role="slider"],[role="separator"]'));
}
export function isNativeCueShortcut(input){
 return !!shortcutLetter({code:input.code,key:input.key,altKey:input.alt,metaKey:input.meta,shiftKey:input.shift});
}
