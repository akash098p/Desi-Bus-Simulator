/**
 * Music Library - Playlist and song management.
 * - Playlists stored in localStorage (metadata)
 * - Local audio files stored in IndexedDB (blobs)
 * - YouTube videos/playlists supported via video IDs
 */

// YouTube IFrame API type declarations
declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          height?: string;
          width?: string;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onError?: () => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => {
        getPlaylist?: () => string[];
        getPlaylistItem?: (index: number) => {
          videoId?: string;
          title?: string;
        };
        playVideo: () => void;
        pauseVideo: () => void;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
        getCurrentTime: () => number;
        getDuration: () => number;
        destroy: () => void;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface Song {
  id: string;
  title: string;
  type: "local" | "youtube";
  /** For local files: IndexedDB key */
  fileKey?: string;
  /** For YouTube: video ID */
  youtubeId?: string;
  /** For YouTube playlists: playlist ID */
  playlistId?: string;
  duration?: number;
  addedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: number;
}

const PLAYLISTS_KEY = "desi-bus-playlists";
const ACTIVE_PLAYLIST_KEY = "desi-bus-active-playlist";
const ACTIVE_SONG_KEY = "desi-bus-active-song";

// ===== IndexedDB for local audio files =====
const DB_NAME = "desi-bus-music";
const DB_STORE = "audio-files";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioFile(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAudioFile(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAudioFile(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ===== Playlist CRUD =====

export function getPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    return raw ? (JSON.parse(raw) as Playlist[]) : [];
  } catch {
    return [];
  }
}

function savePlaylists(playlists: Playlist[]): void {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export function createPlaylist(name: string): Playlist {
  const playlists = getPlaylists();
  const playlist: Playlist = {
    id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    songs: [],
    createdAt: Date.now(),
  };
  playlists.push(playlist);
  savePlaylists(playlists);
  return playlist;
}

export function renamePlaylist(playlistId: string, newName: string): void {
  const playlists = getPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (pl) {
    pl.name = newName;
    savePlaylists(playlists);
  }
}

export function deletePlaylist(playlistId: string): void {
  const playlists = getPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (pl) {
    // Clean up local files
    pl.songs
      .filter((s) => s.type === "local" && s.fileKey)
      .forEach((s) => {
        if (s.fileKey) void deleteAudioFile(s.fileKey);
      });
  }
  savePlaylists(playlists.filter((p) => p.id !== playlistId));
}

export function addSongToPlaylist(
  playlistId: string,
  song: Omit<Song, "id" | "addedAt">,
): Song {
  const playlists = getPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) throw new Error("Playlist not found");
  const newSong: Song = {
    ...song,
    id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    addedAt: Date.now(),
  };
  pl.songs.push(newSong);
  savePlaylists(playlists);
  return newSong;
}

export function updateSong(
  playlistId: string,
  songId: string,
  updates: Partial<Song>,
): void {
  const playlists = getPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;
  const song = pl.songs.find((s) => s.id === songId);
  if (song) {
    Object.assign(song, updates);
    savePlaylists(playlists);
  }
}

export function removeSongFromPlaylist(
  playlistId: string,
  songId: string,
): void {
  const playlists = getPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;
  const song = pl.songs.find((s) => s.id === songId);
  if (song?.type === "local" && song.fileKey) {
    void deleteAudioFile(song.fileKey);
  }
  pl.songs = pl.songs.filter((s) => s.id !== songId);
  savePlaylists(playlists);
}

export function reorderSongs(
  playlistId: string,
  fromIndex: number,
  toIndex: number,
): void {
  const playlists = getPlaylists();
  const pl = playlists.find((p) => p.id === playlistId);
  if (!pl) return;
  const [moved] = pl.songs.splice(fromIndex, 1);
  pl.songs.splice(toIndex, 0, moved);
  savePlaylists(playlists);
}

// ===== Active state =====

export function getActivePlaylistId(): string | null {
  return localStorage.getItem(ACTIVE_PLAYLIST_KEY);
}

export function setActivePlaylistId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_PLAYLIST_KEY, id);
  else localStorage.removeItem(ACTIVE_PLAYLIST_KEY);
}

export function getActiveSongId(): string | null {
  return localStorage.getItem(ACTIVE_SONG_KEY);
}

export function setActiveSongId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_SONG_KEY, id);
  else localStorage.removeItem(ACTIVE_SONG_KEY);
}

// ===== YouTube URL parsing =====

export function parseYouTubeUrl(url: string): {
  type: "video" | "playlist";
  id: string;
} | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    if (!host.includes("youtube.com") && !host.includes("youtu.be")) {
      return null;
    }

    // youtu.be/VIDEO_ID
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      if (id) return { type: "video", id };
    }

    // youtube.com/watch?v=VIDEO_ID
    const v = parsed.searchParams.get("v");
    if (v) return { type: "video", id: v };

    // youtube.com/playlist?list=PLAYLIST_ID
    const list = parsed.searchParams.get("list");
    if (list) return { type: "playlist", id: list };

    return null;
  } catch {
    return null;
  }
}

// ===== YouTube IFrame API =====

let ytApiReady: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (ytApiReady) return ytApiReady;
  ytApiReady = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevOnReady?.();
      resolve();
    };
    document.head.appendChild(tag);
  });
  return ytApiReady;
}

export function extractYouTubePlaylistVideos(
  playlistId: string,
): Promise<{ id: string; title: string }[]> {
  return new Promise((resolve, reject) => {
    void loadYouTubeApi().then(() => {
      if (!window.YT?.Player) {
        reject(new Error("YouTube API not available"));
        return;
      }
      // Use the YouTube IFrame API to load the playlist and extract videos
      const container = document.createElement("div");
      container.id = `yt-playlist-extract-${Date.now()}`;
      container.style.display = "none";
      document.body.appendChild(container);

      const player = new window.YT.Player(container.id, {
        height: "1",
        width: "1",
        playerVars: {
          listType: "playlist",
          list: playlistId,
        },
        events: {
          onReady: () => {
            try {
              const videos: { id: string; title: string }[] = [];
              const count = player.getPlaylist?.()?.length ?? 0;
              for (let i = 0; i < count; i++) {
                const id = player.getPlaylistItem?.(i)?.videoId;
                const title = player.getPlaylistItem?.(i)?.title;
                if (id) {
                  videos.push({ id, title: title || `Video ${i + 1}` });
                }
              }
              player.destroy();
              container.remove();
              resolve(videos);
            } catch {
              player.destroy();
              container.remove();
              reject(new Error("Could not extract playlist"));
            }
          },
          onError: () => {
            player.destroy();
            container.remove();
            reject(new Error("YouTube playlist error"));
          },
        },
      });
    });
  });
}