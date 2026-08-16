// script.js - simple fly-swat game
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let w = 0, h = 0;
const scoreEl = document.getElementById('score');
const missesEl = document.getElementById('misses');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const messageEl = document.getElementById('message');

let flies = [];
let running = false;
let lastSpawn = 0;
let spawnInterval = 900; // ms
let lastTime = 0;
let score = 0;
let misses = 0;
const MISS_LIMIT = 5;

function resize(){
  const ratio = devicePixelRatio || 1;
  w = Math.max(window.innerWidth, 320);
  h = Math.max(window.innerHeight, 480);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.floor(w * ratio);
  canvas.height = Math.floor(h * ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
}
window.addEventListener('resize', resize);
resize();

class Fly{
  constructor(){
    // spawn just offscreen on a random side
    const side = Math.floor(Math.random()*4);
    const margin = 30;
    if(side===0){ this.x = -margin; this.y = Math.random()*h; }
    else if(side===1){ this.x = w+margin; this.y = Math.random()*h; }
    else if(side===2){ this.x = Math.random()*w; this.y = -margin; }
    else { this.x = Math.random()*w; this.y = h+margin; }
    const angle = Math.random()*Math.PI*2;
    const speed = 40 + Math.random()*120; // px per second
    this.vx = Math.cos(angle)*speed;
    this.vy = Math.sin(angle)*speed;
    this.r = 12 + Math.random()*10; // size
    this.alive = true;
    this.time = 0;
    this.wiggle = Math.random()*Math.PI*2;
  }
  update(dt){
    // slight wandering
    this.wiggle += dt*6;
    this.x += this.vx*dt + Math.cos(this.wiggle)*10*dt;
    this.y += this.vy*dt + Math.sin(this.wiggle)*10*dt;
    this.time += dt;
  }
  draw(ctx){
    ctx.save();
    ctx.translate(this.x,this.y);
    // body
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.ellipse(0,0,this.r*0.7,this.r,0,0,Math.PI*2);
    ctx.fill();
    // wings
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(-this.r*0.4,-this.r*0.6,this.r*0.7,this.r*0.45,0,0,Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(this.r*0.4,-this.r*0.6,this.r*0.7,this.r*0.45,0,0,Math.PI*2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-this.r*0.25, -this.r*0.12, this.r*0.18,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(this.r*0.25, -this.r*0.12, this.r*0.18,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  isOffscreen(){
    const pad = 60;
    return this.x < -pad || this.x > w+pad || this.y < -pad || this.y > h+pad;
  }
}

function spawn(){
  flies.push(new Fly());
}

function update(dt){
  for(let f of flies){ f.update(dt); }
  // check escapes
  for(let i=flies.length-1;i>=0;i--){
    const f = flies[i];
    if(f.isOffscreen()){
      flies.splice(i,1);
      misses++;
      missesEl.textContent = misses;
      if(misses>=MISS_LIMIT){ gameOver(); }
    }
  }
}

function draw(){
  ctx.clearRect(0,0,w,h);
  for(let f of flies){ f.draw(ctx); }
}

function loop(ts){
  if(!running) return;
  if(!lastTime) lastTime = ts;
  const dt = Math.min(0.05,(ts-lastTime)/1000);
  lastTime = ts;
  // spawn logic
  lastSpawn += dt*1000;
  if(lastSpawn > spawnInterval){
    lastSpawn = 0;
    spawn();
    // gradually increase difficulty
    spawnInterval = Math.max(350, spawnInterval - 5);
  }
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function start(){
  score = 0; misses = 0; flies = [];
  scoreEl.textContent = score;
  missesEl.textContent = misses;
  messageEl.textContent = '';
  running = true; lastTime = 0; lastSpawn = 0; spawnInterval = 900;
  startBtn.style.display = 'none'; restartBtn.style.display = 'none';
  requestAnimationFrame(loop);
}

function gameOver(){
  running = false;
  messageEl.textContent = `Game over — too many flies escaped.`;
  restartBtn.style.display = 'inline-block';
}

// input handling (pointer covers mouse & touch)
canvas.addEventListener('pointerdown', (ev)=>{
  if(!running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left);
  const y = (ev.clientY - rect.top);
  // check flies from top so closer flies (drawn later) also get hit
  for(let i=flies.length-1;i>=0;i--){
    const f = flies[i];
    const dx = f.x - x, dy = f.y - y;
    const dist = Math.hypot(dx,dy);
    if(dist < f.r*1.2){
      // hit
      flies.splice(i,1);
      // small score: larger flies give more points
      score += Math.round(1 + f.r/6);
      scoreEl.textContent = score;
      // small visual feedback: draw a quick splash
      drawSplash(x,y);
      break; // single finger kills one fly per event
    }
  }
});

function drawSplash(x,y){
  const start = performance.now();
  const duration = 220;
  function frame(now){
    const t = (now-start)/duration;
    if(t>1) return;
    // draw on top
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,80,60,${1-t})`;
    ctx.beginPath(); ctx.arc(x,y, 6 + 30*t,0,Math.PI*2); ctx.fill();
    ctx.restore();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

startBtn.addEventListener('click', start);
restartBtn.addEventListener('click', start);

// start in paused state; show instructions
messageEl.textContent = 'Tap the flies with your finger or mouse to swat them. If 5 flies escape the screen, the game ends.';

// nice to warm up with a few flies offscreen
for(let i=0;i<2;i++) flies.push(new Fly());

// ensure canvas sized on first paint
setTimeout(()=>{ resize(); draw(); }, 120);
