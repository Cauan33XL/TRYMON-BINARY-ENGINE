import { globals, CONFIG, spawnParticles } from './Globals';
import { random } from './Utils';
import { IMAGES } from './Assets';
import { Projectile } from './EntitiesPlayer';

export class Enemy {
    x: number; y: number; type: string; width: number; height: number; sprite: any; health: number; maxHealth: number;
    moveDirection: number; moveSpeed: number; moveDistance: number; originalX: number; originalY: number;
    shootCooldown: number; shootTimer: number; attackPattern: number; attackTimer: number; active: boolean;
    
    constructor(x: number, y: number, type: string = 'static') {
        this.x = x; this.y = y; this.type = type; this.width = type === 'boss' ? 48 : 24; this.height = type === 'boss' ? 48 : 24;
        this.health = type === 'boss' ? 10 : 1; this.maxHealth = this.health;
        this.moveDirection = 1; this.moveSpeed = 1; this.moveDistance = 0; 
        this.originalX = x; this.originalY = y;
        this.shootCooldown = 2; this.shootTimer = 0; this.attackPattern = 0; this.attackTimer = 0;
        
        if (type === 'moving') { this.moveSpeed = random(1, 2); this.moveDistance = random(50, 100); }
        else if (type === 'flying') { this.moveSpeed = random(0.5, 1.5); this.moveDistance = random(30, 80); }
        else if (type === 'shooting') { this.shootCooldown = random(2, 4); }
        else if (type === 'boss') { this.moveSpeed = 1; this.moveDistance = 200; }
        
        if (globals.customAssets.enemy) {
            this.sprite = new Image();
            this.sprite.src = globals.customAssets.enemy;
        } else {
            switch(type) {
                case 'static': this.sprite = IMAGES.enemyStatic; break;
                case 'moving': this.sprite = IMAGES.enemyMoving; break;
                case 'flying': this.sprite = IMAGES.enemyFlying; break;
                case 'shooting': this.sprite = IMAGES.enemyShooting; break;
                case 'boss': this.sprite = IMAGES.boss; break;
                default: this.sprite = IMAGES.enemyStatic; break;
            }
        }
        this.active = true;
    }
    
    update(dt: number) {
        if (!this.active) return;
        if (this.type === 'moving' || this.type === 'boss') {
            this.x += this.moveDirection * this.moveSpeed;
            if (Math.abs(this.x - this.originalX) > this.moveDistance) this.moveDirection *= -1;
        } else if (this.type === 'flying') {
            this.y += this.moveDirection * this.moveSpeed;
            if (Math.abs(this.y - this.originalY) > this.moveDistance) this.moveDirection *= -1;
        }
        
        if (this.type === 'shooting' || this.type === 'boss') {
            this.shootTimer += dt;
            if (this.shootTimer >= this.shootCooldown) {
                this.shoot(); this.shootTimer = 0; this.shootCooldown = random(2, 4);
            }
        }
        if (this.type === 'boss') {
            this.attackTimer += dt;
            if (this.attackTimer >= 5) { this.attackPattern = (this.attackPattern + 1) % 3; this.attackTimer = 0; }
        }
    }
    
    shoot() {
        if(!globals.player) return;
        if (this.type === 'shooting') {
            const dx = globals.player.x - this.x; const dy = globals.player.y - this.y;
            const distance = Math.sqrt(dx*dx + dy*dy); const speed = 4;
            globals.enemyProjectiles.push(new Projectile(this.x + this.width/2, this.y + this.height/2, (dx/distance) * speed, (dy/distance) * speed, 'enemy'));
        } else if (this.type === 'boss') {
            switch(this.attackPattern) {
                case 0:
                    const dx = globals.player.x - this.x; const dy = globals.player.y - this.y;
                    const distance = Math.sqrt(dx*dx + dy*dy); const speed = 5;
                    globals.enemyProjectiles.push(new Projectile(this.x + this.width/2, this.y + this.height/2, (dx/distance) * speed, (dy/distance) * speed, 'boss'));
                    break;
                case 1:
                    for (let i = 0; i < 5; i++) {
                        const angle = (i / 5) * Math.PI * 2;
                        globals.enemyProjectiles.push(new Projectile(this.x + this.width/2, this.y + this.height/2, Math.cos(angle) * 4, Math.sin(angle) * 4, 'boss'));
                    } break;
                case 2:
                    for (let i = 0; i < 3; i++) {
                        const angle = -Math.PI/4 + (i * Math.PI/4);
                        globals.enemyProjectiles.push(new Projectile(this.x + this.width/2, this.y + this.height/2, Math.cos(angle) * 6, Math.sin(angle) * 6, 'boss'));
                    } break;
            }
        }
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) ctx.drawImage(this.sprite as HTMLImageElement, this.x, this.y, this.width, this.height);
        else { ctx.fillStyle = this.type === 'boss' ? '#dc2626' : '#ef4444'; ctx.fillRect(this.x, this.y, this.width, this.height); }
        if (this.type === 'boss') {
            const barWidth = this.width; const barHeight = 6; const barX = this.x; const barY = this.y - 10;
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(barX, barY, barWidth, barHeight);
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#10b981' : healthPercent > 0.25 ? '#f59e0b' : '#ef4444';
            ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
        }
    }
    checkCollision(player: any) {
        if (!this.active) return false;
        return (player.x < this.x + this.width && player.x + player.w > this.x && player.y < this.y + this.height && player.y + player.h > this.y);
    }
    takeDamage(amount = 1) {
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
            spawnParticles(this.x + this.width/2, this.y + this.height/2, this.type === 'boss' ? CONFIG.PARTICLE_COLORS.BOSS : CONFIG.PARTICLE_COLORS.ENEMY, this.type === 'boss' ? 50 : 15);
            if (this.type !== 'boss') { globals.missionProgress.enemiesDefeated++; }
            return true;
        }
        return false;
    }
}
