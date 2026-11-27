const {contextBridge,ipcRenderer}=require('electron');
const listen=(channel,fn)=>{const handler=(_e,value)=>fn(value);ipcRenderer.on(channel,handler);return()=>ipcRenderer.removeListener(channel,handler)};
contextBridge.exposeInMainWorld('deckAPI',{
  state:()=>ipcRenderer.invoke('deck:state'),
  command:(action)=>ipcRenderer.invoke('deck:command',action),
  displays:()=>ipcRenderer.invoke('deck:displays'),
  start:(id)=>ipcRenderer.invoke('deck:start',id),
  stop:()=>ipcRenderer.invoke('deck:stop'),
  testOutput:(enabled)=>ipcRenderer.invoke('deck:test-output',enabled),
  importDeck:()=>ipcRenderer.invoke('deck:import'),
  compare:(id)=>ipcRenderer.invoke('deck:compare',id),
  activate:(id,options)=>ipcRenderer.invoke('deck:activate',id,options),
  onState:(fn)=>listen('deck:state-update',fn),
  outputState:()=>ipcRenderer.invoke('deck:output-state'),
  onOutput:(fn)=>listen('deck:output',fn),
  ack:(sequence)=>ipcRenderer.send('deck:ack',sequence)
});