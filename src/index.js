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
    
    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener('click', () => {
            settingsMenu.classList.toggle('visible');
        });
        
        // Close settings when clicking outside
        document.addEventListener('click', (event) => {
            if (!settingsMenu.contains(event.target) && event.target !== settingsBtn) {
                settingsMenu.classList.remove('visible');
            }
        });
        
        // Sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                const isMuted = game.audio.toggleMute();
                soundToggle.textContent = isMuted ? '🔇' : '🔊';
            });
        }
    }
    
    // Leaderboard button functionality
    const leaderboardBtn = document.getElementById('leaderboard-btn');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    
    if (leaderboardBtn && leaderboardModal) {
        leaderboardBtn.addEventListener('click', () => {
            leaderboardModal.style.display = 'flex';
            updateLeaderboard();
        });
        
        const closeLeaderboard = document.getElementById('close-leaderboard');
        if (closeLeaderboard) {
            closeLeaderboard.addEventListener('click', () => {
                leaderboardModal.style.display = 'none';
            });
        }
    }
    
    function updateLeaderboard() {
        // Placeholder function for updating the leaderboard
        // In a real game, this would load scores from localStorage or a server
    }
});