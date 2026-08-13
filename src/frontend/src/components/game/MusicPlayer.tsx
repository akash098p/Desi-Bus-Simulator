import { useCallback, useEffect, useRef, useState } from "react";
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  extractYouTubePlaylistVideos,
  getPlaylists,
  parseYouTubeUrl,
  removeSongFromPlaylist,
  renamePlaylist,
  reorderSongs,
  saveAudioFile,
  updateSong,
  type Playlist,
  type Song,
} from "../../utils/musicLibrary";
import { musicPlayer } from "../../utils/musicPlayer";

interface MusicPlayerProps {
  onClose: () => void;
}

export default function MusicPlayer({ onClose }: MusicPlayerProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => getPlaylists());
  const [activePlaylistId, setActivePlaylist] = useState<string | null>(
    () => musicPlayer.playlist?.id ?? null,
  );
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState("");
  const [editingSong, setEditingSong] = useState<{
    playlistId: string;
    songId: string;
    title: string;
  } | null>(null);
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [, forceUpdate] = useState({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) ?? null;
  const activeSong = musicPlayer.song;
  const isPlaying = musicPlayer.isPlaying;
  const currentTime = musicPlayer.currentTime;
  const duration = musicPlayer.duration;
  const volume = musicPlayer.volume;
  const shuffle = musicPlayer.shuffle;
  const repeat = musicPlayer.repeat;

  const refreshPlaylists = useCallback(() => {
    setPlaylists(getPlaylists());
  }, []);

  // Subscribe to music player state
  useEffect(() => {
    const unsub = musicPlayer.subscribe(() => {
      setActivePlaylist(musicPlayer.playlist?.id ?? null);
      forceUpdate({});
    });
    return unsub;
  }, []);

  // ===== Playback controls =====
  const togglePlay = () => {
    musicPlayer.togglePlay();
  };

  const playNext = () => {
    musicPlayer.next();
  };

  const playPrev = () => {
    musicPlayer.prev();
  };

  const selectSong = (song: Song) => {
    if (!activePlaylistId) return;
    musicPlayer.loadPlaylist(activePlaylistId, song.id);
  };

  const handleVolumeChange = (v: number) => {
    musicPlayer.setVolume(v);
  };

  const handleSeek = (t: number) => {
    musicPlayer.seek(t);
  };

  // ===== Playlist management =====
  const handleCreatePlaylist = () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const pl = createPlaylist(name);
    setNewPlaylistName("");
    refreshPlaylists();
    setActivePlaylist(pl.id);
  };

  const handleRenamePlaylist = (playlistId: string) => {
    const name = editingPlaylistName.trim();
    if (!name) return;
    renamePlaylist(playlistId, name);
    setEditingPlaylistId(null);
    refreshPlaylists();
  };

  const handleDeletePlaylist = (playlistId: string) => {
    if (!confirm("Delete this playlist and all its songs?")) return;
    deletePlaylist(playlistId);
    if (activePlaylistId === playlistId) {
      setActivePlaylist(null);
      musicPlayer.stop();
    }
    refreshPlaylists();
  };

  // ===== Song management =====
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const targetPlaylistId = activePlaylistId ?? createPlaylist("My Playlist").id;
    if (!activePlaylistId) setActivePlaylist(targetPlaylistId);
    let added = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/")) continue;
      const key = `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await saveAudioFile(key, file);
      addSongToPlaylist(targetPlaylistId, {
        title: file.name.replace(/\.[^.]+$/, ""),
        type: "local",
        fileKey: key,
        duration: 0,
      });
      added++;
    }
    if (added > 0) {
      refreshPlaylists();
      setActivePlaylist(targetPlaylistId);
    }
  };

  const handleAddYouTube = async () => {
    const url = ytUrl.trim();
    if (!url) return;
    const targetPlaylistId = activePlaylistId ?? createPlaylist("My Playlist").id;
    if (!activePlaylistId) setActivePlaylist(targetPlaylistId);
    setYtLoading(true);
    setYtError("");
    try {
      const parsed = parseYouTubeUrl(url);
      if (!parsed) {
        setYtError("Invalid YouTube URL");
        return;
      }

      let added = 0;
      if (parsed.type === "video") {
        addSongToPlaylist(targetPlaylistId, {
          title: `YouTube Video (${parsed.id.slice(0, 8)}...)`,
          type: "youtube",
          youtubeId: parsed.id,
        });
        added = 1;
      } else {
        // Extract playlist videos
        const videos = await extractYouTubePlaylistVideos(parsed.id);
        if (videos.length === 0) {
          setYtError("No videos found in playlist");
          return;
        }
        for (const video of videos) {
          addSongToPlaylist(targetPlaylistId, {
            title: video.title,
            type: "youtube",
            youtubeId: video.id,
            playlistId: parsed.id,
          });
        }
        added = videos.length;
      }
      if (added > 0) {
        setYtUrl("");
        refreshPlaylists();
        setActivePlaylist(targetPlaylistId);
      }
    } catch {
      setYtError("Could not load YouTube content");
    } finally {
      setYtLoading(false);
    }
  };

  const handleRenameSong = () => {
    if (!editingSong) return;
    const title = editingSong.title.trim();
    if (!title) return;
    updateSong(editingSong.playlistId, editingSong.songId, { title });
    setEditingSong(null);
    refreshPlaylists();
  };

  const handleDeleteSong = (playlistId: string, songId: string) => {
    removeSongFromPlaylist(playlistId, songId);
    if (musicPlayer.song?.id === songId) {
      musicPlayer.stop();
    }
    refreshPlaylists();
  };

  const handleDrop = (toIndex: number) => {
    if (dragIndex === null || !activePlaylistId) return;
    reorderSongs(activePlaylistId, dragIndex, toIndex);
    setDragIndex(null);
    refreshPlaylists();
  };

  // ===== Format helpers =====
  const formatTime = (t: number) => {
    if (!isFinite(t)) return "0:00";
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(5,5,15,0.92)",
        backdropFilter: "blur(8px)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Outfit', sans-serif",
        color: "#fff",
        pointerEvents: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(255,149,0,0.2)",
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 800, color: "#FF9500" }}>
          🎵 MUSIC PLAYER
        </div>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,149,0,0.2)",
            border: "1px solid rgba(255,149,0,0.4)",
            color: "#FF9500",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ✕ CLOSE
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ===== LEFT: Playlist sidebar ===== */}
        <div
          style={{
            width: 260,
            borderRight: "1px solid rgba(255,149,0,0.2)",
            padding: 16,
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,149,0,0.7)",
              fontWeight: 700,
              letterSpacing: "0.15em",
              marginBottom: 12,
            }}
          >
            PLAYLISTS
          </div>

          {/* New playlist */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
              placeholder="New playlist name..."
              style={{
                flex: 1,
                background: "rgba(255,149,0,0.1)",
                border: "1px solid rgba(255,149,0,0.3)",
                borderRadius: 6,
                padding: "8px 12px",
                color: "#fff",
                fontSize: 13,
                outline: "none",
              }}
            />
            <button
              onClick={handleCreatePlaylist}
              style={{
                background: "#FF9500",
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                color: "#000",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              +
            </button>
          </div>

          {/* Playlist list */}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => {
                setActivePlaylist(pl.id);
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                cursor: "pointer",
                marginBottom: 4,
                background:
                  activePlaylistId === pl.id
                    ? "rgba(255,149,0,0.2)"
                    : "rgba(255,255,255,0.05)",
                border:
                  activePlaylistId === pl.id
                    ? "1px solid rgba(255,149,0,0.4)"
                    : "1px solid transparent",
              }}
            >
              {editingPlaylistId === pl.id ? (
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    value={editingPlaylistName}
                    onChange={(e) => setEditingPlaylistName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenamePlaylist(pl.id);
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      background: "rgba(255,149,0,0.1)",
                      border: "1px solid rgba(255,149,0,0.3)",
                      borderRadius: 4,
                      padding: "4px 8px",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => handleRenamePlaylist(pl.id)}
                    style={{
                      background: "#00CC44",
                      border: "none",
                      borderRadius: 4,
                      padding: "4px 8px",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {pl.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      {pl.songs.length} songs
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPlaylistId(pl.id);
                        setEditingPlaylistName(pl.name);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,255,255,0.5)",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(pl.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "rgba(255,80,80,0.7)",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {playlists.length === 0 && (
            <div
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 13,
                textAlign: "center",
                padding: 20,
              }}
            >
              No playlists yet.
              <br />
              Create one above!
            </div>
          )}
        </div>

        {/* ===== RIGHT: Song list + player ===== */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Add songs bar */}
          <div
            style={{
              padding: "12px 20px",
              borderBottom: "1px solid rgba(255,149,0,0.15)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "rgba(255,149,0,0.2)",
                border: "1px solid rgba(255,149,0,0.4)",
                color: "#FF9500",
                borderRadius: 6,
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              📁 Add Local Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                void handleFileUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              style={{
                background: "rgba(255,149,0,0.2)",
                border: "1px solid rgba(255,149,0,0.4)",
                color: "#FF9500",
                borderRadius: 6,
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              ▶️ Add YouTube
            </button>

            {showAddMenu && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flex: 1,
                  minWidth: 300,
                }}
              >
                <input
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleAddYouTube()}
                  placeholder="YouTube video or playlist URL..."
                  style={{
                    flex: 1,
                    background: "rgba(255,149,0,0.1)",
                    border: "1px solid rgba(255,149,0,0.3)",
                    borderRadius: 6,
                    padding: "8px 12px",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => void handleAddYouTube()}
                  disabled={ytLoading}
                  style={{
                    background: "#FF9500",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 14px",
                    color: "#000",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {ytLoading ? "..." : "ADD"}
                </button>
              </div>
            )}
            {ytError && (
              <div style={{ color: "#FF4444", fontSize: 12 }}>{ytError}</div>
            )}
          </div>

          {/* Song list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
            {!activePlaylist && (
              <div
                style={{
                  color: "rgba(255,255,255,0.3)",
                  textAlign: "center",
                  padding: 40,
                  fontSize: 14,
                }}
              >
                Select a playlist to see its songs
              </div>
            )}

            {activePlaylist?.songs.map((song, index) => (
              <div
                key={song.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                onClick={() => selectSong(song)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  marginBottom: 4,
                  cursor: "pointer",
                  background:
                    activeSong?.id === song.id
                      ? "rgba(255,149,0,0.15)"
                      : "rgba(255,255,255,0.03)",
                  border:
                    activeSong?.id === song.id
                      ? "1px solid rgba(255,149,0,0.3)"
                      : "1px solid transparent",
                }}
              >
                <div
                  style={{
                    width: 28,
                    textAlign: "center",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: 13,
                  }}
                >
                  {activeSong?.id === song.id && isPlaying ? "▶" : index + 1}
                </div>
                <div style={{ fontSize: 18 }}>
                  {song.type === "local" ? "🎵" : "▶️"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingSong?.songId === song.id ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        value={editingSong.title}
                        onChange={(e) =>
                          setEditingSong({
                            ...editingSong,
                            title: e.target.value,
                          })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleRenameSong()
                        }
                        autoFocus
                        style={{
                          flex: 1,
                          background: "rgba(255,149,0,0.1)",
                          border: "1px solid rgba(255,149,0,0.3)",
                          borderRadius: 4,
                          padding: "4px 8px",
                          color: "#fff",
                          fontSize: 13,
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={handleRenameSong}
                        style={{
                          background: "#00CC44",
                          border: "none",
                          borderRadius: 4,
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {song.title}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    {song.type === "local" ? "Local file" : "YouTube"}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {song.duration ? formatTime(song.duration) : ""}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSong({
                        playlistId: activePlaylist.id,
                        songId: song.id,
                        title: song.title,
                      });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSong(activePlaylist.id, song.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "rgba(255,80,80,0.7)",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            {activePlaylist && activePlaylist.songs.length === 0 && (
              <div
                style={{
                  color: "rgba(255,255,255,0.3)",
                  textAlign: "center",
                  padding: 40,
                  fontSize: 14,
                }}
              >
                No songs yet. Add local files or YouTube videos!
              </div>
            )}
          </div>

          {/* ===== Player controls ===== */}
          <div
            style={{
              borderTop: "1px solid rgba(255,149,0,0.2)",
              padding: "16px 20px",
              background: "rgba(10,10,20,0.9)",
            }}
          >
            {/* Now playing */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 8,
                color: "rgba(255,255,255,0.8)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {activeSong ? (
                <>
                  <span style={{ color: "#FF9500" }}>
                    {isPlaying ? "▶" : "⏸"}{" "}
                  </span>
                  {activeSong.title}
                </>
              ) : (
                "No song selected"
              )}
            </div>

            {/* Progress bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#FF9500" }}
              />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {formatTime(duration)}
              </span>
            </div>

            {/* Control buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <button
                onClick={() => musicPlayer.toggleShuffle()}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  opacity: shuffle ? 1 : 0.4,
                }}
                title="Shuffle"
              >
                🔀
              </button>
              <button
                onClick={playPrev}
                style={{
                  background: "rgba(255,149,0,0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: 44,
                  height: 44,
                  fontSize: 18,
                  cursor: "pointer",
                }}
                title="Previous"
              >
                ⏮
              </button>
              <button
                onClick={togglePlay}
                disabled={!activeSong}
                style={{
                  background: "#FF9500",
                  border: "none",
                  borderRadius: "50%",
                  width: 56,
                  height: 56,
                  fontSize: 22,
                  cursor: "pointer",
                  color: "#000",
                  fontWeight: 900,
                }}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button
                onClick={playNext}
                style={{
                  background: "rgba(255,149,0,0.2)",
                  border: "none",
                  borderRadius: "50%",
                  width: 44,
                  height: 44,
                  fontSize: 18,
                  cursor: "pointer",
                }}
                title="Next"
              >
                ⏭
              </button>
              <button
                onClick={() => musicPlayer.toggleRepeat()}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  opacity: repeat ? 1 : 0.4,
                }}
                title="Repeat"
              >
                🔁
              </button>

              {/* Volume */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginLeft: 16,
                }}
              >
                <span style={{ fontSize: 16 }}>🔊</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  style={{ width: 100, accentColor: "#FF9500" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden YouTube player container */}
      <div ref={ytContainerRef} style={{ display: "none" }} />
    </div>
  );
}