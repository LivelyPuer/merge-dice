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

        this.lastLeaderboardUpdate = 0;
        this.leaderboardUpdateInterval = 5000; // 5 seconds in milliseconds
        this.scoreChanged = false;

        // Load high scores from local storage
        this.highScores = loadFromLocalStorage('diceHighScores', []);

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

        // Set up leaderboard tabs
        this.setupLeaderboardTabs();

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
        // First try to show an ad if Yandex SDK is initialized
        if (this.yandexSDK && this.yandexSDK.initialized && typeof this.yandexSDK.showFullscreenAd === 'function') {
            console.log('Attempting to show ad before starting new game');
            // We'll show an ad and then start a new game when it's closed
            this.yandexSDK.showFullscreenAd()
                .then(result => {
                    console.log('Ad result:', result);
                    this.actuallyStartNewGame();
                })
                .catch(error => {
                    console.warn('Failed to show ad, starting game anyway:', error);
                    this.actuallyStartNewGame();
                });
        } else {
            // If SDK is not available, just start the game
            console.log('Ad functionality not available, starting game directly');
            this.actuallyStartNewGame();
        }
    }
    actuallyStartNewGame() {
        // Reset game state
        this.board = Array(this.boardSize * this.boardSize).fill(null);
        this.score = 0;
        this.moveCount = 0;
        this.highestDie = 1;
        this.selectedCell = null;
        this.gameOver = false;
        this.lastLeaderboardUpdate = 0;
        this.scoreChanged = false;
    
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
        
        // Save score after each merge
        this.saveScore();
        
        this.moveCount++;
    
        // Update highest die if needed
        if (newValue > this.highestDie) {
            this.highestDie = newValue;
            
            // Play upgrade sound for new highest die
            this.audio.playSound('upgrade');
            
            // Display achievement message for new highest die
            this.ui.showMessage(`New record: ${newValue}!`);
            setTimeout(() => this.ui.hideMessage(), 2000);
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

        // Force an immediate update to the leaderboard with the final score
        if (this.scoreChanged) {
            this.updateYandexLeaderboard();
        }

        // Show game over screen
        this.ui.showGameOver(this.score, this.highestDie);

        // Disable add die button
        this.updateAddDieButton();
    }
    checkPendingUpdates() {
        // If there are pending score changes, force an update
        if (this.scoreChanged) {
            this.updateYandexLeaderboard();
        }
    }

    /**
     * Save score to high scores
     */
    saveScore() {
        // Only save if game is active or just ended
        if (this.score <= 0) return;

        // Mark that the score has changed
        this.scoreChanged = true;

        // Create score entry for local storage
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
        saveToLocalStorage('diceHighScores', this.highScores);

        // Check if it's time to update the leaderboard
        const now = Date.now();
        if (now - this.lastLeaderboardUpdate >= this.leaderboardUpdateInterval) {
            this.updateYandexLeaderboard();
            this.lastLeaderboardUpdate = now;
        }
    }
    updateYandexLeaderboard() {
        // Only update if score has changed since last update
        if (!this.scoreChanged || this.score <= 0) return;
        
        // Reset the flag
        this.scoreChanged = false;
        
        // If Yandex SDK is available, check and save score there
        if (this.yandexSDK && this.yandexSDK.initialized) {
            console.log('Checking if score qualifies for leaderboard update:', this.score);
            
            // First, try to get the player's current leaderboard score
            this.yandexSDK.getPlayerLeaderboardScore()
                .then(currentScore => {
                    // If we have a current score, only update if new score is higher
                    if (currentScore !== null) {
                        if (this.score > currentScore) {
                            console.log(`Updating leaderboard: ${this.score} > ${currentScore}`);
                            this.yandexSDK.saveScore(this.score)
                                .then(success => {
                                    if (success) {
                                        console.log('New high score saved to leaderboard!');
                                        // Optionally show a message to the player
                                        this.ui.showMessage("New high score!");
                                        setTimeout(() => this.ui.hideMessage(), 2000);
                                    }
                                })
                                .catch(err => console.warn('Failed to save new high score:', err));
                        } else {
                            console.log(`Not updating leaderboard: ${this.score} <= ${currentScore}`);
                        }
                    } else {
                        // No current score, this is first time, so save
                        console.log('No previous score found, saving first score to leaderboard');
                        this.yandexSDK.saveScore(this.score)
                            .catch(err => console.warn('Failed to save first score:', err));
                    }
                })
                .catch(error => {
                    console.warn('Error checking player score:', error);
                    // On error checking score, try to save score anyway as a fallback
                    this.yandexSDK.saveScore(this.score)
                        .catch(err => console.warn('Failed to save fallback score:', err));
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
    updateLeaderboardUI() {
        const leaderboardBody = document.getElementById('leaderboard-tbody');
        const noScoresMessage = document.getElementById('no-scores-message');

        if (!leaderboardBody || !noScoresMessage) return;

        // Clear existing entries
        leaderboardBody.innerHTML = '';

        // Show no scores message if there are no scores
        if (this.highScores.length === 0) {
            noScoresMessage.style.display = 'block';
            return;
        } else {
            noScoresMessage.style.display = 'none';
        }

        // Add each score to the table
        this.highScores.forEach((entry, index) => {
            const row = document.createElement('tr');

            // Format the date
            const date = new Date(entry.date);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

            // Add rank emoji for top 3
            let rankDisplay = `${index + 1}`;
            if (index === 0) rankDisplay = `🥇 ${index + 1}`;
            else if (index === 1) rankDisplay = `🥈 ${index + 1}`;
            else if (index === 2) rankDisplay = `🥉 ${index + 1}`;

            row.innerHTML = `
                <td>${rankDisplay}</td>
                <td>${entry.score}</td>
                <td>${entry.highestDie}</td>
                <td>${formattedDate}</td>
            `;

            leaderboardBody.appendChild(row);
        });
    }

    /**
    * Set up leaderboard tabs
     */
    setupLeaderboardTabs() {
        const shareScoreBtn = document.getElementById('share-score-btn');
        const leaderboardModal = document.getElementById('leaderboard-modal');
        const closeLeaderboardBtn = document.getElementById('close-leaderboard');

        // Set up share button
        if (shareScoreBtn) {
            shareScoreBtn.addEventListener('click', () => this.shareScore());
        }

        // Close button
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.addEventListener('click', () => {
                leaderboardModal.style.display = 'none';
            });
        }

        // When leaderboard is opened, immediately try to load global scores
        document.getElementById('leaderboard-btn').addEventListener('click', () => {
            const globalLeaderboard = document.getElementById('global-leaderboard');
            leaderboardModal.style.display = 'flex';

            // Show loading message
            globalLeaderboard.innerHTML = '<div class="loading-leaderboard">Loading leaderboard data...</div>';

            // Try to fetch and display the Yandex leaderboard
            if (this.yandexSDK && this.yandexSDK.initialized) {
                this.yandexSDK.showLeaderboard().catch(error => {
                    console.warn('Failed to display Yandex leaderboard:', error);

                    // Show error message
                    globalLeaderboard.innerHTML = `
                        <div class="error-message">
                            <p>Could not load leaderboard data.</p>
                            <p>Error: ${error.message || 'Unknown error'}</p>
                        </div>
                    `;
                });
            } else {
                globalLeaderboard.innerHTML = `
                    <div class="global-leaderboard-message">
                        Leaderboard is only available when running in Yandex Games.
                        <p>Currently running in local/development mode.</p>
                    </div>
                `;
            }
        });
    }

    /**
     * Share the current score
     */
    shareScore() {
        if (!this.score) {
            this.ui.showMessage("Play a game first to share your score!");
            setTimeout(() => this.ui.hideMessage(), 2000);
            return;
        }

        // Try to use the Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: 'Dice Dynasty Score',
                text: `I just scored ${this.score} points in Dice Dynasty with a highest die of ${this.highestDie}! Can you beat it?`,
                url: window.location.href
            }).catch(error => {
                console.warn('Error sharing:', error);
            });
        } else {
            // Fallback: copy to clipboard
            const text = `I just scored ${this.score} points in Dice Dynasty with a highest die of ${this.highestDie}! Can you beat it?`;

            // Create a temporary textarea
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();

            try {
                document.execCommand('copy');
                this.ui.showMessage("Score copied to clipboard!");
            } catch (err) {
                this.ui.showMessage("Couldn't copy score");
            }

            document.body.removeChild(textarea);
            setTimeout(() => this.ui.hideMessage(), 2000);
        }
    }

}