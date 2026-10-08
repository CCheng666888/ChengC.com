import { Game } from './game/Game.js';
import { openNativeStorage } from './game/NativeStorage.js';

export let game;
try {const backend=await openNativeStorage();game=new Game(document.querySelector('#world'),backend);}
catch(error){document.querySelector('#interface').innerHTML='<div class="startup-error"><h1>散步暂时无法开始。</h1><p></p><button class="btn primary" onclick="location.reload()">重新读取</button></div>';document.querySelector('.startup-error p').textContent=error.message;}
