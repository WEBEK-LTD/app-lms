// Focal-point cropping for .ph elements: data-src="img.jpg" data-f="cx cy zoom"
(function(){
  function apply(el, im){
    const f=(el.dataset.f||'0.5 0.5 1').split(/\s+/).map(Number);
    const [cx,cy,z]=[f[0],f[1],f[2]||1];
    const ew=el.clientWidth, eh=el.clientHeight, iw=im.naturalWidth, ih=im.naturalHeight;
    const s=Math.max(ew/iw, eh/ih)*z, dw=iw*s, dh=ih*s;
    const x=Math.min(0,Math.max(ew-dw, ew/2-cx*dw)), y=Math.min(0,Math.max(eh-dh, eh/2-cy*dh));
    el.style.backgroundImage='url("'+el.dataset.src+'")';
    el.style.backgroundSize=dw+'px '+dh+'px';
    el.style.backgroundPosition=x+'px '+y+'px';
    el.style.backgroundRepeat='no-repeat';
  }
  window.addEventListener('load', async function(){
    await document.fonts.ready;
    const els=[...document.querySelectorAll('[data-src]')];
    await Promise.all(els.map(el=>new Promise(r=>{const im=new Image();im.onload=()=>{apply(el,im);r();};im.onerror=r;im.src=el.dataset.src;})));
    document.body.dataset.ready='1';
  });
})();
