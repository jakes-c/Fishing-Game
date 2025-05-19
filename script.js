const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const startScreen = document.getElementById('startScreen');
const endScreen = document.getElementById('endScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const finalScoreText = document.getElementById('finalScore');

// Game world settings
const worldHeight = 3000; // Total world height (pixels)
const viewportHeight = canvas.height; // Height of visible area
let cameraY = 0; // Camera vertical position
let targetCameraY = 0; // Target camera position for smooth transitions
const cameraSmoothing = 0.05; // Camera movement smoothing factor (lower = smoother)
const waterSurfaceY = canvas.height * 0.5; // Y position of water surface

const castSound = new Audio('assets/cast.mp3');
const catchSound = new Audio('assets/catch.mp3');
const splashSound = new Audio('assets/splash.mp3');
const reelSound = new Audio('assets/reel.mp3');
const collisionSound = new Audio('assets/splash.mp3'); // Reusing splash for collision
const bgMusic = new Audio('assets/bgmusic.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.3;
splashSound.volume = 0.4;

window.addEventListener('load', () => {
  bgMusic.play().catch(() => {
    const resumeMusic = () => {
      bgMusic.play();
      document.removeEventListener('click', resumeMusic);
      document.removeEventListener('keydown', resumeMusic);
    };
    document.addEventListener('click', resumeMusic);
    document.addEventListener('keydown', resumeMusic);
  });
});

// Boat position is fixed at the top of the water
const boatElement = document.getElementById('boat');
const boat = { 
  x: canvas.width / 2, 
  y: canvas.height * 0.28, // Fixed Y position for boat
  worldY: canvas.height * 0.28 // Fixed world Y position for boat
};

const hook = { 
  x: 0, 
  y: 0, 
  worldY: 0, // Absolute Y position in world coordinates
  originalY: 0, 
  isMovingDown: false, 
  isMovingUp: false,
  stepDistance: 20, // Distance to move in one step
  horizontalSpeed: 5, // Added horizontal speed for A/D movement
  attachedFishes: [],
  maxFishes: 5, // Maximum number of fishes that can be caught before auto-reeling
  radius: 15 // Collision radius for the hook
};

// Added keyboard state tracking
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

const hookImg = new Image();
hookImg.src = 'assets/hook.png';

const fishImages = ['fish1.png', 'fish2.png', 'fish3.png', 'fish4.png'].map(name => {
  const img = new Image();
  img.src = `assets/${name}`;
  return img;
});

const obstacleImages = ['seahorse.png', 'jellyfish.png', 'starfish.png', 'shell.png'].map(name => {
  const img = new Image();
  img.src = `assets/${name}`;
  return img;
});

let fishes = [], score = 0, timeLeft = 60, gameOver = false;
const obstacles = [];

// Fish depth zones (for spawning at different levels)
const depthZones = [
  { minDepth: 500, maxDepth: 1000, fishCount: 5 },
  { minDepth: 1000, maxDepth: 2000, fishCount: 10 },
  { minDepth: 2000, maxDepth: 2800, fishCount: 15 }
];

function spawnObstacles() {
  obstacles.length = 0;
  // Spawn some obstacles in each depth zone
  for (let depth = 500; depth < worldHeight - 500; depth += 300) {
    const count = 2 + Math.floor(Math.random() * 3); // 2-4 obstacles per level
    for (let i = 0; i < count; i++) {
      const image = obstacleImages[Math.floor(Math.random() * obstacleImages.length)];
      const x = Math.random() * (canvas.width - 80);
      const worldY = depth + Math.random() * 200;
      const size = 60 + Math.random() * 40;
      obstacles.push({ 
        image, 
        x, 
        worldY, 
        size,
        radius: size / 2 // Collision radius
      });
    }
  }
}

function drawObstacles() {
  obstacles.forEach(obstacle => {
    // Only draw obstacles that are in the viewport
    const screenY = obstacle.worldY - cameraY;
    if (screenY > -obstacle.size && screenY < canvas.height + obstacle.size) {
      ctx.drawImage(obstacle.image, obstacle.x, screenY, obstacle.size, obstacle.size);
    }
  });
}

// Modified to check for depth
function checkObstacleCollisions() {
  if (hook.attachedFishes.length === 0) return;

  for (const obstacle of obstacles) {
    const dx = hook.x - (obstacle.x + obstacle.size/2);
    const dy = hook.worldY - obstacle.worldY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < hook.radius + obstacle.radius) {
      // Collision detected! Release all caught fish
      collisionSound.currentTime = 0;
      collisionSound.play();
      
      hook.attachedFishes.forEach(fish => {
        fish.caught = false;
        // Give fish a little nudge away from the obstacle
        fish.x += (Math.random() - 0.5) * 100;
        fish.worldY = obstacle.worldY + obstacle.radius + fish.size/2 + Math.random() * 50;
      });
      
      hook.attachedFishes = [];
      break;
    }
  }
}

// 🌊 WAVE FUNCTION - Modified to stay fixed at the top of the water
function drawWaves() {
  // Fixed wave position (no longer affected by camera)
  const waveY = waterSurfaceY;
  
  ctx.fillStyle = '#0a2e59';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, waveY);
  for (let x = 0; x <= canvas.width; x++) {
    const y = waveY + Math.sin((x + Date.now() / 20) * 0.02) * 20;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();
}

class Fish {
  constructor(x, worldY, speed, image, direction, depth) {
    this.x = x;
    this.worldY = worldY;
    this.speed = speed;
    this.size = 60;
    this.image = image;
    this.caught = false;
    this.direction = direction;
    this.depth = depth; // Store which depth zone this fish belongs to
  }
  
  draw() {
    // Convert worldY to screen coordinates
    const screenY = this.worldY - cameraY;
    
    // Only draw if fish is visible in viewport
    if (screenY > -this.size && screenY < canvas.height + this.size) {
      ctx.drawImage(this.image, this.x, screenY, this.size, this.size);
    }
  }
  
  update() {
    if (!this.caught) {
      this.x += this.speed;
      // Wrap around the screen horizontally
      if (this.direction === 'left' && this.x < -this.size) this.x = canvas.width;
      else if (this.direction === 'right' && this.x > canvas.width) this.x = -this.size;
    } else {
      // If caught, follow the hook
      const index = hook.attachedFishes.indexOf(this);
      this.x = hook.x - this.size / 2 + index * 35;
      this.worldY = hook.worldY - 50 - index * 40;
    }
    this.draw();
  }
}

function spawnFish() {
  fishes = [];
  
  // Spawn fish in each depth zone
  depthZones.forEach(zone => {
    for (let i = 0; i < zone.fishCount; i++) {
      const imgIndex = Math.floor(Math.random() * fishImages.length);
      const img = fishImages[imgIndex];
      let x, speed, direction;
      
      if (Math.random() > 0.5) {
        x = Math.random() * 100;
        speed = Math.random() * 2 + 1;
        direction = 'right';
      } else {
        x = canvas.width - (Math.random() * 100);
        speed = -(Math.random() * 2 + 1);
        direction = 'left';
      }
      
      const worldY = zone.minDepth + Math.random() * (zone.maxDepth - zone.minDepth);
      fishes.push(new Fish(x, worldY, speed, img, direction, zone.minDepth));
    }
  });
}

// Modified to keep boat fixed at the water's surface
function updateBoatPosition() {
  const rect = boatElement.getBoundingClientRect();
  boat.x = rect.left + rect.width / 2;
  
  // Keep boat's screen position fixed regardless of camera
  boat.y = canvas.height * 0.28;
  
  // If hook is at or above the boat, reset it to boat position
  const boatWorldY = cameraY + boat.y;
  
  if (hook.worldY <= boatWorldY) {
    hook.x = boat.x - 270;
    hook.y = boat.y + 15;
    hook.worldY = boatWorldY + 15;
    hook.originalY = hook.y;
    hook.isMovingDown = false;
    hook.isMovingUp = false;
  }
}

function drawHook() {
  // Calculate screen position of hook
  hook.y = hook.worldY - cameraY;
  
  // Calculate the line start position (always from the boat)
  const lineStartY = boat.y + 15;
  
  // Draw fishing line from boat to hook
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.moveTo(hook.x, lineStartY);
  ctx.lineTo(hook.x, hook.y);
  ctx.stroke();
  
  // Draw hook image
  ctx.drawImage(hookImg, hook.x - 15, hook.y, 30, 50);
}

function checkCatch() {
  fishes.forEach(fish => {
    if (!fish.caught && hook.attachedFishes.length < hook.maxFishes) {
      const dx = hook.x - (fish.x + fish.size / 2);
      const dy = hook.worldY - fish.worldY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < fish.size / 2 + 10) {
        fish.caught = true;
        hook.attachedFishes.push(fish);
        catchSound.currentTime = 0;
        catchSound.play();
        splashSound.currentTime = 0;
        splashSound.play();
      }
    }
  });
}

// Completely redesigned camera system with smooth transitions
function updateCamera() {
  // Determine target camera position based on hook depth
  // The deeper the hook goes, the more we want to follow it
  
  // Fixed camera until hook reaches water surface
  if (hook.worldY < waterSurfaceY) {
    targetCameraY = 0;
  } 
  // After passing water surface, start following gradually
  else {
    // How far from water surface the hook is
    const depthBelowSurface = hook.worldY - waterSurfaceY;
    
    // Calculate how much the camera should follow
    // We want to keep the hook visible but not too close to the edges
    const visibleAreaHeight = canvas.height - waterSurfaceY;
    const idealHookScreenPos = waterSurfaceY + visibleAreaHeight * 0.4; // Keep hook at 40% from top of water
    
    // Target camera position to achieve ideal hook position
    targetCameraY = hook.worldY - idealHookScreenPos;
    
    // Don't let camera go above water surface
    targetCameraY = Math.max(0, targetCameraY);
    
    // Don't let camera go below world bottom
    targetCameraY = Math.min(worldHeight - canvas.height, targetCameraY);
  }
  
  // Smooth camera movement using interpolation
  cameraY += (targetCameraY - cameraY) * cameraSmoothing;
}

// Added function to handle WASD movement
function handleHookMovement() {
  // Calculate the boat's current world Y position
  const boatWorldY = cameraY + boat.y;
  
  // Left movement - always available when hook isn't at original position
  if (keys.a && hook.worldY > boatWorldY) {
    hook.x -= hook.horizontalSpeed;
    // Add boundary check for left edge
    if (hook.x < 20) {
      hook.x = 20;
    }
  }
  
  // Right movement - always available when hook isn't at original position
  if (keys.d && hook.worldY > boatWorldY) {
    hook.x += hook.horizontalSpeed;
    // Add boundary check for right edge
    if (hook.x > canvas.width - 20) {
      hook.x = canvas.width - 20;
    }
  }
  
  // Move hook down with S key
  if (keys.s && !hook.isMovingUp && hook.worldY < worldHeight - 50 && 
      hook.attachedFishes.length < hook.maxFishes) {
    hook.worldY += hook.stepDistance;
    if (!hook.isMovingDown) {
      castSound.currentTime = 0;
      castSound.play();
      hook.isMovingDown = true;
    }
    
    if (hook.worldY > worldHeight - 50) {
      hook.worldY = worldHeight - 50; // Set to max depth
    }
  } else {
    hook.isMovingDown = false;
  }
  
  // Move hook up with W key
  if (keys.w && !hook.isMovingDown && hook.worldY > boatWorldY) {
    hook.worldY -= hook.stepDistance;
    if (!hook.isMovingUp) {
      reelSound.currentTime = 0;
      reelSound.play();
      hook.isMovingUp = true;
    }
    
    // Check if we've reached the boat position
    if (hook.worldY <= boatWorldY) {
      hook.worldY = boatWorldY;
      hook.isMovingUp = false;
      
      // Handle fish scoring when reaching the top
      if (hook.attachedFishes.length > 0) {
        hook.attachedFishes.forEach(f => {
          fishes = fishes.filter(ff => ff !== f);
          score++;
        });
        document.getElementById('score').textContent = score;
        hook.attachedFishes = [];
      }
    }
  } else {
    hook.isMovingUp = false;
  }
  
  // Auto-reel if max fishes caught
  if (hook.attachedFishes.length >= hook.maxFishes && !hook.isMovingUp) {
    hook.isMovingUp = true;
    reelSound.currentTime = 0;
    reelSound.play();
  }
}

// Draw the background with fixed sky and scrolling underwater scene
function drawBackground() {
  // Sky is always fixed at the top
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, canvas.width, waterSurfaceY);
  
  // Draw water background (scrolls with camera)
  ctx.fillStyle = '#0077be';
  ctx.fillRect(0, waterSurfaceY, canvas.width, canvas.height - waterSurfaceY);
  
  // Draw a subtle gradient for water depth effect
  const gradient = ctx.createLinearGradient(0, waterSurfaceY, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(0, 119, 190, 1)');  // Light blue at top
  gradient.addColorStop(0.6, 'rgba(0, 60, 120, 1)'); // Darker blue in middle
  gradient.addColorStop(1, 'rgba(0, 20, 60, 1)');    // Very dark blue at bottom
  ctx.fillStyle = gradient;
  ctx.fillRect(0, waterSurfaceY, canvas.width, canvas.height - waterSurfaceY);
  
  // Draw depth markers
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '16px Arial';
  
  const depthValues = [500, 1000, 1500, 2000, 2500];
  depthValues.forEach(depth => {
    const y = depth - cameraY;
    if (y > waterSurfaceY && y < canvas.height) {
      ctx.fillText(`${depth/100}m`, canvas.width - 70, y);
      
      // Draw a dashed line
      ctx.beginPath();
      ctx.setLineDash([5, 10]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  
  // Draw sea floor at the bottom
  const seaFloorY = worldHeight - cameraY;
  if (seaFloorY < canvas.height + 50) {
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, seaFloorY - 30, canvas.width, 50);
  }
}

function update() {
  if (gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update camera to follow hook with smooth transitions
  updateCamera();
  
  // Draw all game elements
  drawBackground();
  drawWaves();

  updateBoatPosition();
  drawObstacles();
  
  // Handle WASD hook movement
  handleHookMovement();
  
  drawHook();
  fishes.forEach(fish => fish.update());
  
  checkCatch();
  checkObstacleCollisions();
  
  if (fishes.length === 0) {
    endGame();
  }

  requestAnimationFrame(update);
}

function startTimer() {
  const timerSpan = document.getElementById('time');
  const countdown = setInterval(() => {
    if (gameOver) {
      clearInterval(countdown);
      return;
    }
    timeLeft--;
    timerSpan.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(countdown);
      endGame();
    }
  }, 1000);
}

function endGame() {
  gameOver = true;
  finalScoreText.textContent = `Your Score: ${score}`;
  endScreen.style.display = 'flex';
}

function startGame() {
  score = 0;
  timeLeft = 60;
  gameOver = false;
  cameraY = 0; // Reset camera position
  targetCameraY = 0; // Reset target camera position
  
  document.getElementById('score').textContent = score;
  document.getElementById('time').textContent = timeLeft;
  startScreen.style.display = 'none';
  endScreen.style.display = 'none';
  fishes = [];
  obstacles.length = 0;
  
  // Reset hook state
  hook.isMovingDown = false;
  hook.isMovingUp = false;
  hook.attachedFishes = [];
  hook.worldY = boat.y;
  
  spawnFish();
  spawnObstacles();
  update();
  startTimer();
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

// Modified key event listeners
window.addEventListener('keydown', e => {
  // Only process keypresses if game is in progress
  if (!gameOver) {
    switch(e.key.toLowerCase()) {
      case 'w':
        keys.w = true;
        break;
      case 'a':
        keys.a = true;
        break;
      case 's':
        keys.s = true;
        break;
      case 'd':
        keys.d = true;
        break;
    }
  }
});

// Add keyup event listener to track when keys are released
window.addEventListener('keyup', e => {
  switch(e.key.toLowerCase()) {
    case 'w':
      keys.w = false;
      break;
    case 'a':
      keys.a = false;
      break;
    case 's':
      keys.s = false;
      break;
    case 'd':
      keys.d = false;
      break;
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Reset water surface position on resize
  waterSurfaceY = canvas.height * 0.5;
});