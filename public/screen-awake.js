'use strict';
// Android's activity keeps its screen on. This also supports foreground browsers.
(()=>{
 let lock=null,pending=false;
 async function acquire(){
  if(document.hidden||lock||pending||!navigator.wakeLock?.request)return;
  pending=true;
  try{
   const next=await navigator.wakeLock.request('screen');
   if(document.hidden){await next.release();return;}
   lock=next;next.addEventListener('release',()=>{if(lock===next)lock=null;});
  }catch{ /* A browser can refuse, for example when battery saver is active. */ }
  finally{pending=false;}
 }
 function release(){const previous=lock;lock=null;previous?.release().catch(()=>{});}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)release();else acquire();});
 window.addEventListener('pagehide',release);window.addEventListener('pageshow',acquire);
 document.addEventListener('pointerdown',acquire,{passive:true});
 acquire();
})();
