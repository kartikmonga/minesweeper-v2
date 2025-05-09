// Minesweeper Game with Dynamic Grid and Mine Adjustments
const gameContainer = document.getElementById('game');
const levelDisplay = document.getElementById('levelDisplay');
let currentLevel = 1;
let gridSize, mineCount, flagsUsed;
let cells = [];
let gameEnded = false;
let timer, timeLeft = 0;
let focusedIndex = 0;

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
  if (currentLevel >= 50) {
    cells.forEach(cell => {
      if (Math.random() < 0.05) cell.el.classList.add('hidden-cell');
    });
  }

  if (currentLevel >= 125) {
    let bonuses = Math.floor(gridSize / 2);
    for (let i = 0; i < bonuses; i++) {
      const candidates = cells.filter(c => !c.mine && !c.bonus);
      const randomCell = candidates[Math.floor(Math.random() * candidates.length)];
      if (randomCell) {
        randomCell.bonus = true;
        randomCell.el.classList.add('bonus');
      }
    }
  }
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
  const allSafeRevealed = cells.every(cell => cell.mine || cell.revealed);
  if (allSafeRevealed) {
    gameEnded = true;
    clearInterval(timer);
    victorySound.play();
    if (currentLevel >= 200) {
      showModal('🎉 Final Victory!', 'You completed all 200 levels!', true);
    } else {
      showModal(`Level ${currentLevel} Complete!`, '🎉 Well done!', true);
      setTimeout(() => startGame(currentLevel + 1), 2500);
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
  if (gameEnded && e.key.toLowerCase() !== 'r') return;

  const row = Math.floor(focusedIndex / gridSize);
  const col = focusedIndex % gridSize;

  let newIndex = focusedIndex;

  switch (e.key) {
    case 'ArrowUp':
      if (row > 0) newIndex -= gridSize;
      break;
    case 'ArrowDown':
      if (row < gridSize - 1) newIndex += gridSize;
      break;
    case 'ArrowLeft':
      if (col > 0) newIndex -= 1;
      break;
    case 'ArrowRight':
      if (col < gridSize - 1) newIndex += 1;
      break;
    case 'Enter':
    case ' ':
      handleCellClick({ currentTarget: cells[focusedIndex].el });
      break;
    case 'f':
    case 'F':
      handleRightClick({ preventDefault: () => {}, currentTarget: cells[focusedIndex].el });
      break;
    case 'r':
    case 'R':
      startGame(1);
      break;
    default:
      return;
  }

  if (newIndex !== focusedIndex && newIndex >= 0 && newIndex < cells.length) {
    cells[focusedIndex].el.classList.remove('focused');
    focusedIndex = newIndex;
    cells[focusedIndex].el.classList.add('focused');
  }
});
