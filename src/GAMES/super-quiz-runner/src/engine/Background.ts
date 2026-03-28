import { globals, CONFIG } from './Globals';

export class Camera {
    x: number; y: number;
    constructor(){ this.x = 0; this.y = 0; }
    update(){
        if(!globals.player) return;
        const targetX = globals.player.x - CONFIG.WIDTH / 3;
        this.x += (targetX - this.x) * 0.1;
        if(this.x < 0) this.x = 0;
    }
}

export class BackLayer {
    drawFunc: (ctx: CanvasRenderingContext2D) => void;
    speed: number;
    offset: number;
    constructor(drawFunc: (ctx: CanvasRenderingContext2D) => void, speed: number) {
        this.drawFunc = drawFunc;
        this.speed = speed;
        this.offset = 0;
    }
    update(cam: Camera) { this.offset = (cam.x * this.speed); }
    draw(ctx: CanvasRenderingContext2D) {
        ctx.save(); ctx.translate(-this.offset, 0); this.drawFunc(ctx); ctx.restore();
    }
}

export const drawHills = (color1: string, color2: string) => (ctx: CanvasRenderingContext2D) => {
    for(let i=-2;i<5;i++){
        const x = i * 420 + 30;
        ctx.fillStyle = color1; ctx.beginPath(); ctx.ellipse(x + 120, 420, 220, 90, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = color2; ctx.beginPath(); ctx.ellipse(x + 260, 460, 200, 70, 0, 0, Math.PI*2); ctx.fill();
    }
};

export const drawClouds = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for(let i=0;i<8;i++){
        const x = (i * 350 + (i*i*10)) % (CONFIG.WIDTH * 3) - CONFIG.WIDTH;
        const y = 80 + Math.sin(i) * 30;
        ctx.beginPath(); ctx.ellipse(x, y, 60, 20, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x+30, y-10, 50, 20, 0, 0, Math.PI*2); ctx.fill();
    }
};

export const drawMountains = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = 'rgba(55,65,81,0.8)';
    for(let i=-1;i<4;i++){
        const x = i * 300;
        ctx.beginPath(); ctx.moveTo(x, CONFIG.HEIGHT); ctx.lineTo(x+100, CONFIG.HEIGHT-120); ctx.lineTo(x+200, CONFIG.HEIGHT); ctx.fill();
    }
};

export function updateParticles(dt: number){
    for(let i=globals.particles.length-1;i>=0;i--){
        const p = globals.particles[i];
        p.life -= dt;
        if(p.life <= 0) globals.particles.splice(i,1);
        else {
            if (p.gravity) p.vy += CONFIG.GRAVITY * 0.2;
            p.x += p.vx; p.y += p.vy;
        }
    }
}

export function drawParticles(ctx: CanvasRenderingContext2D){
    for(const p of globals.particles){
        ctx.globalAlpha = Math.max(0, p.life/1.0);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size/2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

export const drawCustomBackground = (ctx: CanvasRenderingContext2D) => {
    if (globals.customAssets.background) {
        const img = new Image();
        img.src = globals.customAssets.background;
        if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, 0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        }
    }
};
