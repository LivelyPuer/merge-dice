export class AudioManager {
    constructor() {
        this.sounds = {
            select: new Audio('./assets/sounds/select.mp3'),
            merge: new Audio('./assets/sounds/merge.mp3'),
            place: new Audio('./assets/sounds/place.mp3'),
            gameover: new Audio('./assets/sounds/gameover.mp3'),
            upgrade: new Audio('./assets/sounds/upgrade.mp3')
        };
        
        this.muted = false;
        
        // Preload sounds
        this.preloadSounds();
    }
    
    preloadSounds() {
        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.5;
            
            // Force preload by starting to play and immediately pausing
            sound.play().catch(() => {
                // This will likely fail due to user interaction requirements,
                // but we'll handle it properly when actually playing sounds
            });
            sound.pause();
            sound.currentTime = 0;
        });
    }
    
    playSound(soundName) {
        if (this.muted || !this.sounds[soundName]) return;
        
        // Clone the audio to allow overlapping sounds
        const sound = this.sounds[soundName].cloneNode();
        sound.volume = this.sounds[soundName].volume;
        
        sound.play().catch(error => {
            console.error(`Error playing sound ${soundName}:`, error);
        });
    }
    
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }
    
    setVolume(volume) {
        // Ensure volume is between 0 and 1
        volume = Math.max(0, Math.min(1, volume));
        
        // Set volume for all sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = volume;
        });
    }
}