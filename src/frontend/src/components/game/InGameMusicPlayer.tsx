import { useEffect, useState } from "react";
import { musicPlayer } from "../../utils/musicPlayer";
import MusicPlayer from "./MusicPlayer";

export default function InGameMusicPlayer() {
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(
    musicPlayer.playlist?.id ?? null,
  );
  const [, forceUpdate] = useState({});

  // Subscribe to updates
  useEffect(() => {
    const unsub = musicPlayer.subscribe(() => {
      setCurrentPlaylistId(musicPlayer.playlist?.id ?? null);
      forceUpdate({});
    });
    return unsub;
  }, []);

  const playlists = musicPlayer.playlist ? [musicPlayer.playlist] : [];
  const currentPlaylist = musicPlayer.playlist;
  const currentSong = musicPlayer.song;
  const isPlaying = musicPlayer.isPlaying;

  const selectPlaylist = (playlistId: string) => {
    musicPlayer.loadPlaylist(playlistId);
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: "36vh",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "rgba(15,15,25,0.95)",
          border: "2px solid rgba(255,149,0,0.4)",
          borderRadius: 12,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "'Outfit', sans-serif",
          color: "#fff",
          minWidth: 320,
          maxWidth: "90vw",
        }}
      >
        {/* Playlist selector */}
        <select
          value={currentPlaylistId ?? ""}
          onChange={(e) => selectPlaylist(e.target.value)}
          style={{
            background: "rgba(255,149,0,0.15)",
            border: "1px solid rgba(255,149,0,0.4)",
            color: "#FF9500",
            borderRadius: 6,
            padding: "6px 8px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            outline: "none",
            maxWidth: 120,
          }}
        >
          <option value="">No playlist</option>
          {playlists.map((pl) => (
            <option key={pl.id} value={pl.id}>
              {pl.name}
            </option>
          ))}
        </select>

        {/* Song info */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            color: isPlaying ? "#FF9500" : "rgba(255,255,255,0.6)",
          }}
        >
          {currentSong ? (
            <>
              {isPlaying ? "▶" : "⏸"} {currentSong.title}
            </>
          ) : (
            "No song selected"
          )}
        </div>

        {/* Controls */}
        <button
          onClick={() => musicPlayer.prev()}
          style={{
            background: "rgba(255,149,0,0.2)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            fontSize: 14,
            cursor: "pointer",
            color: "#FF9500",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Previous"
        >
          ⏮
        </button>
        <button
          onClick={() => musicPlayer.togglePlay()}
          disabled={!currentSong}
          style={{
            background: "#FF9500",
            border: "none",
            borderRadius: "50%",
            width: 40,
            height: 40,
            fontSize: 16,
            cursor: "pointer",
            color: "#000",
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          onClick={() => musicPlayer.next()}
          style={{
            background: "rgba(255,149,0,0.2)",
            border: "none",
            borderRadius: "50%",
            width: 32,
            height: 32,
            fontSize: 14,
            cursor: "pointer",
            color: "#FF9500",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Next"
        >
          ⏭
        </button>

        {/* Open full player */}
        <button
          onClick={() => setFullPlayerOpen(true)}
          style={{
            background: "rgba(255,149,0,0.3)",
            border: "1px solid rgba(255,149,0,0.5)",
            borderRadius: 6,
            padding: "4px 10px",
            color: "#FF9500",
            fontSize: 10,
            fontWeight: 800,
            cursor: "pointer",
            letterSpacing: "0.1em",
          }}
        >
          📋
        </button>
      </div>

      {/* Full music player modal */}
      {fullPlayerOpen && (
        <MusicPlayer onClose={() => setFullPlayerOpen(false)} />
      )}
    </>
  );
}