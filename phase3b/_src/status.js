// injects status bar svg using currentColor
document.querySelectorAll('.status').forEach(s=>{s.innerHTML='<div class="time">9:41</div><div class="island"></div><div class="sys"><svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3C13.3 1.9 10.8.8 8 .8S2.7 1.9.8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3C11.4 5.1 9.8 4.4 8 4.4S4.6 5.1 3.4 6.2l1.2 1.3C5.5 6.7 6.7 6.2 8 6.2zm0 3.5c.5 0 1 .2 1.3.5L8 11.6 6.7 10.2c.3-.3.8-.5 1.3-.5z"/></svg><svg width="27" height="13" viewBox="0 0 27 13" fill="currentColor"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.2"/><path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" opacity=".45"/></svg></div>';});
// isolate " · "-separated segments so mixed Latin/Arabic specs keep logical RTL order
document.querySelectorAll('body *').forEach(el=>{
  if(el.children.length||el.closest('.ms'))return;
  const t=el.textContent; if(t.indexOf(' · ')<0)return;
  el.innerHTML=t.split(' · ').map(x=>'<bdi>'+x.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</bdi>').join(' · ');
});
