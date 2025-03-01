import { UI } from './ui';
import { AudioManager } from './audio';
import { getRandomInt, saveToLocalStorage, loadFromLocalStorage } from './utils';
import { YandexSDK } from './yandexSDK';
import { Localization } from './localization';

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
        this.leaderboardUpdateInterval = 30000; // 30 seconds in milliseconds
        this.scoreChanged = false;

        // Load high scores from local storage
        this.highScores = loadFromLocalStorage('diceHighScores', []);

        // Initialize UI
        this.ui = new UI(this);

        // Initialize localization first with default settings
        this.localization = new Localization();

        // Initialize Yandex SDK
        this.yandexSDK = new YandexSDK(this);

        // Wait for SDK initialization before starting the game
        this.waitForSDKInitialization();
    }
    /*
    * Wait for the Yandex SDK to initialize before proceeding
    */
    waitForSDKInitialization() {
        // Define a check function
        const checkSDKInit = () => {
            if (this.yandexSDK.initialized) {
                // SDK is initialized, now initialize localization with SDK
                this.initLocalization();
            } else {
                // Check again after a short delay
                setTimeout(checkSDKInit, 100);
            }
        };

        // Start checking
        checkSDKInit();
    }

    /**
  * Initialize localization
  */
    async initLocalization() {
        try {
            // Initialize localization with Yandex SDK
            await this.localization.init(this.yandexSDK);
            
            // Register for language change events
            document.addEventListener('languageChanged', () => {
                this.onLanguageChange();
            });
            
            // Initialize the game
            this.init();
        } catch (error) {
            console.error('Error initializing localization:', error);
            // Fallback: still initialize the game even if localization fails
            this.init();
        }
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

        // Set up language switcher
        this.setupLanguageSwitcher();

        // Update UI with current language
        this.updateUI();

        // Start new game
        this.startNewGame();
    }

    /**
     * Set up language switcher
     */
    setupLanguageSwitcher() {
        // Create language selector in settings menu
        const settingsMenu = document.getElementById('settings-menu');
        if (!settingsMenu) return;

        // Add language option to settings
        const languageOption = document.createElement('div');
        languageOption.className = 'settings-option';

        // Create label
        const label = document.createElement('span');
        label.id = 'language-label';
        label.textContent = this.localization.get('language');

        // Create dropdown
        const select = document.createElement('select');
        select.id = 'language-select';

        // Add options for each language
        const languages = this.localization.getAvailableLanguages();
        Object.keys(languages).forEach(langCode => {
            const option = document.createElement('option');
            option.value = langCode;
            option.textContent = languages[langCode];

            // Set current language as selected
            if (langCode === this.localization.currentLanguage) {
                option.selected = true;
            }

            select.appendChild(option);
        });

        // Add event listener for language change
        select.addEventListener('change', () => {
            this.localization.setLanguage(select.value);
        });

        // Add elements to settings menu
        languageOption.appendChild(label);
        languageOption.appendChild(select);
        settingsMenu.appendChild(languageOption);
    }
    /**
        * Update UI elements with localized text
        */
    updateUI() {
        // Update page title
        document.title = this.localization.get('game_title');

        // Update headings
        const headings = document.querySelectorAll('h1, h2, h3');
        headings.forEach(heading => {
            if (heading.dataset.locKey) {
                heading.textContent = this.localization.get(heading.dataset.locKey);
            }
        });

        // Update buttons
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            if (button.dataset.locKey) {
                button.textContent = this.localization.get(button.dataset.locKey);
            }
        });

        // Update specific elements
        this.updateSpecificElements();

        // Update settings menu
        this.updateSettingsMenu();

        // Update tutorial
        this.updateTutorial();

        // Update leaderboard
        this.updateLeaderboardUI();
    }
    /**
  * Update specific UI elements with localized text
  */
    updateSpecificElements() {
        // Game title
        const gameTitle = document.querySelector('h1');
        if (gameTitle) {
            gameTitle.textContent = this.localization.get('game_title');
        }

        // Score label
        const scoreLabel = document.querySelector('.score');
        if (scoreLabel) {
            // Get the current score value
            const scoreValue = document.getElementById('score').textContent;

            // Clear the element
            scoreLabel.innerHTML = '';

            // Create the text node with localized label
            const textNode = document.createTextNode(this.localization.get('score') + ': ');
            scoreLabel.appendChild(textNode);

            // Create the span for the value
            const scoreSpan = document.createElement('span');
            scoreSpan.id = 'score';
            scoreSpan.textContent = scoreValue;
            scoreLabel.appendChild(scoreSpan);
        }

        // Highest die label
        const highestLabel = document.querySelector('.highest-die');
        if (highestLabel) {
            // Get the current highest value
            const highestValue = document.getElementById('highest-die').textContent;

            // Clear the element
            highestLabel.innerHTML = '';

            // Create the text node with localized label
            const textNode = document.createTextNode(this.localization.get('highest') + ': ');
            highestLabel.appendChild(textNode);

            // Create the span for the value
            const highestSpan = document.createElement('span');
            highestSpan.id = 'highest-die';
            highestSpan.textContent = highestValue;
            highestLabel.appendChild(highestSpan);
        }

        // Add die button
        const addDieBtn = document.getElementById('add-die-btn');
        if (addDieBtn) {
            addDieBtn.textContent = this.localization.get('add_dice');
        }

        // New game button
        const newGameBtn = document.getElementById('new-game-btn');
        if (newGameBtn) {
            newGameBtn.textContent = this.localization.get('new_game');
        }

        // Game over screen
        const gameOverTitle = document.querySelector('#game-over h2');
        if (gameOverTitle) {
            gameOverTitle.textContent = this.localization.get('game_over');
        }

        // Final score
        const finalScoreText = document.querySelector('#game-over p:nth-child(2)');
        if (finalScoreText) {
            // Get the current score value
            const finalScoreValue = document.getElementById('final-score').textContent;

            // Clear the element
            finalScoreText.innerHTML = '';

            // Create the text node with localized label
            const textNode = document.createTextNode(this.localization.get('final_score') + ': ');
            finalScoreText.appendChild(textNode);

            // Create the span for the value
            const finalScoreSpan = document.createElement('span');
            finalScoreSpan.id = 'final-score';
            finalScoreSpan.textContent = finalScoreValue;
            finalScoreText.appendChild(finalScoreSpan);
        }

        // Final highest die
        const finalHighestText = document.querySelector('#game-over p:nth-child(3)');
        if (finalHighestText) {
            // Get the current highest value
            const finalHighestValue = document.getElementById('final-highest').textContent;

            // Clear the element
            finalHighestText.innerHTML = '';

            // Create the text node with localized label
            const textNode = document.createTextNode(this.localization.get('highest_die') + ': ');
            finalHighestText.appendChild(textNode);

            // Create the span for the value
            const finalHighestSpan = document.createElement('span');
            finalHighestSpan.id = 'final-highest';
            finalHighestSpan.textContent = finalHighestValue;
            finalHighestText.appendChild(finalHighestSpan);
        }

        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.textContent = this.localization.get('play_again');
        }
    }
    /**
     * Update settings menu
     */
    updateSettingsMenu() {
        // Settings title
        const settingsTitle = document.querySelector('#settings-menu h3');
        if (settingsTitle) {
            settingsTitle.textContent = this.localization.get('settings');
        }

        // Sound label
        const soundLabel = document.querySelector('#settings-menu .settings-option:first-child span');
        if (soundLabel) {
            soundLabel.textContent = this.localization.get('sound');
        }

        // Language label
        const languageLabel = document.getElementById('language-label');
        if (languageLabel) {
            languageLabel.textContent = this.localization.get('language');
        }
    }

    /**
     * Update tutorial text
     */
    updateTutorial() {
        // Tutorial title
        const tutorialTitle = document.querySelector('.tutorial h3');
        if (tutorialTitle) {
            tutorialTitle.textContent = this.localization.get('tutorial_title');
        }

        // Tutorial steps
        const tutorialSteps = document.querySelectorAll('.tutorial p');
        tutorialSteps.forEach((step, index) => {
            step.textContent = this.localization.get(`tutorial_${index + 1}`);
        });

        // Got it button
        const gotItBtn = document.getElementById('close-tutorial');
        if (gotItBtn) {
            gotItBtn.textContent = this.localization.get('got_it');
        }
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
    
            // Update text with localization and adjust for length
            this.updateAddDieButtonText(addDieBtn);
    
            // Initial button state
            this.updateAddDieButton();
        }
    }
    /**
     * Update the add die button text and adjust styling if needed
     * @param {HTMLElement} button - The button element 
     */
    updateAddDieButtonText(button) {
        if (!button) return;
        
        // Get localized text
        const localizedText = this.localization.get('add_dice');
        button.textContent = localizedText;
        
        // Check text length and adjust style for long text
        if (localizedText.length > 12) {
            button.classList.add('long-text');
        } else {
            button.classList.remove('long-text');
        }
    }
    /**
     * Handle language change for the add die button
     */
    onLanguageChange() {
        // Update all UI text
        this.updateUI();
        
        // Update the add die button text specifically
        const addDieBtn = document.getElementById('add-die-btn');
        if (addDieBtn) {
            this.updateAddDieButtonText(addDieBtn);
        }
        
        // Update the game title
        const gameTitle = document.querySelector('h1');
        if (gameTitle) {
            gameTitle.textContent = this.localization.get('game_title');
        }
        
        // Any other language-specific adjustments can go here
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

            // Display localized achievement message for new highest die
            const message = this.localization.get('new_record', { value: newValue });
            this.ui.showMessage(message);
            setTimeout(() => this.ui.hideMessage(), 2000);
        }

        // Clear selection
        this.ui.deselectCell(index1);
        this.selectedCell = null;

        // Update displays
        this.ui.updateScore(this.score, this.highestDie);

        // Update add die button
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

        // Show game over screen with localized text
        this.ui.showGameOver(
            this.score,
            this.highestDie
        );

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
    /**
     * Update Yandex leaderboard with the current score,
     * but only if it's higher than the existing score
     */
    updateYandexLeaderboard() {
        // Only update if score has changed since last update
        if (!this.scoreChanged || this.score <= 0) return;
        
        // Reset the flag
        this.scoreChanged = false;
        
        // If Yandex SDK is available, check and save score
        if (this.yandexSDK && this.yandexSDK.initialized) {
            console.log('Checking if score qualifies for leaderboard update:', this.score);
            
            // First, try to get the player's current leaderboard score
            this.yandexSDK.getPlayerLeaderboardScore()
                .then(currentScore => {
                    // If we have a current score, only update if new score is higher
                    if (currentScore !== null) {
                        if (this.score > currentScore) {
                            console.log(`Updating leaderboard: ${this.score} > ${currentScore}`);
                            this.saveScoreToLeaderboard();
                        } else {
                            console.log(`Not updating leaderboard: ${this.score} <= ${currentScore}`);
                            // Don't update if the current score is not higher
                        }
                    } else {
                        // No current score found, this is first time, so save
                        console.log('No previous score found, saving first score to leaderboard');
                        this.saveScoreToLeaderboard();
                    }
                })
                .catch(error => {
                    console.warn('Error checking player score:', error);
                    // On error checking score, we'll still try to save the score
                    // The Yandex SDK should prevent lower scores from overwriting higher ones
                    this.saveScoreToLeaderboard();
                });
        }
    }
    /**
     * Helper method to save the score to the leaderboard
     * and show appropriate UI feedback
     */
    saveScoreToLeaderboard() {
        this.yandexSDK.saveScore(this.score)
            .then(success => {
                if (success) {
                    console.log('Score saved to leaderboard!');
                    // Show message only when game is over
                    if (this.gameOver) {
                        const message = this.localization.get('new_high_score');
                        this.ui.showMessage(message);
                        setTimeout(() => this.ui.hideMessage(), 2000);
                    }
                }
            })
            .catch(err => console.warn('Failed to save score:', err));
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
        const leaderboardTitle = document.querySelector('.leaderboard-content h2');
        const leaderboardDescription = document.querySelector('.leaderboard-description');
        const closeButton = document.getElementById('close-leaderboard');

        // Update static text elements
        if (leaderboardTitle) {
            leaderboardTitle.textContent = `${this.localization.get('game_title')} ${this.localization.get('leaderboard')}`;
        }

        if (leaderboardDescription) {
            leaderboardDescription.textContent = this.localization.get('leaderboard_description', {
                game: this.localization.get('game_title')
            });
        }

        if (closeButton) {
            closeButton.textContent = this.localization.get('close');
        }

        if (!leaderboardBody || !noScoresMessage) return;

        // Clear existing entries
        leaderboardBody.innerHTML = '';

        // Show no scores message if there are no scores
        if (this.highScores.length === 0) {
            noScoresMessage.style.display = 'block';
            noScoresMessage.textContent = this.localization.get('no_scores_message');
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

        // Update the table headers
        const tableHeaders = document.querySelectorAll('#leaderboard-table th');
        if (tableHeaders.length >= 4) {
            tableHeaders[0].textContent = this.localization.get('rank');
            tableHeaders[1].textContent = this.localization.get('score');
            tableHeaders[2].textContent = this.localization.get('highest_die');
            // Keep date column as is
        }
    }


    /**
      * Set up leaderboard tabs with localized text
      */
    setupLeaderboardTabs() {
        const shareScoreBtn = document.getElementById('share-score-btn');
        const leaderboardModal = document.getElementById('leaderboard-modal');
        const closeLeaderboardBtn = document.getElementById('close-leaderboard');
        const leaderboardBtn = document.getElementById('leaderboard-btn');

        // Set up share button
        if (shareScoreBtn) {
            shareScoreBtn.textContent = this.localization.get('share_score');
            shareScoreBtn.addEventListener('click', () => this.shareScore());
        }

        // Close button
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.textContent = this.localization.get('close');
            closeLeaderboardBtn.addEventListener('click', () => {
                leaderboardModal.style.display = 'none';
            });
        }

        // When leaderboard is opened, immediately try to load global scores
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => {
                const globalLeaderboard = document.getElementById('global-leaderboard');
                leaderboardModal.style.display = 'flex';

                // Show loading message
                globalLeaderboard.innerHTML = `<div class="loading-leaderboard">${this.localization.get('loading_leaderboard')}</div>`;

                // Try to fetch and display the Yandex leaderboard
                if (this.yandexSDK && this.yandexSDK.initialized) {
                    this.yandexSDK.showLeaderboard(this.localization).catch(error => {
                        console.warn('Failed to display Yandex leaderboard:', error);

                        // Show error message
                        globalLeaderboard.innerHTML = `
                        <div class="error-message">
                            <p>${this.localization.get('error_loading')}</p>
                            <p>Error: ${error.message || 'Unknown error'}</p>
                        </div>
                    `;
                    });
                } else {
                    globalLeaderboard.innerHTML = `
                    <div class="global-leaderboard-message">
                        ${this.localization.get('leaderboard_unavailable')}
                        <p>${this.localization.get('dev_mode')}</p>
                    </div>
                `;
                }
            });
        }
    }

    /**
     * Share the current score
     */
    shareScore() {
        if (!this.score) {
            this.ui.showMessage(this.localization.get('play_first'));
            setTimeout(() => this.ui.hideMessage(), 2000);
            return;
        }

        // Get localized share text with score and highest die values
        const shareText = this.localization.get('share_text', {
            score: this.score,
            highestDie: this.highestDie
        });

        // Try to use the Web Share API if available
        if (navigator.share) {
            navigator.share({
                title: this.localization.get('game_title'),
                text: shareText,
                url: window.location.href
            }).catch(error => {
                console.warn('Error sharing:', error);
            });
        } else {
            // Fallback: copy to clipboard
            const textarea = document.createElement('textarea');
            textarea.value = shareText;
            document.body.appendChild(textarea);
            textarea.select();

            try {
                document.execCommand('copy');
                this.ui.showMessage(this.localization.get('score_copied'));
            } catch (err) {
                this.ui.showMessage(this.localization.get('error_copying'));
            }

            document.body.removeChild(textarea);
            setTimeout(() => this.ui.hideMessage(), 2000);
        }
    }
}