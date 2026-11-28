const {contextBridge,ipcRenderer}=require('electron');
const listen=(channel,fn)=>{const handler=(_e,value)=>fn(value);ipcRenderer.on(channel,handler);return()=>ipcRenderer.removeListener(channel,handler)};
contextBridge.exposeInMainWorld('deckAPI',{
  state:()=>ipcRenderer.invoke('deck:state'),
  command:(action)=>ipcRenderer.invoke('deck:command',action),
  displays:()=>ipcRenderer.invoke('deck:displays'),
  start:(id)=>ipcRenderer.invoke('deck:start',id),
  stop:()=>ipcRenderer.invoke('deck:stop'),
  setCaptionScale:(value)=>ipcRenderer.invoke('deck:caption-scale',value),
  setCaptionFont:(value)=>ipcRenderer.invoke('deck:caption-font',value),
  setCaptionStyle:(expected,index,value)=>ipcRenderer.invoke('deck:caption-style',expected,index,value),
  setCaptionWidths:(expected,index,value)=>ipcRenderer.invoke('deck:caption-widths',expected,index,value),
  testOutput:(enabled)=>ipcRenderer.invoke('deck:test-output',enabled),
  importDeck:()=>ipcRenderer.invoke('deck:import'),
  deleteVersion:(id,expectedActive)=>ipcRenderer.invoke('deck:delete-version',id,expectedActive),
  compare:(id)=>ipcRenderer.invoke('deck:compare',id),
  activate:(id,options)=>ipcRenderer.invoke('deck:activate',id,options),
  onState:(fn)=>listen('deck:state-update',fn),
  outputState:()=>ipcRenderer.invoke('deck:output-state'),
  onOutput:(fn)=>listen('deck:output',fn),
  ack:(sequence)=>ipcRenderer.send('deck:ack',sequence)
});