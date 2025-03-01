import { UI } from './ui';
import { AudioManager } from './audio';
import { getRandomInt, saveToLocalStorage, loadFromLocalStorage } from './utils';
import { YandexSDK } from './yandexSDK';

/**
 * Main game class that manages the game state and logic
 */
export class Game {
    /**
     * Creates a new game instance
     */
    constructor() {
        this.boardSize = 5;
        this.initialDice = 3;

        // Create the audio manager first
        this.audio = new AudioManager();

        // Then initialize the UI and other components
        this.ui = new UI(this);

        // Make sure audio methods are safely callable with optional chaining
        this.playSound = (soundName) => {
            this.audio?.playSound(soundName);
        };

        // Game state
        this.board = Array(this.boardSize * this.boardSize).fill(null);
        this.score = 0;
        this.moveCount = 0;
        this.highestDie = 1;
        this.selectedCell = null;
        this.gameOver = false;

        // Initialize UI and audio
        this.ui = new UI(this);
        this.audio = new AudioManager();

        this.yandexSDK = new YandexSDK(this);

        // Initialize the game
        this.init();
    }

    /**
     * Initialize the game
     */
    init() {
        // Set up UI elements and event listeners
        this.ui.createBoardCells();
        this.ui.setupEventListeners();

        // Set up add die button
        this.setupAddDieButton();

        // Start new game
        this.startNewGame();
    }

    /**
     * Set up the add die button
     */
    setupAddDieButton() {
        // Get reference to the existing button
        const addDieBtn = document.getElementById('add-die-btn');

        if (addDieBtn) {
            // Add event listener
            addDieBtn.addEventListener('click', () => this.addRandomDie());

            // Initial button state
            this.updateAddDieButton();
        }
    }

    /**
     * Start a new game
     */
    startNewGame() {
        // Reset game state
        this.board = Array(this.boardSize * this.boardSize).fill(null);
        this.score = 0;
        this.moveCount = 0;
        this.highestDie = 1;
        this.selectedCell = null;
        this.gameOver = false;

        // Clear all cells in UI
        this.ui.resetBoard();

        // Add initial dice
        for (let i = 0; i < this.initialDice; i++) {
            this.addRandomDie();
        }

        // Update displays
        this.ui.updateScore(this.score, this.highestDie);
        this.ui.hideGameOver();

        // Enable/disable add die button based on available space
        this.updateAddDieButton();
    }

    /**
     * Update the add die button state (enabled/disabled)
     */
    updateAddDieButton() {
        const addDieBtn = document.getElementById('add-die-btn');
        if (!addDieBtn) return;

        // Check if there are any empty cells
        const hasEmptyCells = this.board.includes(null);

        // Enable/disable button
        addDieBtn.disabled = !hasEmptyCells || this.gameOver;

        // Update button appearance
        if (!hasEmptyCells || this.gameOver) {
            addDieBtn.classList.add('disabled');
        } else {
            addDieBtn.classList.remove('disabled');
        }
    }

    /**
     * Handle cell click event
     * @param {number} index - Index of the clicked cell
     */
    handleCellClick(index) {
        if (this.gameOver) return;

        // If there's no die in this cell, ignore the click
        if (this.board[index] === null) return;

        // If nothing is selected yet, select this cell
        if (this.selectedCell === null) {
            this.selectedCell = index;
            this.ui.selectCell(index);
            this.audio.playSound('select');
            return;
        }

        // If clicking on the already selected cell, deselect it
        if (this.selectedCell === index) {
            this.ui.deselectCell(index);
            this.selectedCell = null;
            return;
        }

        // If the dice values match, merge them
        if (this.board[this.selectedCell] === this.board[index]) {
            this.mergeDice(this.selectedCell, index);
        } else {
            // If they don't match, deselect the previous cell and select this one
            this.ui.deselectCell(this.selectedCell);
            this.selectedCell = index;
            this.ui.selectCell(index);
            this.audio.playSound('select');
        }
    }

    /**
     * Merge two dice
     * @param {number} index1 - Index of the first die
     * @param {number} index2 - Index of the second die
     */
    mergeDice(index1, index2) {
        // Get the value of the dice being merged
        const value = this.board[index1];

        // Create a new die with value + 1
        const newValue = value + 1;

        // Remove dice from both cells
        this.board[index1] = null;
        this.board[index2] = null;

        // Update UI
        this.ui.clearCell(index1);
        this.ui.clearCell(index2);

        // Place new die in the second cell
        this.board[index2] = newValue;
        this.ui.renderDie(index2, newValue);
        this.ui.animateMerge(index2);

        // Play merge sound
        this.audio.playSound('merge');

        // Update score
        this.score += newValue * 2;

        this.saveScore();
        
        this.moveCount++;

        // Update highest die if needed
        if (newValue > this.highestDie) {
            this.highestDie = newValue;
        }

        // Clear selection
        this.ui.deselectCell(index1);
        this.selectedCell = null;

        // Update displays
        this.ui.updateScore(this.score, this.highestDie);

        // Update add die button state
        this.updateAddDieButton();

        // Check if game is over
        if (this.isGameOver()) {
            this.handleGameOver();
        }
    }

    /**
     * Add a random die to an empty cell
     */
    addRandomDie() {
        // Find all empty cells
        const emptyCells = this.board.map((val, idx) => val === null ? idx : -1).filter(idx => idx !== -1);

        // If there are no empty cells, disable button and return
        if (emptyCells.length === 0) {
            this.updateAddDieButton();
            return;
        }

        // Choose a random empty cell
        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];

        // Determine the value of the new die (1 with 70% probability, 2 with 30% probability)
        const value = Math.random() < 0.7 ? 1 : 2;

        // Place the new die
        this.board[randomIndex] = value;
        this.ui.renderDie(randomIndex, value);
        this.ui.animateNew(randomIndex);

        // Play place sound
        this.audio.playSound('place');

        // Check if board is full
        this.updateAddDieButton();

        // Check if game is over
        if (this.isGameOver()) {
            this.handleGameOver();
        }
    }

    /**
     * Check if the game is over
     * @returns {boolean} True if game is over
     */
    isGameOver() {
        // If there are any empty cells, game is not over
        if (this.board.includes(null)) {
            return false;
        }

        // Check if there are any possible merges
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const index = row * this.boardSize + col;
                const value = this.board[index];

                // Check right neighbor
                if (col < this.boardSize - 1) {
                    const rightIndex = row * this.boardSize + (col + 1);
                    if (this.board[rightIndex] === value) return false;
                }

                // Check bottom neighbor
                if (row < this.boardSize - 1) {
                    const bottomIndex = (row + 1) * this.boardSize + col;
                    if (this.board[bottomIndex] === value) return false;
                }
            }
        }

        // No empty cells and no possible merges
        return true;
    }

    /**
     * Handle game over
     */
    handleGameOver() {
        this.gameOver = true;
        this.audio.playSound('gameover');

        // Save score to high scores if it qualifies
        this.saveScore();

        // Show game over screen
        this.ui.showGameOver(this.score, this.highestDie);

        // Disable add die button
        this.updateAddDieButton();
    }

    /**
     * Save score to high scores
     */
    saveScore() {
        // Create score entry
        const scoreEntry = {
            score: this.score,
            highestDie: this.highestDie,
            date: new Date().toISOString()
        };

        // Add to high scores
        this.highScores.push(scoreEntry);

        // Sort by score (descending)
        this.highScores.sort((a, b) => b.score - a.score);

        // Keep only top 10
        if (this.highScores.length > 10) {
            this.highScores = this.highScores.slice(0, 10);
        }

        // Save to local storage
        if (this.yandexSDK && this.yandexSDK.initialized) {
            this.yandexSDK.saveScore(this.score).catch(error => {
                console.warn('Failed to save score to Yandex leaderboard', error);
            });
        }
    }
    showYandexLeaderboard() {
        if (this.yandexSDK && this.yandexSDK.initialized) {
            this.yandexSDK.showLeaderboard().catch(error => {
                console.warn('Failed to open Yandex leaderboard', error);
            });
        }
    }
    /**
     * Get high scores
     * @returns {Array} Array of high score objects
     */
    getHighScores() {
        return this.highScores;
    }
}