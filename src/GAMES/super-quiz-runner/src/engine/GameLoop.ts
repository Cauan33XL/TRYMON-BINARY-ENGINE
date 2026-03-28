import { globals, CONFIG, triggerScreenShake, spawnParticles, STATES } from './Globals';
import { input } from './Input';
import { sound } from './Sound';
import { Player } from './EntitiesPlayer';
import { Platform } from './EntitiesPlatform';
import { Enemy } from './EntitiesEnemy';
import { Powerup, Coin } from './EntitiesItems';
import { Camera, BackLayer, drawClouds, drawHills, drawMountains, updateParticles, drawParticles, drawCustomBackground } from './Background';
import { QuizManager } from './QuizManager';
import { EventBus } from '../EventBus';
import { roundRect, wrapText } from './Utils';

export function resetGame() {
    globals.player = new Player(globals.selectedCharacter);
    globals.camera = new Camera();
    globals.platforms = [new Platform(-100, CONFIG.HEIGHT - CONFIG.PLATFORM.HEIGHT, CONFIG.WIDTH + 200, 'solid')];
    globals.platforms[0].scored = true;
    
    globals.enemies = []; globals.powerups = []; globals.coins = []; globals.particles = [];
    globals.projectiles = []; globals.enemyProjectiles = []; globals.boss = null;
    
    let currentX = 200;
    for(let i=0; i<10; i++){
        currentX += 150 + Math.random() * 120;
        const y = CONFIG.HEIGHT - CONFIG.PLATFORM.HEIGHT - (Math.random() * 120);
        const w = CONFIG.PLATFORM.MIN_W + Math.random() * (CONFIG.PLATFORM.MAX_W - CONFIG.PLATFORM.MIN_W);
        let type = 'solid';
        const rand = Math.random();
        if (rand < 0.6) type = 'solid'; else if (rand < 0.7) type = 'breakable'; else if (rand < 0.8) type = 'moving'; else if (rand < 0.85) type = 'disappearing'; else if (rand < 0.9) type = 'bouncy'; else if (rand < 0.95) type = 'ice'; else type = 'lava';
        globals.platforms.push(new Platform(currentX, y, w, type));
    }
    
    globals.backLayers = [
        new BackLayer(drawMountains, 0.2), new BackLayer(drawHills('#3fa34a','#2f8f3a'), 0.35),
        new BackLayer(drawHills('#6fcf97','#4fbf8f'), 0.7), new BackLayer(drawClouds, 0.1)
    ];
    
    globals.quizManager = new QuizManager();
    globals.score = 0; globals.lives = 3; globals.currentLevel = 0; globals.gameTime = 0; globals.quizCount = 0; globals.correctAnswers = 0; globals.powerupsCollected = 0;
    globals.quizTriggerX = 1200 + Math.random()*500; globals.currentQuiz = null;
    globals.missionProgress = { score: 0, correctQuizzes: 0, coins: 0, enemiesDefeated: 0, powerupsUsed: 0 };
    
    if(globals.gameState !== STATES.MENU && globals.gameState !== STATES.CHAR_SELECT) globals.setGameState(STATES.RUNNING);
    if (sound.ctx && (globals.gameState === STATES.RUNNING || globals.gameState === STATES.QUIZ || globals.gameState === STATES.BOSS_FIGHT)) sound.playMusic();
}

function handleCollisions() {
    const player = globals.player;
    const COLLISION_TOLERANCE = 14;
    const prevBottom = player.y + player.h - player.vy;
    let onAnyPlatform = false;
    
    for(const p of globals.platforms){
        if (p.disappearing && !p.visible) continue;
        const playerBottom = player.y + player.h;
        if (player.x < p.x + p.width && player.x + player.w > p.x && prevBottom <= p.y + COLLISION_TOLERANCE && playerBottom >= p.y - COLLISION_TOLERANCE) {
            if(player.vy >= 0){
                if (!player.onGround) {
                    sound.land(); spawnParticles(player.x + player.w / 2, player.y + player.h, CONFIG.PARTICLE_COLORS.LAND, 15);
                    player.scaleY = 0.7; player.scaleX = 1.3;
                    if (player.vy > 15) triggerScreenShake(0.2, 8);
                }
                player.y = p.y - player.h; player.vy = 0; player.onGround = true; onAnyPlatform = true; player.coyoteTimer = CONFIG.PLAYER.COYOTE_TIME;
                
                if(!p.scored && p.type !== 'bad'){
                    globals.score += 2; p.scored = true; spawnParticles(player.x + player.w/2, player.y, CONFIG.PARTICLE_COLORS.SCORE, 8);
                }
                
                if (p.breakable) {
                    p.health--; triggerScreenShake(0.1, 3);
                    if (p.health <= 0) {
                        spawnParticles(p.x + p.width/2, p.y + p.height/2, '#a16207', 20);
                        globals.platforms.splice(globals.platforms.indexOf(p), 1);
                    }
                }
                if (p.bouncy) {
                    player.vy = CONFIG.PLAYER.JUMP_V * p.bouncePower; player.onGround = false;
                    spawnParticles(player.x + player.w/2, player.y + player.h, '#10b981', 10); sound.jump();
                }
                if (p.lava) {
                    player.takeDamage(); spawnParticles(player.x + player.w/2, player.y + player.h, '#dc2626', 15);
                }
            }
        }
    }
    if (!onAnyPlatform) player.onGround = false;
    
    for (let i = globals.enemies.length - 1; i >= 0; i--) {
        const enemy = globals.enemies[i];
        if (enemy.checkCollision(player)) {
            if (player.takeDamage()) {
                if (enemy.type === 'static') {
                    globals.enemies.splice(i, 1); spawnParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, CONFIG.PARTICLE_COLORS.ENEMY, 15);
                }
            }
        }
    }
    
    if (globals.boss && globals.boss.checkCollision(player)) player.takeDamage();
    
    for (let i = globals.powerups.length - 1; i >= 0; i--) {
        const powerup = globals.powerups[i];
        if (powerup.checkCollision(player)) {
            player.applyPowerup(powerup.type); globals.powerups.splice(i, 1); globals.powerupsCollected++;
            EventBus.emit('feedback', {text: 'POWER-UP!', type: 'powerup'});
        }
    }
    
    for (let i = globals.coins.length - 1; i >= 0; i--) {
        const coin = globals.coins[i];
        if (coin.checkCollision(player)) {
            player.coins++; globals.score += 5; globals.coins.splice(i, 1); sound.coin();
            spawnParticles(coin.x + coin.width/2, coin.y + coin.height/2, '#fbbf24', 8);
            globals.missionProgress.coins++; updateMissionProgress();
        }
    }
    
    for (let i = globals.projectiles.length - 1; i >= 0; i--) {
        const projectile = globals.projectiles[i];
        for (let j = globals.enemies.length - 1; j >= 0; j--) {
            const enemy = globals.enemies[j];
            if (projectile.checkCollision(enemy)) {
                if (enemy.takeDamage()) { globals.score += 10; globals.enemies.splice(j, 1); }
                globals.projectiles.splice(i, 1); break;
            }
        }
        if (projectile.active && globals.boss && projectile.checkCollision(globals.boss)) {
            if (globals.boss.takeDamage(2)) {
                globals.score += 100; sound.bossDefeated(); EventBus.emit('feedback', {text: 'CHEFE DERROTADO! +100', type: 'boss'});
                globals.boss = null; globals.setGameState(STATES.RUNNING);
            }
            globals.projectiles.splice(i, 1);
        }
    }
    
    for (let i = globals.enemyProjectiles.length - 1; i >= 0; i--) {
        const projectile = globals.enemyProjectiles[i];
        if (projectile.checkCollision(player)) {
            player.takeDamage(); globals.enemyProjectiles.splice(i, 1);
            spawnParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, projectile.source === 'boss' ? CONFIG.PARTICLE_COLORS.BOSS : CONFIG.PARTICLE_COLORS.ENEMY, 10);
        }
    }
}

function maybeAddPlatforms(){
    const last = globals.platforms[globals.platforms.length - 1];
    if((last.x + last.width) - globals.player.x < CONFIG.WIDTH * 2.0){
        const levelConfig = CONFIG.LEVELS[Math.min(globals.currentLevel, CONFIG.LEVELS.length - 1)];
        const newX = last.x + last.width + levelConfig.PLATFORM_GAP + Math.random()*60;
        const newY = CONFIG.HEIGHT - CONFIG.PLATFORM.HEIGHT - (Math.random()*140);
        const w = CONFIG.PLATFORM.MIN_W + Math.random()*(CONFIG.PLATFORM.MAX_W - CONFIG.PLATFORM.MIN_W);
        let type = 'solid'; const rand = Math.random();
        if (rand < 0.5) type = 'solid'; else if (rand < 0.6) type = 'breakable'; else if (rand < 0.7) type = 'moving'; else if (rand < 0.75) type = 'disappearing'; else if (rand < 0.8) type = 'bouncy'; else if (rand < 0.85) type = 'ice'; else if (rand < 0.9) type = 'lava'; else type = 'boost';
        
        globals.platforms.push(new Platform(newX, newY, w, type));
        
        if (Math.random() < levelConfig.ENEMY_SPAWN_RATE) {
            const enemyTypes = ['static', 'moving', 'flying', 'shooting'];
            globals.enemies.push(new Enemy(newX + w/2 - 12, newY - 30, enemyTypes[Math.floor(Math.random() * enemyTypes.length)]));
        }
        if (Math.random() < levelConfig.POWERUP_SPAWN_RATE) {
            const powerupTypes = ['shield', 'doubleJump', 'magnet', 'speedBoost', 'invincibility', 'projectile', 'health', 'timeSlow'];
            globals.powerups.push(new Powerup(newX + w/2 - 10, newY - 40, powerupTypes[Math.floor(Math.random() * powerupTypes.length)]));
        }
        if (Math.random() < 0.3) globals.coins.push(new Coin(newX + 20, newY - 30));
    }
}

export function enterQuiz(){
    const last = globals.platforms[globals.platforms.length - 1];
    const baseX = last.x + last.width + 100;
    const y = CONFIG.HEIGHT - CONFIG.PLATFORM.HEIGHT - (80 + Math.random()*60);
    const w = 180;
    const a = new Platform(baseX, y, w, 'solid'); const b = new Platform(baseX + w + 120, y, w, 'solid');
    const c = new Platform(baseX, y - 100, w, 'solid'); const d = new Platform(baseX + w + 120, y - 100, w, 'solid');
    globals.platforms.push(a, b, c, d);
    const final = new Platform(b.x + w + 160 + Math.random()*80, CONFIG.HEIGHT - CONFIG.PLATFORM.HEIGHT, 400, 'solid');
    globals.platforms.push(final);
    
    globals.quizTriggerX = final.x + final.width + 600 + Math.random()*500;
    globals.currentQuiz = { a, b, c, d, final, question: globals.quizManager.getNew() };
    globals.setGameState(STATES.QUIZ); globals.quizCount++;
}

export function startBossFight() {
    globals.setGameState(STATES.BOSS_FIGHT);
    globals.boss = new Enemy(CONFIG.WIDTH + 100, 200, 'boss');
    sound.bossSpawn(); EventBus.emit('feedback', {text:'CHEFE INIMIGO!', type:'boss'});
}

export function updateMissionProgress() {
    globals.missionProgress.score = globals.score;
    const checkboxes = [
        { id: 'mission1', completed: globals.missionProgress.score >= CONFIG.MISSIONS.SCORE },
        { id: 'mission2', completed: globals.missionProgress.correctQuizzes >= CONFIG.MISSIONS.CORRECT_QUIZZES },
        { id: 'mission3', completed: globals.missionProgress.coins >= CONFIG.MISSIONS.COINS },
        { id: 'mission4', completed: globals.missionProgress.enemiesDefeated >= CONFIG.MISSIONS.ENEMIES_DEFEATED },
        { id: 'mission5', completed: globals.missionProgress.powerupsUsed >= CONFIG.MISSIONS.POWERUPS_USED }
    ];
    // Sync to React
    EventBus.emit('mission-progress', checkboxes);
    
    const allCompleted = checkboxes.every(c => c.completed);
    if (allCompleted && globals.gameState === STATES.RUNNING) {
        globals.setGameState(STATES.MISSION);
        globals.score += 100; globals.lives = Math.min(5, globals.lives + 1);
        EventBus.emit('feedback', {text:'MISSÃO CUMPRIDA! +100', type:'good'});
    }
}

export function update(dt: number){
    if(globals.gameState === STATES.RUNNING || globals.gameState === STATES.BOSS_FIGHT){
        globals.gameTime += dt;
        const newLevel = Math.floor(globals.score / 100);
        if (newLevel > globals.currentLevel && newLevel < CONFIG.LEVELS.length) {
            globals.currentLevel = newLevel; EventBus.emit('feedback', {text:`NÍVEL ${globals.currentLevel + 1}!`, type:'powerup'});
            if (CONFIG.LEVELS[globals.currentLevel].BOSS_SPAWN && !globals.boss) startBossFight();
        }
        
        globals.player.update(dt);
        handleCollisions(); globals.camera.update();
        globals.backLayers.forEach(b=>b.update(globals.camera));
        
        globals.platforms.forEach(p => p.update(dt)); globals.enemies.forEach(e => e.update(dt));
        globals.powerups.forEach(p => p.update(dt)); globals.coins.forEach(c => c.update(dt));
        globals.projectiles.forEach(p => p.update(dt)); globals.enemyProjectiles.forEach(p => p.update(dt));
        if (globals.boss) globals.boss.update(dt);
        
        if (globals.gameState === STATES.RUNNING) {
            maybeAddPlatforms(); if(globals.player.x >= globals.quizTriggerX) enterQuiz();
        }
        
        if (globals.player.health <= 0) {
            globals.lives--; globals.player.health = globals.player.maxHealth;
            if (globals.lives <= 0) globals.setGameState(STATES.GAME_OVER);
            else {
                const solid = globals.platforms.filter(p => p.type === 'solid' && p.x < globals.player.x).pop() || globals.platforms[0];
                globals.player.x = solid.x + 20; globals.player.y = solid.y - globals.player.h; globals.player.vx = 0; globals.player.vy = 0; globals.player.onGround = true;
                spawnParticles(globals.player.x + globals.player.w/2, globals.player.y + globals.player.h/2, '#ffffff', 20);
            }
        }
        updateMissionProgress();
        EventBus.emit('sync-hud', {score: globals.score, lives: globals.lives, health: globals.player.health, maxHealth: globals.player.maxHealth, level: globals.currentLevel+1, coins: globals.player.coins, bossHealth: globals.boss ? globals.boss.health : 0, bossMax: globals.boss ? globals.boss.maxHealth : 1, powerups: globals.player.powerups, special: globals.player.specialAbility});
    } else if(globals.gameState === STATES.FALLING){
        globals.lives = Math.max(0, globals.lives - 1);
        if(globals.lives <= 0) globals.setGameState(STATES.GAME_OVER);
        else {
            const solid = globals.platforms.filter(p => p.type === 'solid' && p.x < globals.player.x).pop() || globals.platforms[0];
            globals.player.x = solid.x + 20; globals.player.y = solid.y - globals.player.h; globals.player.vx = 0; globals.player.vy = 0; globals.player.onGround = true; globals.setGameState(STATES.RUNNING);
        }
    }
    if (globals.screenShake.duration > 0) globals.screenShake.duration -= dt;
    updateParticles(dt);
}

export function draw(ctx: CanvasRenderingContext2D){
    const g = ctx.createLinearGradient(0,0,0,CONFIG.HEIGHT);
    if (globals.gameState === STATES.BOSS_FIGHT) { g.addColorStop(0, '#ff7d7d'); g.addColorStop(1, '#dc2626'); }
    else { g.addColorStop(0, '#7dbbff'); g.addColorStop(1, '#5b9be8'); }
    
    ctx.fillStyle = g; ctx.fillRect(0,0,CONFIG.WIDTH,CONFIG.HEIGHT); ctx.save();
    
    if (globals.customAssets.background) {
        drawCustomBackground(ctx);
    }
    
    if (globals.screenShake.duration > 0) {
        const mag = globals.screenShake.magnitude * (globals.screenShake.duration / CONFIG.SCREEN_SHAKE_DURATION);
        ctx.translate(Math.random() * mag - mag / 2, Math.random() * mag - mag / 2);
    }
    
    globals.backLayers.forEach(layer=> layer.draw(ctx)); ctx.translate(-globals.camera.x, 0);
    globals.platforms.forEach(p=>p.draw(ctx)); globals.enemies.forEach(e=>e.draw(ctx));
    globals.powerups.forEach(p=>p.draw(ctx)); globals.coins.forEach(p=>p.draw(ctx));
    globals.projectiles.forEach(p=>p.draw(ctx)); globals.enemyProjectiles.forEach(p=>p.draw(ctx));
    if (globals.boss) globals.boss.draw(ctx);
    if (globals.player) globals.player.draw(ctx);
    drawParticles(ctx); ctx.restore();
    
    if(globals.gameState === STATES.QUIZ && globals.currentQuiz && globals.currentQuiz.question){
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        const W = CONFIG.WIDTH - 160, H = 300, X = 80, Y = 80;
        ctx.fillStyle = '#111'; roundRect(ctx, X, Y, W, H, 10, true, false);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; roundRect(ctx, X, Y, W, H, 10, false, true);
        const q = globals.currentQuiz.question;
        ctx.fillStyle = '#fff'; ctx.font = '20px "Press Start 2P"'; ctx.textAlign = 'center'; wrapText(ctx, q.q, X + W/2, Y + 56, W - 40, 30);
        ctx.font = '16px "Press Start 2P"'; ctx.textAlign = 'left';
        ctx.fillText(`A: ${q.o.A}`, X + 40, Y + H - 148); ctx.fillText(`B: ${q.o.B}`, X + 40, Y + H - 108);
        ctx.fillText(`C: ${q.o.C}`, X + W/2 + 20, Y + H - 148); ctx.fillText(`D: ${q.o.D}`, X + W/2 + 20, Y + H - 108);
        ctx.textAlign = 'center'; ctx.font = '14px "Press Start 2P"'; ctx.fillText('Pressione A, B, C ou D', X + W/2, Y + H - 44);
    }
}

let last = 0; let animationFrameId: any;
export function loop(ts: number){
    const dt = Math.min((ts - last) / 1000, 0.05); last = ts;
    if (globals.gameState !== STATES.PAUSED && globals.gameState !== STATES.MENU && globals.gameState !== STATES.CHAR_SELECT && globals.gameState !== STATES.SETTINGS && globals.gameState !== STATES.CREDITS) {
        update(dt);
    }
    if(globals.ctx) draw(globals.ctx);
    animationFrameId = requestAnimationFrame(loop);
}

export function startGame(){
    if (!sound.ctx) sound.init();
    globals.setGameState(STATES.RUNNING); resetGame();
}

EventBus.on('quiz-answer', (choice: string) => {
    if(!globals.currentQuiz || !globals.currentQuiz.question) return;
    const q = globals.currentQuiz.question;
    const correct = q.c === choice;
    if(correct){
        globals.score += 20; globals.correctAnswers++; EventBus.emit('feedback', {text:'ACERTOU! +20', type:'good'}); sound.good();
        globals.missionProgress.correctQuizzes++; updateMissionProgress();
    } else {
        globals.lives = Math.max(0, globals.lives - 1); EventBus.emit('feedback', {text:'ERROU! -1 vida', type:'bad'}); sound.bad();
        globals.currentQuiz[choice.toLowerCase()].type = 'bad';
    }
    globals.currentQuiz.a.highlight = 1.0; globals.currentQuiz.b.highlight = 1.0; globals.currentQuiz.c.highlight = 1.0; globals.currentQuiz.d.highlight = 1.0;
    const answeredPlatform = globals.currentQuiz[choice.toLowerCase()];
    spawnParticles(answeredPlatform.x + answeredPlatform.width/2, answeredPlatform.y, correct ? '#8ef3a6' : '#ff9b9b', 22);
    setTimeout(()=>{
        globals.currentQuiz.question = null; globals.currentQuiz = null;
        if(globals.lives <= 0) globals.setGameState(STATES.GAME_OVER);
        else { globals.setGameState(STATES.RUNNING); sound.playMusic(); }
    }, 900);
});

export function stopLoop() { cancelAnimationFrame(animationFrameId); input.cleanup(); }
export function initLoop() { 
    input.init();
    // Simulate initial player for menu rendering
    globals.player = new Player(); globals.camera = new Camera(); globals.backLayers = [new BackLayer(drawClouds, 0.1)];
    animationFrameId = requestAnimationFrame(loop); 
}
