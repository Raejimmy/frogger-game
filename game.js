const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Game constants
const GRID_SIZE = 50;
const FROG_SIZE = 40;
const CAR_WIDTH = 80;
const CAR_HEIGHT = 40;

// Game state
let score = 0;
let gameOver = false;

// Player
const frog = {
    x: canvas.width / 2 - FROG_SIZE / 2,
    y: canvas.height - GRID_SIZE,
    width: FROG_SIZE,
    height: FROG_SIZE
};

// Obstacles (cars)
let cars = [];
const lanes = [1, 2, 3, 4, 5, 6]; // Lane positions
const speeds = [-1, 1.5, -2, 1, -1.5, 2]; // Speed for each lane (negative = left, positive = right)

// Initialize cars
function initCars() {
    cars = [];
    lanes.forEach((lane, index) => {
        const numCars = Math.floor(Math.random() * 3) + 2; // 2-4 cars per lane
        for (let i = 0; i < numCars; i++) {
            cars.push({
                x: Math.random() * canvas.width,
                y: lane * GRID_SIZE,
                width: CAR_WIDTH,
                height: CAR_HEIGHT,
                speed: speeds[index]
            });
        }
    });
}

// Draw functions
function drawFrog() {
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(frog.x, frog.y, frog.width, frog.height);
}

function drawCar(car) {
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(car.x, car.y, car.width, car.height);
}

function drawSafeZones() {
    ctx.fillStyle = '#666';
    ctx.fillRect(0, 0, canvas.width, GRID_SIZE); // Top safe zone
    ctx.fillRect(0, canvas.height - GRID_SIZE, canvas.width, GRID_SIZE); // Bottom safe zone
}

// Game logic
function updateCars() {
    cars.forEach(car => {
        car.x += car.speed;
        
        // Wrap cars around screen
        if (car.speed > 0 && car.x > canvas.width) {
            car.x = -car.width;
        } else if (car.speed < 0 && car.x + car.width < 0) {
            car.x = canvas.width;
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
    return cars.some(car => checkCollision(frog, car));
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
    updateCars();
    cars.forEach(drawCar);
    drawFrog();

    // Check win/lose conditions
    if (checkGameOver()) {
        gameOver = true;
        alert('Game Over! Score: ' + score);
        resetGame();
    } else if (checkWin()) {
        score += 100;
        scoreElement.textContent = score;
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
    resetFrog();
    initCars();
    gameLoop();
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (gameOver) return;

    const STEP = GRID_SIZE;
    
    switch(e.key) {
        case 'ArrowUp':
            if (frog.y > 0) frog.y -= STEP;
            break;
        case 'ArrowDown':
            if (frog.y < canvas.height - FROG_SIZE) frog.y += STEP;
            break;
        case 'ArrowLeft':
            if (frog.x > 0) frog.x -= STEP;
            break;
        case 'ArrowRight':
            if (frog.x < canvas.width - FROG_SIZE) frog.x += STEP;
            break;
    }
});

// Start game
initCars();
gameLoop();
