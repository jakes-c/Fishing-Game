const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const startScreen = document.getElementById('startScreen');
const endScreen = document.getElementById('endScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const finalScoreText = document.getElementById('finalScore');

const castSound = new Audio('assets/cast.mp3');
const catchSound = new Audio('assets/catch.mp3');
const splashSound = new Audio('assets/splash.mp3');
const reelSound = new Audio('assets/reel.mp3');
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

const boatElement = document.getElementById('boat');
const boat = { x: canvas.width / 2, y: canvas.height * 0.28 };
const hook = { x: 0, y: 0, originalY: 0, isMovingDown: false, speed: 10, attachedFishes: [] };

const hookImg = new Image();
hookImg.src = 'assets/hook.png';

const fishImages = ['fish1.png', 'fish2.png', 'fish3.png', 'fish4.png'].map(name => {
  const img = new Image();
  img.src = `assets/${name}`;
  return img;
});

const creatureImages = ['seahorse.png', 'jellyfish.png', 'starfish.png', 'shell.png'].map(name => {
  const img = new Image();
  img.src = `assets/${name}`;
  return img;
});

let fishes = [], score = 0, timeLeft = 60, gameOver = false;
const underwaterCreatures = [];

function spawnCreatures() {
  for (let i = 0; i < 8; i++) {
    const image = creatureImages[i % creatureImages.length];
    const x = Math.random() * (canvas.width - 80);
    const y = canvas.height * 0.55 + Math.random() * (canvas.height * 0.3);
    const size = 50 + Math.random() * 30;
    underwaterCreatures.push({ image, x, y, size });
  }
}

function drawCreatures() {
  underwaterCreatures.forEach(c => ctx.drawImage(c.image, c.x, c.y, c.size, c.size));
}

// 🌊 WAVE FUNCTION
function drawWaves() {
  ctx.fillStyle = '#0a2e59';
  ctx.beginPath();
  const waveY = canvas.height * 0.5;
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
  constructor(x, y, speed, image, direction) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.size = 60;
    this.image = image;
    this.caught = false;
    this.direction = direction;
  }
  draw() {
    ctx.drawImage(this.image, this.x, this.y, this.size, this.size);
  }
  update() {
    if (!this.caught) {
      this.x += this.speed;
      if (this.direction === 'left' && this.x < -this.size) this.x = canvas.width;
      else if (this.direction === 'right' && this.x > canvas.width) this.x = -this.size;
    } else {
      const index = hook.attachedFishes.indexOf(this);
      this.x = hook.x - this.size / 2 + index * 35;
      this.y = hook.y - 50 - index * 40;
    }
    this.draw();
  }
}

function spawnFish() {
  fishes = [];
  for (let i = 0; i < 15; i++) {
    const imgIndex = Math.floor(Math.random() * fishImages.length);
    const img = fishImages[imgIndex];
    let x, speed, direction;
    if (imgIndex === 3) {
      x = Math.random() * 100;
      speed = Math.random() * 2 + 1;
      direction = 'right';
    } else {
      x = canvas.width - (Math.random() * 100);
      speed = -(Math.random() * 2 + 1);
      direction = 'left';
    }
    const y = canvas.height * 0.6 + Math.random() * 150;
    fishes.push(new Fish(x, y, speed, img, direction));
  }
}

function updateBoatPosition() {
  const rect = boatElement.getBoundingClientRect();
  boat.x = rect.left + rect.width / 2;
  boat.y = rect.top + rect.height * 0.75;
  if (!hook.isMovingDown && hook.attachedFishes.length === 0) {
    hook.x = boat.x - 270;
    hook.y = boat.y + 15;
    hook.originalY = hook.y;
  }
}

function drawHook() {
  ctx.beginPath();
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;
  ctx.moveTo(hook.x, boat.y + 15);
  ctx.lineTo(hook.x, hook.y);
  ctx.stroke();
  ctx.drawImage(hookImg, hook.x - 15, hook.y, 30, 50);
}

function checkCatch() {
  if (!hook.isMovingDown) return;
  fishes.forEach(fish => {
    if (!fish.caught && hook.attachedFishes.length < 3) {
      const dx = hook.x - (fish.x + fish.size / 2);
      const dy = hook.y - (fish.y + fish.size / 2);
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

function update() {
  if (gameOver) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawWaves(); // 🌊 Draw waves before other elements

  updateBoatPosition();
  drawCreatures();
  drawHook();
  fishes.forEach(fish => fish.update());

  if (hook.isMovingDown) {
    hook.y += hook.speed;
    if (castSound.paused) {
      castSound.currentTime = 0;
      castSound.play();
    }
    if (hook.y > canvas.height * 0.95) {
      hook.isMovingDown = false;
      castSound.pause();
      castSound.currentTime = 0;
    }
  } else if (hook.y > hook.originalY) {
    hook.y -= hook.speed;
    if (reelSound.paused) {
      reelSound.currentTime = 0;
      reelSound.play();
    }
    if (hook.y <= hook.originalY) {
      reelSound.pause();
      reelSound.currentTime = 0;
      if (hook.attachedFishes.length > 0) {
        hook.attachedFishes.forEach(f => {
          fishes = fishes.filter(ff => ff !== f);
          score++;
        });
        document.getElementById('score').textContent = score;
      }
      hook.attachedFishes = [];
    }
  } else {
    reelSound.pause();
    reelSound.currentTime = 0;
  }

  checkCatch();
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
  document.getElementById('score').textContent = score;
  document.getElementById('time').textContent = timeLeft;
  startScreen.style.display = 'none';
  endScreen.style.display = 'none';
  fishes = [];
  underwaterCreatures.length = 0;
  spawnFish();
  spawnCreatures();
  update();
  startTimer();
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

window.addEventListener('keydown', e => {
  if (e.key === ' ' && !hook.isMovingDown && hook.y === hook.originalY && !gameOver) {
    hook.isMovingDown = true;
  }
});
