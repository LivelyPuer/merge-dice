import './css/style.css';
import { Game } from './js/game';

// Initialize the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const isQAEnvironment = window.location.href.includes('qa.crazygames') || 
                           window.location.href.includes('dev.crazygames') ||
                           document.referrer.includes('qa.crazygames') ||
                           document.referrer.includes('dev.crazygames');
    
    if (isQAEnvironment) {
        console.log('QA environment detected - applying special styling');
        document.body.classList.add('qa-environment');
        
        // Force display of game elements
        const gameElements = [
            document.getElementById('game-board'),
            document.querySelector('.game-controls'),
            document.querySelector('.game-container')
        ];
        
        gameElements.forEach(element => {
            if (element) {
                element.style.display = element.id === 'game-board' ? 'grid' : 'block';
                element.style.visibility = 'visible';
                element.style.opacity = '1';
            }
        });
        
        // Add debugging info
        const debugInfo = document.createElement('div');
        debugInfo.style.position = 'fixed';
        debugInfo.style.top = '5px';
        debugInfo.style.left = '5px';
        debugInfo.style.background = 'rgba(255,0,0,0.7)';
        debugInfo.style.color = 'white';
        debugInfo.style.padding = '5px';
        debugInfo.style.zIndex = '9999';
        debugInfo.style.fontSize = '12px';
        debugInfo.textContent = 'QA MODE';
        document.body.appendChild(debugInfo);
    }
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
    const inviteFriendsBtn = document.getElementById('invite-friends-btn');
    if (inviteFriendsBtn) {
        inviteFriendsBtn.addEventListener('click', () => {
            game.inviteFriends();
        });
    }
    const inviteGameOverBtn = document.getElementById('invite-game-over-btn');
    if (inviteGameOverBtn) {
        inviteGameOverBtn.addEventListener('click', () => {
            game.inviteFriends();
        });
    }
    // Add watch ad button functionality
    const watchAdBtn = document.getElementById('watch-ad-btn');
    if (watchAdBtn) {
        watchAdBtn.addEventListener('click', () => {
            game.addExtraDiceWithAd();
        });
    }

    // Save pending updates when page is hidden or closed
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // Game is being hidden/backgrounded
            try {
                if (window.CrazyGames && window.CrazyGames.SDK && 
                    window.CrazyGames.SDK.game && 
                    typeof window.CrazyGames.SDK.game.gameplayStop === 'function') {
                    
                    console.log('Visibility hidden: calling gameplayStop');
                    window.CrazyGames.SDK.game.gameplayStop();
                }
            } catch (error) {
                console.warn('Error calling gameplayStop on visibility change:', error);
            }
        } else if (document.visibilityState === 'visible') {
            // Game is visible again
            try {
                if (window.CrazyGames && window.CrazyGames.SDK && 
                    window.CrazyGames.SDK.game && 
                    typeof window.CrazyGames.SDK.game.gameplayStart === 'function') {
                    
                    console.log('Visibility visible: calling gameplayStart');
                    window.CrazyGames.SDK.game.gameplayStart();
                }
            } catch (error) {
                console.warn('Error calling gameplayStart on visibility change:', error);
            }
        }
    });
    window.crazyGamesSdkAvailable = !!window.CrazyGames && !!window.CrazyGames.SDK;
    
    console.log('Initial SDK availability check:', window.crazyGamesSdkAvailable);
    
    // If not available, add event listener for when it becomes available
    if (!window.crazyGamesSdkAvailable) {
        window.addEventListener('CrazyGamesSDKReady', () => {
            console.log('CrazyGames SDK became available');
            window.crazyGamesSdkAvailable = true;
            
            // If game instance exists, update its SDK reference
            if (window.game && window.game.crazyGamesSDK) {
                window.game.crazyGamesSDK.sdk = window.CrazyGames.SDK;
                window.game.crazyGamesSDK.initialized = true;
                console.log('Updated game instance with SDK reference');
            }
        });
    }
    
    // Perform periodic checks for SDK availability for the first 10 seconds
    let sdkCheckCount = 0;
    const sdkCheckInterval = setInterval(() => {
        sdkCheckCount++;
        
        // Check if SDK is now available
        if (!window.crazyGamesSdkAvailable && window.CrazyGames && window.CrazyGames.SDK) {
            window.crazyGamesSdkAvailable = true;
            console.log('SDK detected during periodic check');
            
            // If game instance exists, update its SDK reference
            if (window.game && window.game.crazyGamesSDK) {
                window.game.crazyGamesSDK.sdk = window.CrazyGames.SDK;
                window.game.crazyGamesSDK.initialized = true;
                console.log('Updated game instance with SDK reference');
            }
        }
        
        // Stop checking after 10 seconds (20 checks * 500ms)
        if (sdkCheckCount >= 20) {
            clearInterval(sdkCheckInterval);
            console.log('Stopped periodic SDK checks');
        }
    }, 500);
    setTimeout(() => {
        try {
            if (window.CrazyGames && window.CrazyGames.SDK && 
                window.CrazyGames.SDK.game && 
                typeof window.CrazyGames.SDK.game.gameplayStart === 'function') {
                
                console.log('Calling window.CrazyGames.SDK.game.gameplayStart() directly');
                window.CrazyGames.SDK.game.gameplayStart();
            }
        } catch (error) {
            console.warn('Error making direct gameplayStart call:', error);
        }
    }, 2000);
});