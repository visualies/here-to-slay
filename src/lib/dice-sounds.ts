class DiceSoundManager {
  private bounceAudios: HTMLAudioElement[] = [];
  private currentlyPlaying: HTMLAudioElement[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeSounds();
  }

  private async initializeSounds() {
    if (this.isInitialized) return;
    
    const bounceCount = 4;
    
    for (let i = 1; i <= bounceCount; i++) {
      try {
        const audio = new Audio(`/dice-bounces/bounce${i}.mp3`);
        audio.preload = 'auto';
        audio.volume = 0.6;
        this.bounceAudios.push(audio);
      } catch (error) {
        console.warn(`Failed to load bounce${i}.mp3:`, error);
      }
    }
    
    this.isInitialized = true;
  }

  private getRandomBounce(): HTMLAudioElement | null {
    if (this.bounceAudios.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * this.bounceAudios.length);
    return this.bounceAudios[randomIndex];
  }

  private async playAudioSafely(audio: HTMLAudioElement) {
    try {
      audio.currentTime = 0;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
        this.currentlyPlaying.push(audio);
        
        audio.addEventListener('ended', () => {
          const index = this.currentlyPlaying.indexOf(audio);
          if (index > -1) {
            this.currentlyPlaying.splice(index, 1);
          }
        }, { once: true });
      }
    } catch (error) {
      console.warn('Failed to play dice sound:', error);
    }
  }

  public async playDiceRoll() {
    if (!this.isInitialized) {
      await this.initializeSounds();
    }

    const bounceAudio = this.getRandomBounce();
    if (bounceAudio) {
      await this.playAudioSafely(bounceAudio);
    }
  }

  public stopAllSounds() {
    this.currentlyPlaying.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.currentlyPlaying = [];
  }

  public setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.bounceAudios.forEach(audio => {
      audio.volume = clampedVolume;
    });
  }
}

let diceSoundManager: DiceSoundManager | null = null;

export const getDiceSoundManager = (): DiceSoundManager => {
  if (!diceSoundManager) {
    diceSoundManager = new DiceSoundManager();
  }
  return diceSoundManager;
};

export const playDiceSound = async () => {
  const manager = getDiceSoundManager();
  await manager.playDiceRoll();
};

export const setDiceSoundVolume = (volume: number) => {
  const manager = getDiceSoundManager();
  manager.setVolume(volume);
};

export const stopAllDiceSounds = () => {
  const manager = getDiceSoundManager();
  manager.stopAllSounds();
};