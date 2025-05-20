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
let waterSurfaceY = canvas.height * 0.5; // Y position of water surface (now dynamic)
let defaultWaterSurfaceY = canvas.height * 0.5; // Default water surface Y position

const castSound = new Audio('assets/cast.mp3');
const catchSound = new Audio('assets/catch.mp3');
const splashSound = new Audio('assets/splash.mp3');
const reelSound = new Audio('assets/reel.mp3');
const collisionSound = new Audio('assets/splash.mp3'); // Reusing splash for collision
const coinSound = new Audio('assets/catch.mp3'); // Reusing catch sound for scoring
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

// Boat position is now dynamic and will change based on hook position
const boatElement = document.getElementById('boat');
const boat = { 
  x: canvas.width / 2, 
  y: canvas.height * 0.28, // Starting Y position for boat
  worldY: canvas.height * 0.28, // World Y position for boat that will change
  defaultWorldY: canvas.height * 0.28, // Store the default position for reference
  moveSpeed: 10, // Speed at which the boat will move with hook
  maxDepth: 500 // Maximum depth the boat can go (in pixels from default position)
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
  radius: 15, // Collision radius for the hook
  isAtBoat: true, // New flag to track if hook is at the boat position
  fishBeingDelivered: false // Flag to track if fish are being delivered to boat
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
      hook.fishBeingDelivered = false; // Reset delivery flag when fish are released
      break;
    }
  }
}

// 🌊 WAVE FUNCTION - MODIFIED to scroll with camera and boat with better synchronization
function drawWaves() {
  // Dynamic wave position that moves with the camera with better synchronization
  // Make waves follow the camera more closely for better visual effect
  const waveY = defaultWaterSurfaceY - cameraY * 0.25; // Adjusted coefficient for smoother scrolling
  waterSurfaceY = waveY; // Update the water surface Y position
  
  ctx.fillStyle = '#0a2e59';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, waveY);
  
  // More realistic wave pattern
  const time = Date.now() / 200; // Slower wave movement for more natural look
  for (let x = 0; x <= canvas.width; x += 10) {
    // Combine multiple sine waves for more natural wave pattern
    const y = waveY + 
              Math.sin((x * 0.02) + time * 0.1) * 15 + 
              Math.sin((x * 0.01) + time * 0.2) * 8;
    ctx.lineTo(x, y);
  }
  
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();
  
  // Add a highlight/foam effect at the wave top
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
    this.deliveredToBoat = false; // Track if fish has been delivered to the boat
  }
  
  draw() {
    // Convert worldY to screen coordinates
    const screenY = this.worldY - cameraY;
    
    // Only draw if fish is visible in viewport
    if (screenY > -this.size && screenY < canvas.height + this.size) {
      // Flip the fish image if moving left
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
      // Wrap around the screen horizontally
      if (this.direction === 'left' && this.x < -this.size) this.x = canvas.width;
      else if (this.direction === 'right' && this.x > canvas.width) this.x = -this.size;
    } else {
      // If caught, follow the hook with smoother motion
      const index = hook.attachedFishes.indexOf(this);
      
      // Target position calculation
      const targetX = hook.x - this.size / 2 + index * 35;
      const targetY = hook.worldY - 50 - index * 40;
      
      // Smooth following with easing
      this.x += (targetX - this.x) * 0.2;
      this.worldY += (targetY - this.worldY) * 0.2;
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

// Modified to better synchronize boat movement with hook and handle fish delivery to boat
function updateBoatPosition() {
  // Get the current hook depth relative to the default boat position
  const hookDepthBelowBoat = Math.max(0, hook.worldY - boat.defaultWorldY);
  
  // Calculate the target boat world position based on hook depth with improved formula
  // The deeper the hook goes, the more the boat will follow (limited by maxDepth)
  let targetBoatWorldY = boat.defaultWorldY;
  
  if (hookDepthBelowBoat > 0) {
    // Improved calculation for smoother boat movement that follows hook depth
    // This creates a more gradual, natural movement where boat follows hook
    const boatDepthMovement = Math.min(boat.maxDepth, hookDepthBelowBoat * 0.25);
    targetBoatWorldY = boat.defaultWorldY + boatDepthMovement;
  }
  
  // Smoother transition for the boat position
  boat.worldY += (targetBoatWorldY - boat.worldY) * 0.04; // Slightly slower for smoother movement
  
  // Update the HTML boat element's position
  // This is the visual position (screen coordinates, not world coordinates)
  boat.y = boat.worldY - cameraY;
  
  // Apply the position to the actual boat element
  boatElement.style.top = (boat.y - 300) + 'px'; // Adjust for boat image height
  
  // Update the x position of the boat (unchanged)
  const rect = boatElement.getBoundingClientRect();
  boat.x = rect.left + rect.width / 2;
  
 // If hook is at or above the boat AND we have fish, begin the delivery process
if (hook.worldY <= boat.worldY + 15 && hook.attachedFishes.length > 0) {
  // Process caught fish (increase score, remove from game)
  const fishCount = hook.attachedFishes.length;
  score += fishCount; // Add points for each fish
  document.getElementById('score').textContent = score;
  
  // Play the coin sound when fish are being delivered
  coinSound.currentTime = 0;
  coinSound.play();
  
  // Remove the caught fish from the game
  hook.attachedFishes.forEach(f => {
    fishes = fishes.filter(ff => ff !== f);
  });
  
  // Clear the hook's fish collection
  hook.attachedFishes = [];
  
  // Reset the fish delivery flag to ensure future catches can be processed
  hook.fishBeingDelivered = false;
}
  // If hook is at or above the boat, reset its position
  if (hook.worldY <= boat.worldY) {
    hook.x = boat.x - 270;
    hook.y = boat.y + 15;
    hook.worldY = boat.worldY + 15;
    hook.originalY = hook.y;
    hook.isMovingDown = false;
    hook.isMovingUp = false;
    
    // Set flag that hook is at boat
    hook.isAtBoat = true;
    
    // Reset the fish delivery flag
    hook.fishBeingDelivered = false;
  }
}

function drawHook() {
  // Calculate screen position of hook
  hook.y = hook.worldY - cameraY;
  
  // Calculate the line start position (from the boat, which now moves)
  const lineStartY = boat.y + 15;
  
  // Draw fishing line from boat to hook with improved visual
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 2;
  ctx.moveTo(hook.x, lineStartY);
  
  // Add a slight curve to the line for more realism
  // Calculate control point based on line length
  const lineLength = hook.y - lineStartY;
  const controlX = hook.x + Math.sin(Date.now() / 2000) * 20; // Gentle sway based on time
  const controlY = lineStartY + lineLength * 0.5;
  
  // Use quadratic curve for a more natural fishing line look
  if (lineLength > 100) { // Only curve if line is long enough
    ctx.quadraticCurveTo(controlX, controlY, hook.x, hook.y);
  } else {
    ctx.lineTo(hook.x, hook.y);
  }
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

// 1. IMPROVED CAMERA SYSTEM WITH BETTER SYNCHRONIZATION
function updateCamera() {
  // Determine if we're in deep water (hook below water surface)
  const isInDeepWater = hook.worldY > defaultWaterSurfaceY;
  
  if (!isInDeepWater) {
    // If hook is above water, keep camera at surface level
    targetCameraY = 0;
  } else {
    // NEW APPROACH: Base camera position primarily on hook position for better scrolling
    // This creates a more natural scrolling effect where camera follows the hook more directly
    
    // Calculate the relative position between hook and viewport
    const hookScreenY = hook.worldY - cameraY;
    const viewportCenter = canvas.height * 0.5;
    
    // Target: Keep hook roughly in the middle of the screen
    // When hook is far from center, camera will move to center it
    if (Math.abs(hookScreenY - viewportCenter) > 100) {
      // Move camera to center the hook with some offset based on direction
      if (hook.isMovingDown) {
        // When moving down, look ahead more (show more of what's below)
        targetCameraY = hook.worldY - viewportCenter * 0.7;
      } else if (hook.isMovingUp) {
        // When moving up, keep the hook higher in the screen
        targetCameraY = hook.worldY - viewportCenter * 1.2;
      } else {
        // Standard position when not moving
        targetCameraY = hook.worldY - viewportCenter;
      }
    }
    
    // Clamp the camera position to valid world bounds
    targetCameraY = Math.max(0, targetCameraY);
    targetCameraY = Math.min(worldHeight - canvas.height, targetCameraY);
  }
  
  // Improved smoothing with different rates for different directions
  const smoothingUp = 0.08;    // Faster when moving up for better responsiveness
  const smoothingDown = 0.05;  // Slower when moving down for a more cinematic feel
  
  // Choose smoothing factor based on direction
  const cameraDelta = targetCameraY - cameraY;
  const currentSmoothing = cameraDelta < 0 ? smoothingUp : smoothingDown;
  
  // Apply camera smoothing
  cameraY += cameraDelta * currentSmoothing;
}

// Added function to handle WASD movement
function handleHookMovement() {
  // Calculate the boat's current world Y position (which now changes)
  const boatWorldY = boat.worldY;
  
  // When hook starts moving down, mark it as not at boat
  if (hook.worldY > boatWorldY) {
    hook.isAtBoat = false;
  }
  
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

// Draw the background with scrolling underwater scene - improved synchronization
function drawBackground() {
  // Calculate water surface position relative to camera with better synchronization
  const dynamicWaterSurfaceY = waterSurfaceY;
  
  // Sky is fixed at the top of the viewport
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, canvas.width, dynamicWaterSurfaceY);
  
  // Draw water background (scrolls with camera) with improved colors
  ctx.fillStyle = '#0077be';
  ctx.fillRect(0, dynamicWaterSurfaceY, canvas.width, canvas.height - dynamicWaterSurfaceY);
  
  // Enhanced gradient for water depth effect that better responds to depth
  // This creates a more dramatic visual effect when going deep
  const depthRatio = Math.min(1, cameraY / (worldHeight * 0.7));
  
  const gradient = ctx.createLinearGradient(0, dynamicWaterSurfaceY, 0, canvas.height);
  gradient.addColorStop(0, 'rgba(0, 119, 190, 1)');  // Light blue at top
  gradient.addColorStop(0.4, `rgba(0, ${80 - depthRatio * 40}, ${150 - depthRatio * 70}, 1)`); // Middle blue that darkens with depth
  gradient.addColorStop(0.8, `rgba(0, ${30 - depthRatio * 20}, ${80 - depthRatio * 60}, 1)`); // Dark blue that darkens with depth
  gradient.addColorStop(1, `rgba(0, ${10 - depthRatio * 8}, ${40 - depthRatio * 30}, 1)`);    // Very dark blue at bottom
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, dynamicWaterSurfaceY, canvas.width, canvas.height - dynamicWaterSurfaceY);
  
  // Add subtle ambient particles in water for depth effect
  if (depthRatio > 0.1) {
    const particleCount = Math.floor(30 * depthRatio);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    
    for (let i = 0; i < particleCount; i++) {
      const size = 1 + Math.random() * 3;
      const x = Math.random() * canvas.width;
      const y = dynamicWaterSurfaceY + Math.random() * (canvas.height - dynamicWaterSurfaceY);
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Draw depth markers that scroll with camera
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '16px Arial';
  
  const depthValues = [500, 1000, 1500, 2000, 2500];
  depthValues.forEach(depth => {
    const y = depth - cameraY;
    if (y > dynamicWaterSurfaceY && y < canvas.height) {
      ctx.fillText(`${depth/100}m`, canvas.width - 70, y);
      
      // Draw a dashed line with improved visual
      ctx.beginPath();
      ctx.setLineDash([5, 10]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  
  // Draw sea floor at the bottom with improved visuals
  const seaFloorY = worldHeight - cameraY;
  if (seaFloorY < canvas.height + 50) {
    // Main sea floor
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, seaFloorY - 30, canvas.width, 80);
    
    // Add some rocks and details to the sea floor
    ctx.fillStyle = '#654321';
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
  waterSurfaceY = defaultWaterSurfaceY; // Reset water surface position
  
  // Reset boat position
  boat.worldY = boat.defaultWorldY;
  boatElement.style.top = (boat.y - 300) + 'px';
  
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
  hook.worldY = boat.worldY;
  hook.isAtBoat = true; // Reset hook at boat flag
  hook.fishBeingDelivered = false; // Reset the fish delivery flag
  
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
  defaultWaterSurfaceY = canvas.height * 0.5;
  waterSurfaceY = defaultWaterSurfaceY;  
});
