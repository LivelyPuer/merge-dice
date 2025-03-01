// src/js/yandexSDK.js

export class YandexSDK {
    constructor(game) {
        this.game = game;
        this.player = null;
        this.initialized = false;
        this.leaderboardName = 'main'; // Using "main" as the leaderboard name
        this.ysdk = null;
        this.leaderboard = null;

        // Initialize the SDK
        this.init();
    }

    async init() {
        try {
            // Check if YaGames is defined globally
            if (typeof YaGames === 'undefined') {
                console.warn('YaGames SDK not available, running in local/development mode');
                this.initialized = false;
                return;
            }

            // Initialize Yandex SDK
            this.ysdk = await YaGames.init();
            console.log('Yandex SDK initialized');

            // Try to get the player
            try {
                this.player = await this.ysdk.getPlayer();
                const playerName = this.player.getName();
                const playerId = this.player.getUniqueID();

                console.log('Player authenticated:', playerName || 'Anonymous');
            } catch (error) {
                console.warn('Player auth failed', error);
                this.player = null;
            }

            // Initialize advertisement
            try {
                this.adv = await this.ysdk.getAdv();
                console.log('Advertisement functionality initialized');
            } catch (error) {
                console.warn('Advertisement functionality not available', error);
                this.adv = null;
            }

            // Try to get the leaderboard
            try {
                this.leaderboard = await this.ysdk.getLeaderboards();

                // Check if our leaderboard exists by trying to get entries
                try {
                    await this.leaderboard.getLeaderboardEntries(this.leaderboardName, { quantityTop: 1 });
                    console.log('Leaderboard exists and is accessible');
                } catch (leaderboardError) {
                    // If error contains "not found", the leaderboard doesn't exist
                    if (leaderboardError.message && leaderboardError.message.includes('not found')) {
                        console.warn('Leaderboard does not exist. Will be created when first score is submitted.');
                    } else {
                        console.warn('Error checking leaderboard:', leaderboardError);
                    }
                }
            } catch (error) {
                console.warn('Leaderboard functionality not available', error);
                this.leaderboard = null;
            }

            this.initialized = true;
            console.log('Yandex Games SDK initialized successfully');

        } catch (error) {
            console.error('Error initializing Yandex Games SDK:', error);
            this.initialized = false;
        }
    }

    // Save score to leaderboard
    async saveScore(score) {
        if (!this.initialized || !this.ysdk || !this.leaderboard) {
            console.warn('Cannot save score: SDK not initialized or leaderboard not available');
            return false;
        }

        try {
            await this.leaderboard.setLeaderboardScore(this.leaderboardName, score);
            console.log('Score saved to leaderboard:', score);
            return true;
        } catch (error) {
            console.error('Error saving score to leaderboard:', error);
            return false;
        }
    }

    // Show leaderboard
    async showLeaderboard() {
        if (!this.initialized || !this.ysdk) {
            console.warn('Cannot show leaderboard: SDK not initialized');
            return false;
        }

        try {
            // Create our own leaderboard UI using the Yandex data
            const globalLeaderboardDiv = document.getElementById('global-leaderboard');
            if (!globalLeaderboardDiv) {
                console.error('Global leaderboard div not found');
                return false;
            }

            // Clear previous content and show loading message
            globalLeaderboardDiv.innerHTML = '<div class="loading-leaderboard">Loading leaderboard data...</div>';

            // Get leaderboard data from Yandex
            const leaderboard = await this.ysdk.getLeaderboards();

            try {
                const leaderboardData = await leaderboard.getLeaderboardEntries(this.leaderboardName, { quantityTop: 10 });

                if (!leaderboardData || !leaderboardData.entries || leaderboardData.entries.length === 0) {
                    globalLeaderboardDiv.innerHTML = '<div class="no-scores-message">No global scores available yet. Be the first to submit your score!</div>';
                    return true;
                }

                // Create table for leaderboard
                const table = document.createElement('table');
                table.className = 'leaderboard-table';

                // Create header
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr>
                        <th>Rank</th>
                        <th>Player</th>
                        <th>Score</th>
                    </tr>
                `;
                table.appendChild(thead);

                // Create body
                const tbody = document.createElement('tbody');

                // Add entries
                leaderboardData.entries.forEach((entry) => {
                    const row = document.createElement('tr');

                    // Add rank emoji for top 3
                    let rankDisplay = `${entry.rank}`;
                    if (entry.rank === 1) rankDisplay = `🥇 ${entry.rank}`;
                    else if (entry.rank === 2) rankDisplay = `🥈 ${entry.rank}`;
                    else if (entry.rank === 3) rankDisplay = `🥉 ${entry.rank}`;

                    // Get player name
                    let playerName = entry.player.publicName;
                    if (!playerName || playerName.trim() === '') {
                        playerName = 'Anonymous Player';
                    }

                    // Highlight current player
                    const isCurrentPlayer = this.player && entry.player.uniqueID === this.player.getUniqueID();

                    row.innerHTML = `
                        <td>${rankDisplay}</td>
                        <td>${playerName}${isCurrentPlayer ? ' (You)' : ''}</td>
                        <td>${entry.score}</td>
                    `;

                    if (isCurrentPlayer) {
                        row.classList.add('current-player');
                    }

                    tbody.appendChild(row);
                });

                table.appendChild(tbody);

                // Clear loading message and append table
                globalLeaderboardDiv.innerHTML = '';
                globalLeaderboardDiv.appendChild(table);

                console.log('Leaderboard displayed successfully');
                return true;
            } catch (error) {
                // Handle "leaderboard not found" error gracefully
                if (error.message && error.message.includes('not found')) {
                    globalLeaderboardDiv.innerHTML = `
                        <div class="no-scores-message">
                            <p>The leaderboard hasn't been created yet.</p>
                            <p>Play a game and score some points to create it!</p>
                        </div>
                    `;
                    return true;
                }

                throw error; // Re-throw other errors
            }
        } catch (error) {
            console.error('Error displaying leaderboard:', error);

            // Show error message
            const globalLeaderboardDiv = document.getElementById('global-leaderboard');
            if (globalLeaderboardDiv) {
                globalLeaderboardDiv.innerHTML = `
                    <div class="error-message">
                        <p>Could not load global leaderboard data.</p>
                        <p>Error: ${error.message || 'Unknown error'}</p>
                    </div>
                `;
            }

            throw error; // Re-throw to allow proper handling
        }
    }

    // Get player data
    async getPlayerData() {
        if (!this.initialized || !this.player) {
            return null;
        }

        try {
            const data = await this.player.getData();
            return data || {};
        } catch (error) {
            console.error('Error getting player data:', error);
            return null;
        }
    }

    // Save player data
    async savePlayerData(data) {
        if (!this.initialized || !this.player) {
            return false;
        }

        try {
            await this.player.setData(data);
            return true;
        } catch (error) {
            console.error('Error saving player data:', error);
            return false;
        }
    }
    async showFullscreenAd() {
        if (!this.initialized || !this.ysdk) {
            console.warn('Cannot show ad: SDK not initialized');
            return false;
        }

        try {
            // Check if we have adv initialized
            if (!this.adv) {
                // Try to initialize it now
                try {
                    this.adv = await this.ysdk.adv;
                    console.log('Advertisement functionality initialized');
                } catch (error) {
                    console.warn('Failed to initialize advertisement:', error);
                    return false;
                }
            }

            console.log('Attempting to show fullscreen ad...');

            // Using the correct method from Yandex documentation
            return new Promise((resolve) => {
                this.adv.showFullscreenAdv({
                    callbacks: {
                        onClose: (wasShown) => {
                            console.log('Fullscreen ad closed, wasShown:', wasShown);
                            // Resume game here if needed
                            resolve(true);
                        },
                        onError: (error) => {
                            console.error('Error showing fullscreen ad:', error);
                            // Continue with the game despite ad error
                            resolve(false);
                        }
                    }
                });
            });
        } catch (error) {
            console.error('Error showing fullscreen ad:', error);
            return false;
        }
    }
    /**
 * Get the player's current score in the leaderboard
 * @returns {Promise<number|null>} The player's current score or null if not found
 */
    async getPlayerLeaderboardScore() {
        if (!this.initialized || !this.ysdk) {
            console.warn('Cannot get player score: SDK not initialized');
            return null;
        }

        try {
            // Get leaderboard
            const leaderboard = await this.ysdk.getLeaderboards();

            // Try to get player entry
            try {
                const playerEntry = await leaderboard.getLeaderboardPlayerEntry(this.leaderboardName);
                if (playerEntry && typeof playerEntry.score === 'number') {
                    console.log(`Found player's leaderboard score: ${playerEntry.score}`);
                    return playerEntry.score;
                }
                return null; // No score found
            } catch (error) {
                // If error contains "not found", the player doesn't have a score yet
                if (error.message && error.message.includes('not found')) {
                    console.log('Player has no score in the leaderboard yet');
                    return null;
                }
                throw error; // Re-throw other errors
            }
        } catch (error) {
            console.warn('Error getting player leaderboard score:', error);
            return null;
        }
    }
}