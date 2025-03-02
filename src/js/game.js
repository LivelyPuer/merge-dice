import { UI } from './ui';
import { AudioManager } from './audio';
import { getRandomInt, saveToLocalStorage, loadFromLocalStorage } from './utils';
import { Localization } from './localization';
import { CrazyGamesSDK } from './crazyGamesSDK';

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

        // Initialize Crazy Games SDK
        this.crazyGamesSDK = new CrazyGamesSDK(this);

        // Wait for SDK initialization before starting the game
        this.waitForSDKInitialization();
    }

    /*
     * Wait for the SDK to initialize before proceeding
     */
    waitForSDKInitialization() {
        // Define a check function
        const checkSDKInit = () => {
            if (this.crazyGamesSDK.initialized) {
                // SDK is initialized, now initialize localization
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
            // Initialize localization without Yandex SDK
            await this.localization.init();

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

        // Force gameplay start - Call this a few seconds after game is ready
        setTimeout(() => {
            this.triggerGameplayStart();
        }, 1000);
    }
    triggerGameplayStart() {
        // Only trigger if the game is in a playable state
        if (this.gameOver) return;

        console.log('Game is in playable state, triggering gameplay start event');

        if (this.crazyGamesSDK && this.crazyGamesSDK.initialized) {
            // Call the gameplay start method directly
            this.crazyGamesSDK.forceGameplayStart();

            // Add a visual indicator in QA mode to confirm the event was triggered
            if (this.isQAEnvironment) {
                const indicator = document.createElement('div');
                indicator.style.position = 'fixed';
                indicator.style.bottom = '10px';
                indicator.style.left = '10px';
                indicator.style.background = 'green';
                indicator.style.color = 'white';
                indicator.style.padding = '5px';
                indicator.style.borderRadius = '5px';
                indicator.style.zIndex = '9999';
                indicator.textContent = '✅ Gameplay Start Triggered';
                document.body.appendChild(indicator);

                // Remove after 5 seconds
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.parentNode.removeChild(indicator);
                    }
                }, 5000);
            }
        }
    }
    /**
     * Set up language switcher
     */
    setupLanguageSwitcher() {
        // Look for the language select element in the new settings modal structure
        const languageSelect = document.getElementById('language-select');
        const languageLabel = document.getElementById('language-label');

        // Exit if either element doesn't exist
        if (!languageSelect || !languageLabel) {
            console.warn('Language switcher elements not found in the DOM');
            return;
        }

        // Update the label with localized text
        languageLabel.textContent = this.localization.get('language');

        // Clear any existing options
        languageSelect.innerHTML = '';

        // Get available languages and add options
        const languages = this.localization.getAvailableLanguages();
        Object.keys(languages).forEach(langCode => {
            const option = document.createElement('option');
            option.value = langCode;
            option.textContent = languages[langCode];

            // Set current language as selected
            if (langCode === this.localization.currentLanguage) {
                option.selected = true;
            }

            languageSelect.appendChild(option);
        });

        // Add event listener for language change
        languageSelect.addEventListener('change', () => {
            this.localization.setLanguage(languageSelect.value);
        });

        console.log('Language switcher initialized with', Object.keys(languages).length, 'languages');
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

        // Watch ad button
        const watchAdBtn = document.getElementById('watch-ad-btn');
        if (watchAdBtn) {
            watchAdBtn.textContent = this.localization.get('watch_ad_for_dice');
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
        // Try to show an ad if Crazy Games SDK is initialized
        if (this.crazyGamesSDK && this.crazyGamesSDK.initialized) {
            console.log('Attempting to show ad before starting new game');
            // We'll show an ad and then start a new game when it's closed
            this.crazyGamesSDK.showMidgameAd()
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

    /**
     * Actually start a new game (after potentially showing an ad)
     */
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

        // Track gameplay start directly using window object to ensure it works
        try {
            if (window.CrazyGames && window.CrazyGames.SDK &&
                window.CrazyGames.SDK.game &&
                typeof window.CrazyGames.SDK.game.gameplayStart === 'function') {

                console.log('Calling gameplayStart directly from window');
                window.CrazyGames.SDK.game.gameplayStart();
            }
        } catch (error) {
            console.warn('Error calling direct gameplayStart:', error);
        }

        // Also try through our SDK wrapper
        if (this.crazyGamesSDK && this.crazyGamesSDK.initialized) {
            this.crazyGamesSDK.trackGameplayStart();
        }
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
        if (this.crazyGamesSDK && this.crazyGamesSDK.initialized && !this.crazyGamesSDK.gameplayStarted) {
            console.log('First interaction detected, triggering gameplay start');
            this.crazyGamesSDK.forceGameplayStart();
        }

        // Rest of the existing method...
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
     * Add extra dice through a rewarded ad with improved SDK checks
     */
    addExtraDiceWithAd() {
        // Check for CrazyGames SDK in window object first
        const sdkAvailable = window.CrazyGames && window.CrazyGames.SDK;

        // If SDK isn't available in window, check our reference
        if (!sdkAvailable && (!this.crazyGamesSDK || !this.crazyGamesSDK.initialized)) {
            console.warn('Cannot show rewarded ad: Crazy Games SDK not initialized');

            // Show a user-friendly message instead of just failing silently
            const message = this.localization && this.localization.isLoaded ?
                this.localization.get('ad_not_available') :
                'Ads not available right now. Try again later.';

            this.ui.showMessage(message);
            setTimeout(() => this.ui.hideMessage(), 2000);
            return;
        }

        // Don't show ad if the board is full
        const emptyCells = this.board.filter(cell => cell === null).length;
        if (emptyCells === 0) {
            // Show message that board is full
            const message = this.localization && this.localization.isLoaded ?
                this.localization.get('board_full') :
                'Board is full!';

            this.ui.showMessage(message);
            setTimeout(() => this.ui.hideMessage(), 2000);
            return;
        }

        // Show a loading message
        const loadingMessage = this.localization && this.localization.isLoaded ?
            this.localization.get('watching_ad') :
            'Watching ad...';

        this.ui.showMessage(loadingMessage);

        // Reward function - add 3 dice when ad is completed
        const giveReward = () => {
            // Hide the loading message
            this.ui.hideMessage();
            
            // Add the dice
            let diceAdded = 0;
            for (let i = 0; i < 3; i++) {
                // Make sure there's still space on the board
                if (this.board.includes(null)) {
                    this.addRandomDie();
                    diceAdded++;
                } else {
                    break;
                }
            }
            
            // Show reward message
            const message = this.localization ? 
                this.localization.get('extra_dice_added') : 
                `+${diceAdded} Dice Added!`;
                
            this.ui.showMessage(message);
            setTimeout(() => this.ui.hideMessage(), 2000);
            
            // Log reward claimed (removed trackEvent call)
            console.log('Reward claimed: extra dice', diceAdded);
        };

        // Handle errors if the ad fails to show
        const handleAdError = () => {
            this.ui.hideMessage();

            const errorMessage = this.localization && this.localization.isLoaded ?
                this.localization.get('ad_error') :
                'Could not show ad. Try again later.';

            this.ui.showMessage(errorMessage);
            setTimeout(() => this.ui.hideMessage(), 2000);
        };

        // Try showing the rewarded ad
        try {
            // Use the global SDK if available
            if (sdkAvailable && (!this.crazyGamesSDK || !this.crazyGamesSDK.initialized)) {
                console.log('Using global SDK for rewarded ad');

                try {
                    window.CrazyGames.SDK.ad.requestAd('rewarded');

                    // Simple ad event handlers
                    const onAdFinished = () => {
                        window.CrazyGames.SDK.ad.removeEventListener('adFinished', onAdFinished);
                        window.CrazyGames.SDK.ad.removeEventListener('adError', onAdError);
                        giveReward();
                    };

                    const onAdError = (error) => {
                        window.CrazyGames.SDK.ad.removeEventListener('adFinished', onAdFinished);
                        window.CrazyGames.SDK.ad.removeEventListener('adError', onAdError);
                        console.warn('Rewarded ad error:', error);
                        handleAdError();
                    };

                    window.CrazyGames.SDK.ad.addEventListener('adFinished', onAdFinished);
                    window.CrazyGames.SDK.ad.addEventListener('adError', onAdError);
                } catch (error) {
                    console.error('Error using global SDK for rewarded ad:', error);
                    handleAdError();
                }
            } else {
                // Use our SDK instance
                this.crazyGamesSDK.showRewardedAd(giveReward)
                    .then(success => {
                        if (!success) {
                            handleAdError();
                        }
                    })
                    .catch(error => {
                        console.error('Error showing rewarded ad:', error);
                        handleAdError();
                    });
            }
        } catch (error) {
            console.error('Unexpected error in addExtraDiceWithAd:', error);
            handleAdError();
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

        // Track gameplay stop using direct window access
        try {
            if (window.CrazyGames && window.CrazyGames.SDK &&
                window.CrazyGames.SDK.game &&
                typeof window.CrazyGames.SDK.game.gameplayStop === 'function') {

                console.log('Calling gameplayStop directly from window');
                window.CrazyGames.SDK.game.gameplayStop();
            }
        } catch (error) {
            console.warn('Error calling direct gameplayStop:', error);
        }

        // Also try through our SDK wrapper
        if (this.crazyGamesSDK && this.crazyGamesSDK.initialized) {
            this.crazyGamesSDK.trackGameplayStop();
        }

        // Show game over screen
        this.ui.showGameOver(
            this.score,
            this.highestDie
        );

        // Disable add die button
        this.updateAddDieButton();
    }

    /**
     * Check pending updates
     */
    checkPendingUpdates() {
        // This function was previously used for Yandex SDK
        // Now it's empty since we've removed Yandex integration
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
    }

    /**
     * Get high scores
     * @returns {Array} Array of high score objects
     */
    getHighScores() {
        return this.highScores;
    }

    /**
     * Update leaderboard UI
     */
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

        // When leaderboard is opened, show local high scores
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => {
                leaderboardModal.style.display = 'flex';

                // Make sure the leaderboard has a proper structure for local scores
                const globalLeaderboard = document.getElementById('global-leaderboard');
                if (globalLeaderboard) {
                    // Create a standard table structure if it doesn't exist
                    if (!document.getElementById('leaderboard-table')) {
                        const table = document.createElement('table');
                        table.id = 'leaderboard-table';
                        table.className = 'leaderboard-table';

                        const thead = document.createElement('thead');
                        thead.innerHTML = `
                            <tr>
                                <th>${this.localization.get('rank')}</th>
                                <th>${this.localization.get('score')}</th>
                                <th>${this.localization.get('highest_die')}</th>
                                <th>Date</th>
                            </tr>
                        `;

                        const tbody = document.createElement('tbody');
                        tbody.id = 'leaderboard-tbody';

                        table.appendChild(thead);
                        table.appendChild(tbody);

                        // No scores message
                        const noScores = document.createElement('div');
                        noScores.id = 'no-scores-message';
                        noScores.className = 'no-scores-message';
                        noScores.style.display = 'none';

                        globalLeaderboard.innerHTML = '';
                        globalLeaderboard.appendChild(table);
                        globalLeaderboard.appendChild(noScores);
                    }

                    // Update the leaderboard with current scores
                    this.updateLeaderboardUI();
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
    inviteFriends() {
        if (!this.crazyGamesSDK || !this.crazyGamesSDK.initialized) {
            console.warn('Cannot invite friends: SDK not initialized');
            return;
        }

        // Get localized share text
        const shareText = this.localization.get('share_text', {
            score: this.score,
            highestDie: this.highestDie
        });

        this.crazyGamesSDK.requestInviteLink({
            title: this.localization.get('game_title'),
            text: shareText
        });
    }

    /**
     * Add a method to save/load game data to the cloud
     */
    saveGameToCloud() {
        if (!this.crazyGamesSDK || !this.crazyGamesSDK.initialized) {
            return false;
        }

        const gameData = {
            score: this.score,
            highestDie: this.highestDie,
            highScores: this.highScores,
            lastPlayed: new Date().toISOString()
        };

        return this.crazyGamesSDK.saveGameData(gameData);
    }

    /**
     * Load game data from cloud
     */
    async loadGameFromCloud() {
        if (!this.crazyGamesSDK || !this.crazyGamesSDK.initialized) {
            return false;
        }

        const gameData = await this.crazyGamesSDK.loadGameData();

        if (gameData && gameData.highScores) {
            this.highScores = gameData.highScores;
            console.log('Loaded high scores from cloud');
            return true;
        }

        return false;
    }

    /**
     * Request a banner ad
     */
    showBanner() {
        if (this.crazyGamesSDK && this.crazyGamesSDK.initialized) {
            this.crazyGamesSDK.requestBanner();
        }
    }

    /**
     * Override the checkPendingUpdates method to save to cloud
     */
    checkPendingUpdates() {
        // If there are pending score changes, save to cloud
        if (this.scoreChanged) {
            this.saveGameToCloud();
            this.scoreChanged = false;
        }
    }
    ensureGameplayEventsTracked() {
        try {
            // Track gameplay start directly if SDK is available in window
            if (window.CrazyGames && window.CrazyGames.SDK && 
                window.CrazyGames.SDK.game && 
                typeof window.CrazyGames.SDK.game.gameplayStart === 'function') {
                
                console.log('Tracking gameplay start directly with window.CrazyGames.SDK');
                window.CrazyGames.SDK.game.gameplayStart();
                
                // Log for debugging
                console.log('Gameplay started via direct window reference', {
                    method: 'direct_window_reference',
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.warn('Error ensuring gameplay events are tracked:', error);
        }
    }
    createFallbackSDK() {
        console.log('Creating fallback SDK handlers');
        
        // Create a minimal crazyGamesSDK object to prevent errors
        this.crazyGamesSDK = {
            initialized: false,
            showMidgameAd: () => {
                console.log('Fallback: Cannot show midgame ad');
                return Promise.resolve(false);
            },
            showRewardedAd: (callback) => {
                console.log('Fallback: Cannot show rewarded ad');
                return Promise.resolve(false);
            },
            trackGameplayStart: () => {
                console.log('Fallback: Cannot track gameplay start');
                // Try direct call as a last resort
                if (window.CrazyGames && window.CrazyGames.SDK && 
                    window.CrazyGames.SDK.game && 
                    typeof window.CrazyGames.SDK.game.gameplayStart === 'function') {
                    window.CrazyGames.SDK.game.gameplayStart();
                }
            },
            trackGameplayStop: () => {
                console.log('Fallback: Cannot track gameplay stop');
                // Try direct call as a last resort
                if (window.CrazyGames && window.CrazyGames.SDK && 
                    window.CrazyGames.SDK.game && 
                    typeof window.CrazyGames.SDK.game.gameplayStop === 'function') {
                    window.CrazyGames.SDK.game.gameplayStop();
                }
            }
        };
    }
}