/**
 * Localization module for Dice Dynasty
 * Uses Yandex Games SDK for language detection
 * and CSV files for storing translations
 */
import Papa from 'papaparse';
import { setupDocumentDirection } from './utils';

export class Localization {
    constructor() {
        this.currentLanguage = 'en'; // Default language
        this.translations = {};
        this.isLoaded = false;
        this.onLoadCallbacks = [];
    }

    /**
    * Initialize localization
    * @param {Object} yandexSDK - Reference to the Yandex SDK instance
    */
    async init(yandexSDK) {
        try {
            // Try to detect language from Yandex SDK
            if (yandexSDK && yandexSDK.initialized) {
                const lang = this.detectYandexLanguage(yandexSDK);
                if (lang) {
                    this.currentLanguage = lang;
                    console.log(`Language detected from Yandex SDK: ${lang}`);
                }
            } else {
                // Fallback to browser language
                const browserLang = this.detectBrowserLanguage();
                if (browserLang) {
                    this.currentLanguage = browserLang;
                    console.log(`Language detected from browser: ${browserLang}`);
                }
            }

            // Set document language attribute
            document.documentElement.lang = this.currentLanguage;

            // Load translations
            await this.loadTranslations();
            
            // Mark as loaded and run callbacks
            this.isLoaded = true;
            this.runLoadCallbacks();
            
            return true;
        } catch (error) {
            console.error('Error initializing localization:', error);
            return false;
        }
    }


    /**
     * Detect language from Yandex SDK
     * @param {Object} yandexSDK - Reference to the Yandex SDK instance
     * @returns {string|null} - Language code or null if not detected
     */
    detectYandexLanguage(yandexSDK) {
        if (!yandexSDK || !yandexSDK.initialized) return null;
        
        try {
            // Get language directly from the SDK
            const langCode = yandexSDK.getLanguage();
            if (!langCode) return null;
            
            // Map Yandex language codes to our supported languages
            const supportedLanguages = {
                'ru': 'ru',
                'en': 'en',
                'tr': 'tr',
                'de': 'de',
                'fr': 'fr',
                'es': 'es'
                // Add more languages as needed
            };
            
            console.log('Yandex detected language:', langCode);
            return supportedLanguages[langCode] || 'en';
        } catch (error) {
            console.warn('Error detecting Yandex language:', error);
        }
        
        return null;
    }

    /**
    * Detect language from browser settings
    * @returns {string} - Language code
    */
    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        if (!browserLang) return 'en';
        
        // Get the primary language code (e.g., 'en' from 'en-US')
        const primaryLang = browserLang.split('-')[0];
        
        // Map to supported languages
        const supportedLanguages = {
            'ru': 'ru',
            'en': 'en',
            'tr': 'tr',
            'de': 'de',
            'fr': 'fr',
            'es': 'es'
            // Add more languages as needed
        };
        
        return supportedLanguages[primaryLang] || 'en';
    }

    /**
     * Load translations from CSV file
     */
    async loadTranslations() {
        try {
            const response = await fetch(`./assets/localization/translations.csv`);
            const csv = await response.text();
            
            // Parse CSV using PapaParse
            const result = Papa.parse(csv, {
                header: true,
                skipEmptyLines: true
            });
            
            if (result.errors && result.errors.length > 0) {
                console.warn('CSV parsing errors:', result.errors);
            }
            
            // Convert the array of objects to a more usable format
            this.processTranslations(result.data);
            
            console.log(`Loaded ${Object.keys(this.translations).length} translation keys`);
            return true;
        } catch (error) {
            console.error('Error loading translations:', error);
            return false;
        }
    }

    /**
     * Process the raw CSV data into a usable format
     * @param {Array} data - Array of objects from CSV
     */
    processTranslations(data) {
        // Reset translations
        this.translations = {};
        
        // Process each row
        data.forEach(row => {
            const key = row.key;
            if (!key) return; // Skip rows without a key
            
            // Create entry for this key
            this.translations[key] = {};
            
            // Add each language
            Object.keys(row).forEach(lang => {
                if (lang !== 'key' && row[lang]) {
                    this.translations[key][lang] = row[lang];
                }
            });
        });
    }

    /**
     * Set the current language
     * @param {string} lang - Language code
     */
    setLanguage(lang) {
        if (this.currentLanguage === lang) return;
        
        this.currentLanguage = lang;
        console.log(`Language changed to: ${lang}`);
        
        // Update document language attribute
        document.documentElement.lang = lang;
        
        // Trigger language change event
        const event = new CustomEvent('languageChanged', {
            detail: { language: lang }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get a translated string
     * @param {string} key - Translation key
     * @param {Object} replacements - Optional key-value pairs for variable replacement
     * @returns {string} - Translated string or key if not found
     */
    get(key, replacements = null) {
        // If translations not loaded yet, return key
        if (!this.isLoaded) {
            return key;
        }
        
        // Get translation for current language
        const translationObj = this.translations[key];
        if (!translationObj) {
            console.warn(`Translation key not found: ${key}`);
            return key;
        }
        
        // Get specific language translation or fall back to English
        let translation = translationObj[this.currentLanguage] || translationObj['en'] || key;
        
        // Handle replacements if provided
        if (replacements) {
            Object.keys(replacements).forEach(replaceKey => {
                const placeholder = new RegExp(`\\{${replaceKey}\\}`, 'g');
                translation = translation.replace(placeholder, replacements[replaceKey]);
            });
        }
        
        return translation;
    }

    /**
     * Register a callback to be executed when translations are loaded
     * @param {Function} callback - Function to call when loaded
     */
    onLoad(callback) {
        if (this.isLoaded) {
            callback();
        } else {
            this.onLoadCallbacks.push(callback);
        }
    }

    /**
     * Run all registered load callbacks
     */
    runLoadCallbacks() {
        this.onLoadCallbacks.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('Error in localization load callback:', error);
            }
        });
        
        // Clear callbacks
        this.onLoadCallbacks = [];
    }

    /**
     * Get list of available languages
     * @returns {Object} - Object with language codes and names
     */
    getAvailableLanguages() {
        return {
            'en': 'English',
            'ru': 'Русский',
            'tr': 'Türkçe',
            'de': 'Deutsch',
            'fr': 'Français',
            'es': 'Español'
            // Add more languages as needed
        };
    }
    /*
    * Check if current language is RTL
    * @returns {boolean} - True if current language is RTL
    */
    isRtl() {
        const rtlLanguages = ['en', 'ru', 'tr', 'de', 'fr', 'es'];
        return rtlLanguages.includes(this.currentLanguage);
    }
}