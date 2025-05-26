// Deep Sea Fishing Adventure - JavaScript Part 1: Core Setup (FIXED)
// This works with your existing HTML and CSS files

// Canvas and context setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Menu elements
const mainMenu = document.getElementById('mainMenu');
const levelSelect = document.getElementById('levelSelect');
const customizationScreen = document.getElementById('customizationScreen');
const howToPlayScreen = document.getElementById('howToPlayScreen');
const endScreen = document.getElementById('endScreen');

// Menu buttons
const playButton = document.getElementById('playButton');
const howToPlayButton = document.getElementById('howToPlayButton');
const backToMainButton = document.getElementById('backToMainButton');
const backFromHowToPlayButton = document.getElementById('backFromHowToPlayButton');
const backToLevelsButton = document.getElementById('backToLevelsButton');
const startGameButton = document.getElementById('startGameButton');
const nextLevelButton = document.getElementById('nextLevelButton');
const replayLevelButton = document.getElementById('replayLevelButton');
const backToLevelsFromEndButton = document.getElementById('backToLevelsFromEndButton');

// Game state variables
let currentLevel = 1;
let selectedBoat = 'boat1';
let selectedHook = 'hook1';
let gameActive = false;
let gameOver = false;
let score = 0;
let timeLeft = 60;

// Level configurations
const levelConfigs = {
  1: {
    name: "Shallow Waters",
    timeLimit: 60,
    fishTypes: ['fish1.png', 'fish2.png'],
    obstacleCount: 3,
    worldHeight: 2000,
    scoreMultiplier: 1
  },
  2: {
    name: "Mid Ocean", 
    timeLimit: 60,
    fishTypes: ['fish3.png', 'fish4.png', 'fish5.png'],
    obstacleCount: 5,
    worldHeight: 2500,
    scoreMultiplier: 1.5
  },
  3: {
    name: "Deep Abyss",
    timeLimit: 60,
    fishTypes: ['fish5.png', 'fish6.png', 'fish7.png', 'fish8.png'],
    obstacleCount: 8,
    worldHeight: 3000,
    scoreMultiplier: 2
  }
};

// Game world settings - FIXED
let worldHeight = 2000;
let cameraY = 0;
let targetCameraY = 0;
const cameraSmoothing = 0.05;
let waterSurfaceY = canvas.height * 0.35;
let defaultWaterSurfaceY = canvas.height * 0.35;

// Audio setup
const sounds = {
  cast: new Audio('assets/cast.mp3'),
  catch: new Audio('assets/catch.mp3'),
  splash: new Audio('assets/splash.mp3'),
  reel: new Audio('assets/reel.mp3'),
  collision: new Audio('assets/splash.mp3'),
  coin: new Audio('assets/catch.mp3'),
  bgMusic: new Audio('assets/bgmusic.mp3')
};

// Set up background music
sounds.bgMusic.loop = true;
sounds.bgMusic.volume = 0.3;
sounds.splash.volume = 0.4;

// Initialize audio on first user interaction
window.addEventListener('load', () => {
  sounds.bgMusic.play().catch(() => {
    const resumeMusic = () => {
      sounds.bgMusic.play();
      document.removeEventListener('click', resumeMusic);
      document.removeEventListener('keydown', resumeMusic);
    };
    document.addEventListener('click', resumeMusic);
    document.addEventListener('keydown', resumeMusic);
  });
});

// Boat object - FIXED positioning
const boatElement = document.getElementById('boat');
const boat = { 
  x: canvas.width / 2, 
  y: waterSurfaceY - 80, // Position boat properly above water surface
  worldY: waterSurfaceY - 80, // World position above water
  defaultWorldY: waterSurfaceY - 80,
  moveSpeed: 10,
  maxDepth: 500,
  width: 120, // Add boat dimensions for proper rendering
  height: 80
};

// Hook object - FIXED initial positioning
const hook = { 
  x: boat.x, // Start hook at boat position
  y: boat.y + boat.height, // Start hook at bottom of boat
  worldY: boat.worldY + boat.height,
  originalY: boat.y + boat.height, 
  isMovingDown: false, 
  isMovingUp: false,
  stepDistance: 20,
  horizontalSpeed: 5,
  attachedFishes: [],
  maxFishes: 5,
  radius: 15,
  isAtBoat: true,
  fishBeingDelivered: false
};

// Keyboard state tracking
const keys = {
  w: false,
  a: false,
  s: false,
  d: false
};

// Game arrays
let fishes = [];
let obstacles = [];

// Load images
const hookImg = new Image();
hookImg.src = 'assets/hook.png';

const fishImages = [];
const obstacleImages = [];

// FIXED: Update boat element positioning function
function updateBoatElement() {
  if (boatElement) {
    // Calculate proper water surface position accounting for camera
    const currentWaterSurfaceY = defaultWaterSurfaceY;
    
    // Position boat element relative to screen, always on water surface
    const boatScreenY = currentWaterSurfaceY - 80 - cameraY;
    
    boatElement.style.left = (boat.x - boat.width/2) + 'px';
    boatElement.style.top = Math.max(boatScreenY, currentWaterSurfaceY - 80) + 'px';
    boatElement.style.display = gameActive ? 'block' : 'none';
    boatElement.style.zIndex = '10'; // Ensure boat appears above water
    
    // Update boat sprite based on selected boat
    const boatSprites = {
      'boat1': 'assets/boat1.png',
      'boat2': 'assets/boat2.png', 
      'boat3': 'assets/boat3.png'
    };
    
    if (boatSprites[selectedBoat]) {
      boatElement.src = boatSprites[selectedBoat];
    }
    
    // Set boat size for consistency
    boatElement.style.width = boat.width + 'px';
    boatElement.style.height = boat.height + 'px';
  }
}

// FIXED: Initialize game function
function startGame() {
  gameActive = true;
  gameOver = false;
  score = 0;
  
  // Load level configuration
  const config = levelConfigs[currentLevel];
  timeLeft = config.timeLimit;
  worldHeight = config.worldHeight;
  
  // Reset camera and positioning
  cameraY = 0;
  targetCameraY = 0;
  
  // IMPORTANT: Keep water surface consistent across all levels
  waterSurfaceY = canvas.height * 0.35;
  defaultWaterSurfaceY = canvas.height * 0.35;
  
  // Reset boat position - FIXED to be consistent across levels
  boat.x = canvas.width / 2;
  boat.y = defaultWaterSurfaceY - 80; // Always 80px above water surface
  boat.worldY = defaultWaterSurfaceY - 80;
  boat.defaultWorldY = defaultWaterSurfaceY - 80;
  
  // Reset hook position - FIXED  
  hook.x = boat.x;
  hook.y = boat.y + boat.height;
  hook.worldY = boat.worldY + boat.height;
  hook.originalY = boat.y + boat.height;
  hook.isAtBoat = true;
  hook.attachedFishes = [];
  
  // Clear and regenerate game entities
  fishes = [];
  obstacles = [];
  generateFishes();
  generateObstacles();
  
  // Force update boat element immediately
  setTimeout(() => {
    updateBoatElement();
  }, 100);
  
  // Start game loop
  gameLoop();
  
  // Start timer
  gameTimer();
}

// FIXED: Game timer function
function gameTimer() {
  if (!gameActive || gameOver) return;
  
  const timer = setInterval(() => {
    timeLeft--;
    updateUI();
    
    if (timeLeft <= 0) {
      clearInterval(timer);
      endGame();
    }
    
    if (!gameActive || gameOver) {
      clearInterval(timer);
    }
  }, 1000);
}

// FIXED: Update UI function
function updateUI() {
  // Update score and time display
  const scoreElement = document.querySelector('.score');
  const timeElement = document.querySelector('.time');
  const levelElement = document.querySelector('.level-display');
  
  if (scoreElement) scoreElement.textContent = `Score: ${score}`;
  if (timeElement) timeElement.textContent = `Time: ${timeLeft}s`;
  if (levelElement) levelElement.textContent = `Level: ${currentLevel}`;
}

// Placeholder functions for game entities
function generateFishes() {
  const config = levelConfigs[currentLevel];
  const fishCount = 20 + (currentLevel * 5);
  
  for (let i = 0; i < fishCount; i++) {
    fishes.push({
      x: Math.random() * canvas.width,
      y: waterSurfaceY + Math.random() * (worldHeight - waterSurfaceY),
      type: config.fishTypes[Math.floor(Math.random() * config.fishTypes.length)],
      width: 40,
      height: 30,
      speed: 1 + Math.random() * 2,
      direction: Math.random() > 0.5 ? 1 : -1,
      value: 10 + Math.floor(Math.random() * 20)
    });
  }
}

function generateObstacles() {
  const config = levelConfigs[currentLevel];
  
  for (let i = 0; i < config.obstacleCount; i++) {
    obstacles.push({
      x: Math.random() * canvas.width,
      y: waterSurfaceY + 200 + Math.random() * (worldHeight - waterSurfaceY - 400),
      width: 60,
      height: 60,
      type: 'rock'
    });
  }
}

// FIXED: Main game loop
function gameLoop() {
  if (!gameActive || gameOver) return;
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Update camera
  updateCamera();
  
  // Update game entities
  updateHook();
  updateFishes();
  
  // Render everything
  render();
  
  // Update boat element position
  updateBoatElement();
  
  // Continue loop
  requestAnimationFrame(gameLoop);
}

// FIXED: Camera update function
function updateCamera() {
  // Camera follows hook when it goes deep, but boat stays at surface
  if (!hook.isAtBoat && hook.worldY > defaultWaterSurfaceY + 200) {
    targetCameraY = hook.worldY - canvas.height * 0.6;
  } else {
    targetCameraY = 0;
  }
  
  // Smooth camera movement
  cameraY += (targetCameraY - cameraY) * cameraSmoothing;
  
  // Clamp camera to world bounds
  cameraY = Math.max(0, Math.min(cameraY, worldHeight - canvas.height));
  
  // Keep boat at surface regardless of camera position
  boat.worldY = defaultWaterSurfaceY - 80;
  boat.y = defaultWaterSurfaceY - 80;
}

// Placeholder update functions
function updateHook() {
  // Hook movement logic will be implemented in Part 2
}

function updateFishes() {
  // Fish movement and behavior logic will be implemented in Part 2
}

// FIXED: Render function
function render() {
  // Draw ocean background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87CEEB'); // Sky blue
  gradient.addColorStop(0.35, '#4682B4'); // Steel blue at water surface
  gradient.addColorStop(1, '#191970'); // Midnight blue at depth
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw water surface waves
  drawWaterSurface();
  
  // Draw game entities (will be expanded in Part 2)
  drawFishes();
  drawObstacles();
  drawHook();
}

function drawWaterSurface() {
  // Always draw water surface at the same relative position
  const surfaceScreenY = defaultWaterSurfaceY - cameraY;
  
  if (surfaceScreenY >= -50 && surfaceScreenY <= canvas.height + 50) {
    ctx.strokeStyle = '#4682B4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let x = 0; x <= canvas.width; x += 20) {
      const waveHeight = Math.sin((x + Date.now() * 0.002) * 0.02) * 5;
      if (x === 0) {
        ctx.moveTo(x, surfaceScreenY + waveHeight);
      } else {
        ctx.lineTo(x, surfaceScreenY + waveHeight);
      }
    }
    ctx.stroke();
    
    // Also draw a subtle water surface line for better visibility
    ctx.strokeStyle = '#6495ED';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, surfaceScreenY);
    ctx.lineTo(canvas.width, surfaceScreenY);
    ctx.stroke();
  }
}

// Placeholder render functions
function drawFishes() {
  // Fish rendering logic will be implemented in Part 2
}

function drawObstacles() {
  // Obstacle rendering logic will be implemented in Part 2
}

function drawHook() {
  if (!hook.isAtBoat) {
    const screenY = hook.worldY - cameraY;
    if (screenY >= -50 && screenY <= canvas.height + 50) {
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(hook.x - 2, Math.min(boat.y + boat.height, screenY) - 2, 4, Math.abs(screenY - (boat.y + boat.height)) + 4);
      
      ctx.fillStyle = '#C0C0C0';
      ctx.beginPath();
      ctx.arc(hook.x, screenY, hook.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// End game function
function endGame() {
  gameActive = false;
  gameOver = true;
  
  // Hide boat
  if (boatElement) {
    boatElement.style.display = 'none';
  }
  
  // Show end screen
  document.getElementById('finalScore').textContent = score;
  document.getElementById('levelCompleted').textContent = currentLevel;
  endScreen.style.display = 'flex';
}

// Menu event listeners
playButton.addEventListener('click', () => {
  mainMenu.style.display = 'none';
  levelSelect.style.display = 'flex';
});

howToPlayButton.addEventListener('click', () => {
  mainMenu.style.display = 'none';
  howToPlayScreen.style.display = 'flex';
});

backToMainButton.addEventListener('click', () => {
  levelSelect.style.display = 'none';
  mainMenu.style.display = 'flex';
});

backFromHowToPlayButton.addEventListener('click', () => {
  howToPlayScreen.style.display = 'none';
  mainMenu.style.display = 'flex';
});

// Level selection
document.querySelectorAll('.level-card').forEach(card => {
  card.addEventListener('click', () => {
    currentLevel = parseInt(card.dataset.level);
    document.getElementById('customizationTitle').textContent = 
      `Level ${currentLevel}: Customization`;
    levelSelect.style.display = 'none';
    customizationScreen.style.display = 'flex';
  });
});

// Customization selection
document.querySelectorAll('[data-boat]').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('[data-boat]').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedBoat = card.dataset.boat;
  });
});

document.querySelectorAll('[data-hook]').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('[data-hook]').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedHook = card.dataset.hook;
  });
});

backToLevelsButton.addEventListener('click', () => {
  customizationScreen.style.display = 'none';
  levelSelect.style.display = 'flex';
});

startGameButton.addEventListener('click', () => {
  customizationScreen.style.display = 'none';
  startGame();
});

// End screen button handlers
nextLevelButton.addEventListener('click', () => {
  if (currentLevel < 3) {
    currentLevel++;
    endScreen.style.display = 'none';
    customizationScreen.style.display = 'flex';
    document.getElementById('customizationTitle').textContent = 
      `Level ${currentLevel}: Customization`;
  }
});

replayLevelButton.addEventListener('click', () => {
  endScreen.style.display = 'none';
  startGame();
});

backToLevelsFromEndButton.addEventListener('click', () => {
  endScreen.style.display = 'none';
  levelSelect.style.display = 'flex';
});

// Keyboard event listeners
document.addEventListener('keydown', (e) => {
  if (!gameActive) return;
  
  switch(e.key.toLowerCase()) {
    case 'w': keys.w = true; break;
    case 'a': keys.a = true; break;
    case 's': keys.s = true; break;
    case 'd': keys.d = true; break;
  }
});

document.addEventListener('keyup', (e) => {
  switch(e.key.toLowerCase()) {
    case 'w': keys.w = false; break;
    case 'a': keys.a = false; break;
    case 's': keys.s = false; break;
    case 'd': keys.d = false; break;
  }
});

// Window resize handler - FIXED
window.addEventListener('resize', () => {
  const oldHeight = canvas.height;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Update water surface position proportionally
  defaultWaterSurfaceY = canvas.height * 0.35;
  waterSurfaceY = defaultWaterSurfaceY;
  
  // Update boat position on resize to maintain position relative to water
  if (gameActive) {
    boat.y = defaultWaterSurfaceY - 70;
    boat.worldY = defaultWaterSurfaceY - 70;
    boat.defaultWorldY = defaultWaterSurfaceY - 70;
    
    // Update hook position if at boat
    if (hook.isAtBoat) {
      hook.x = boat.x;
      hook.y = boat.y + boat.height;
      hook.worldY = boat.worldY + boat.height;
      hook.originalY = boat.y + boat.height;
    }
    
    // Force immediate boat element update
    setTimeout(() => {
      updateBoatElement();
    }, 50);
  }
});
// Deep Sea Fishing Adventure - JavaScript Part 2: Game Objects
// Add this after Part 1

// Fish class
class Fish {
  constructor(x, worldY, speed, image, direction, depth, value = 1) {
    this.x = x;
    this.worldY = worldY;
    this.speed = speed;
    
    // Determine size based on fish image
    const imageName = image.src.split('/').pop(); // Get filename from image src
    switch(imageName) {
      case 'fish1.png':
        this.size = 50; // Small shallow water fish
        break;
      case 'fish2.png':
        this.size = 55; // Small shallow water fish
        break;
      case 'fish3.png':
        this.size = 65; // Medium mid-ocean fish
        break;
      case 'fish4.png':
        this.size = 70; // Medium mid-ocean fish
        break;
      case 'fish5.png':
        this.size = 80; // Large deep sea fish
        break;
      case 'fish6.png':
        this.size = 85; // Large deep sea fish
        break;
      case 'fish7.png':
        this.size = 90; // Very large deep sea fish
        break;
      case 'fish8.png':
        this.size = 150; // Largest deep sea fish
        break;
      default:
        this.size = 60; // Default size for any other fish
        break;
    }
    
    this.image = image;
    this.caught = false;
    this.direction = direction;
    this.depth = depth;
    this.value = value; // Points this fish is worth
    this.deliveredToBoat = false;
  }
  
  draw() {
    const screenY = this.worldY - cameraY;
    
    if (screenY > -this.size && screenY < canvas.height + this.size) {
      ctx.save();
      if (this.direction === 'left' && !this.caught) {
        ctx.translate(this.x + this.size, screenY);
        ctx.scale(-1, 1);
        ctx.drawImage(this.image, 0, 0, this.size, this.size);
      } else {
        ctx.drawImage(this.image, this.x, screenY, this.size, this.size);
      }
      ctx.restore();
    }
  }
  
  update() {
    if (!this.caught) {
      this.x += this.speed;
      if (this.direction === 'left' && this.x < -this.size) this.x = canvas.width;
      else if (this.direction === 'right' && this.x > canvas.width) this.x = -this.size;
    } else {
      const index = hook.attachedFishes.indexOf(this);
      const targetX = hook.x - this.size / 2 + index * 35;
      const targetY = hook.worldY - 50 - index * 40;
      
      this.x += (targetX - this.x) * 0.2;
      this.worldY += (targetY - this.worldY) * 0.2;
    }
    this.draw();
  }
}

// Initialize images based on current level
function loadLevelAssets() {
  const config = levelConfigs[currentLevel];
  
  // Clear existing images
  fishImages.length = 0;
  obstacleImages.length = 0;
  
  // Load fish images for current level
  config.fishTypes.forEach(fishName => {
    const img = new Image();
    img.src = `assets/${fishName}`;
    fishImages.push(img);
  });
  
  // Load obstacle images
  const obstacleTypes = ['seahorse.png', 'jellyfish.png', 'starfish.png', 'shell.png'];
  obstacleTypes.forEach(obstName => {
    const img = new Image();
    img.src = `assets/${obstName}`;
    obstacleImages.push(img);
  });
  
  // Update hook image based on selection
  hookImg.src = `assets/${selectedHook}.png`;
  
  // Update boat image based on selection
  boatElement.src = `assets/${selectedBoat}.png`;
}

// Spawn fish based on current level
function spawnFish() {
  fishes = [];
  const config = levelConfigs[currentLevel];
  worldHeight = config.worldHeight;
  
  // Define depth zones based on level
  let depthZones;
  if (currentLevel === 1) {
    depthZones = [
      { minDepth: 400, maxDepth: 800, fishCount: 8, fishValue: 1 },
      { minDepth: 800, maxDepth: 1200, fishCount: 12, fishValue: 2 },
      { minDepth: 1200, maxDepth: 1800, fishCount: 10, fishValue: 3 }
    ];
  } else if (currentLevel === 2) {
    depthZones = [
      { minDepth: 500, maxDepth: 1000, fishCount: 6, fishValue: 2 },
      { minDepth: 1000, maxDepth: 1500, fishCount: 10, fishValue: 3 },
      { minDepth: 1500, maxDepth: 2200, fishCount: 12, fishValue: 4 }
    ];
  } else { // Level 3
    depthZones = [
      { minDepth: 600, maxDepth: 1200, fishCount: 5, fishValue: 3 },
      { minDepth: 1200, maxDepth: 2000, fishCount: 8, fishValue: 5 },
      { minDepth: 2000, maxDepth: 2800, fishCount: 10, fishValue: 8 }
    ];
  }
  
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
      fishes.push(new Fish(x, worldY, speed, img, direction, zone.minDepth, zone.fishValue));
    }
  });
}

// Spawn obstacles based on current level
function spawnObstacles() {
  obstacles.length = 0;
  const config = levelConfigs[currentLevel];
  
  // Spawn obstacles throughout the water depth
  for (let depth = 500; depth < worldHeight - 500; depth += 200) {
    const count = Math.floor(config.obstacleCount / 4) + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const image = obstacleImages[Math.floor(Math.random() * obstacleImages.length)];
      const x = Math.random() * (canvas.width - 80);
      const worldY = depth + Math.random() * 150;
      const size = 60 + Math.random() * 40;
      obstacles.push({ 
        image, 
        x, 
        worldY, 
        size,
        radius: size / 2
      });
    }
  }
}

// Draw obstacles
function drawObstacles() {
  obstacles.forEach(obstacle => {
    const screenY = obstacle.worldY - cameraY;
    if (screenY > -obstacle.size && screenY < canvas.height + obstacle.size) {
      ctx.drawImage(obstacle.image, obstacle.x, screenY, obstacle.size, obstacle.size);
    }
  });
}

// Check obstacle collisions
function checkObstacleCollisions() {
  if (hook.attachedFishes.length === 0) return;

  for (const obstacle of obstacles) {
    const dx = hook.x - (obstacle.x + obstacle.size/2);
    const dy = hook.worldY - obstacle.worldY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < hook.radius + obstacle.radius) {
      sounds.collision.currentTime = 0;
      sounds.collision.play();
      
      hook.attachedFishes.forEach(fish => {
        fish.caught = false;
        fish.x += (Math.random() - 0.5) * 100;
        fish.worldY = obstacle.worldY + obstacle.radius + fish.size/2 + Math.random() * 50;
      });
      
      hook.attachedFishes = [];
      hook.fishBeingDelivered = false;
      break;
    }
  }
}

// Check fish catches
function checkCatch() {
  fishes.forEach(fish => {
    if (!fish.caught && hook.attachedFishes.length < hook.maxFishes) {
      const dx = hook.x - (fish.x + fish.size / 2);
      const dy = hook.worldY - fish.worldY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < fish.size / 2 + 10) {
        fish.caught = true;
        hook.attachedFishes.push(fish);
        sounds.catch.currentTime = 0;
        sounds.catch.play();
        sounds.splash.currentTime = 0;
        sounds.splash.play();
      }
    }
  });
}
// Deep Sea Fishing Adventure - JavaScript Part 3: Rendering & Camera
// Add this after Part 2

// Draw animated waves
function drawWaves() {
  const waveY = defaultWaterSurfaceY - cameraY * 0.25;
  waterSurfaceY = waveY;
  
  ctx.fillStyle = '#0a2e59';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, waveY);
  
  const time = Date.now() / 200;
  for (let x = 0; x <= canvas.width; x += 10) {
    const y = waveY + 
              Math.sin((x * 0.02) + time * 0.1) * 15 + 
              Math.sin((x * 0.01) + time * 0.2) * 8;
    ctx.lineTo(x, y);
  }
  
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();
  
  // Wave highlights
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += 10) {
    const y = waveY + 
              Math.sin((x * 0.02) + time * 0.1) * 15 + 
              Math.sin((x * 0.01) + time * 0.2) * 8;
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

// Update boat position function
function updateBoatPosition() {
  const hookDepthBelowBoat = Math.max(0, hook.worldY - boat.defaultWorldY);
  
  let targetBoatWorldY = boat.defaultWorldY;
  
  if (hookDepthBelowBoat > 0) {
    const boatDepthMovement = Math.min(boat.maxDepth, hookDepthBelowBoat * 0.25);
    targetBoatWorldY = boat.defaultWorldY + boatDepthMovement;
  }
  
  boat.worldY += (targetBoatWorldY - boat.worldY) * 0.04;
  boat.y = boat.worldY - cameraY;
  
  // Move boat vertically up by increasing the offset
  boatElement.style.top = (boat.y - 350) + 'px'; // Changed from -300 to -450
  
  const rect = boatElement.getBoundingClientRect();
  boat.x = rect.left + rect.width / 2;
  
  // Deliver fish when hook reaches boat
  if (hook.worldY <= boat.worldY + 15 && hook.attachedFishes.length > 0) {
    let totalValue = 0;
    hook.attachedFishes.forEach(fish => {
      totalValue += fish.value * levelConfigs[currentLevel].scoreMultiplier;
    });
    
    score += Math.floor(totalValue);
    document.getElementById('score').textContent = score;
    
    sounds.coin.currentTime = 0;
    sounds.coin.play();
    
    hook.attachedFishes.forEach(f => {
      fishes = fishes.filter(ff => ff !== f);
    });
    
    hook.attachedFishes = [];
    hook.fishBeingDelivered = false;
  }
  
  // Reset hook position at boat
  if (hook.worldY <= boat.worldY) {
    hook.x = boat.x - 270;
    hook.y = boat.y + 20;
    hook.worldY = boat.worldY + 15;
    hook.originalY = hook.y;
    hook.isMovingDown = false;
    hook.isMovingUp = false;
    hook.isAtBoat = true;
    hook.fishBeingDelivered = false;
  }
}
// Draw fishing hook and line
function drawHook() {
  hook.y = hook.worldY - cameraY;
  
  const lineStartY = boat.y + 15;
  
  // Draw fishing line
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.moveTo(hook.x, lineStartY);
  
  const lineLength = hook.y - lineStartY;
  const controlX = hook.x + Math.sin(Date.now() / 2000) * 20;
  const controlY = lineStartY + lineLength * 0.5;
  
  if (lineLength > 100) {
    ctx.quadraticCurveTo(controlX, controlY, hook.x, hook.y);
  } else {
    ctx.lineTo(hook.x, hook.y);
  }
  ctx.stroke();
  
  // Draw hook
  ctx.drawImage(hookImg, hook.x - 15, hook.y, 30, 50);
}

// Camera system
function updateCamera() {
  const isInDeepWater = hook.worldY > defaultWaterSurfaceY;
  
  if (!isInDeepWater) {
    targetCameraY = 0;
  } else {
    const hookScreenY = hook.worldY - cameraY;
    const viewportCenter = canvas.height * 0.5;
    
    if (Math.abs(hookScreenY - viewportCenter) > 100) {
      if (hook.isMovingDown) {
        targetCameraY = hook.worldY - viewportCenter * 0.7;
      } else if (hook.isMovingUp) {
        targetCameraY = hook.worldY - viewportCenter * 1.2;
      } else {
        targetCameraY = hook.worldY - viewportCenter;
      }
    }
    
    targetCameraY = Math.max(0, targetCameraY);
    targetCameraY = Math.min(worldHeight - canvas.height, targetCameraY);
  }
  
  const smoothingUp = 0.08;
  const smoothingDown = 0.05;
  
  const cameraDelta = targetCameraY - cameraY;
  const currentSmoothing = cameraDelta < 0 ? smoothingUp : smoothingDown;
  
  cameraY += cameraDelta * currentSmoothing;
}

// Draw background with depth effects
function drawBackground() {
  const dynamicWaterSurfaceY = waterSurfaceY;
  
  // Sky
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, canvas.width, dynamicWaterSurfaceY);
  
  // Water base
  ctx.fillStyle = '#0077be';
  ctx.fillRect(0, dynamicWaterSurfaceY, canvas.width, canvas.height - dynamicWaterSurfaceY);
  
  // Depth gradient based on level
  const depthRatio = Math.min(1, cameraY / (worldHeight * 0.7));
  
  const gradient = ctx.createLinearGradient(0, dynamicWaterSurfaceY, 0, canvas.height);
  
  // Different colors for each level
  if (currentLevel === 1) {
    gradient.addColorStop(0, 'rgba(0, 119, 190, 1)');
    gradient.addColorStop(0.4, `rgba(0, ${80 - depthRatio * 30}, ${150 - depthRatio * 50}, 1)`);
    gradient.addColorStop(1, `rgba(0, ${40 - depthRatio * 20}, ${100 - depthRatio * 40}, 1)`);
  } else if (currentLevel === 2) {
    gradient.addColorStop(0, 'rgba(0, 100, 160, 1)');
    gradient.addColorStop(0.4, `rgba(0, ${60 - depthRatio * 40}, ${120 - depthRatio * 60}, 1)`);
    gradient.addColorStop(1, `rgba(0, ${20 - depthRatio * 15}, ${60 - depthRatio * 40}, 1)`);
  } else {
    gradient.addColorStop(0, 'rgba(0, 80, 130, 1)');
    gradient.addColorStop(0.4, `rgba(0, ${40 - depthRatio * 30}, ${90 - depthRatio * 70}, 1)`);
    gradient.addColorStop(1, `rgba(0, ${10 - depthRatio * 8}, ${30 - depthRatio * 25}, 1)`);
  }
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, dynamicWaterSurfaceY, canvas.width, canvas.height - dynamicWaterSurfaceY);
  
  // Ambient particles for deeper levels
  if (depthRatio > 0.1 && currentLevel > 1) {
    const particleCount = Math.floor(20 * depthRatio * currentLevel);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    
    for (let i = 0; i < particleCount; i++) {
      const size = 1 + Math.random() * (currentLevel);
      const x = Math.random() * canvas.width;
      const y = dynamicWaterSurfaceY + Math.random() * (canvas.height - dynamicWaterSurfaceY);
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Depth markers
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '16px Arial';
  
  const depthInterval = currentLevel === 1 ? 300 : currentLevel === 2 ? 400 : 500;
  for (let depth = depthInterval; depth < worldHeight; depth += depthInterval) {
    const y = depth - cameraY;
    if (y > dynamicWaterSurfaceY && y < canvas.height) {
      ctx.fillText(`${Math.floor(depth/100)}m`, canvas.width - 70, y);
      
      ctx.beginPath();
      ctx.setLineDash([5, 10]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  
  // Sea floor
  const seaFloorY = worldHeight - cameraY;
  if (seaFloorY < canvas.height + 50) {
    ctx.fillStyle = currentLevel === 3 ? '#2d1810' : '#8b4513';
    ctx.fillRect(0, seaFloorY - 30, canvas.width, 80);
    
    // Floor details
    ctx.fillStyle = currentLevel === 3 ? '#1a0f08' : '#654321';
    for (let x = 0; x < canvas.width; x += 120) {
      const rockHeight = 20 + Math.random() * 25;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.random() * 100, 
        seaFloorY - rockHeight/2, 
        30 + Math.random() * 20, 
        rockHeight/2,  
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }
}
// Deep Sea Fishing Adventure - JavaScript Part 4: Controls & Game Loop
// Add this after Part 3

// Handle hook movement with WASD keys
function handleHookMovement() {
  const boatWorldY = boat.worldY;
  
  if (hook.worldY > boatWorldY) {
    hook.isAtBoat = false;
  }
  
  // Horizontal movement (A/D keys)
  if (keys.a && hook.worldY > boatWorldY) {
    hook.x -= hook.horizontalSpeed;
    if (hook.x < 20) {
      hook.x = 20;
    }
  }
  
  if (keys.d && hook.worldY > boatWorldY) {
    hook.x += hook.horizontalSpeed;
    if (hook.x > canvas.width - 20) {
      hook.x = canvas.width - 20;
    }
  }
  
  // Move down (S key)
  if (keys.s && !hook.isMovingUp && hook.worldY < worldHeight - 50 && 
      hook.attachedFishes.length < hook.maxFishes) {
    hook.worldY += hook.stepDistance;
    if (!hook.isMovingDown) {
      sounds.cast.currentTime = 0;
      sounds.cast.play();
      hook.isMovingDown = true;
    }
    
    if (hook.worldY > worldHeight - 50) {
      hook.worldY = worldHeight - 50;
    }
  } else {
    hook.isMovingDown = false;
  }
  
  // Move up (W key)
  if (keys.w && !hook.isMovingDown && hook.worldY > boatWorldY) {
    hook.worldY -= hook.stepDistance;
    if (!hook.isMovingUp) {
      sounds.reel.currentTime = 0;
      sounds.reel.play();
      hook.isMovingUp = true;
    }
    
    if (hook.worldY <= boatWorldY) {
      hook.worldY = boatWorldY;
      hook.isMovingUp = false;
    }
  } else {
    hook.isMovingUp = false;
  }
  
  // Auto-reel when max fish caught
  if (hook.attachedFishes.length >= hook.maxFishes && !hook.isMovingUp) {
    hook.isMovingUp = true;
    sounds.reel.currentTime = 0;
    sounds.reel.play();
  }
}

// Main game update loop
function update() {
  if (!gameActive || gameOver) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateCamera();
  drawBackground();
  drawWaves();
  updateBoatPosition();
  drawObstacles();
  handleHookMovement();
  drawHook();
  
  // Update all fish
  fishes.forEach(fish => fish.update());
  
  checkCatch();
  checkObstacleCollisions();
  
  // Check win condition (all fish caught)
  if (fishes.length === 0) {
    endGame(true);
  }

  requestAnimationFrame(update);
}

// Timer system
function startTimer() {
  const timerSpan = document.getElementById('time');
  const countdown = setInterval(() => {
    if (!gameActive || gameOver) {
      clearInterval(countdown);
      return;
    }
    timeLeft--;
    timerSpan.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(countdown);
      endGame(false);
    }
  }, 1000);
}

// End game function
function endGame(levelComplete = false) {
  gameActive = false;
  gameOver = true;
  
  document.getElementById('finalScore').textContent = `Your Score: ${score}`;
  document.getElementById('levelCompleted').textContent = 
    levelComplete ? `Level ${currentLevel} Completed!` : `Time's Up!`;
  
  // Show appropriate buttons
  const nextButton = document.getElementById('nextLevelButton');
  if (levelComplete && currentLevel < 3) {
    nextButton.style.display = 'inline-block';
  } else {
    nextButton.style.display = 'none';
  }
  
  endScreen.style.display = 'flex';
}

// Start game function
function startGame() {
  // Reset game state
  score = 0;
  timeLeft = levelConfigs[currentLevel].timeLimit;
  gameActive = true;
  gameOver = false;
  cameraY = 0;
  targetCameraY = 0;
  waterSurfaceY = defaultWaterSurfaceY;
  
  // Reset boat position
  boat.worldY = boat.defaultWorldY;
  boatElement.style.top = (boat.y - 300) + 'px';
  
  // Update UI
  document.getElementById('score').textContent = score;
  document.getElementById('time').textContent = timeLeft;
  document.getElementById('current-level').textContent = currentLevel;
  
  // Reset hook state
  hook.isMovingDown = false;
  hook.isMovingUp = false;
  hook.attachedFishes = [];
  hook.worldY = boat.worldY;
  hook.isAtBoat = true;
  hook.fishBeingDelivered = false;
  
  // Load level assets and spawn entities
  loadLevelAssets();
  
  // Wait a bit for images to load
 // In your startGame function, replace the setTimeout section with:
setTimeout(() => {
    spawnFishWithPreloader(); // Instead of spawnFish()
    spawnObstacles();
    update();
    startTimer();
}, 100);
}

// End screen button handlers
nextLevelButton.addEventListener('click', () => {
  if (currentLevel < 3) {
    currentLevel++;
    endScreen.style.display = 'none';
    document.getElementById('customizationTitle').textContent = 
      `Level ${currentLevel}: Customization`;
    customizationScreen.style.display = 'flex';
  }
});

replayLevelButton.addEventListener('click', () => {
  endScreen.style.display = 'none';
  startGame();
});

backToLevelsFromEndButton.addEventListener('click', () => {
  endScreen.style.display = 'none';
  levelSelect.style.display = 'flex';
});

// Keyboard event listeners
window.addEventListener('keydown', e => {
  if (!gameActive || gameOver) return;
  
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
});

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

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
  // Show main menu on load
  mainMenu.style.display = 'flex';
});
// Level-based color management functions - CANVAS RENDERING VERSION
// Add these functions to your existing JavaScript code

// Level-specific color schemes for canvas rendering
const levelColorSchemes = {
    1: {
        skyColor: '#87ceeb',
        waterSurface: '#4682b4',
        waterDeep: '#191970',
        waterBase: '#0077be',
        gradientStops: [
            { stop: 0, color: 'rgba(0, 119, 190, 1)' },
            { stop: 0.4, color: 'rgba(0, 80, 150, 1)' },
            { stop: 1, color: 'rgba(0, 40, 100, 1)' }
        ]
    },
    2: {
        skyColor: '#6495ed',
        waterSurface: '#4169e1',
        waterDeep: '#0000cd',
        waterBase: '#0066cc',
        gradientStops: [
            { stop: 0, color: 'rgba(0, 102, 204, 1)' },
            { stop: 0.4, color: 'rgba(0, 60, 180, 1)' },
            { stop: 1, color: 'rgba(0, 20, 120, 1)' }
        ]
    },
    3: {
        skyColor: '#483d8b',
        waterSurface: '#2e2b5f',
        waterDeep: '#1a1a2e',
        waterBase: '#2d1b69',
        gradientStops: [
            { stop: 0, color: 'rgba(45, 27, 105, 1)' },
            { stop: 0.4, color: 'rgba(30, 20, 80, 1)' },
            { stop: 1, color: 'rgba(15, 10, 50, 1)' }
        ]
    }
};

// Function to get current level colors
function getCurrentLevelColors() {
    return levelColorSchemes[currentLevel] || levelColorSchemes[1];
}

// REPLACE your existing drawBackground() function with this version:
function drawBackground() {
    const dynamicWaterSurfaceY = waterSurfaceY;
    const colors = getCurrentLevelColors();
    
    // Sky with level-specific color
    ctx.fillStyle = colors.skyColor;
    ctx.fillRect(0, 0, canvas.width, dynamicWaterSurfaceY);
    
    // Water base with level-specific color
    ctx.fillStyle = colors.waterBase;
    ctx.fillRect(0, dynamicWaterSurfaceY, canvas.width, canvas.height - dynamicWaterSurfaceY);
    
    // Depth gradient based on level
    const depthRatio = Math.min(1, cameraY / (worldHeight * 0.7));
    
    const gradient = ctx.createLinearGradient(0, dynamicWaterSurfaceY, 0, canvas.height);
    
    // Use level-specific gradient colors
    const levelGradient = colors.gradientStops;
    levelGradient.forEach(stop => {
        // Adjust color intensity based on depth
        const rgba = stop.color.replace('rgba(', '').replace(')', '').split(',');
        const r = Math.max(0, parseInt(rgba[0]) - depthRatio * 30);
        const g = Math.max(0, parseInt(rgba[1]) - depthRatio * 40);
        const b = Math.max(0, parseInt(rgba[2]) - depthRatio * 60);
        gradient.addColorStop(stop.stop, `rgba(${r}, ${g}, ${b}, 1)`);
    });
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, dynamicWaterSurfaceY, canvas.width, canvas.height - dynamicWaterSurfaceY);
    
    // Ambient particles for deeper levels (unchanged)
    if (depthRatio > 0.1 && currentLevel > 1) {
        const particleCount = Math.floor(20 * depthRatio * currentLevel);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        
        for (let i = 0; i < particleCount; i++) {
            const size = 1 + Math.random() * (currentLevel);
            const x = Math.random() * canvas.width;
            const y = dynamicWaterSurfaceY + Math.random() * (canvas.height - dynamicWaterSurfaceY);
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Depth markers (unchanged)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Arial';
    
    const depthInterval = currentLevel === 1 ? 300 : currentLevel === 2 ? 400 : 500;
    for (let depth = depthInterval; depth < worldHeight; depth += depthInterval) {
        const y = depth - cameraY;
        if (y > dynamicWaterSurfaceY && y < canvas.height) {
            ctx.fillText(`${Math.floor(depth/100)}m`, canvas.width - 70, y);
            
            ctx.beginPath();
            ctx.setLineDash([5, 10]);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // Sea floor with level-specific colors
    const seaFloorY = worldHeight - cameraY;
    if (seaFloorY < canvas.height + 50) {
        ctx.fillStyle = currentLevel === 3 ? '#2d1810' : currentLevel === 2 ? '#654321' : '#8b4513';
        ctx.fillRect(0, seaFloorY - 30, canvas.width, 80);
        
        // Floor details
        ctx.fillStyle = currentLevel === 3 ? '#1a0f08' : currentLevel === 2 ? '#4a3218' : '#654321';
        for (let x = 0; x < canvas.width; x += 120) {
            const rockHeight = 20 + Math.random() * 25;
            ctx.beginPath();
            ctx.ellipse(
                x + Math.random() * 100, 
                seaFloorY - rockHeight/2, 
                30 + Math.random() * 20, 
                rockHeight/2, 
                0, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }
}

// REPLACE your existing drawWaves() function with this version:
function drawWaves() {
    const waveY = defaultWaterSurfaceY - cameraY * 0.25;
    waterSurfaceY = waveY;
    const colors = getCurrentLevelColors();
    
    // Use level-specific water color
    ctx.fillStyle = colors.waterSurface;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(0, waveY);
    
    const time = Date.now() / 200;
    for (let x = 0; x <= canvas.width; x += 10) {
        const y = waveY + 
                  Math.sin((x * 0.02) + time * 0.1) * 15 + 
                  Math.sin((x * 0.01) + time * 0.2) * 8;
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    // Wave highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 10) {
        const y = waveY + 
                  Math.sin((x * 0.02) + time * 0.1) * 15 + 
                  Math.sin((x * 0.01) + time * 0.2) * 8;
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

// Simple function to apply CSS body colors for menus (optional)
function applyMenuLevelColors(levelNumber) {
    document.body.classList.remove('level-1', 'level-2', 'level-3');
    document.body.classList.add(`level-${levelNumber}`);
}

// Add this to your level selection event listeners:
// (This is optional - only for menu background colors)
/*
document.querySelectorAll('.level-card').forEach(card => {
    card.addEventListener('click', () => {
        currentLevel = parseInt(card.dataset.level);
        applyMenuLevelColors(currentLevel); // Optional: for menu background
        
        document.getElementById('customizationTitle').textContent = 
            `Level ${currentLevel}: Customization`;
        levelSelect.style.display = 'none';
        customizationScreen.style.display = 'flex';
    });
});
*/
// Image Preloader Fix - Add this code to your existing JavaScript
// This ensures all images are loaded before the game starts

// Image preloader system
class ImagePreloader {
    constructor() {
        this.loadedImages = new Map();
        this.loadingPromises = new Map();
        this.totalImages = 0;
        this.loadedCount = 0;
        this.onProgress = null;
        this.onComplete = null;
    }

    // Load a single image and return a promise
    loadImage(src, key = null) {
        if (!key) key = src;
        
        // Return cached image if already loaded
        if (this.loadedImages.has(key)) {
            return Promise.resolve(this.loadedImages.get(key));
        }

        // Return existing promise if already loading
        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.loadedImages.set(key, img);
                this.loadedCount++;
                
                if (this.onProgress) {
                    this.onProgress(this.loadedCount, this.totalImages);
                }
                
                resolve(img);
            };
            
            img.onerror = () => {
                console.warn(`Failed to load image: ${src}`);
                // Create a placeholder colored rectangle instead of failing
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, 100, 100);
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.fillText('Missing', 25, 50);
                
                const placeholderImg = new Image();
                placeholderImg.src = canvas.toDataURL();
                this.loadedImages.set(key, placeholderImg);
                this.loadedCount++;
                
                if (this.onProgress) {
                    this.onProgress(this.loadedCount, this.totalImages);
                }
                
                resolve(placeholderImg);
            };
            
            img.src = src;
        });

        this.loadingPromises.set(key, promise);
        this.totalImages++;
        return promise;
    }

    // Load multiple images
    loadImages(imageList) {
        const promises = imageList.map(item => {
            if (typeof item === 'string') {
                return this.loadImage(item);
            } else {
                return this.loadImage(item.src, item.key);
            }
        });

        return Promise.all(promises);
    }

    // Get a loaded image
    getImage(key) {
        return this.loadedImages.get(key);
    }

    // Check if an image is loaded
    isLoaded(key) {
        return this.loadedImages.has(key);
    }
}

// Create global image preloader instance
const imagePreloader = new ImagePreloader();

// Define all game images that need to be preloaded
const gameImages = {
    // Boats
    boats: [
        { src: 'assets/boat1.png', key: 'boat1' },
        { src: 'assets/boat2.png', key: 'boat2' },
        { src: 'assets/boat3.png', key: 'boat3' }
    ],
    // Hooks
    hooks: [
        { src: 'assets/hook1.png', key: 'hook1' },
        { src: 'assets/hook2.png', key: 'hook2' },
        { src: 'assets/hook3.png', key: 'hook3' }
    ],
    // Fish
    fish: [
        { src: 'assets/fish1.png', key: 'fish1' },
        { src: 'assets/fish2.png', key: 'fish2' },
        { src: 'assets/fish3.png', key: 'fish3' },
        { src: 'assets/fish4.png', key: 'fish4' },
        { src: 'assets/fish5.png', key: 'fish5' },
        { src: 'assets/fish6.png', key: 'fish6' },
        { src: 'assets/fish7.png', key: 'fish7' },
        { src: 'assets/fish8.png', key: 'fish8' }
    ],
    // Obstacles
    obstacles: [
        { src: 'assets/seahorse.png', key: 'seahorse' },
        { src: 'assets/jellyfish.png', key: 'jellyfish' },
        { src: 'assets/starfish.png', key: 'starfish' },
        { src: 'assets/shell.png', key: 'shell' }
    ]
};

// Loading screen functions
function showLoadingScreen() {
    // Create loading overlay if it doesn't exist
    let loadingOverlay = document.getElementById('loadingOverlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 50, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        loadingOverlay.innerHTML = `
            <div style="text-align: center;">
                <h2 style="margin-bottom: 20px;">Loading Game Assets...</h2>
                <div id="loadingBar" style="
                    width: 300px;
                    height: 20px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: 10px;
                ">
                    <div id="loadingProgress" style="
                        width: 0%;
                        height: 100%;
                        background: linear-gradient(90deg, #4CAF50, #2196F3);
                        transition: width 0.3s ease;
                        border-radius: 10px;
                    "></div>
                </div>
                <div id="loadingText">0%</div>
            </div>
        `;
        
        document.body.appendChild(loadingOverlay);
    }
    
    loadingOverlay.style.display = 'flex';
}

function updateLoadingProgress(loaded, total) {
    const percentage = Math.round((loaded / total) * 100);
    const progressBar = document.getElementById('loadingProgress');
    const progressText = document.getElementById('loadingText');
    
    if (progressBar) {
        progressBar.style.width = percentage + '%';
    }
    
    if (progressText) {
        progressText.textContent = `${percentage}% (${loaded}/${total})`;
    }
}

function hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Enhanced loadLevelAssets function replacement
function loadLevelAssetsWithPreloader() {
    return new Promise((resolve, reject) => {
        const config = levelConfigs[currentLevel];
        const imagesToLoad = [];
        
        // Add current level fish images
        config.fishTypes.forEach(fishName => {
            const key = fishName.replace('.png', '');
            imagesToLoad.push({ src: `assets/${fishName}`, key: key });
        });
        
        // Add obstacle images
        gameImages.obstacles.forEach(obs => {
            imagesToLoad.push(obs);
        });
        
        // Add selected boat and hook
        imagesToLoad.push({ src: `assets/${selectedBoat}.png`, key: selectedBoat });
        imagesToLoad.push({ src: `assets/${selectedHook}.png`, key: selectedHook });
        
        // Reset preloader counters
        imagePreloader.totalImages = 0;
        imagePreloader.loadedCount = 0;
        
        // Load all images
        imagePreloader.loadImages(imagesToLoad)
            .then(() => {
                // Update your existing image arrays with preloaded images
                fishImages.length = 0;
                obstacleImages.length = 0;
                
                config.fishTypes.forEach(fishName => {
                    const key = fishName.replace('.png', '');
                    const img = imagePreloader.getImage(key);
                    if (img) fishImages.push(img);
                });
                
                gameImages.obstacles.forEach(obs => {
                    const img = imagePreloader.getImage(obs.key);
                    if (img) obstacleImages.push(img);
                });
                
                // Update hook and boat images
                const hookImage = imagePreloader.getImage(selectedHook);
                if (hookImage) {
                    hookImg.src = hookImage.src;
                    hookImg.onload = null; // Remove any existing onload handlers
                }
                
                const boatImage = imagePreloader.getImage(selectedBoat);
                if (boatImage && boatElement) {
                    boatElement.src = boatImage.src;
                    boatElement.onload = null; // Remove any existing onload handlers
                }
                
                resolve();
            })
            .catch(reject);
    });
}

// Preload all images at game startup
function preloadAllGameImages() {
    return new Promise((resolve, reject) => {
        showLoadingScreen();
        
        // Set up progress callback
        imagePreloader.onProgress = updateLoadingProgress;
        
        // Collect all images to preload
        const allImages = [
            ...gameImages.boats,
            ...gameImages.hooks,
            ...gameImages.fish,
            ...gameImages.obstacles
        ];
        
        // Reset counters
        imagePreloader.totalImages = 0;
        imagePreloader.loadedCount = 0;
        
        imagePreloader.loadImages(allImages)
            .then(() => {
                hideLoadingScreen();
                resolve();
            })
            .catch(error => {
                console.error('Failed to preload images:', error);
                hideLoadingScreen();
                resolve(); // Continue anyway with placeholders
            });
    });
}

// Enhanced startGame function wrapper
function startGameWithPreloader() {
    showLoadingScreen();
    
    // Set up progress tracking for level-specific loading
    imagePreloader.onProgress = (loaded, total) => {
        updateLoadingProgress(loaded, total);
    };
    
    loadLevelAssetsWithPreloader()
        .then(() => {
            hideLoadingScreen();
            
            // Call your original startGame function
            startGame();
        })
        .catch(error => {
            console.error('Failed to load level assets:', error);
            hideLoadingScreen();
            alert('Some images failed to load. The game may not display correctly.');
            startGame(); // Start anyway
        });
}

// Replace the startGameButton event listener
if (startGameButton) {
    // Remove existing event listener and add new one
    const newStartGameButton = startGameButton.cloneNode(true);
    startGameButton.parentNode.replaceChild(newStartGameButton, startGameButton);
    
    newStartGameButton.addEventListener('click', () => {
        customizationScreen.style.display = 'none';
        startGameWithPreloader();
    });
}

// Initialize preloader when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Preload all images at startup
    preloadAllGameImages().then(() => {
        console.log('All game images preloaded successfully!');
    });
});

// Enhanced Fish class creation with preloaded images
function createFishWithPreloadedImage(x, worldY, speed, imageSrc, direction, depth, value = 1) {
    const imageKey = imageSrc.replace('assets/', '').replace('.png', '');
    const preloadedImage = imagePreloader.getImage(imageKey);
    
    if (preloadedImage) {
        return new Fish(x, worldY, speed, preloadedImage, direction, depth, value);
    } else {
        // Fallback: create image normally but it might not be loaded
        const img = new Image();
        img.src = imageSrc;
        return new Fish(x, worldY, speed, img, direction, depth, value);
    }
}

// Enhanced spawnFish function that uses preloaded images
function spawnFishWithPreloader() {
    fishes = [];
    const config = levelConfigs[currentLevel];
    worldHeight = config.worldHeight;
    
    // Define depth zones based on level (same as original)
    let depthZones;
    if (currentLevel === 1) {
        depthZones = [
            { minDepth: 400, maxDepth: 800, fishCount: 8, fishValue: 1 },
            { minDepth: 800, maxDepth: 1200, fishCount: 12, fishValue: 2 },
            { minDepth: 1200, maxDepth: 1800, fishCount: 10, fishValue: 3 }
        ];
    } else if (currentLevel === 2) {
        depthZones = [
            { minDepth: 500, maxDepth: 1000, fishCount: 6, fishValue: 2 },
            { minDepth: 1000, maxDepth: 1500, fishCount: 10, fishValue: 3 },
            { minDepth: 1500, maxDepth: 2200, fishCount: 12, fishValue: 4 }
        ];
    } else { // Level 3
        depthZones = [
            { minDepth: 600, maxDepth: 1200, fishCount: 5, fishValue: 3 },
            { minDepth: 1200, maxDepth: 2000, fishCount: 8, fishValue: 5 },
            { minDepth: 2000, maxDepth: 2800, fishCount: 10, fishValue: 8 }
        ];
    }
    
    depthZones.forEach(zone => {
        for (let i = 0; i < zone.fishCount; i++) {
            const fishType = config.fishTypes[Math.floor(Math.random() * config.fishTypes.length)];
            const imageKey = fishType.replace('.png', '');
            const preloadedImage = imagePreloader.getImage(imageKey);
            
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
            
            if (preloadedImage) {
                fishes.push(new Fish(x, worldY, speed, preloadedImage, direction, zone.minDepth, zone.fishValue));
            } else {
                // Fallback
                const img = new Image();
                img.src = `assets/${fishType}`;
                fishes.push(new Fish(x, worldY, speed, img, direction, zone.minDepth, zone.fishValue));
            }
        }
    });
}

// Replace spawnFish calls with spawnFishWithPreloader
// You can add this line to override the original function:
// spawnFish = spawnFishWithPreloader;

console.log('Image preloader system loaded successfully!');
