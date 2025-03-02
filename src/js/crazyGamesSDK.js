// src/js/crazyGamesSDK.js

export class CrazyGamesSDK {
    constructor(game) {
        this.game = game;
        this.sdk = null;
        this.initialized = false;
        this.initCallbacks = [];
        this.adRequested = false;
        this.gameplayStarted = false;

        // Initialize the SDK
        this.init();
    }

    async init() {
        try {
            // Check if we're in the QA environment
            const isQAEnvironment = window.location.href.includes('qa.crazygames') ||
                window.location.href.includes('dev.crazygames') ||
                document.referrer.includes('qa.crazygames') ||
                document.referrer.includes('dev.crazygames');

            if (isQAEnvironment) {
                console.log('Detected Crazy Games QA environment');
            }

            // First check if SDK is already available globally
            if (window.CrazyGames && window.CrazyGames.SDK) {
                console.log('CrazyGames SDK already available in window, using it');
                this.sdk = window.CrazyGames.SDK;

                // Track loading event start
                this.trackLoadingStart();

                // Initialize tracking and banner ads
                try {
                    this.sdk.game.init();
                } catch (initError) {
                    console.warn('Error during SDK game.init():', initError);
                }

                console.log('CrazyGames SDK initialized successfully from global object');
                this.initialized = true;

                // Set up ad event listeners
                this.setupAdEventListeners();

                // Set up user and data modules
                this.setupUserModule();
                this.setupDataModule();

                // Check for happy time
                this.checkHappyTime();

                // Trigger callbacks
                this.triggerInitCallbacks();

                // Track loading event end
                this.trackLoadingEnd();

                // Call gameLoadingFinished when the game is ready
                try {
                    this.sdk.game.gameLoadingFinished();
                } catch (loadingError) {
                    console.warn('Error during gameLoadingFinished():', loadingError);
                }

                return;
            }

            // Check if Crazy Games SDK script is available but not initialized
            if (typeof window.CrazyGames === 'undefined') {
                console.warn('CrazyGames SDK not available, running in local/development mode');

                // Special handling for QA environment - still mark as initialized
                // to allow the game to function without the SDK
                if (isQAEnvironment) {
                    console.log('QA environment detected but SDK not found - initializing anyway');
                    this.initialized = true;
                    this.mockSDKForQA();
                    this.triggerInitCallbacks();
                    return;
                }

                // Set up a listener for when SDK becomes available
                window.addEventListener('CrazyGamesSDKReady', () => {
                    console.log('CrazyGames SDK became available, initializing');
                    if (window.CrazyGames && window.CrazyGames.SDK) {
                        this.sdk = window.CrazyGames.SDK;
                        this.initialized = true;

                        // Initialize the SDK
                        try {
                            this.sdk.game.init();
                        } catch (lateInitError) {
                            console.warn('Error during late SDK initialization:', lateInitError);
                        }

                        // Trigger callbacks that might be waiting
                        this.triggerInitCallbacks();
                    }
                });

                this.initialized = false;
                this.triggerInitCallbacks();
                return;
            }

            console.log('Initializing CrazyGames SDK...');

            // Initialize the SDK
            this.sdk = window.CrazyGames.SDK;

            // Track loading event start
            this.trackLoadingStart();

            // Initialize tracking and banner ads
            try {
                this.sdk.game.init();
            } catch (initError) {
                console.warn('Error during SDK game.init():', initError);
            }

            console.log('CrazyGames SDK initialized successfully');
            this.initialized = true;

            // Set up ad event listeners
            this.setupAdEventListeners();

            // Set up user and data modules
            this.setupUserModule();
            this.setupDataModule();

            // Check for happy time
            this.checkHappyTime();

            // Trigger callbacks
            this.triggerInitCallbacks();

            // Track loading event end
            this.trackLoadingEnd();

            // Call gameLoadingFinished when the game is ready
            try {
                this.sdk.game.gameLoadingFinished();
            } catch (loadingError) {
                console.warn('Error during gameLoadingFinished():', loadingError);
            }

        } catch (error) {
            console.error('Error initializing CrazyGames SDK:', error);
            this.initialized = false;
            this.triggerInitCallbacks();
        }
    }
    /**
 * Create a mock SDK with correct methods (without trackEvent)
 */
    mockSDKForQA() {
        console.log('Creating mock SDK with correct methods');
        
        // Create a mock SDK object with correct methods (removing addEventListener)
        this.sdk = {
            game: {
                init: () => console.log('Mock: game.init called'),
                gameLoadingFinished: () => console.log('Mock: gameLoadingFinished called'),
                gameplayStart: () => console.log('Mock: gameplayStart called'),
                gameplayStop: () => console.log('Mock: gameplayStop called'),
                happytime: false
                // Removed addEventListener as it doesn't exist
            },
            ad: {
                addEventListener: (event, callback) => console.log(`Mock: ad.addEventListener(${event}) called`),
                removeEventListener: (event, callback) => console.log(`Mock: ad.removeEventListener(${event}) called`),
                requestAd: (type) => {
                    console.log(`Mock: requestAd(${type}) called`);
                    // Simulate an ad completion after a delay
                    setTimeout(() => {
                        if (this.sdk.ad._eventCallbacks && this.sdk.ad._eventCallbacks.adFinished) {
                            this.sdk.ad._eventCallbacks.adFinished.forEach(callback => callback());
                        }
                    }, 1000);
                },
                // Store callbacks for simulation
                _eventCallbacks: {
                    adFinished: [],
                    adError: []
                }
            },
            banner: {
                requestBanner: (options) => console.log('Mock: requestBanner called', options)
            },
            user: {
                addAuthListener: (callback) => {
                    console.log('Mock: addAuthListener called');
                    // Simulate no user
                    setTimeout(() => callback(null), 500);
                },
                getToken: () => {
                    console.log('Mock: getToken called');
                    return Promise.resolve('mock-token');
                },
                getXsollaToken: () => {
                    console.log('Mock: getXsollaToken called');
                    return Promise.resolve('mock-xsolla-token');
                }
            },
            inviteLink: {
                requestInviteLink: (options) => console.log('Mock: requestInviteLink called', options)
            }
        };
        
        // Add the ad event listener helpers
        // (keeping these since they're used for the ads which do have event listeners)
        const originalAdAddEventListener = this.sdk.ad.addEventListener;
        this.sdk.ad.addEventListener = (event, callback) => {
            originalAdAddEventListener(event, callback);
            
            // Store callback for simulation
            if (!this.sdk.ad._eventCallbacks[event]) {
                this.sdk.ad._eventCallbacks[event] = [];
            }
            this.sdk.ad._eventCallbacks[event].push(callback);
        };
        
        const originalAdRemoveEventListener = this.sdk.ad.removeEventListener;
        this.sdk.ad.removeEventListener = (event, callback) => {
            originalAdRemoveEventListener(event, callback);
            
            // Remove callback from stored list
            if (this.sdk.ad._eventCallbacks[event]) {
                const index = this.sdk.ad._eventCallbacks[event].indexOf(callback);
                if (index !== -1) {
                    this.sdk.ad._eventCallbacks[event].splice(index, 1);
                }
            }
        };
        
        console.log('Mock SDK created successfully');
    }
    /**
 * Set up event listeners for ad-related events
 */
    setupAdEventListeners() {
        if (!this.sdk) {
            console.warn('Cannot set up ad event listeners: SDK not initialized');
            return;
        }

        try {
            // Check if the ad API is available
            if (!this.sdk.ad || typeof this.sdk.ad.addEventListener !== 'function') {
                console.warn('Ad API not available in SDK');
                return;
            }

            // Listen for ad events
            this.sdk.ad.addEventListener('adStarted', () => {
                console.log('Ad started, pausing game...');
                // Pause game logic, music, etc.
                if (this.game && this.game.audio) {
                    this.game.audio.muted = true;
                }

                // If we have gameplay in progress, pause it
                if (this.gameplayStarted) {
                    this.trackGameplayStop();
                }
            });

            this.sdk.ad.addEventListener('adFinished', () => {
                console.log('Ad finished, resuming game...');
                // Resume game logic, music, etc.
                if (this.game && this.game.audio) {
                    this.game.audio.muted = false;
                }

                // If we had gameplay in progress, resume it
                if (this.gameplayStarted) {
                    this.trackGameplayStart();
                }
            });

            this.sdk.ad.addEventListener('adError', (error) => {
                console.warn('Ad error:', error);
                // Resume game even if ad fails
                if (this.game && this.game.audio) {
                    this.game.audio.muted = false;
                }

                // If we had gameplay in progress, resume it
                if (this.gameplayStarted) {
                    this.trackGameplayStart();
                }
            });

            console.log('Ad event listeners set up successfully');
        } catch (error) {
            console.error('Error setting up ad event listeners:', error);
        }
    }

    /**
     * Setup the User Module
     */
    setupUserModule() {
        if (!this.sdk) return;
        
        try {
            // Check if the correct methods exist before using them
            if (this.sdk.user && typeof this.sdk.user.addAuthListener === 'function') {
                this.sdk.user.addAuthListener((user) => {
                    if (user) {
                        console.log('User authenticated:', user);
                        
                        // Request user token
                        this.requestUserToken();
                        
                        // Request Xsolla token if needed
                        this.requestXsollaToken();
                    } else {
                        console.log('User not authenticated');
                    }
                });
            } else {
                console.log('User module authentication listener not available');
            }
            
            console.log('User module initialized');
        } catch (error) {
            console.error('Error setting up user module:', error);
        }
    }

    /**
     * Setup the Data Module
     */
    setupDataModule() {
        if (!this.sdk) return;
        
        try {
            // Log that we're initializing the data module
            console.log('Setting up data module (without event listeners)');
            
            // No addEventListener method available, just log that we're initialized
            console.log('Data module initialized with basic functionality');
        } catch (error) {
            console.error('Error setting up data module:', error);
        }
    }

    /**
     * Request user token
     */
    requestUserToken() {
        if (!this.sdk) return;

        try {
            this.sdk.user.getToken()
                .then((token) => {
                    console.log('User token received');
                    // Use token if needed
                })
                .catch((error) => {
                    console.error('Error getting user token:', error);
                });
        } catch (error) {
            console.error('Error requesting user token:', error);
        }
    }

    /**
     * Request Xsolla token
     */
    requestXsollaToken() {
        if (!this.sdk) return;

        try {
            this.sdk.user.getXsollaToken()
                .then((token) => {
                    console.log('Xsolla token received');
                    // Use token if needed
                })
                .catch((error) => {
                    console.error('Error getting Xsolla token:', error);
                });
        } catch (error) {
            console.error('Error requesting Xsolla token:', error);
        }
    }

    /**
     * Check for happy time feature
     */
    checkHappyTime() {
        if (!this.sdk) return;

        try {
            const isHappyTime = this.sdk.game.happytime;

            if (isHappyTime) {
                console.log('Happy time is active!');
                // Implement any special features for happy time here
            }
        } catch (error) {
            console.error('Error checking happy time:', error);
        }
    }

    /**
     * Register a callback to be called when SDK initialization is complete
     * @param {Function} callback 
     */
    onInit(callback) {
        if (this.initialized) {
            // If already initialized, call immediately
            callback(this.initialized);
        } else {
            // Otherwise add to queue
            this.initCallbacks.push(callback);
        }
    }

    /**
     * Trigger all registered init callbacks
     */
    triggerInitCallbacks() {
        for (const callback of this.initCallbacks) {
            try {
                callback(this.initialized);
            } catch (e) {
                console.error('Error in SDK init callback:', e);
            }
        }
        // Clear the callbacks
        this.initCallbacks = [];
    }

    /**
     * Track game loading start
     */
    trackLoadingStart() {
        if (!this.sdk) return;

        try {
            console.log('Tracking loading start');
            if (this.sdk.game.trackLoadingStart) {
                this.sdk.game.trackLoadingStart();
            }
        } catch (error) {
            console.error('Error tracking loading start:', error);
        }
    }

    /**
     * Track game loading end
     */
    trackLoadingEnd() {
        if (!this.sdk) return;

        try {
            console.log('Tracking loading end');
            this.sdk.game.trackLoadingEnd();
        } catch (error) {
            console.error('Error tracking loading end:', error);
        }
    }

    /**
     * Track gameplay start
     */
    trackLoadingEnd() {
        if (!this.sdk) return;

        try {
            console.log('Tracking loading end');
            if (this.sdk.game.trackLoadingEnd) {
                this.sdk.game.trackLoadingEnd();
            }
        } catch (error) {
            console.error('Error tracking loading end:', error);
        }
    }

    trackGameplayStart() {
        if (!this.sdk) return;

        try {
            console.log('Tracking gameplay start');

            // Use gameplayStart() as per documentation
            if (this.sdk.game && typeof this.sdk.game.gameplayStart === 'function') {
                this.sdk.game.gameplayStart();
                console.log('✓ Gameplay start tracked with gameplayStart()');
            } else {
                console.warn('gameplayStart method not available');

                // Try fallback to direct window reference
                if (window.CrazyGames && window.CrazyGames.SDK &&
                    window.CrazyGames.SDK.game &&
                    typeof window.CrazyGames.SDK.game.gameplayStart === 'function') {
                    window.CrazyGames.SDK.game.gameplayStart();
                    console.log('✓ Used window.CrazyGames.SDK for gameplay start');
                }
            }

            this.gameplayStarted = true;
        } catch (error) {
            console.error('Error tracking gameplay start:', error);
        }
    }
    trackGameplayStop() {
        if (!this.sdk) return;

        try {
            console.log('Tracking gameplay stop');

            // Use gameplayStop() as per documentation
            if (this.sdk.game && typeof this.sdk.game.gameplayStop === 'function') {
                this.sdk.game.gameplayStop();
                console.log('✓ Gameplay stop tracked with gameplayStop()');
            } else {
                console.warn('gameplayStop method not available');

                // Try fallback to direct window reference
                if (window.CrazyGames && window.CrazyGames.SDK &&
                    window.CrazyGames.SDK.game &&
                    typeof window.CrazyGames.SDK.game.gameplayStop === 'function') {
                    window.CrazyGames.SDK.game.gameplayStop();
                    console.log('✓ Used window.CrazyGames.SDK for gameplay stop');
                }
            }

            this.gameplayStarted = false;
        } catch (error) {
            console.error('Error tracking gameplay stop:', error);
        }
    }

    /**
     * Show a midgame ad (interstitial)
     * @returns {Promise<boolean>} True if ad was shown successfully
     */
    async showMidgameAd() {
        if (!this.initialized || !this.sdk) {
            console.warn('Cannot show ad: SDK not initialized');
            return false;
        }

        try {
            // Don't request an ad if we've already requested one
            if (this.adRequested) {
                console.log('Ad already requested, waiting for it to complete');
                return false;
            }

            console.log('Attempting to show midgame ad...');

            // Mark that we've requested an ad to prevent multiple requests
            this.adRequested = true;

            return new Promise((resolve) => {
                this.sdk.ad.requestAd('midgame');

                // Add temporary listeners for this specific ad request
                const onAdFinished = () => {
                    console.log('Midgame ad finished');
                    cleanup();
                    this.adRequested = false;
                    resolve(true);
                };

                const onAdError = (error) => {
                    console.warn('Midgame ad error:', error);
                    cleanup();
                    this.adRequested = false;
                    resolve(false);
                };

                // Add listeners
                this.sdk.ad.addEventListener('adFinished', onAdFinished);
                this.sdk.ad.addEventListener('adError', onAdError);

                // Cleanup function to remove listeners
                const cleanup = () => {
                    this.sdk.ad.removeEventListener('adFinished', onAdFinished);
                    this.sdk.ad.removeEventListener('adError', onAdError);
                };
            });
        } catch (error) {
            console.error('Error showing midgame ad:', error);
            this.adRequested = false;
            return false;
        }
    }


    /**
     * Show a rewarded ad with improved initialization checks
     * @param {Function} rewardCallback Callback to execute when the user earns the reward
     * @returns {Promise<boolean>} True if ad was shown successfully
     */
    async showRewardedAd(rewardCallback) {
        // First, perform a thorough SDK check
        if (!window.CrazyGames || !window.CrazyGames.SDK) {
            console.warn('Cannot show rewarded ad: CrazyGames SDK not found in window');
            return false;
        }

        // Check if our internal SDK reference is initialized
        if (!this.sdk) {
            // Try to initialize SDK reference if it's available but not set
            if (window.CrazyGames.SDK) {
                console.log('Late SDK initialization before showing rewarded ad');
                this.sdk = window.CrazyGames.SDK;
                this.initialized = true;
            } else {
                console.warn('Cannot show rewarded ad: SDK reference not available');
                return false;
            }
        }

        // Verify that ad functionality is available
        if (!this.sdk.ad || typeof this.sdk.ad.requestAd !== 'function') {
            console.warn('Cannot show rewarded ad: Ad API not available');
            return false;
        }

        try {
            // Don't request an ad if we've already requested one
            if (this.adRequested) {
                console.log('Ad already requested, waiting for it to complete');
                return false;
            }

            console.log('Attempting to show rewarded ad...');

            // Mark that we've requested an ad to prevent multiple requests
            this.adRequested = true;

            return new Promise((resolve) => {
                try {
                    this.sdk.ad.requestAd('rewarded');

                    // Add temporary listeners for this specific ad request
                    const onAdFinished = () => {
                        console.log('Rewarded ad finished, giving reward');
                        cleanup();
                        this.adRequested = false;

                        // Call the reward callback
                        if (typeof rewardCallback === 'function') {
                            rewardCallback();
                        }

                        resolve(true);
                    };

                    const onAdError = (error) => {
                        console.warn('Rewarded ad error:', error);
                        cleanup();
                        this.adRequested = false;
                        resolve(false);
                    };

                    // Add listeners
                    this.sdk.ad.addEventListener('adFinished', onAdFinished);
                    this.sdk.ad.addEventListener('adError', onAdError);

                    // Cleanup function to remove listeners
                    const cleanup = () => {
                        this.sdk.ad.removeEventListener('adFinished', onAdFinished);
                        this.sdk.ad.removeEventListener('adError', onAdError);
                    };
                } catch (error) {
                    console.error('Error requesting rewarded ad:', error);
                    this.adRequested = false;
                    resolve(false);
                }
            });
        } catch (error) {
            console.error('Error showing rewarded ad:', error);
            this.adRequested = false;
            return false;
        }
    }

    /**
     * Request a banner ad
     */
    requestBanner() {
        if (!this.initialized || !this.sdk) {
            console.warn('Cannot request banner: SDK not initialized');
            return;
        }

        try {
            console.log('Requesting banner ad');
            this.sdk.banner.requestBanner({
                size: '320x100', // Standard size
                position: 'bottom' // Display at bottom
            });
        } catch (error) {
            console.error('Error requesting banner:', error);
        }
    }

    /**
     * Request an invite link
     * @param {Object} options Options like title, text, url, etc.
     */
    requestInviteLink(options = {}) {
        if (!this.initialized || !this.sdk) {
            console.warn('Cannot request invite link: SDK not initialized');
            return;
        }

        try {
            const defaultOptions = {
                title: 'Play Dice Dynasty with me!',
                text: 'Check out this cool dice merging game I\'m playing!',
            };

            const mergedOptions = { ...defaultOptions, ...options };

            console.log('Requesting invite link');
            this.sdk.inviteLink.requestInviteLink(mergedOptions);
        } catch (error) {
            console.error('Error requesting invite link:', error);
        }
    }

    /**
     * Save game data to the Crazy Games cloud
     * @param {Object} data The data to save
     * @returns {Promise<boolean>} True if successful
     */
    async saveGameData(data) {
        if (!this.initialized || !this.sdk) {
            console.warn('Cannot save game data: SDK not initialized');
            return false;
        }

        try {
            console.log('Saving game data to cloud');
            await this.sdk.game.saveData(data);
            return true;
        } catch (error) {
            console.error('Error saving game data:', error);
            return false;
        }
    }

    /**
     * Load game data from the Crazy Games cloud
     * @returns {Promise<Object>} The loaded data or null if error
     */
    async loadGameData() {
        if (!this.initialized || !this.sdk) {
            console.warn('Cannot load game data: SDK not initialized');
            return null;
        }

        try {
            console.log('Loading game data from cloud');
            const data = await this.sdk.game.loadData();
            return data || {};
        } catch (error) {
            console.error('Error loading game data:', error);
            return null;
        }
    }

    /**
     * Track a game event
     * @param {string} eventName Name of the event to track
     * @param {Object} eventParams Optional event parameters
     */
    trackEvent(eventName, eventParams = {}) {
        // First check if we have a direct SDK reference
        try {
            console.log(`Attempting to track event: ${eventName}`, eventParams);

            // Don't try to use trackEvent, as it doesn't exist
            // Instead, log the event for debugging purposes
            console.log(`Event tracking for "${eventName}" - SDK doesn't support custom events`);

            // Log event parameters for debugging
            console.log('Event parameters:', eventParams);
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    }

    /**
     * Get the happy time (extra features for users coming from Crazy Games)
     * @returns {boolean} True if happy time is enabled
     */
    getHappyTime() {
        if (!this.initialized || !this.sdk) {
            return false;
        }

        try {
            return this.sdk.game.happytime;
        } catch (error) {
            console.error('Error getting happy time:', error);
            return false;
        }
    }
    forceGameplayStart() {
        if (!this.sdk) {
            console.warn('Cannot force gameplay start: SDK not initialized');
            return;
        }

        try {
            console.log('Forcing gameplay start event');

            // Check if we've already triggered gameplay start
            if (this.gameplayStarted) {
                console.log('Gameplay already started, triggering again to ensure detection');
            }

            // Call the gameplayStart method directly
            if (this.sdk.game && typeof this.sdk.game.gameplayStart === 'function') {
                this.sdk.game.gameplayStart();
                console.log('✅ gameplayStart() called explicitly');
            } else {
                console.warn('gameplayStart method not available');

                // Try direct window access
                if (window.CrazyGames && window.CrazyGames.SDK &&
                    window.CrazyGames.SDK.game &&
                    typeof window.CrazyGames.SDK.game.gameplayStart === 'function') {
                    window.CrazyGames.SDK.game.gameplayStart();
                    console.log('✅ window.CrazyGames.SDK.game.gameplayStart() called');
                }
            }

            this.gameplayStarted = true;
        } catch (error) {
            console.error('Error forcing gameplay start:', error);
        }
    }

}