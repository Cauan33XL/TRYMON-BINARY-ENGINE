import { IMAGES } from './Assets';
import { random } from './Utils';

export class Powerup {
    x: number; y: number; type: string; width: number; height: number; sprite: any; active: boolean;
    floatOffset: number; floatSpeed: number; floatAmplitude: number;
    
    constructor(x: number, y: number, type: string) {
        this.x = x; this.y = y; this.type = type; this.width = 20; this.height = 20;
        this.active = true; this.floatOffset = 0; this.floatSpeed = random(0.05, 0.1); this.floatAmplitude = random(2, 5);
        switch(type) {
            case 'shield': this.sprite = IMAGES.powerupShield; break;
            case 'double_jump': this.sprite = IMAGES.powerupDoubleJump; break;
            case 'magnet': this.sprite = IMAGES.powerupMagnet; break;
            case 'speed_boost': this.sprite = IMAGES.powerupSpeed; break;
            case 'invincibility': this.sprite = IMAGES.powerupInvincibility; break;
            case 'projectile': this.sprite = IMAGES.powerupProjectile; break;
            case 'health': this.sprite = IMAGES.powerupHealth; break;
            case 'time_slow': this.sprite = IMAGES.powerupTimeSlow; break;
            default: this.sprite = IMAGES.powerupShield; break;
        }
    }
    update(_dt: number) {
        if (!this.active) return;
        this.floatOffset = Math.sin(Date.now() * this.floatSpeed) * this.floatAmplitude;
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        const drawY = this.y + this.floatOffset;
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) ctx.drawImage(this.sprite as HTMLImageElement, this.x, drawY, this.width, this.height);
        else {
            switch(this.type) {
                case 'shield': ctx.fillStyle = '#60a5fa'; break;
                case 'double_jump': ctx.fillStyle = '#8b5cf6'; break;
                case 'magnet': ctx.fillStyle = '#f59e0b'; break;
                case 'speed_boost': ctx.fillStyle = '#10b981'; break;
                case 'invincibility': ctx.fillStyle = '#fbbf24'; break;
                case 'projectile': ctx.fillStyle = '#fbbf24'; break;
                case 'health': ctx.fillStyle = '#ef4444'; break;
                case 'time_slow': ctx.fillStyle = '#8b5cf6'; break;
            }
            ctx.fillRect(this.x, drawY, this.width, this.height);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(this.x-1, drawY-1, this.width+2, this.height+2);
    }
    checkCollision(player: any) {
        if (!this.active) return false;
        return (player.x < this.x + this.width && player.x + player.w > this.x && player.y < this.y + this.height && player.y + player.h > this.y);
    }
}

export class Coin {
    x: number; y: number; width: number; height: number; sprite: any; active: boolean; rotation: number; rotationSpeed: number;
    constructor(x: number, y: number) {
        this.x = x; this.y = y; this.width = 16; this.height = 16; this.sprite = IMAGES.coin; this.active = true;
        this.rotation = 0; this.rotationSpeed = random(0.02, 0.05);
    }
    update(_dt: number) {
        if (!this.active) return;
        this.rotation += this.rotationSpeed;
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        ctx.save(); ctx.translate(this.x + this.width/2, this.y + this.height/2); ctx.rotate(this.rotation);
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) ctx.drawImage(this.sprite as HTMLImageElement, -this.width/2, -this.height/2, this.width, this.height);
        else { ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 0, this.width/2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    }
    checkCollision(player: any) {
        if (!this.active) return false;
        let collisionRadius = this.width/2;
        if (player.powerups.magnet.active) collisionRadius *= 3;
        const playerCenterX = player.x + player.w/2; const playerCenterY = player.y + player.h/2;
        const coinCenterX = this.x + this.width/2; const coinCenterY = this.y + this.height/2;
        const distance = Math.sqrt(Math.pow(playerCenterX - coinCenterX, 2) + Math.pow(playerCenterY - coinCenterY, 2));
        return distance < collisionRadius;
    }
}
