const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Game constants
const GRID_SIZE = 50;
const FROG_SIZE = 40;
const VEHICLE_WIDTH = 40;
const VEHICLE_HEIGHT = 30;

// Audio Context and Background Music
let audioContext = null;
let bgMusicPlaying = false;

function initAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    playBackgroundMusic();
}

// Sound functions
function playBackgroundMusic() {
    if (!audioContext || bgMusicPlaying) return;
    bgMusicPlaying = true;

    const notes = [
        { freq: 262, duration: 0.2 }, // C4
        { freq: 330, duration: 0.2 }, // E4
        { freq: 392, duration: 0.2 }, // G4
        { freq: 330, duration: 0.2 }, // E4
    ];
    
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
    gainNode.connect(audioContext.destination);

    function playNote(time, note) {
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(note.freq, time);
        
        const noteGain = audioContext.createGain();
        noteGain.gain.setValueAtTime(0.1, time);
        noteGain.gain.exponentialRampToValueAtTime(0.01, time + note.duration);
        
        oscillator.connect(noteGain);
        noteGain.connect(gainNode);
        
        oscillator.start(time);
        oscillator.stop(time + note.duration);
    }

    function scheduleNotes(startTime) {
        let currentTime = startTime;
        notes.forEach(note => {
            playNote(currentTime, note);
            currentTime += note.duration;
        });
        
        // Schedule next loop
        if (bgMusicPlaying) {
            setTimeout(() => {
                scheduleNotes(audioContext.currentTime);
            }, (currentTime - startTime) * 1000);
        }
    }

    scheduleNotes(audioContext.currentTime);
}

function stopBackgroundMusic() {
    bgMusicPlaying = false;
}

function playJumpSound() {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playSplashSound() {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

function playWinSound() {
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

// Game state
let score = 0;
let gameOver = false;
let fireworks = [];

// Firework particle class
class Firework {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.createParticles();
    }

    createParticles() {
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 2 + Math.random() * 2;
            this.particles.push({
                x: this.x,
                y: this.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color: `hsl(${Math.random() * 360}, 50%, 50%)`
            });
        }
    }

    update() {
        for (let particle of this.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.05; // gravity
            particle.alpha -= 0.02;
        }
        return this.particles[0].alpha > 0;
    }

    draw(ctx) {
        for (let particle of this.particles) {
            if (particle.alpha > 0) {
                ctx.save();
                ctx.globalAlpha = particle.alpha;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }
}

// Player
const frog = {
    x: canvas.width / 2 - FROG_SIZE / 2,
    y: canvas.height - GRID_SIZE,
    width: FROG_SIZE,
    height: FROG_SIZE,
    isJumping: false,
    jumpProgress: 0,
    targetX: null,
    targetY: null,
    startX: null,
    startY: null
};

const JUMP_DURATION = 15; // frames the jump animation takes

// Obstacles (vehicles)
let vehicles = [];
const lanes = [1, 2, 3, 4, 5, 6]; // Lane positions
const speeds = [-0.5, 0.75, -1, 0.5, -0.75, 1]; // Speed for each lane (negative = left, positive = right)
const vehicleTypes = ['car', 'car', 'car', 'car', 'car', 'car']; // All cars
const vehicleColors = ['#FF4444', '#4444FF', '#44FF44', '#FFFF44', '#FF44FF', '#44FFFF']; // Colors for each lane

// Initialize vehicles
function initVehicles() {
    vehicles = [];
    lanes.forEach((lane, index) => {
        const numVehicles = Math.floor(Math.random() * 2) + 3; // 3-4 vehicles per lane
        for (let i = 0; i < numVehicles; i++) {
            vehicles.push({
                x: Math.random() * canvas.width,
                y: lane * GRID_SIZE,
                width: VEHICLE_WIDTH,
                height: VEHICLE_HEIGHT,
                speed: speeds[index],
                color: vehicleColors[index],
                type: vehicleTypes[index]
            });
        }
    });
}

// Draw functions
function drawFrog() {
    let currentX = frog.x;
    let currentY = frog.y;
    let scale = 1;
    let legOffset = 0;
    
    if (frog.isJumping) {
        // Calculate current position based on jump progress
        const progress = frog.jumpProgress / JUMP_DURATION;
        currentX = frog.startX + (frog.targetX - frog.startX) * progress;
        currentY = frog.startY + (frog.targetY - frog.startY) * progress;
        
        // Add a jumping arc
        const jumpHeight = 20;
        const jumpArc = Math.sin(progress * Math.PI) * jumpHeight;
        currentY -= jumpArc;
        
        // Scale the frog during jump (stretch up then squash down)
        if (progress < 0.5) {
            scale = 1 + (progress * 0.4); // Stretch up
        } else {
            scale = 1.2 - ((progress - 0.5) * 0.4); // Squash down
        }
        
        // Adjust leg positions during jump
        legOffset = Math.sin(progress * Math.PI) * 8;
    }
    
    // Main body (slightly darker green)
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(
        currentX + 8,
        currentY + 8 / scale,
        frog.width - 16,
        (frog.height - 16) * scale
    );
    
    // Head (lighter green)
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(
        currentX + 12,
        currentY + 4 / scale,
        frog.width - 24,
        12 * scale
    );
    
    // Eyes (white with black pupils)
    // Left eye
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(currentX + 14, currentY + 6, 6, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(currentX + 16, currentY + 8, 2, 2);
    
    // Right eye
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(currentX + frog.width - 20, currentY + 6, 6, 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(currentX + frog.width - 18, currentY + 8, 2, 2);
    
    // Legs (darker green)
    ctx.fillStyle = '#1B5E20';
    // Front legs with jump animation
    ctx.fillRect(currentX + 4, currentY + 12 - legOffset, 8, 8);
    ctx.fillRect(currentX + frog.width - 12, currentY + 12 - legOffset, 8, 8);
    // Back legs with jump animation
    ctx.fillRect(currentX + 4, currentY + frog.height - 16 + legOffset, 8, 8);
    ctx.fillRect(currentX + frog.width - 12, currentY + frog.height - 16 + legOffset, 8, 8);
    
    // Update jump progress
    if (frog.isJumping) {
        frog.jumpProgress++;
        if (frog.jumpProgress >= JUMP_DURATION) {
            frog.isJumping = false;
            frog.jumpProgress = 0;
            frog.x = frog.targetX;
            frog.y = frog.targetY;
        }
    }
}

function drawVehicle(vehicle) {
    const x = vehicle.x;
    const y = vehicle.y;
    const width = vehicle.width;
    const height = vehicle.height;
    const isMovingRight = vehicle.speed > 0;

    // Main body
    ctx.fillStyle = vehicle.color;
    ctx.fillRect(x + 2, y + 6, width - 4, height - 12);
    
    // Roof with gradient
    const roofGradient = ctx.createLinearGradient(x + width/4, y, x + width*3/4, y);
    roofGradient.addColorStop(0, darkenColor(vehicle.color, 30));
    roofGradient.addColorStop(0.5, darkenColor(vehicle.color, 10));
    roofGradient.addColorStop(1, darkenColor(vehicle.color, 30));
    ctx.fillStyle = roofGradient;
    ctx.fillRect(x + width/4, y + 2, width/2, height - 8);

    // Windows with frames
    ctx.fillStyle = '#333333';
    // Front window frame
    ctx.fillRect(x + width/3 - 1, y + 4, width/4 + 2, height/2);
    // Back window frame
    ctx.fillRect(x + width/2, y + 4, width/4 + 2, height/2);
    
    // Window glass
    ctx.fillStyle = '#ADD8E6';
    // Front window
    ctx.fillRect(x + width/3, y + 5, width/4, height/2 - 2);
    // Back window
    ctx.fillRect(x + width/2 + 1, y + 5, width/4, height/2 - 2);

    // Tires with detail
    ctx.fillStyle = '#000000';
    // Draw tires with circular shape
    for (let i = 0; i < 4; i++) {
        const tireX = x + width * (0.2 + i * 0.2);
        ctx.beginPath();
        ctx.arc(tireX, y + height - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Hubcaps
        ctx.fillStyle = '#CCCCCC';
        ctx.beginPath();
        ctx.arc(tireX, y + height - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
    }

    // Grill and bumper
    ctx.fillStyle = '#333333';
    if (isMovingRight) {
        ctx.fillRect(x + width - 5, y + height/2 - 2, 3, 4);
    } else {
        ctx.fillRect(x + 2, y + height/2 - 2, 3, 4);
    }

    // Headlights/taillights with glow
    if (isMovingRight) {
        // Headlights
        const headlightGradient = ctx.createRadialGradient(
            x + width - 2, y + height/3,
            0,
            x + width - 2, y + height/3,
            6
        );
        headlightGradient.addColorStop(0, '#FFFFFF');
        headlightGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = headlightGradient;
        ctx.fillRect(x + width - 6, y + height/3 - 3, 6, 6);
        
        // Taillights
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x, y + height/3 - 2, 4, 4);
    } else {
        // Headlights
        const headlightGradient = ctx.createRadialGradient(
            x + 2, y + height/3,
            0,
            x + 2, y + height/3,
            6
        );
        headlightGradient.addColorStop(0, '#FFFFFF');
        headlightGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = headlightGradient;
        ctx.fillRect(x, y + height/3 - 3, 6, 6);
        
        // Taillights
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x + width - 4, y + height/3 - 2, 4, 4);
    }
}

// Helper functions to modify colors
function darkenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, ((num >> 16) - amt));
    const G = Math.max(0, (((num >> 8) & 0x00FF) - amt));
    const B = Math.max(0, ((num & 0x0000FF) - amt));
    return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

function lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, ((num >> 16) + amt));
    const G = Math.min(255, (((num >> 8) & 0x00FF) + amt));
    const B = Math.min(255, ((num & 0x0000FF) + amt));
    return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

function drawSafeZones() {
    ctx.fillStyle = '#666';
    ctx.fillRect(0, 0, canvas.width, GRID_SIZE); // Top safe zone
    ctx.fillRect(0, canvas.height - GRID_SIZE, canvas.width, GRID_SIZE); // Bottom safe zone
}

// Game logic
function updateVehicles() {
    vehicles.forEach(vehicle => {
        vehicle.x += vehicle.speed;
        
        // Wrap vehicles around screen
        if (vehicle.speed > 0 && vehicle.x > canvas.width) {
            vehicle.x = -vehicle.width;
        } else if (vehicle.speed < 0 && vehicle.x + vehicle.width < 0) {
            vehicle.x = canvas.width;
        }
    });
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkGameOver() {
    return vehicles.some(vehicle => checkCollision(frog, vehicle));
}

function checkWin() {
    return frog.y <= GRID_SIZE;
}

// Main game loop
function gameLoop() {
    if (gameOver) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw game elements
    drawSafeZones();
    updateVehicles();
    vehicles.forEach(drawVehicle);
    drawFrog();
    
    // Update and draw fireworks
    fireworks = fireworks.filter(firework => {
        const isAlive = firework.update();
        if (isAlive) {
            firework.draw(ctx);
        }
        return isAlive;
    });

    // Check win/lose conditions
    if (checkGameOver()) {
        gameOver = true;
        playSplashSound();
        stopBackgroundMusic();
        alert('Game Over! Score: ' + score);
        resetGame();
    } else if (checkWin()) {
        score += 100;
        scoreElement.textContent = score;
        playWinSound();
        // Add fireworks at random positions near the top
        for (let i = 0; i < 3; i++) {
            const x = Math.random() * canvas.width;
            fireworks.push(new Firework(x, GRID_SIZE));
        }
        resetFrog();
    }

    requestAnimationFrame(gameLoop);
}

// Reset functions
function resetFrog() {
    frog.x = canvas.width / 2 - FROG_SIZE / 2;
    frog.y = canvas.height - GRID_SIZE;
}

function resetGame() {
    score = 0;
    scoreElement.textContent = score;
    gameOver = false;
    fireworks = []; // Clear any remaining fireworks
    resetFrog();
    initVehicles();
    gameLoop();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    console.log('Key pressed:', e.code); // Debug log
    if (gameOver) return;
    
    // Initialize audio on first interaction
    initAudio();

    const STEP = GRID_SIZE;
    
    if (!frog.isJumping) {
        switch(e.code) {
            case 'ArrowUp':
            case 'KeyW':
                console.log('Moving up'); // Debug log
                if (frog.y > 0) {
                    startJump(frog.x, frog.y - STEP);
                }
                break;
            case 'ArrowDown':
            case 'KeyS':
                console.log('Moving down'); // Debug log
                if (frog.y < canvas.height - FROG_SIZE) {
                    startJump(frog.x, frog.y + STEP);
                }
                break;
            case 'ArrowLeft':
            case 'KeyA':
                console.log('Moving left'); // Debug log
                if (frog.x > 0) {
                    startJump(frog.x - STEP, frog.y);
                }
                break;
            case 'ArrowRight':
            case 'KeyD':
                console.log('Moving right'); // Debug log
                if (frog.x < canvas.width - FROG_SIZE) {
                    startJump(frog.x + STEP, frog.y);
                }
                break;
        }
    }
});

// Helper function to start a jump
function startJump(targetX, targetY) {
    frog.isJumping = true;
    frog.jumpProgress = 0;
    frog.startX = frog.x;
    frog.startY = frog.y;
    frog.targetX = targetX;
    frog.targetY = targetY;
    playJumpSound();
}

// Start game
initVehicles();
gameLoop();
