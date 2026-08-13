/**
 * MusicPlayer - Singleton audio playback manager.
 * Handles local file playback and YouTube video playback.
 */
import {
  getAudioFile,
  getPlaylists,
  setActivePlaylistId,
  setActiveSongId,
  type Playlist,
  type Song,
} from "./musicLibrary";

// Extended type for YouTube Player with playback methods
interface YTPlayerExtended {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

class MusicPlayerManager {
  private audio: HTMLAudioElement | null = null;
  private ytPlayer: YTPlayerExtended | null = null;
  private ytContainer: HTMLDivElement | null = null;
  private ytTimeInterval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();

  private _playlist: Playlist | null = null;
  private _song: Song | null = null;
  private _isPlaying = false;
  private _currentTime = 0;
  private _duration = 0;
  private _volume = 0.8;
  private _shuffle = false;
  private _repeat = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.audio = new Audio();
      this.audio.volume = this._volume;
      this.audio.addEventListener("timeupdate", () => {
        this._currentTime = this.audio?.currentTime ?? 0;
        this.emit();
      });
      this.audio.addEventListener("loadedmetadata", () => {
        this._duration = this.audio?.duration ?? 0;
        this.emit();
      });
      this.audio.addEventListener("ended", () => {
        if (this._repeat) {
          if (this.audio) {
            this.audio.currentTime = 0;
            void this.audio.play();
          }
        } else {
          this.next();
        }
      });

      // Create hidden YouTube container
      this.ytContainer = document.createElement("div");
      this.ytContainer.style.display = "none";
      document.body.appendChild(this.ytContainer);
    }
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  get playlist(): Playlist | null {
    return this._playlist;
  }

  get song(): Song | null {
    return this._song;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  get duration(): number {
    return this._duration;
  }

  get volume(): number {
    return this._volume;
  }

  get shuffle(): boolean {
    return this._shuffle;
  }

  get repeat(): boolean {
    return this._repeat;
  }

  setVolume(v: number): void {
    this._volume = v;
    if (this.audio) this.audio.volume = v;
    this.emit();
  }

  toggleShuffle(): void {
    this._shuffle = !this._shuffle;
    this.emit();
  }

  toggleRepeat(): void {
    this._repeat = !this._repeat;
    this.emit();
  }

  seek(t: number): void {
    if (this._song?.type === "local" && this.audio) {
      this.audio.currentTime = t;
      this._currentTime = t;
      this.emit();
    } else if (this._song?.type === "youtube" && this.ytPlayer) {
      if (this.ytPlayer.seekTo) {
        this.ytPlayer.seekTo(t, true);
      }
      this._currentTime = t;
      this.emit();
    }
  }

  /** Load a playlist and optionally play a specific song. */
  loadPlaylist(playlistId: string, songId?: string): void {
    const playlists = getPlaylists();
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    this._playlist = pl;
    setActivePlaylistId(pl.id);

    if (songId) {
      const song = pl.songs.find((s) => s.id === songId);
      if (song) {
        this.loadSong(song);
        return;
      }
    }
    if (pl.songs.length > 0) {
      this.loadSong(pl.songs[0]);
    } else {
      this._song = null;
      this._isPlaying = false;
      this.emit();
    }
  }

  /** Load and play a specific song. */
  loadSong(song: Song): void {
    this._song = song;
    setActiveSongId(song.id);
    this._currentTime = 0;
    this._duration = 0;

    // Clean up previous YouTube time interval
    if (this.ytTimeInterval) {
      clearInterval(this.ytTimeInterval);
      this.ytTimeInterval = null;
    }

    // Destroy any existing YouTube player
    if (this.ytPlayer) {
      this.ytPlayer.destroy();
      this.ytPlayer = null;
    }

    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }

    if (song.type === "local" && song.fileKey) {
      void getAudioFile(song.fileKey).then((blob) => {
        if (!blob || !this.audio || this._song?.id !== song.id) return;
        const url = URL.createObjectURL(blob);
        this.audio.src = url;
        this.audio.volume = this._volume;
        void this.audio.play().then(() => {
          this._isPlaying = true;
          this.emit();
        }).catch(() => {
          this._isPlaying = false;
          this.emit();
        });
      });
    } else if (song.type === "youtube" && song.youtubeId) {
      void this.loadYouTube(song);
    }
    this.emit();
  }

  private async loadYouTube(song: Song): Promise<void> {
    if (!song.youtubeId || !this.ytContainer) return;
    try {
      // Load YouTube IFrame API
      await new Promise<void>((resolve) => {
        if (window.YT?.Player) {
          resolve();
          return;
        }
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prev?.();
          resolve();
        };
        document.head.appendChild(tag);
      });

      if (!window.YT?.Player || this._song?.id !== song.id) return;

      this.ytContainer.innerHTML = "";
      const div = document.createElement("div");
      div.id = `yt-music-${song.id}`;
      this.ytContainer.appendChild(div);

      this.ytPlayer = new window.YT.Player(div.id, {
        height: "1",
        width: "1",
        videoId: song.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
        },
        events: {
          onStateChange: (event: { data: number }) => {
            // 1 = playing, 2 = paused, 0 = ended
            if (event.data === 1) {
              this._isPlaying = true;
              // Start tracking time for YouTube
              if (this.ytTimeInterval) clearInterval(this.ytTimeInterval);
              this.ytTimeInterval = setInterval(() => {
                if (this.ytPlayer) {
                  const t = this.ytPlayer.getCurrentTime?.() ?? 0;
                  const d = this.ytPlayer.getDuration?.() ?? 0;
                  this._currentTime = t;
                  this._duration = d;
                  this.emit();
                }
              }, 500);
              this.emit();
            } else if (event.data === 2) {
              this._isPlaying = false;
              if (this.ytTimeInterval) {
                clearInterval(this.ytTimeInterval);
                this.ytTimeInterval = null;
              }
              this.emit();
            } else if (event.data === 0) {
              this._isPlaying = false;
              if (this.ytTimeInterval) {
                clearInterval(this.ytTimeInterval);
                this.ytTimeInterval = null;
              }
              if (this._repeat) {
                // replay handled by YouTube
              } else {
                this.next();
              }
            }
          },
        },
      });
    } catch {
      // YouTube failed to load
      this._isPlaying = false;
      this.emit();
    }
  }

  togglePlay(): void {
    if (!this._song) return;
    if (this._song.type === "local") {
      if (!this.audio) return;
      if (this._isPlaying) {
        this.audio.pause();
        this._isPlaying = false;
      } else {
        void this.audio.play().then(() => {
          this._isPlaying = true;
          this.emit();
        }).catch(() => {
          this._isPlaying = false;
          this.emit();
        });
      }
      this.emit();
    } else if (this._song.type === "youtube") {
      if (!this.ytPlayer) return;
      if (this._isPlaying) {
        this.ytPlayer.pauseVideo();
        this._isPlaying = false;
        if (this.ytTimeInterval) {
          clearInterval(this.ytTimeInterval);
          this.ytTimeInterval = null;
        }
      } else {
        this.ytPlayer.playVideo();
        this._isPlaying = true;
        if (this.ytTimeInterval) {
          clearInterval(this.ytTimeInterval);
        }
        this.ytTimeInterval = setInterval(() => {
          if (this.ytPlayer) {
            const t = this.ytPlayer.getCurrentTime?.() ?? 0;
            const d = this.ytPlayer.getDuration?.() ?? 0;
            this._currentTime = t;
            this._duration = d;
            this.emit();
          }
        }, 500);
      }
      this.emit();
    }
  }

  next(): void {
    if (!this._playlist || this._playlist.songs.length === 0) return;
    const songs = this._playlist.songs;
    let nextIndex = 0;
    if (this._song) {
      const currentIndex = songs.findIndex((s) => s.id === this._song?.id);
      if (this._shuffle) {
        nextIndex = Math.floor(Math.random() * songs.length);
      } else {
        nextIndex = (currentIndex + 1) % songs.length;
      }
    }
    this.loadSong(songs[nextIndex]);
  }

  prev(): void {
    if (!this._playlist || this._playlist.songs.length === 0) return;
    const songs = this._playlist.songs;
    let prevIndex = songs.length - 1;
    if (this._song) {
      const currentIndex = songs.findIndex((s) => s.id === this._song?.id);
      prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    }
    this.loadSong(songs[prevIndex]);
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
    }
    if (this.ytPlayer) {
      this.ytPlayer.destroy();
      this.ytPlayer = null;
    }
    if (this.ytTimeInterval) {
      clearInterval(this.ytTimeInterval);
      this.ytTimeInterval = null;
    }
    this._isPlaying = false;
    this._currentTime = 0;
    this._duration = 0;
    this.emit();
  }
}

/** Singleton instance */
export const musicPlayer = new MusicPlayerManager();