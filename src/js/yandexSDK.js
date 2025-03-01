// src/js/yandexSDK.js

export class YandexSDK {
    constructor(game) {
        this.game = game;
        this.player = null;
        this.initialized = false;
        this.leaderboardName = 'dice_dynasty_leaderboard';

        // Initialize the SDK
        this.init();
    }

    async init() {
        try {
            if (typeof YaGames === 'undefined') {
                console.warn('YaGames SDK not available, running in local/development mode');
                this.initialized = false;
                return;
            }
            // Initialize Yandex SDK
            await this.initSDK();

            // Check environment and get player
            this.environment = await this.getEnvironment();

            // Initialize player
            if (this.environment.id) {
                this.player = await this.initPlayer();
            }

            this.initialized = true;
            console.log('Yandex Games SDK initialized successfully');

        } catch (error) {
            console.error('Error initializing Yandex Games SDK:', error);
            this.initialized = false;
        }
    }

    async initSDK() {
        return new Promise((resolve, reject) => {
            // Check if YaGames is available
            if (typeof YaGames === 'undefined') {
                return reject(new Error('YaGames is not defined. Make sure the SDK is loaded.'));
            }

            YaGames.init()
                .then(ysdk => {
                    this.ysdk = ysdk;
                    resolve(ysdk);
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    async getEnvironment() {
        return this.ysdk.environment.i18n.lang;
    }

    async initPlayer() {
        try {
            const player = await this.ysdk.getPlayer();
            const playerName = player.getName();
            const playerId = player.getUniqueID();

            return {
                id: playerId,
                name: playerName || 'Anonymous Player',
                photoURL: player.getPhoto('medium') || null,
                data: {}
            };
        } catch (error) {
            console.warn('Player auth failed', error);
            return null;
        }
    }

    // Save score to leaderboard
    async saveScore(score) {
        if (!this.initialized || !this.ysdk || !this.player) {
            console.warn('Cannot save score: SDK not initialized or player not authenticated');
            return false;
        }

        try {
            const leaderboard = await this.ysdk.getLeaderboards();
            await leaderboard.setLeaderboardScore(this.leaderboardName, score);
            console.log('Score saved to leaderboard:', score);
            return true;
        } catch (error) {
            console.error('Error saving score to leaderboard:', error);
            return false;
        }
    }

    // Get player data
    async getPlayerData() {
        if (!this.initialized || !this.ysdk || !this.player) {
            return null;
        }

        try {
            const data = await this.ysdk.getPlayer().then(player => player.getData());
            this.player.data = data || {};
            return this.player.data;
        } catch (error) {
            console.error('Error getting player data:', error);
            return null;
        }
    }

    // Save player data
    async savePlayerData(data) {
        if (!this.initialized || !this.ysdk || !this.player) {
            return false;
        }

        try {
            await this.ysdk.getPlayer().then(player => player.setData(data));
            this.player.data = data;
            return true;
        } catch (error) {
            console.error('Error saving player data:', error);
            return false;
        }
    }

    // Show leaderboard
    async showLeaderboard() {
        if (!this.initialized || !this.ysdk) {
            return false;
        }

        try {
            await this.ysdk.getLeaderboards()
                .then(lb => lb.openLeaderboard(this.leaderboardName));
            return true;
        } catch (error) {
            console.error('Error opening leaderboard:', error);
            return false;
        }
    }
}