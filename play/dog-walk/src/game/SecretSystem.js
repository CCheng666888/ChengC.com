import { ArchivePanel } from '../ui/ArchivePanel.js';

const SECRET_CODE = 'lzt';
export class SecretSystem {
  constructor(game) {
    this.game=game;this.buffer='';this.lastInput=0;this.busy=false;this.cooldownUntil=0;
    this.archive=new ArchivePanel(game,()=>this.release());
    window.addEventListener('keydown',event=>this.listen(event));
  }
  listen(event) {
    if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.isComposing||this.busy||Date.now()<this.cooldownUntil)return;
    const target=event.target;
    if(target.isContentEditable||target.tagName==='TEXTAREA'||(target.tagName==='INPUT'&&!['range','checkbox','button'].includes(target.type)))return;
    if(Date.now()-this.lastInput>2200)this.buffer='';this.lastInput=Date.now();
    if(event.key.length!==1||!/^[a-z]$/i.test(event.key)){this.buffer='';return;}
    this.buffer=(this.buffer+event.key.toLowerCase()).slice(-SECRET_CODE.length);
    if(this.buffer===SECRET_CODE)this.trigger();
  }
  trigger() {
    if(this.busy)return;
    this.busy=true;this.buffer='';this.game.suspended=true;this.game.input.clear();this.game.saveWalk();
    this.game.storage.data.archiveDiscovered=true;this.game.storage.save();this.game.audio.play('event');this.game.audio.duck(true);this.archive.open();
  }
  release() {this.busy=false;this.cooldownUntil=Date.now()+5000;this.game.suspended=false;this.game.input.clear();this.game.audio.duck(false);}
}
