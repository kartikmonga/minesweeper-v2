// Minesweeper Game with Dynamic Grid and Mine Adjustments
const gameContainer = document.getElementById('game');
const levelDisplay = document.getElementById('levelDisplay');
let currentLevel = 1;
let gridSize, mineCount, flagsUsed;
let cells = [];
let gameEnded = false;
let timer, timeLeft = 0;
let focusedIndex = 0;
let hasShuffled = false; // <-- ADD THIS at the top

// 🎵 Sound Effects
const clickSound = new Audio('click.mp3');
const bonusSound = new Audio('bonus.mp3');
const flagSound = new Audio('flag.mp3');
const bombSound = new Audio('BLAST SOUND.mp3');
const victorySound = new Audio('level-up-5.mp3');
const timeoutSound = new Audio('time-out.mp3');
const levelStartSound = new Audio('game start.mp3');
const bgMusic = new Audio('bg.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;

let musicStarted = false;

function tryStartMusic() {
  if (!musicStarted) {
    bgMusic.play().then(() => {
      musicStarted = true;
    }).catch((e) => {
      console.warn('🔇 Autoplay blocked even after interaction.', e);
    });
  }
}

function startGame(level = 1) {
  currentLevel = level;
  gameEnded = false;
  levelDisplay.textContent = `Level ${currentLevel}`;

  levelStartSound.currentTime = 0;
  levelStartSound.play();

  const baseSize = 6;
  const maxGridSize = 20;
  const difficultyMultiplier = 1 + Math.floor((level - 1) / 10) * 0.15;
  
  gridSize = Math.min(Math.floor(baseSize * Math.pow(1.14, level - 1) * difficultyMultiplier), maxGridSize);

  const baseDensity = 0.1 + level * 0.002;
  const difficultyBoost = 0.02 * Math.floor((level - 1) / 10);
  const cappedDensity = Math.min(baseDensity + difficultyBoost, 0.5);
  mineCount = Math.floor(gridSize * gridSize * cappedDensity);

  const totalCells = gridSize * gridSize;
  flagsUsed = 0;
  cells = [];
  gameEnded = false;
  gameContainer.innerHTML = '';
  gameContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    gameContainer.appendChild(cell);

    cell.addEventListener('click', handleCellClick);
    cell.addEventListener('contextmenu', handleRightClick);

    cells.push({
      el: cell,
      mine: false,
      revealed: false,
      flagged: false,
      neighborMines: 0,
      bonus: false,
    });
  }

  placeMines(totalCells);
  calculateNeighborMines();
  applyLevelTwists();

  focusedIndex = 0;
  cells[focusedIndex].el.classList.add('focused');

  startLevelTimer(level);
}

// shuffle mines
function shuffleMines() {
  // Remove the current mines
  cells.forEach(cell => {
    cell.mine = false;
    updateCellDisplay(cell.index); // Make sure mines are visually reset
  });

  // Randomly reassign mines
  const totalCells = gridSize * gridSize;
  const indices = [...Array(totalCells).keys()];
  for (let m = 0; m < mineCount; m++) {
    const i = Math.floor(Math.random() * indices.length);
    const index = indices.splice(i, 1)[0];
    cells[index].mine = true;
  }

  // Recalculate neighbor mines after shuffle
  calculateNeighborMines();
}



function placeMines(totalCells) {
  const indices = [...Array(totalCells).keys()];
  for (let m = 0; m < mineCount; m++) {
    const i = Math.floor(Math.random() * indices.length);
    const index = indices.splice(i, 1)[0];
    cells[index].mine = true;
  }
}

function calculateNeighborMines() {
  for (let i = 0; i < cells.length; i++) {
    const neighbors = getNeighborIndices(i);
    cells[i].neighborMines = neighbors.reduce((sum, n) => sum + (cells[n].mine ? 1 : 0), 0);
  }
}

function applyLevelTwists() {
  // Reset any previous twists
  cells.forEach(cell => {
    cell.el.classList.remove('hidden-cell', 'bonus');
    cell.bonus = false;
  });

  // Determine twist parameters based on current level
  let hiddenCellChance = 0;
  let bonusCount = 0;

  if (currentLevel >= 50 && currentLevel < 100) {
    hiddenCellChance = 0.05;
  } else if (currentLevel >= 100 && currentLevel < 150) {
    hiddenCellChance = 0.05;
    bonusCount = Math.floor(gridSize / 2);
  } else if (currentLevel >= 150 && currentLevel < 200) {
    hiddenCellChance = 0.1;
    bonusCount = Math.floor(gridSize / 2);
  } else if (currentLevel === 200) {
    hiddenCellChance = 0.1;
    bonusCount = Math.floor(gridSize / 1.5);
  }

  // Apply hidden cells
  if (hiddenCellChance > 0) {
    cells.forEach(cell => {
      if (Math.random() < hiddenCellChance) {
        cell.el.classList.add('hidden-cell');
      }
    });
  }

  // Apply bonus cells
  if (bonusCount > 0) {
    let candidates = cells.filter(c => !c.mine && !c.bonus);
    for (let i = 0; i < bonusCount && candidates.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * candidates.length);
      const randomCell = candidates.splice(randomIndex, 1)[0];
      randomCell.bonus = true;
      randomCell.el.classList.add('bonus');
    }
  }
}

// level
function checkLevelCompletion() {
  if (gameEnded) return false;

  const allSafeRevealed = cells.every(cell => cell.mine || cell.revealed);
  const allBonusesCollected = cells.every(cell => !cell.bonus || cell.revealed);

  if (currentLevel < 50) {
    return allSafeRevealed;
  } else if (currentLevel < 100) {
    return allSafeRevealed;
  } else if (currentLevel < 150) {
    return allSafeRevealed && allBonusesCollected;
  } else if (currentLevel < 200) {
    return allSafeRevealed && allBonusesCollected;
  } else if (currentLevel === 200) {
    return allSafeRevealed && allBonusesCollected;
  }

  return false;
}


function handleCellClick(e) {
  const index = parseInt(e.currentTarget.dataset.index);
  const cell = cells[index];
  if (cell.revealed || cell.flagged || gameEnded) return;

  revealCell(index);
  if (cell.mine) {
    bombSound.play();
    revealAllMines();
    gameEnded = true;
    clearInterval(timer);
    showModal('Game Over', '💥 You hit a mine!', false);
  } else if (cell.bonus) {
    bonusSound.play();
    autoRevealNeighbors(index);
  } else {
    clickSound.play();
  }
}

function handleRightClick(e) {
  e.preventDefault();
  const index = parseInt(e.currentTarget.dataset.index);
  const cell = cells[index];
  if (cell.revealed || gameEnded) return;
  cell.flagged = !cell.flagged;
  flagsUsed += cell.flagged ? 1 : -1;
  updateCellDisplay(index);
  flagSound.play();
}

function revealCell(index) {
  const cell = cells[index];
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;
  updateCellDisplay(index);
  if (cell.neighborMines === 0 && !cell.mine) getNeighborIndices(index).forEach(revealCell);
  checkWinCondition();
}

function revealAllMines() {
  cells.forEach((cell, i) => {
    if (cell.mine) {
      cell.revealed = true;
      updateCellDisplay(i);
    }
  });
}

function updateCellDisplay(index) {
  const cell = cells[index];
  const el = cell.el;
  el.classList.remove('flagged', 'mine', 'revealed');
  el.innerHTML = '';
  if (cell.flagged) {
    el.classList.add('flagged');
    el.innerHTML = '<i class="fas fa-flag"></i>';
  } else if (cell.revealed) {
    el.classList.add('revealed');
    if (cell.mine) {
      el.classList.add('mine');
      el.innerHTML = '<i class="fas fa-bomb"></i>';
    } else if (cell.neighborMines > 0) {
      el.textContent = cell.neighborMines;
      el.style.color = getNumberColor(cell.neighborMines);
    }
  }
}

function getNeighborIndices(index) {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr, c = col + dc;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize)
        neighbors.push(r * gridSize + c);
    }
  }
  return neighbors;
}

function autoRevealNeighbors(index) {
  getNeighborIndices(index).forEach(i => {
    if (!cells[i].revealed && !cells[i].flagged) revealCell(i);
  });
}

function checkWinCondition() {
  if (gameEnded) return;

  if (checkLevelCompletion()) {
    gameEnded = true;
    clearInterval(timer);
    victorySound.play();

    if (currentLevel >= 200) {
      showModal('🎉 Final Victory!', 'You completed all 200 levels!', true);
    } else {
      showModal(`Level ${currentLevel} Complete!`, '🎉 Well done!', true);
      // Remove automatic level progression
      // setTimeout(() => startGame(currentLevel + 1), 2500);
    }
  }
}


function showModal(title, message, isWin) {
  document.getElementById('gameModalLabel').textContent = title;
  document.getElementById('gameModalBody').textContent = message;
  const restartBtn = document.getElementById('modalRestartBtn');
  const nextBtn = document.getElementById('modalNextBtn');
  restartBtn.classList.remove('d-none');
  nextBtn.classList.toggle('d-none', !isWin);
  const modal = new bootstrap.Modal(document.getElementById('gameModal'));
  modal.show();
  restartBtn.onclick = () => { modal.hide(); startGame(1); };
  nextBtn.onclick = () => { modal.hide(); startGame(currentLevel + 1); };
}

// start level
function startLevelTimer(level, displayId = 'timerDisplay') {
  timeLeft = 30;
  const timerDisplay = document.getElementById(displayId);
  if (!timerDisplay) return;
  timerDisplay.textContent = `⏱️ ${timeLeft}s`;
  timerDisplay.classList.remove('blink');
  clearInterval(timer);
  timer = setInterval(() => {
    if (gameEnded) return clearInterval(timer);
    timeLeft--;
    timerDisplay.textContent = `⏱️ ${timeLeft}s`;

    if (timeLeft === 10 && !hasShuffled) {
      timerDisplay.classList.add('blink');
      shuffleMines(); // Automatically shuffle mines at 10s
      hasShuffled = true;
    }

    if (timeLeft <= 10) timerDisplay.classList.add('blink');
    if (timeLeft <= 0) {
      clearInterval(timer);
      gameEnded = true;
      timeoutSound.play();
      revealAllMines();
      showModal('⏰ Time\'s Up!', 'You ran out of time!', false);
    }
  }, 1000);
}




function getNumberColor(number) {
  const colors = ['', '#00f', '#008200', '#f00', '#000080', '#800000', '#008080', '#000', '#808080'];
  return colors[number] || '#000';
}

document.addEventListener('DOMContentLoaded', () => {
  startGame();
  ['click', 'touchstart', 'keydown'].forEach(event => document.addEventListener(event, tryStartMusic, { once: true }));
  document.getElementById('volumeControl')?.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    [clickSound, bonusSound, flagSound, bombSound, victorySound, timeoutSound, bgMusic, levelStartSound].forEach(s => s.volume = vol);
  });
});

document.addEventListener('keydown', (e) => {
  if (!cells.length) return;

  const key = e.key.toLowerCase();
  const row = Math.floor(focusedIndex / gridSize);
  const col = focusedIndex % gridSize;
  let newIndex = focusedIndex;

  // Handle controls when game is over
  if (gameEnded) {
    if (key === 'enter') {
      startGame(currentLevel); // Restart current level
    } else if (key === 'r') {
      startGame(1); // Restart from level 1
    }
    return;
  }

  // Movement logic  ksyboard controls
  if (key === 'arrowup' && row > 0) {
    newIndex -= gridSize;
  } else if (key === 'arrowdown' && row < gridSize - 1) {
    newIndex += gridSize;
  } else if (key === 'arrowleft' && col > 0) {
    newIndex -= 1;
  } else if (key === 'arrowright' && col < gridSize - 1) {
    newIndex += 1;
  } else if (key === 'enter' || key === ' ') {
    handleCellClick({ currentTarget: cells[focusedIndex].el });
  } else if (key === 'f') {
    handleRightClick({ preventDefault: () => {}, currentTarget: cells[focusedIndex].el });
  } else if (key === 'r') {
    startGame(1);
  }

  // Focus update
  if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < cells.length) {
    cells[focusedIndex].el.classList.remove('focused');
    focusedIndex = newIndex;
    cells[focusedIndex].el.classList.add('focused');
  }

// modal controls
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('gameModal');
  const isModalVisible = modal.classList.contains('show');
  if (!isModalVisible) return;

  const key = e.key.toLowerCase();
  const restartBtn = document.getElementById('modalRestartBtn');
  const nextBtn = document.getElementById('modalNextBtn');

  if (key === 'enter' || key === 'r') {
    restartBtn.click();
  } else if (key === 'n' && !nextBtn.classList.contains('d-none')) {
    nextBtn.click();
  }
});

// 
  if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < cells.length) {
    cells[focusedIndex].el.classList.remove('focused');
    focusedIndex = newIndex;
    cells[focusedIndex].el.classList.add('focused');
  }
});
