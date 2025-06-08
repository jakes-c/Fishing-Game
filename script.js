// Deep Sea Fishing Adventure - Cleaned Up Script.js

// ======================= CORE SETUP =======================

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
// Fish database with names, points, and depth zones
const fishDatabase = {
  'fish1.png': { name: 'Goldfish', points: 10, depth: 'Shallow' },
  'fish2.png': { name: 'Clownfish', points: 15, depth: 'Shallow' },
  'fish3.png': { name: 'Angelfish', points: 25, depth: 'Mid Ocean' },
  'fish4.png': { name: 'Blue Tang', points: 30, depth: 'Mid Ocean' },
  'fish5.png': { name: 'Parrotfish', points: 35, depth: 'Mid Ocean' },
  'fish6.png': { name: 'Grouper', points: 50, depth: 'Deep Sea' },
  'fish7.png': { name: 'Tuna', points: 60, depth: 'Deep Sea' },
  'fish8.png': { name: 'Giant Squid', points: 100, depth: 'Abyss' }
};

// Fish panel update
function updateFishPanel() {
  const fishStats = document.getElementById('fishStats');
  const multiplier = document.getElementById('multiplier');
  const levelMultiplierDisplay = document.getElementById('levelMultiplierDisplay');
  if (!fishStats) return;
  const config = levelConfigs[currentLevel];
  if (multiplier) multiplier.textContent = config.scoreMultiplier;
  if (levelMultiplierDisplay) levelMultiplierDisplay.textContent = currentLevel;
  fishStats.innerHTML = '';
  const levelFishTypes = config.fishTypes;
  levelFishTypes.forEach(fishType => {
    const fishInfo = fishDatabase[fishType];
    if (!fishInfo) return;
    const count = caughtFishCounts[fishType] || 0;
    const totalPoints = count * fishInfo.points * config.scoreMultiplier;
    const fishItem = document.createElement('div');
    fishItem.className = 'fish-item';
    fishItem.innerHTML = `
      <div class="fish-info">
        <div class="fish-name">${fishInfo.name}</div>
        <div class="fish-depth">${fishInfo.depth}</div>
      </div>
      <div class="fish-stats-right">
        <div class="fish-count">${count}</div>
        <div class="fish-points">${fishInfo.points}pts</div>
      </div>
    `;
    fishStats.appendChild(fishItem);
  });
}

// Track caught fish by type
let caughtFishCounts = {};

// Game world settings
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

// Boat object
const boatElement = document.getElementById('boat');
const boat = { 
  x: canvas.width / 2, 
  y: waterSurfaceY - 80,
  worldY: waterSurfaceY - 80,
  defaultWorldY: waterSurfaceY - 80,
  moveSpeed: 10,
  maxDepth: 500,
  width: 120,
  height: 80
};

// Hook object
const hook = { 
  x: boat.x,
  y: boat.y + boat.height,
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
const keys = { w: false, a: false, s: false, d: false };

// Game arrays
let fishes = [];
let obstacles = [];

// Load images
const hookImg = new Image();
hookImg.src = 'assets/hook.png';
const fishImages = [];
const obstacleImages = [];

// ======================= IMAGE PRELOADER =======================

class ImagePreloader {
  constructor() {
    this.loadedImages = new Map();
    this.loadingPromises = new Map();
    this.totalImages = 0;
    this.loadedCount = 0;
    this.onProgress = null;
    this.onComplete = null;
  }
  loadImage(src, key = null) {
    if (!key) key = src;
    if (this.loadedImages.has(key)) {
      return Promise.resolve(this.loadedImages.get(key));
    }
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(key, img);
        this.loadedCount++;
        if (this.onProgress) this.onProgress(this.loadedCount, this.totalImages);
        resolve(img);
      };
      img.onerror = () => {
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
        if (this.onProgress) this.onProgress(this.loadedCount, this.totalImages);
        resolve(placeholderImg);
      };
      img.src = src;
    });
    this.loadingPromises.set(key, promise);
    this.totalImages++;
    return promise;
  }
  loadImages(imageList) {
    const promises = imageList.map(item =>
      typeof item === 'string' ? this.loadImage(item) : this.loadImage(item.src, item.key)
    );
    return Promise.all(promises);
  }
  getImage(key) {
    return this.loadedImages.get(key);
  }
  isLoaded(key) {
    return this.loadedImages.has(key);
  }
}

const imagePreloader = new ImagePreloader();
const gameImages = {
  boats: [
    { src: 'assets/boat1.png', key: 'boat1' },
    { src: 'assets/boat2.png', key: 'boat2' },
    { src: 'assets/boat3.png', key: 'boat3' }
  ],
  hooks: [
    { src: 'assets/hook1.png', key: 'hook1' },
    { src: 'assets/hook2.png', key: 'hook2' },
    { src: 'assets/hook3.png', key: 'hook3' }
  ],
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
  obstacles: [
    { src: 'assets/seahorse.png', key: 'seahorse' },
    { src: 'assets/jellyfish.png', key: 'jellyfish' },
    { src: 'assets/starfish.png', key: 'starfish' },
    { src: 'assets/shell.png', key: 'shell' }
  ]
};

function showLoadingScreen() {
  let loadingOverlay = document.getElementById('loadingOverlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    loadingOverlay.style.cssText = `
      position: fixed;top: 0;left: 0;width: 100%;height: 100%;
      background: rgba(0, 0, 50, 0.9);display: flex;flex-direction: column;
      justify-content: center;align-items: center;z-index: 1000;color: white;font-family: Arial, sans-serif;
    `;
    loadingOverlay.innerHTML = `
      <div style="text-align: center;">
        <h2 style="margin-bottom: 20px;">Loading Game Assets...</h2>
        <div id="loadingBar" style="width: 300px;height: 20px;background: rgba(255,255,255,0.2);border-radius: 10px;overflow: hidden;margin-bottom: 10px;">
          <div id="loadingProgress" style="width: 0%;height: 100%;background: linear-gradient(90deg, #4CAF50, #2196F3);transition: width 0.3s ease;border-radius: 10px;"></div>
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
  if (progressBar) progressBar.style.width = percentage + '%';
  if (progressText) progressText.textContent = `${percentage}% (${loaded}/${total})`;
}
function hideLoadingScreen() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) loadingOverlay.style.display = 'none';
}
function preloadAllGameImages() {
  return new Promise((resolve, reject) => {
    showLoadingScreen();
    imagePreloader.onProgress = updateLoadingProgress;
    const allImages = [
      ...gameImages.boats, ...gameImages.hooks, ...gameImages.fish, ...gameImages.obstacles
    ];
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
        resolve();
      });
  });
}
function loadLevelAssetsWithPreloader() {
  return new Promise((resolve, reject) => {
    const config = levelConfigs[currentLevel];
    const imagesToLoad = [];
    // Fish
    config.fishTypes.forEach(fishName => {
      const key = fishName.replace('.png', '');
      imagesToLoad.push({ src: `assets/${fishName}`, key: key });
    });
    // Obstacles
    gameImages.obstacles.forEach(obs => imagesToLoad.push(obs));
    // Boat and hook
    imagesToLoad.push({ src: `assets/${selectedBoat}.png`, key: selectedBoat });
    imagesToLoad.push({ src: `assets/${selectedHook}.png`, key: selectedHook });
    imagePreloader.totalImages = 0;
    imagePreloader.loadedCount = 0;
    imagePreloader.loadImages(imagesToLoad)
      .then(() => {
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
        const hookImage = imagePreloader.getImage(selectedHook);
        if (hookImage) {
          hookImg.src = hookImage.src;
          hookImg.onload = null;
        }
        const boatImage = imagePreloader.getImage(selectedBoat);
        if (boatImage && boatElement) {
          boatElement.src = boatImage.src;
          boatElement.onload = null;
        }
        resolve();
      })
      .catch(reject);
  });
}

// ======================= CLASSES =======================

// --- (All other code remains unchanged) ---

// In the Fish.draw() method, ADD a check to NOT render fish above the water surface:

// ... (the rest of your game code above remains the same)

// === Fish class FIX: Prevent fish from appearing above water surface ===

class Fish {
  constructor(x, worldY, speed, image, direction, depth, value = 1) {
    this.x = x;
    this.worldY = worldY;
    this.speed = speed;
    const imageName = image.src.split('/').pop();
    switch(imageName) {
      case 'fish1.png': this.size = 50; break;
      case 'fish2.png': this.size = 55; break;
      case 'fish3.png': this.size = 65; break;
      case 'fish4.png': this.size = 70; break;
      case 'fish5.png': this.size = 80; break;
      case 'fish6.png': this.size = 85; break;
      case 'fish7.png': this.size = 90; break;
      case 'fish8.png': this.size = 150; break;
      default: this.size = 60; break;
    }
    this.image = image;
    this.caught = false;
    this.direction = direction;
    this.depth = depth;
    this.deliveredToBoat = false;
    const fishType = imageName;
    const fishInfo = fishDatabase[fishType];
    if (fishInfo) {
      this.value = fishInfo.points;
      this.name = fishInfo.name;
    } else {
      this.value = 10;
      this.name = 'Unknown Fish';
    }
  }
  draw() {
    const screenY = this.worldY - cameraY;
    // The water surface line (in canvas coordinates) is:
    const waterSurfaceScreenY = defaultWaterSurfaceY - cameraY;
    // Only draw if the fish is below or touching the water surface line:
    if (screenY >= waterSurfaceScreenY - this.size) {
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

// ... (the rest of your game code below remains the same)
// --- (The rest of your code remains unchanged) ---

// ======================= FISH & OBSTACLE SPAWNING =======================

function spawnFishWithPreloader() {
  fishes = [];
  const config = levelConfigs[currentLevel];
  worldHeight = config.worldHeight;
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
  } else {
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
        const img = new Image();
        img.src = `assets/${fishType}`;
        fishes.push(new Fish(x, worldY, speed, img, direction, zone.minDepth, zone.fishValue));
      }
    }
  });
}

function spawnObstacles() {
  obstacles.length = 0;
  const config = levelConfigs[currentLevel];
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

// ======================= GAME LOOP & LOGIC =======================

function drawObstacles() {
  obstacles.forEach(obstacle => {
    const screenY = obstacle.worldY - cameraY;
    if (screenY > -obstacle.size && screenY < canvas.height + obstacle.size) {
      ctx.drawImage(obstacle.image, obstacle.x, screenY, obstacle.size, obstacle.size);
    }
  });
}

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

function checkCatch() {
  fishes.forEach(fish => {
    if (!fish.caught && hook.attachedFishes.length < hook.maxFishes) {
      const dx = hook.x - (fish.x + fish.size / 2);
      const dy = hook.worldY - fish.worldY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < fish.size / 2 + 10) {
        fish.caught = true;
        hook.attachedFishes.push(fish);
        // update sidebar and panel
        const fishType = fish.image.src.split('/').pop();
        if (!caughtFishCounts[fishType]) caughtFishCounts[fishType] = 0;
        caughtFishCounts[fishType]++;
        updateFishPanel();
        updateSidebarFishCount(fishType);
        sounds.catch.currentTime = 0;
        sounds.catch.play();
        sounds.splash.currentTime = 0;
        sounds.splash.play();
      }
    }
  });
}

// ======================= RENDER & CAMERA =======================

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
function getCurrentLevelColors() {
  return levelColorSchemes[currentLevel] || levelColorSchemes[1];
}
// Cleaned up drawBackground (level-based)
function drawBackground() {
  const dynamicWaterSurfaceY = waterSurfaceY;
  const colors = getCurrentLevelColors();
  ctx.fillStyle = colors.skyColor;
  ctx.fillRect(0, 0, canvas.width, dynamicWaterSurfaceY);
  ctx.fillStyle = colors.waterBase;
  ctx.fillRect(0, dynamicWaterSurfaceY, canvas.width, canvas.height - dynamicWaterSurfaceY);
  const depthRatio = Math.min(1, cameraY / (worldHeight * 0.7));
  const gradient = ctx.createLinearGradient(0, dynamicWaterSurfaceY, 0, canvas.height);
  const levelGradient = colors.gradientStops;
  levelGradient.forEach(stop => {
    const rgba = stop.color.replace('rgba(', '').replace(')', '').split(',');
    const r = Math.max(0, parseInt(rgba[0]) - depthRatio * 30);
    const g = Math.max(0, parseInt(rgba[1]) - depthRatio * 40);
    const b = Math.max(0, parseInt(rgba[2]) - depthRatio * 60);
    gradient.addColorStop(stop.stop, `rgba(${r}, ${g}, ${b}, 1)`);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, dynamicWaterSurfaceY, canvas.width, canvas.height - dynamicWaterSurfaceY);
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
  const seaFloorY = worldHeight - cameraY;
  if (seaFloorY < canvas.height + 50) {
    ctx.fillStyle = currentLevel === 3 ? '#2d1810' : currentLevel === 2 ? '#654321' : '#8b4513';
    ctx.fillRect(0, seaFloorY - 30, canvas.width, 80);
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
function drawWaves() {
  // The Y coordinate of the water surface in world coordinates
  const waveWorldY = defaultWaterSurfaceY;
  // Convert to screen (canvas) coordinates
  const waveScreenY = waveWorldY - cameraY;

  // Choose color scheme for the level
  const colors = getCurrentLevelColors();
  ctx.save();
  // Draw water as a big rectangle below the wave
  ctx.fillStyle = colors.waterBase || "#0077be";
  ctx.fillRect(0, waveScreenY, canvas.width, canvas.height - waveScreenY);

  // Draw animated wave line
  ctx.beginPath();
  ctx.moveTo(0, waveScreenY);
  const time = Date.now() * 0.001;
  for (let x = 0; x <= canvas.width; x += 2) {
    // Multi-frequency sine for wavy surface
    let y = waveScreenY
      + Math.sin((x * 0.015) + time * 2) * 10
      + Math.cos((x * 0.007) + time * 1.3) * 6;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, waveScreenY + 30);
  ctx.lineTo(0, waveScreenY + 30);
  ctx.closePath();
  ctx.fillStyle = colors.waterSurface || "#4682b4";
  ctx.globalAlpha = 0.8;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Draw white highlight line
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += 3) {
    let y = waveScreenY
      + Math.sin((x * 0.015) + time * 2) * 10
      + Math.cos((x * 0.007) + time * 1.3) * 6;
    ctx.lineTo(x, y - 2);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.restore();
}
function updateBoatElement() {
  if (boatElement) {
    // Boat always floats at water surface in world coordinates!
    // Boat's Y on screen: water surface Y in world - cameraY - boat height
    const waveScreenY = defaultWaterSurfaceY - cameraY;
    boatElement.style.left = (boat.x - boat.width/2) + 'px';
    boatElement.style.top = (waveScreenY - boat.height) + 'px';
    boatElement.style.display = gameActive ? 'block' : 'none';
    boatElement.style.zIndex = '10';
    // Optional: set size by JS (CSS width can be removed for true sync)
    boatElement.style.width = boat.width + 'px';
    boatElement.style.height = boat.height + 'px';
  }
}
function update() {
  if (!gameActive || gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updateCamera();

  // 1. Draw backgrounds (sky, etc)
  drawBackground();

  // 2. Draw water surface/waves at correct scrolling Y
  drawWaves();

  // 3. Update boat position and DOM
  updateBoatPosition();
  updateBoatElement();

  // 4. Draw obstacles, hook, fish, etc.
  drawObstacles();
  handleHookMovement();
  drawHook();
  fishes.forEach(fish => fish.update());
  checkCatch();
  checkObstacleCollisions();

  // etc...
  requestAnimationFrame(update);
}

// ...the rest of your script remains unchanged (menus, controls, etc)...
// Camera update
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

// Update boat position
function updateBoatPosition() {
  // Always keep the boat floating at the water surface in world coordinates
  let targetBoatWorldY = boat.defaultWorldY;
  const hookDepthBelowBoat = Math.max(0, hook.worldY - boat.defaultWorldY);
  // Only sink the boat if the hook is actively moving down and NOT at the boat
  if (hookDepthBelowBoat > 0 && (hook.isMovingDown || !hook.isAtBoat)) {
    const boatDepthMovement = Math.min(boat.maxDepth, hookDepthBelowBoat * 0.25);
    targetBoatWorldY = boat.defaultWorldY + boatDepthMovement;
  }
  // Smoothly move boat towards the target world Y (surface or slightly sunken)
  boat.worldY += (targetBoatWorldY - boat.worldY) * 0.04;
  boat.y = boat.worldY - cameraY;
  boatElement.style.top = (boat.y - 350) + 'px';
  const rect = boatElement.getBoundingClientRect();
  boat.x = rect.left + rect.width / 2;
  // Boat delivers fish when hook comes up
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
  // Reset hook/boat when hook reaches the boat
  if (hook.worldY <= boat.worldY) {
    hook.x = boat.x - 270;
    hook.y = boat.y + 20;
    hook.worldY = boat.worldY + 15;
    hook.originalY = boat.y + boat.height;
    hook.isMovingDown = false;
    hook.isMovingUp = false;
    hook.isAtBoat = true;
    hook.fishBeingDelivered = false;
  }
}
// Draw hook and line
function drawHook() {
  hook.y = hook.worldY - cameraY;
  const boatScreenX = boat.x;
  const boatScreenY = boat.y;
  const lineStartX = boatScreenX;
  const lineStartY = boatScreenY + 15;
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.moveTo(lineStartX, lineStartY);
  const lineLength = hook.y - lineStartY;
  const controlX = lineStartX + (hook.x - lineStartX) * 0.5 + Math.sin(Date.now() / 2000) * 20;
  const controlY = lineStartY + lineLength * 0.5;
  if (lineLength > 100) {
    ctx.quadraticCurveTo(controlX, controlY, hook.x, hook.y);
  } else {
    ctx.lineTo(hook.x, hook.y);
  }
  ctx.stroke();
  ctx.drawImage(hookImg, hook.x - 15, hook.y, 30, 50);
}

// ======================= GAME CONTROLS =======================

function handleHookMovement() {
  const boatWorldY = boat.worldY;
  if (hook.worldY > boatWorldY) hook.isAtBoat = false;
  // Horizontal
  if (keys.a && hook.worldY > boatWorldY) {
    hook.x -= hook.horizontalSpeed;
    if (hook.x < 20) hook.x = 20;
  }
  if (keys.d && hook.worldY > boatWorldY) {
    hook.x += hook.horizontalSpeed;
    if (hook.x > canvas.width - 20) hook.x = canvas.width - 20;
  }
  // Move down
  if (keys.s && !hook.isMovingUp && hook.worldY < worldHeight - 50 && 
      hook.attachedFishes.length < hook.maxFishes) {
    hook.worldY += hook.stepDistance;
    if (!hook.isMovingDown) {
      sounds.cast.currentTime = 0;
      sounds.cast.play();
      hook.isMovingDown = true;
    }
    if (hook.worldY > worldHeight - 50) hook.worldY = worldHeight - 50;
  } else {
    hook.isMovingDown = false;
  }
  // Move up
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

// ======================= GAME LOOP =======================

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
  fishes.forEach(fish => fish.update());
  checkCatch();
  checkObstacleCollisions();
  if (fishes.length === 0) endGame(true);
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

// ======================= GAME STATE MANAGEMENT =======================

function startGame() {
  score = 0;
  timeLeft = levelConfigs[currentLevel].timeLimit;
  gameActive = true;
  gameOver = false;
  cameraY = 0;
  targetCameraY = 0;
  waterSurfaceY = defaultWaterSurfaceY;
  caughtFishCounts = {};
  updateFishPanel();
  showGameSidebars();
  resetSidebarCounts();
  document.getElementById('leftPanel').style.display = 'block';
  document.getElementById('rightPanel').style.display = 'block';
  boat.worldY = boat.defaultWorldY;
  boatElement.style.top = (boat.y - 300) + 'px';
  document.getElementById('score').textContent = score;
  document.getElementById('time').textContent = timeLeft;
  document.getElementById('current-level').textContent = currentLevel;
  document.getElementById('multiplier').textContent = currentLevel;
  document.querySelectorAll('.fish-count').forEach(item => item.textContent = '0');
  hook.isMovingDown = false;
  hook.isMovingUp = false;
  hook.attachedFishes = [];
  hook.worldY = boat.worldY;
  hook.isAtBoat = true;
  hook.fishBeingDelivered = false;
  loadLevelAssetsWithPreloader().then(() => {
    setTimeout(() => {
      spawnFishWithPreloader();
      spawnObstacles();
      update();
      startTimer();
    }, 100);
  });
}
function endGame(levelComplete = false) {
  gameActive = false;
  gameOver = true;
  hideGameSidebars();
  document.getElementById('leftPanel').style.display = 'none';
  document.getElementById('rightPanel').style.display = 'none';
  document.getElementById('finalScore').textContent = `Your Score: ${score}`;
  document.getElementById('levelCompleted').textContent = 
    levelComplete ? `Level ${currentLevel} Completed!` : `Time's Up!`;
  const nextButton = document.getElementById('nextLevelButton');
  if (levelComplete && currentLevel < 3) {
    nextButton.style.display = 'inline-block';
  } else {
    nextButton.style.display = 'none';
  }
  endScreen.style.display = 'flex';
}

// ======================= SIDEBAR FUNCTIONS =======================

function showGameSidebars() {
  const leftSidebar = document.getElementById('left-sidebar');
  const rightSidebar = document.getElementById('right-sidebar');
  if (leftSidebar) leftSidebar.style.display = 'block';
  if (rightSidebar) rightSidebar.style.display = 'block';
}
function hideGameSidebars() {
  const leftSidebar = document.getElementById('left-sidebar');
  const rightSidebar = document.getElementById('right-sidebar');
  if (leftSidebar) leftSidebar.style.display = 'none';
  if (rightSidebar) rightSidebar.style.display = 'none';
}
function updateSidebarFishCount(fishType) {
  const fishItem = document.querySelector(`#right-sidebar [data-fish-type="${fishType}"]`);
  if (fishItem) {
    const countElement = fishItem.querySelector('.fish-count');
    if (countElement) {
      let currentCount = parseInt(countElement.textContent) || 0;
      countElement.textContent = currentCount + 1;
      fishItem.style.backgroundColor = 'rgba(0, 255, 136, 0.2)';
      setTimeout(() => {
        fishItem.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      }, 300);
      updateSidebarTotal();
    }
  }
}
function updateSidebarTotal() {
  let total = 0;
  const fishItems = document.querySelectorAll('#right-sidebar .fish-item');
  fishItems.forEach(fishItem => {
    const countElement = fishItem.querySelector('.fish-count');
    const scoreElement = fishItem.querySelector('.fish-score');
    if (countElement && scoreElement) {
      const count = parseInt(countElement.textContent) || 0;
      const scoreText = scoreElement.textContent;
      const pointsMatch = scoreText.match(/(\d+)pts/);
      if (pointsMatch) {
        const points = parseInt(pointsMatch[1]);
        total += count * points;
      }
    }
  });
  const totalElement = document.getElementById('sidebar-total');
  if (totalElement) totalElement.textContent = total;
}
function resetSidebarCounts() {
  const countElements = document.querySelectorAll('#right-sidebar .fish-count');
  countElements.forEach(element => {
    element.textContent = '0';
  });
  const totalElement = document.getElementById('sidebar-total');
  if (totalElement) totalElement.textContent = '0';
}

function initializeSidebars() {
  hideGameSidebars();
  const fishItems = document.querySelectorAll('#right-sidebar .fish-item');
  fishItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
      this.style.transform = 'translateX(-3px)';
    });
    item.addEventListener('mouseleave', function() {
      this.style.transform = 'translateX(0)';
    });
  });
}
document.addEventListener('DOMContentLoaded', function() {
  initializeSidebars();
});

// ======================= MENUS AND EVENTS =======================

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
document.querySelectorAll('.level-card').forEach(card => {
  card.addEventListener('click', () => {
    currentLevel = parseInt(card.dataset.level);
    document.getElementById('customizationTitle').textContent = 
      `Level ${currentLevel}: Customization`;
    levelSelect.style.display = 'none';
    customizationScreen.style.display = 'flex';
  });
});
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
if (startGameButton) {
  const newStartGameButton = startGameButton.cloneNode(true);
  startGameButton.parentNode.replaceChild(newStartGameButton, startGameButton);
  newStartGameButton.addEventListener('click', () => {
    customizationScreen.style.display = 'none';
    startGame();
  });
}
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

// ======================= KEYBOARD EVENTS =======================

window.addEventListener('keydown', e => {
  if (!gameActive || gameOver) return;
  switch(e.key.toLowerCase()) {
    case 'w': keys.w = true; break;
    case 'a': keys.a = true; break;
    case 's': keys.s = true; break;
    case 'd': keys.d = true; break;
  }
});
window.addEventListener('keyup', e => {
  switch(e.key.toLowerCase()) {
    case 'w': keys.w = false; break;
    case 'a': keys.a = false; break;
    case 's': keys.s = false; break;
    case 'd': keys.d = false; break;
  }
});

// ======================= WINDOW RESIZE =======================

window.addEventListener('resize', () => {
  const oldHeight = canvas.height;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  defaultWaterSurfaceY = canvas.height * 0.35;
  waterSurfaceY = defaultWaterSurfaceY;
  if (gameActive) {
    boat.y = defaultWaterSurfaceY - 70;
    boat.worldY = defaultWaterSurfaceY - 70;
    boat.defaultWorldY = defaultWaterSurfaceY - 70;
    if (hook.isAtBoat) {
      hook.x = boat.x;
      hook.y = boat.y + boat.height;
      hook.worldY = boat.worldY + boat.height;
      hook.originalY = boat.y + boat.height;
    }
    setTimeout(() => {
      boatElement.style.left = (boat.x - boat.width/2) + 'px';
      boatElement.style.top = (boat.y - 350) + 'px';
    }, 50);
  }
});

// ======================= INIT =======================

document.addEventListener('DOMContentLoaded', () => {
  mainMenu.style.display = 'flex';
  preloadAllGameImages().then(() => {
    console.log('All game images preloaded successfully!');
  });
});
