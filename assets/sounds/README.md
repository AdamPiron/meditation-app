# Sounds

Drop these files in exactly named this way:

- breathing-pacer.mp3 — looping 5s inhale / 5s exhale pacer track, plays throughout every session
- forest.mp3, sea.mp3, fireplace.mp3, tropical-beach.mp3, canadian-forest.mp3, british-library.mp3 — looping ambient tracks (~1 minute each, looped seamlessly), one plays throughout the session matching the chosen sound

These are the tracks used in **"No video" mode** (the default, and the only option for sounds without a mapped YouTube video). When the landing screen's Background switch is set to **"Video"** and the chosen sound has a YouTube video mapped (see `SOUND_VIDEO_IDS` in `app.js`), the session uses that video's own audio instead and skips these local loops entirely — unless the sound is listed in `SOUND_VIDEO_MUTED` in `app.js`, in which case the video's audio is muted and the local loop plays underneath it instead.

Until a file is present it just fails to load silently (no console-visible error to the user, session still runs normally) — dropping the real file in makes it work immediately.

## Track sources

Each ambience is sourced from one YouTube video, used two ways: a 1-minute excerpt becomes the local looping mp3 ("No video" mode), and the full video ID is mapped in `SOUND_VIDEO_IDS` in `app.js` for "Video" mode.

**When extracting a new excerpt, never download the full video/audio.** Use `yt-dlp`'s `--download-sections` to fetch only the needed minute directly, e.g.:

```
yt-dlp -f bestaudio -x --audio-format mp3 --download-sections "*1:30-2:30" -o excerpt.%(ext)s "https://www.youtube.com/watch?v=VIDEO_ID"
```

This avoids pulling down an entire multi-hour video just to trim it with ffmpeg afterward.

- **Forest** (`forest`) — https://www.youtube.com/watch?v=ZkEO4RpZM40
  - `forest.mp3`: existing local loop, unchanged.
  - Video mode: full video, YouTube ID `ZkEO4RpZM40`, starts at 0:05 (see `SOUND_VIDEO_START_SECONDS` in `app.js`). This video's own audio is muted (see `SOUND_VIDEO_MUTED` in `app.js`) — the local `forest.mp3` loop plays underneath it instead.
- **Real fireplace** (`fireplace`) — https://www.youtube.com/watch?v=36Z9CtcNCvw
  - `fireplace.mp3`: 1:45:00–1:46:00 excerpt.
  - Video mode: full video, YouTube ID `36Z9CtcNCvw`.
- **Canadian Forest** (`canadian-forest`) — https://www.youtube.com/watch?v=iqMTypPc62w
  - `canadian-forest.mp3`: 0:20–1:20 excerpt.
  - Video mode: full video, YouTube ID `iqMTypPc62w`, starts at 0:20 (see `SOUND_VIDEO_START_SECONDS` in `app.js`).
- **British Library** (`british-library`) — https://www.youtube.com/watch?v=wmsanwB-z-0
  - `british-library.mp3`: 1:30–2:30 excerpt.
  - Video mode: full video, YouTube ID `wmsanwB-z-0`, starts at 1:30 (see `SOUND_VIDEO_START_SECONDS` in `app.js`).
