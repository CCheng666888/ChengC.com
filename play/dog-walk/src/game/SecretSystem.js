import { ArchivePanel } from '../ui/ArchivePanel.js';

const SECRET_CODE = 'lzt';
export class SecretSystem {
  constructor(game) {
    this.game=game;this.buffer='';this.lastInput=0;this.busy=false;this.cooldownUntil=0;
    this.promptOpen=false;this.promptTimer=0;
    this.archive=new ArchivePanel(game,()=>this.release());
    window.addEventListener('keydown',event=>this.listen(event));
    // 移动端/装饰入口：点击散步时钟或主菜单天气标签（data-secret）一次即打开口令层
    window.addEventListener('click',event=>this.onTap(event));
    this.gate=document.querySelector('#codeGate');
    if(this.gate){
      this.inputEl=this.gate.querySelector('#code-input');
      this.errorEl=this.gate.querySelector('#code-error');
      this.gate.addEventListener('submit',event=>{event.preventDefault();this.submit();});
      this.gate.addEventListener('click',event=>{if(event.target.closest('[data-code-cancel]'))this.cancel();});
    }
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
  onTap(event) {
    if(this.busy||this.promptOpen||Date.now()<this.cooldownUntil)return;
    const target=event.target;
    if(!(target instanceof Element))return;
    const spot=target.closest('[data-secret]');
    if(!spot)return;
    event.preventDefault();event.stopPropagation();
    this.openPrompt();
  }
  openPrompt() {
    if(!this.gate||this.busy||this.promptOpen)return;
    this.promptOpen=true;this.buffer='';this.lastInput=0;
    this.game.suspended=true;this.game.input.clear();
    this.gate.hidden=false;this.inputEl.value='';this.errorEl.hidden=true;
    setTimeout(()=>this.inputEl.focus(),60);
  }
  submit() {
    if(!this.promptOpen)return;
    const value=this.inputEl.value.trim().toLowerCase();
    if(value===SECRET_CODE){
      clearTimeout(this.promptTimer);
      this.gate.hidden=true;this.promptOpen=false;
      this.trigger();
    }else{
      this.errorEl.textContent='口令不正确。';this.errorEl.hidden=false;
      this.inputEl.value='';
      clearTimeout(this.promptTimer);
      this.promptTimer=setTimeout(()=>this.cancel(),1500);
    }
  }
  cancel() {
    if(!this.promptOpen)return;
    clearTimeout(this.promptTimer);
    this.gate.hidden=true;this.promptOpen=false;
    this.game.suspended=false;this.game.input.clear();
  }
  trigger() {
    if(this.busy)return;
    this.busy=true;this.buffer='';this.game.suspended=true;this.game.input.clear();this.game.saveWalk();
    this.game.storage.data.archiveDiscovered=true;this.game.storage.save();this.game.audio.play('event');this.game.audio.duck(true);this.archive.open();
  }
  release() {this.busy=false;this.cooldownUntil=Date.now()+5000;this.game.suspended=false;this.game.input.clear();this.game.audio.duck(false);}
}
