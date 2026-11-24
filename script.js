// Menu mobile
const burger=document.getElementById('burger'),links=document.getElementById('links');
burger.addEventListener('click',()=>{const o=links.classList.toggle('open');burger.setAttribute('aria-expanded',o)});
links.addEventListener('click',()=>links.classList.remove('open'));
document.getElementById('yr').textContent=new Date().getFullYear();
// Salin perintah
document.getElementById('copy').addEventListener('click',e=>{
  navigator.clipboard?.writeText('npm create rutusdev@latest');e.target.textContent='Copied';setTimeout(()=>e.target.textContent='Copy',1500)});
// Hero: titik-titik halus yang mengikuti kursor
(()=>{
  const c=document.getElementById('dots'),x=c.getContext('2d');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w,h,pts=[],m={x:-999,y:-999};
  function size(){w=c.width=c.offsetWidth;h=c.height=c.offsetHeight;
    pts=Array.from({length:Math.min(260,w/5)},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.4+.3,a:Math.random()*.6+.2,vx:(Math.random()-.5)*.15,vy:(Math.random()-.5)*.15}))}
  function draw(){x.clearRect(0,0,w,h);
    for(const p of pts){
      if(!reduce){p.x+=p.vx;p.y+=p.vy;if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0}
      const d=Math.hypot(p.x-m.x,p.y-m.y),near=d<140;
      x.fillStyle=near?'rgba(56,189,248,'+(1-d/140)+')':'rgba(255,255,255,'+p.a*.6+')';
      x.beginPath();x.arc(p.x,p.y,near?p.r*2:p.r,0,7);x.fill()}
    if(!reduce)requestAnimationFrame(draw)}
  c.parentElement.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect();m.x=e.clientX-r.left;m.y=e.clientY-r.top;if(reduce)draw()});
  addEventListener('resize',size);size();draw();
})();
// Form leads — hubungkan ke Worker API: POST /api/leads
document.getElementById('lead').addEventListener('submit',async e=>{
  e.preventDefault();
  const f=e.target,s=document.getElementById('status');
  if(!f.name.value.trim()||!/^\S+@\S+\.\S+$/.test(f.email.value)){s.textContent='Isi nama dan email yang valid.';return}
  s.textContent='Mengirim…';
  try{
    const r=await fetch('/api/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(f)))});
    if(!r.ok)throw 0;s.textContent='Terkirim. Kami akan menghubungi Anda segera.';f.reset();
  }catch{s.textContent='Endpoint /api/leads belum aktif (Fase 1 – Worker). Gunakan WhatsApp atau email.'}
});
