export class UI {
    constructor(gameInstance) {
        this.game = gameInstance;

        // DOM elements
        this.gameBoard = document.getElementById('game-board');
        this.scoreDisplay = document.getElementById('score');
        this.highestDieDisplay = document.getElementById('highest-die');
        this.gameOverScreen = document.getElementById('game-over');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.finalHighestDisplay = document.getElementById('final-highest');
        this.cells = [];

        // Drag and drop state
        this.draggedCell = null;
        this.draggedDie = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.startCellIndex = null;
        this.clonedDie = null;
    }

    createBoardCells() {
        this.gameBoard.innerHTML = '';
        for (let i = 0; i < this.game.boardSize * this.game.boardSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;

            // Add both click and drag event listeners
            cell.addEventListener('click', () => this.game.handleCellClick(i));
            this.addDragListeners(cell, i);

            this.gameBoard.appendChild(cell);
        }
        this.cells = document.querySelectorAll('.cell');
    }

    setupEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.game.startNewGame());
        document.getElementById('restart-btn').addEventListener('click', () => this.game.startNewGame());
        document.getElementById('close-tutorial').addEventListener('click', () => {
            document.getElementById('tutorial').style.display = 'none';
        });
    }

    addDragListeners(cell, cellIndex) {
        // Mouse events
        cell.addEventListener('mousedown', (e) => this.handleDragStart(e, cellIndex));

        // Touch events
        cell.addEventListener('touchstart', (e) => this.handleDragStart(e, cellIndex), { passive: false });

        // We add these to the document to allow dragging outside the cell
        if (!this.dragListenersInitialized) {
            document.addEventListener('mousemove', (e) => this.handleDragMove(e));
            document.addEventListener('mouseup', (e) => this.handleDragEnd(e));

            document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
            document.addEventListener('touchend', (e) => this.handleDragEnd(e));

            this.dragListenersInitialized = true;
        }
    }

    handleDragStart(e, cellIndex) {
        // Only start drag if the game is not over and the cell has a die
        if (this.game.gameOver || this.game.board[cellIndex] === null) {
            return;
        }

        // Prevent default behavior only for touch events to avoid scrolling
        if (e.type === 'touchstart') {
            e.preventDefault();
        }

        // Get the die element
        const cell = this.cells[cellIndex];
        const die = cell.querySelector('.die');

        if (!die) return;

        // Save start position
        this.startCellIndex = cellIndex;
        this.isDragging = true;

        // Get coordinates
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        // Get cell and die positions
        const cellRect = cell.getBoundingClientRect();
        const dieRect = die.getBoundingClientRect();

        // Calculate offsets (where within the die the user clicked)
        this.dragOffsetX = clientX - dieRect.left;
        this.dragOffsetY = clientY - dieRect.top;

        // Create a clone of the die for dragging
        this.clonedDie = die.cloneNode(true);
        this.clonedDie.classList.add('dragging-die');
        this.clonedDie.style.position = 'fixed';
        this.clonedDie.style.width = `${dieRect.width}px`;
        this.clonedDie.style.height = `${dieRect.height}px`;
        this.clonedDie.style.left = `${clientX - this.dragOffsetX}px`;
        this.clonedDie.style.top = `${clientY - this.dragOffsetY}px`;
        this.clonedDie.style.zIndex = '1000';
        this.clonedDie.style.pointerEvents = 'none'; // Prevent the clone from intercepting events
        this.clonedDie.style.transform = 'scale(1.05)';
        this.clonedDie.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        this.clonedDie.style.opacity = '0.9';

        document.body.appendChild(this.clonedDie);

        // Add the 'dragging' class to the original die to make it semi-transparent
        die.classList.add('dragging-source');

        // Play the select sound
        this.game.audio.playSound('select');
    }

    handleDragMove(e) {
        if (!this.isDragging || !this.clonedDie) return;

        // Prevent default behavior only for touch events to avoid scrolling
        if (e.type === 'touchmove') {
            e.preventDefault();
        }

        // Get current cursor/touch position
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

        // Move the cloned die
        this.clonedDie.style.left = `${clientX - this.dragOffsetX}px`;
        this.clonedDie.style.top = `${clientY - this.dragOffsetY}px`;

        // Highlight the cell underneath if it's a valid drop target
        this.highlightTargetCell(clientX, clientY);
    }

    highlightTargetCell(clientX, clientY) {
        // Remove highlight from all cells
        this.cells.forEach(cell => cell.classList.remove('drag-over'));

        // Check which cell is under the cursor
        for (let i = 0; i < this.cells.length; i++) {
            const rect = this.cells[i].getBoundingClientRect();

            if (clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom) {

                // Only highlight if it's a valid merge target (same die value)
                if (i !== this.startCellIndex && this.game.board[i] === this.game.board[this.startCellIndex]) {
                    this.cells[i].classList.add('drag-over');
                }

                break;
            }
        }
    }

    handleDragEnd(e) {
        if (!this.isDragging) return;

        // Get current cursor/touch position
        const clientX = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0);
        const clientY = e.clientY || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : 0);

        // Clean up the cloned die
        if (this.clonedDie && this.clonedDie.parentNode) {
            this.clonedDie.parentNode.removeChild(this.clonedDie);
        }
        this.clonedDie = null;

        // Remove the 'dragging' class from the original die
        const originalDie = this.cells[this.startCellIndex].querySelector('.die');
        if (originalDie) {
            originalDie.classList.remove('dragging-source');
        }

        // Check if the drop is on a valid cell
        let targetCellIndex = -1;

        for (let i = 0; i < this.cells.length; i++) {
            const rect = this.cells[i].getBoundingClientRect();

            if (clientX >= rect.left && clientX <= rect.right &&
                clientY >= rect.top && clientY <= rect.bottom) {

                targetCellIndex = i;
                break;
            }
        }

        // Remove highlight from all cells
        this.cells.forEach(cell => cell.classList.remove('drag-over'));

        // Process the drop if it's on a valid cell and it's a match
        if (targetCellIndex !== -1 && targetCellIndex !== this.startCellIndex) {
            if (this.game.board[targetCellIndex] === this.game.board[this.startCellIndex]) {
                // Merge the dice
                this.game.mergeDice(this.startCellIndex, targetCellIndex);
            }
        }

        // Reset drag state
        this.isDragging = false;
        this.startCellIndex = null;
    }

    selectCell(index) {
        this.cells[index].classList.add('selected');
    }

    deselectCell(index) {
        this.cells[index].classList.remove('selected');
    }

    clearCell(index) {
        this.cells[index].innerHTML = '';
    }

    resetBoard() {
        this.cells.forEach(cell => {
            cell.innerHTML = '';
            cell.classList.remove('selected');
            cell.classList.remove('drag-over');
        });
    }

    renderDie(index, value) {
        const die = document.createElement('div');
        die.className = `die die-${value}`;

        // For values 1-6, we'll use traditional dice dots
        if (value >= 1 && value <= 6) {
            die.innerHTML = this.createDiceDots(value);
        } else {
            // For values > 6, we'll use the number
            die.textContent = value;
        }

        // Add die to cell
        this.cells[index].innerHTML = '';
        this.cells[index].appendChild(die);
    }

    createDiceDots(value) {
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'die-dots';

        // Positions for the dots based on traditional dice layout
        const dotPositions = {
            1: [[50, 50]],
            2: [[25, 25], [75, 75]],
            3: [[25, 25], [50, 50], [75, 75]],
            4: [[25, 25], [25, 75], [75, 25], [75, 75]],
            5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
            6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]]
        };

        const positions = dotPositions[value];
        positions.forEach(pos => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.style.left = `${pos[0]}%`;
            dot.style.top = `${pos[1]}%`;
            dotsContainer.appendChild(dot);
        });

        return dotsContainer.outerHTML;
    }

    animateMerge(index) {
        const die = this.cells[index].querySelector('.die');
        die.classList.add('merge-animation');
        setTimeout(() => {
            die.classList.remove('merge-animation');
        }, 500);
    }

    animateNew(index) {
        const die = this.cells[index].querySelector('.die');
        die.style.transform = 'scale(0)';
        die.style.transition = 'transform 0.3s ease-out';

        // Force reflow to ensure the initial scale is applied
        void die.offsetWidth;

        die.style.transform = 'scale(1)';
    }

    animateUpgrade(index) {
        const die = this.cells[index].querySelector('.die');
        die.classList.add('upgrade-animation');
        setTimeout(() => {
            die.classList.remove('upgrade-animation');
        }, 500);
    }

    /**
     * Update score and highest die display
     * @param {number} score - The current score
     * @param {number} highestDie - The highest die value
     */
    updateScore(score, highestDie) {
        // Update score value only, not the label
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = score;
        }

        // Update highest die value only, not the label
        const highestDieElement = document.getElementById('highest-die');
        if (highestDieElement) {
            highestDieElement.textContent = highestDie;
        }
    }

    showGameOver(score, highestDie) {
        this.finalScoreDisplay.textContent = score;
        this.finalHighestDisplay.textContent = highestDie;
        this.gameOverScreen.style.display = 'flex';
    }

    hideGameOver() {
        this.gameOverScreen.style.display = 'none';
    }

    /**
     * Show a temporary message to the player
     * @param {string} message - The message to display
     */
    showMessage(message) {
        // Check if message container exists, create if not
        let messageContainer = document.getElementById('game-message');

        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'game-message';

            // Apply only essential styles programmatically
            // Other styling comes from CSS
            messageContainer.style.opacity = '0';
            messageContainer.style.transition = 'opacity 0.3s ease-in-out';

            document.body.appendChild(messageContainer);
        }

        // Set message content
        messageContainer.textContent = message;

        // Ensure message is centered in game board
        const gameBoard = document.getElementById('game-board');
        if (gameBoard) {
            const boardRect = gameBoard.getBoundingClientRect();
            messageContainer.style.top = `${boardRect.top + boardRect.height / 2}px`;
            messageContainer.style.left = `${boardRect.left + boardRect.width / 2}px`;
        }

        // Fade in
        setTimeout(() => {
            messageContainer.style.opacity = '1';
        }, 10);
    }

    hideMessage() {
        const messageContainer = document.getElementById('game-message');

        if (messageContainer) {
            // Fade out
            messageContainer.style.opacity = '0';

            // Remove after animation completes
            setTimeout(() => {
                if (messageContainer.parentNode) {
                    messageContainer.parentNode.removeChild(messageContainer);
                }
            }, 300);
        }
    }

    resumeGameAfterAd() {
        // This method is called after an ad is closed
        // It can be used to unpause the game or perform any other action
        console.log('Resuming game after ad...');

        // If we need to do anything special after the ad closes, do it here
        // For now, we'll just let the game continue
    }
    /**
 * Initialize localization for UI elements
 * @param {Localization} localization - The localization instance
 */
    initializeLocalization(localization) {
        this.localization = localization;

        // Listen for language changes
        document.addEventListener('languageChanged', () => {
            this.updateLocalizedElements();
        });

        // Update elements with current language
        this.updateLocalizedElements();
    }

    /**
     * Update all elements with data-loc-key attribute
     */
    updateLocalizedElements() {
        if (!this.localization) return;

        // Find all elements with data-loc-key attribute
        const elements = document.querySelectorAll('[data-loc-key]');

        elements.forEach(element => {
            const key = element.dataset.locKey;

            // Get localized text
            const localizedText = this.localization.get(key);

            // If this is a label element (with a class of "label"), update text
            // but keep the parent structure intact
            if (element.classList.contains('label')) {
                element.textContent = localizedText;
            }
            // Otherwise, normal replacement
            else {
                element.textContent = localizedText;
            }
        });

        // Special handling for combined elements (like "Score: 0")
        this.updateScoreDisplays();
    }
    /**
     * Update score displays specifically
     */
    updateScoreDisplays() {
        // For standard game view
        this.updateLabelValuePair('.score', 'score', '#score');
        this.updateLabelValuePair('.highest-die', 'highest', '#highest-die');

        // For game over screen
        this.updateLabelValuePair('#game-over p:nth-child(2)', 'final_score', '#final-score');
        this.updateLabelValuePair('#game-over p:nth-child(3)', 'highest_die', '#final-highest');
    }
    /**
     * Update a container with label and value
     * @param {string} containerSelector - CSS selector for the container
     * @param {string} labelKey - Localization key for the label
     * @param {string} valueSelector - CSS selector for the value element
     */
    updateLabelValuePair(containerSelector, labelKey, valueSelector) {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        // Find value element and save its current value
        const valueElement = document.querySelector(valueSelector);
        if (!valueElement) return;

        const currentValue = valueElement.textContent;

        // Get localized label
        const localizedLabel = this.localization.get(labelKey);

        // If container has the expected structure with label span, update just that
        const labelSpan = container.querySelector('.label');
        if (labelSpan) {
            labelSpan.textContent = localizedLabel;
            return;
        }

        // Otherwise, reconstruct the whole element
        container.innerHTML = '';

        // Create label + colon
        const labelText = document.createTextNode(localizedLabel + ': ');
        container.appendChild(labelText);

        // Recreate value span
        const newValueElement = document.createElement('span');
        newValueElement.id = valueElement.id;
        newValueElement.textContent = currentValue;
        container.appendChild(newValueElement);
    }
    /**
     * Show a localized message
     * @param {string} key - Localization key
     * @param {Object} replacements - Optional replacements for variables
     */
    showLocalizedMessage(key, replacements = null) {
        if (!this.localization) {
            this.showMessage(key);
            return;
        }

        const message = this.localization.get(key, replacements);
        this.showMessage(message);
    }
}