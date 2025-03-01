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
    }

    createBoardCells() {
        this.gameBoard.innerHTML = '';
        for (let i = 0; i < this.game.boardSize * this.game.boardSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.game.handleCellClick(i));
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

    updateScore(score, highestDie) {
        this.scoreDisplay.textContent = score;
        this.highestDieDisplay.textContent = highestDie;
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
            messageContainer.style.position = 'absolute';
            messageContainer.style.top = '50%';
            messageContainer.style.left = '50%';
            messageContainer.style.transform = 'translate(-50%, -50%)';
            messageContainer.style.backgroundColor = 'rgba(74, 63, 86, 0.9)';
            messageContainer.style.color = '#f8d56c';
            messageContainer.style.padding = '10px 20px';
            messageContainer.style.borderRadius = '8px';
            messageContainer.style.fontWeight = 'bold';
            messageContainer.style.fontSize = '20px';
            messageContainer.style.zIndex = '100';
            messageContainer.style.opacity = '0';
            messageContainer.style.transition = 'opacity 0.3s ease-in-out';

            document.body.appendChild(messageContainer);
        }

        // Set message content
        messageContainer.textContent = message;

        // Fade in
        setTimeout(() => {
            messageContainer.style.opacity = '1';
        }, 10);
    }

    /**
     * Hide the message display
     */
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
}