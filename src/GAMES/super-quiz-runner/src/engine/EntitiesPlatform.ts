import { globals, CONFIG, spawnParticles } from './Globals';
import { IMAGES } from './Assets';
import { roundRect, random } from './Utils';

export class Platform {
    x: number; y: number; width: number; height: number; type: string; texture: any; scored: boolean; highlight: number;
    moving: boolean; moveDirection: number = 0; moveSpeed: number = 0; moveDistance: number = 0; originalX: number = 0;
    disappearing: boolean; visible: boolean = true; disappearTimer: number = 0; disappearAfter: number = 0;
    breakable: boolean; health: number = 0; bouncy: boolean; bouncePower: number = 0; ice: boolean; friction: number = 0; lava: boolean;
    
    constructor(x: number, y: number, w: number, type: string = 'solid'){
        this.x = x; this.y = y; this.width = w; this.height = CONFIG.PLATFORM.HEIGHT; this.type = type;
        this.scored = false; this.highlight = 0;
        this.moving = type === 'moving'; if (this.moving) { this.moveDirection = Math.random() > 0.5 ? 1 : -1; this.moveSpeed = random(1, 2); this.moveDistance = random(50, 150); this.originalX = x; }
        this.disappearing = type === 'disappearing'; if (this.disappearing) { this.visible = true; this.disappearTimer = 0; this.disappearAfter = random(1, 3); }
        this.breakable = type === 'breakable'; if (this.breakable) { this.health = 2; }
        this.bouncy = type === 'bouncy'; if (this.bouncy) { this.bouncePower = 1.5; }
        this.ice = type === 'ice'; if (this.ice) { this.friction = 0.95; }
        this.lava = type === 'lava';
        
        if (globals.customAssets.platform) {
            this.texture = new Image();
            this.texture.src = globals.customAssets.platform;
        } else {
            switch(type) {
                case 'breakable': this.texture = IMAGES.platformBreakable; break;
                case 'bouncy': this.texture = IMAGES.platformBouncy; break;
                case 'ice': this.texture = IMAGES.platformIce; break;
                default: this.texture = IMAGES.platform; break;
            }
        }
    }
    
    update(dt: number) {
        if (this.moving) {
            this.x += this.moveDirection * this.moveSpeed;
            if (Math.abs(this.x - this.originalX) > this.moveDistance) this.moveDirection *= -1;
        }
        if (this.disappearing && this.visible) {
            this.disappearTimer += dt;
            if (this.disappearTimer >= this.disappearAfter) { this.visible = false; spawnParticles(this.x + this.width/2, this.y + this.height/2, '#6b7280', 15); }
        }
    }
    
    draw(ctx: CanvasRenderingContext2D){
        if (this.disappearing && !this.visible) return;
        let fillStyle: any = '#7b5238';
        if(this.texture && this.texture.complete && this.texture.naturalWidth > 0){
            try { fillStyle = ctx.createPattern(this.texture, 'repeat'); } catch (e) {}
        }
        if (this.type === 'bad') fillStyle = 'rgba(255,90,90,0.95)';
        if (this.type === 'boost') fillStyle = 'rgba(139, 92, 246, 0.95)';
        if (this.type === 'breakable') fillStyle = 'rgba(161, 98, 7, 0.95)';
        if (this.type === 'moving') fillStyle = 'rgba(101, 163, 13, 0.95)';
        if (this.type === 'disappearing') fillStyle = 'rgba(107, 114, 128, 0.95)';
        if (this.type === 'bouncy') fillStyle = 'rgba(16, 185, 129, 0.95)';
        if (this.type === 'ice') fillStyle = 'rgba(186, 230, 253, 0.95)';
        if (this.type === 'lava') fillStyle = 'rgba(220, 38, 38, 0.95)';
        
        ctx.fillStyle = fillStyle; roundRect(ctx, this.x, this.y, this.width, this.height, 6, true, false);
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; roundRect(ctx, this.x, this.y, this.width, this.height/2, 6, true, false);
        
        if(this.highlight > 0){
            ctx.strokeStyle = `rgba(255,255,255,${0.9 * this.highlight})`; ctx.lineWidth = 3;
            roundRect(ctx, this.x-2, this.y-2, this.width+4, this.height+4, 8, false, true);
            this.highlight = Math.max(0, this.highlight - 0.02);
        } else {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; roundRect(ctx, this.x, this.y, this.width, this.height, 6, false, true);
        }
        
        if (this.disappearing && this.visible) {
            const progress = this.disappearTimer / this.disappearAfter;
            ctx.fillStyle = `rgba(255,0,0,${0.5 * progress})`; roundRect(ctx, this.x, this.y, this.width * (1 - progress), 5, 0, true, false);
        }
        if (this.breakable) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < this.health; i++) ctx.fillRect(this.x + 10 + i * 12, this.y - 8, 8, 4);
        }
        if (this.bouncy) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(this.x + this.width/2, this.y - 5, 8, 0, Math.PI); ctx.fill();
        }
        if (this.lava) {
            ctx.fillStyle = 'rgba(255,165,0,0.5)';
            for (let i = 0; i < 5; i++) {
                const x = this.x + (i * this.width/5) + Math.random() * 10;
                const size = 4 + Math.random() * 8;
                ctx.beginPath(); ctx.arc(x, this.y + 5, size, 0, Math.PI); ctx.fill();
            }
        }
    }
}
