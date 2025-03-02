import './css/style.css';
import { Game } from './js/game';

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create game instance
    const game = new Game();

    // Make game available globally for debugging
    if (process.env.NODE_ENV !== 'production') {
        window.game = game;
    }

    // Add settings button functionality
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const closeSettingsBtn = document.getElementById('close-settings');

    if (settingsBtn && settingsMenu) {
        // Open settings modal
        settingsBtn.addEventListener('click', () => {
            settingsMenu.style.display = 'flex';
        });

        // Close settings modal with button
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                settingsMenu.style.display = 'none';
            });
        }

        // Close settings when clicking outside the settings content
        settingsMenu.addEventListener('click', (event) => {
            if (event.target === settingsMenu) {
                settingsMenu.style.display = 'none';
            }
        });

        // Sound toggle functionality
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                const isMuted = game.audio.toggleMute();
                soundToggle.textContent = isMuted ? '🔇' : '🔊';
            });
        }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Leaderboard - L key
        if (event.key === 'l' || event.key === 'L') {
            const leaderboardBtn = document.getElementById('leaderboard-btn');
            if (leaderboardBtn) leaderboardBtn.click();
        }

        // Settings - S key
        if (event.key === 's' || event.key === 'S') {
            if (settingsBtn) settingsBtn.click();
        }

        // New Game - N key
        if (event.key === 'n' || event.key === 'N') {
            const newGameBtn = document.getElementById('new-game-btn');
            if (newGameBtn) newGameBtn.click();
        }

        // Add Die - A key
        if (event.key === 'a' || event.key === 'A') {
            const addDieBtn = document.getElementById('add-die-btn');
            if (addDieBtn && !addDieBtn.disabled) addDieBtn.click();
        }
    });

    // Save pending updates when page is hidden or closed
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // Game is being hidden/backgrounded, ensure scores are saved
            if (game) {
                game.checkPendingUpdates();
            }
        }
    });
});