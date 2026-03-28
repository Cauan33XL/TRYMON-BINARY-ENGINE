import { globals, CONFIG, spawnParticles, triggerScreenShake, STATES } from './Globals';
import { IMAGES } from './Assets';
import { input } from './Input';
import { sound } from './Sound';
import { clamp } from './Utils';

export class Projectile {
    x: number; y: number; vx: number; vy: number; width: number; height: number;
    source: string; sprite: any; active: boolean;
    constructor(x: number, y: number, vx: number, vy: number, source: string) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.width = 12; this.height = 12; this.source = source;
        this.sprite = source === 'player' ? IMAGES.projectile : IMAGES.enemyProjectile;
        this.active = true;
    }
    update(_dt: number) {
        if (!this.active) return;
        this.x += this.vx; this.y += this.vy;
        if (this.x < -50 || this.x > CONFIG.WIDTH + 50 || this.y < -50 || this.y > CONFIG.HEIGHT + 50) this.active = false;
    }
    draw(ctx: CanvasRenderingContext2D) {
        if (!this.active) return;
        if (this.sprite && this.sprite.complete && this.sprite.naturalWidth > 0) ctx.drawImage(this.sprite as HTMLImageElement, this.x, this.y, this.width, this.height);
        else {
            ctx.fillStyle = this.source === 'player' ? '#fbbf24' : '#ef4444';
            ctx.beginPath(); ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2); ctx.fill();
        }
    }
    checkCollision(target: any) {
        if (!this.active) return false;
        return (this.x < target.x + target.width && this.x + this.width > target.x && this.y < target.y + target.height && this.y + this.height > target.y);
    }
}

export class Player {
    w: number; h: number; x: number; y: number; vx: number; vy: number; onGround: boolean; character: string; sprite: any;
    coyoteTimer: number; jumpBufferTimer: number; scaleX: number; scaleY: number;
    dashTimer: number; dashCooldown: number; dashDirection: number;
    powerups: any; projectileCooldown: number; animationState: string; animationTimer: number; facingRight: boolean;
    maxHealth: number; health: number; coins: number; specialAbility: any;

    constructor(character = 'default'){
        this.w = CONFIG.PLAYER.WIDTH; this.h = CONFIG.PLAYER.HEIGHT;
        this.x = 150; this.y = CONFIG.HEIGHT - CONFIG.PLATFORM.HEIGHT - this.h;
        this.vx = 0; this.vy = 0; this.onGround = true; this.character = character;
        if (character === 'custom' && globals.customAssets.player) {
            this.sprite = new Image();
            this.sprite.src = globals.customAssets.player;
        } else {
            this.sprite = (IMAGES as any)['player' + character.charAt(0).toUpperCase() + character.slice(1)];
        }
        this.coyoteTimer = 0; this.jumpBufferTimer = 0; this.scaleX = 1; this.scaleY = 1;
        this.dashTimer = 0; this.dashCooldown = 0; this.dashDirection = 0;
        this.powerups = {
            shield: { active: false, timer: 0 }, doubleJump: { active: false, timer: 0, jumpsLeft: 0 },
            magnet: { active: false, timer: 0 }, speedBoost: { active: false, timer: 0 },
            invincibility: { active: false, timer: 0 }, projectile: { active: false, timer: 0 }, timeSlow: { active: false, timer: 0 }
        };
        this.projectileCooldown = 0; this.animationState = 'idle'; this.animationTimer = 0; this.facingRight = true;
        this.maxHealth = 3; this.health = this.maxHealth; this.coins = 0;
        this.specialAbility = { ready: true, cooldown: 0, duration: 0 };
    }
    
    update(dt: number){
        if (this.powerups.timeSlow.active) dt *= 0.5;
        this.coyoteTimer -= dt; this.jumpBufferTimer -= dt; this.dashCooldown -= dt;
        this.animationTimer += dt; this.projectileCooldown -= dt; this.specialAbility.cooldown -= dt; this.specialAbility.duration -= dt;
        this.updatePowerups(dt);
        
        let move = (input.isDown('ArrowRight') || input.isDown('KeyD') ? 1 : 0) - (input.isDown('ArrowLeft') || input.isDown('KeyA') ? 1 : 0);
        let speedMultiplier = 1;
        if (this.powerups.speedBoost.active) speedMultiplier = 1.5;
        
        if (input.isDashPressed() && this.dashCooldown <= 0 && Math.abs(move) > 0.1) {
            this.dashTimer = CONFIG.PLAYER.DASH_DURATION; this.dashCooldown = CONFIG.PLAYER.DASH_COOLDOWN;
            this.dashDirection = move > 0 ? 1 : -1;
            sound.dash(); spawnParticles(this.x + this.w/2, this.y + this.h/2, CONFIG.PARTICLE_COLORS.DASH, 15);
        }
        
        if (this.dashTimer > 0) {
            this.vx = this.dashDirection * CONFIG.PLAYER.DASH_SPEED; this.dashTimer -= dt;
            if (Math.random() < 0.3) spawnParticles(this.x + this.w/2, this.y + this.h/2, CONFIG.PARTICLE_COLORS.DASH, 3);
        } else {
            this.vx += move * CONFIG.PLAYER.ACC * speedMultiplier;
            this.vx *= (move === 0) ? CONFIG.PLAYER.FRICTION : 1;
            this.vx = clamp(this.vx, -CONFIG.PLAYER.MAX_SPEED * speedMultiplier, CONFIG.PLAYER.MAX_SPEED * speedMultiplier);
        }
        
        if (move !== 0) this.facingRight = move > 0;
        
        if (input.isJumpPressed()) this.jumpBufferTimer = CONFIG.PLAYER.JUMP_BUFFER_TIME;
        if(this.jumpBufferTimer > 0 && (this.coyoteTimer > 0 || (this.powerups.doubleJump.active && this.powerups.doubleJump.jumpsLeft > 0))){
            this.vy = CONFIG.PLAYER.JUMP_V; this.onGround = false; this.coyoteTimer = 0; this.jumpBufferTimer = 0;
            if (!this.onGround && this.powerups.doubleJump.active && this.powerups.doubleJump.jumpsLeft > 0) {
                this.powerups.doubleJump.jumpsLeft--; spawnParticles(this.x + this.w/2, this.y + this.h, '#8b5cf6', 8);
            }
            sound.jump(); spawnParticles(this.x + this.w/2, this.y + this.h, CONFIG.PARTICLE_COLORS.JUMP, 10);
        }
        input.jumpPressed = false;
        
        let currentGravity = CONFIG.GRAVITY;
        if (this.vy < 0 && (input.isDown('ArrowUp') || input.isDown('KeyW') || input.isDown('Space'))) currentGravity *= CONFIG.PLAYER.JUMP_HOLD_GRAVITY_MULT;
        this.vy += currentGravity;
        
        this.x += this.vx; this.y += this.vy;
        
        if(this.x < 20) { this.x = 20; this.vx = 0; }
        if(this.y > CONFIG.HEIGHT + 300) { globals.setGameState(STATES.FALLING); sound.fall(); }
        
        this.updateAnimation(dt);
        
        if (!this.onGround) {
            this.scaleY = 1 - (this.vy * 0.02); this.scaleX = 1 + (this.vy * 0.01);
            this.scaleY = clamp(this.scaleY, 0.7, 1.5); this.scaleX = clamp(this.scaleX, 0.7, 1.5);
        } else {
            this.scaleX += (1 - this.scaleX) * 0.2; this.scaleY += (1 - this.scaleY) * 0.2;
        }
        
        if (this.powerups.projectile.active && input.isShootPressed() && this.projectileCooldown <= 0) this.shoot();
        input.shootPressed = false;
        if (input.isDown('KeyE') && this.specialAbility.ready && this.specialAbility.cooldown <= 0) this.activateSpecialAbility();
    }
    
    updatePowerups(dt: number) {
        for (const key in this.powerups) {
            if (this.powerups[key].active) {
                this.powerups[key].timer -= dt;
                if (this.powerups[key].timer <= 0) {
                    this.powerups[key].active = false;
                    if (key === 'shield' || key === 'invincibility') spawnParticles(this.x + this.w/2, this.y + this.h/2, '#8b5cf6', 12);
                }
            }
        }
        if (this.onGround && this.powerups.doubleJump.active) this.powerups.doubleJump.jumpsLeft = 1;
    }
    
    updateAnimation(_dt: number) {
        if (this.onGround) {
            if (Math.abs(this.vx) > 0.5) this.animationState = 'running';
            else this.animationState = 'idle';
        } else {
            if (this.vy < 0) this.animationState = 'jumping';
            else this.animationState = 'falling';
        }
    }
    
    applyPowerup(type: string) {
        if(!this.powerups[type]) return;
        this.powerups[type].active = true;
        const durationKey = type.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
        this.powerups[type].timer = (CONFIG.POWERUP.DURATION as any)[durationKey] || 10;
        switch(type) {
            case 'doubleJump': this.powerups.doubleJump.jumpsLeft = 1; break;
            case 'health': 
                this.health = Math.min(this.maxHealth, this.health + 1); 
                spawnParticles(this.x + this.w/2, this.y + this.h/2, '#ef4444', 15); 
                break;
        }
        sound.powerup(); spawnParticles(this.x + this.w/2, this.y + this.h/2, CONFIG.PARTICLE_COLORS.POWERUP, 20);
        if (type !== 'health') globals.missionProgress.powerupsUsed++;
    }
    
    shoot() {
        this.projectileCooldown = CONFIG.PLAYER.PROJECTILE_COOLDOWN;
        const direction = this.facingRight ? 1 : -1;
        globals.projectiles.push(new Projectile(this.x + (this.facingRight ? this.w : 0), this.y + this.h/2 - 6, direction * CONFIG.PLAYER.PROJECTILE_SPEED, 0, 'player'));
        sound.shoot();
    }
    
    activateSpecialAbility() {
        this.specialAbility.ready = false; this.specialAbility.cooldown = 10; this.specialAbility.duration = 3;
        switch(this.character) {
            case 'ninja': 
                this.powerups.invincibility.active = true; this.powerups.invincibility.timer = 3;
                spawnParticles(this.x + this.w/2, this.y + this.h/2, '#333', 25); break;
            case 'robot': 
                this.powerups.shield.active = true; this.powerups.shield.timer = 5;
                spawnParticles(this.x + this.w/2, this.y + this.h/2, '#10b981', 25); break;
            case 'mage': 
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    globals.projectiles.push(new Projectile(this.x + this.w/2, this.y + this.h/2, Math.cos(angle) * 8, Math.sin(angle) * 8, 'player'));
                }
                spawnParticles(this.x + this.w/2, this.y + this.h/2, '#8b5cf6', 30); sound.shoot(); break;
            default: 
                this.powerups.speedBoost.active = true; this.powerups.speedBoost.timer = 4;
            spawnParticles(this.x + this.w/2, this.y + this.h/2, '#ffd54f', 25); break;
        }
    }
    
    takeDamage() {
        if (this.powerups.invincibility.active || this.powerups.shield.active) {
            spawnParticles(this.x + this.w/2, this.y + this.h/2, '#60a5fa', 15);
            return false;
        }
        this.health--; triggerScreenShake(0.3, 8); sound.enemyHit();
        this.powerups.invincibility.active = true; this.powerups.invincibility.timer = 1.5;
        return true;
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        const centerX = this.x + this.w / 2; const centerY = this.y + this.h / 2;
        ctx.translate(centerX, centerY); ctx.scale(this.scaleX, this.scaleY);
        if (!this.facingRight) ctx.scale(-1, 1);
        ctx.translate(-centerX, -centerY);
        
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(this.x + this.w / 2, this.y + this.h, this.w / 2 * 0.8, 4, 0, 0, Math.PI * 2); ctx.fill();
        
        if (this.powerups.shield.active) {
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(this.x + this.w/2, this.y + this.h/2, this.w/2 + 5, 0, Math.PI * 2); ctx.stroke();
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(96, 165, 250, ${pulse * 0.5})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(this.x + this.w/2, this.y + this.h/2, this.w/2 + 8, 0, Math.PI * 2); ctx.stroke();
        }
        
        if (this.powerups.invincibility.active) {
            const blink = Math.floor(Date.now() / 100) % 2 === 0;
            if (blink) ctx.globalAlpha = 0.5;
        }
        
        if (this.specialAbility.duration > 0) {
            const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7; ctx.globalAlpha = pulse;
        }
        
        if(this.sprite && (this.sprite as any).complete && (this.sprite as any).naturalWidth > 0) {
            ctx.drawImage(this.sprite as HTMLImageElement, this.x, this.y, this.w, this.h);
        } else {
             ctx.fillStyle = '#ffcc00'; ctx.fillRect(this.x, this.y, this.w, this.h); 
        }

        // Draw Player Name
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(globals.playerDisplayName, this.x + this.w / 2, this.y - 12);
        
        ctx.restore();
    }
}
