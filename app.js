(() => {
  'use strict';

  const IMAGES_PER_SOUND = 3;
  const PHOTO_INTERVAL_MS = 60 * 1000;
  const AMBIENT_VOLUME = 0.6;
  const BREATHING_VOLUME = 0.4;
  const AMBIENT_FADE_OUT_SECONDS = 5;
  const AMBIENT_FADE_STEP_MS = 100;
  const VIDEO_VOLUME = 50; // 0-100, mixed under the cardiac coherence pacer

  // Sounds with a YouTube video background instead of photo backgrounds.
  const SOUND_VIDEO_IDS = { sea: 'vLSTcAdy1Bk', fireplace: '36Z9CtcNCvw', 'tropical-beach': 'nJ1hNvRDVeE', 'canadian-forest': 'iqMTypPc62w', 'british-library': 'wmsanwB-z-0', forest: 'ZkEO4RpZM40' };
  // Per-video start offset (seconds) for "Video" mode, when the video shouldn't start at 0:00.
  const SOUND_VIDEO_START_SECONDS = { fireplace: 5, 'canadian-forest': 20, 'british-library': 90, forest: 5 };
  // Videos whose own audio track is muted -- the local ambient loop plays instead.
  const SOUND_VIDEO_MUTED = { forest: true };

  const state = {
    screen: 'landing',
    durationMinutes: 10,
    selectedDurationOption: '10',
    customHours: 0,
    customMinutes: 10,
    selectedSound: 'forest',
    videoMode: 'off',
    countdownVal: 3,
    elapsedSeconds: 0,
    bgIndex: 0,
    showStopConfirm: false,
    isPaused: false,
    videoUnavailable: false,
  };

  const els = {
    screens: {
      landing: document.getElementById('screen-landing'),
      countdown: document.getElementById('screen-countdown'),
      session: document.getElementById('screen-session'),
    },
    durationChips: document.getElementById('duration-chips'),
    customStepper: document.getElementById('custom-stepper'),
    hoursValue: document.getElementById('hours-value'),
    minutesValue: document.getElementById('minutes-value'),
    hoursInc: document.getElementById('hours-inc'),
    hoursDec: document.getElementById('hours-dec'),
    minutesInc: document.getElementById('minutes-inc'),
    minutesDec: document.getElementById('minutes-dec'),
    soundCards: document.getElementById('sound-cards'),
    videoToggle: document.getElementById('video-toggle'),
    videoLabelOff: document.getElementById('video-label-off'),
    videoLabelOn: document.getElementById('video-label-on'),
    startBtn: document.getElementById('start-btn'),
    countdownNum: document.getElementById('countdown-num'),
    bgPhotos: Array.from(document.querySelectorAll('.bg-photo')),
    bgVideo: document.getElementById('bg-video'),
    pauseBtn: document.getElementById('pause-btn'),
    stopBtn: document.getElementById('stop-btn'),
    progressFill: document.getElementById('progress-fill'),
    stopScrim: document.getElementById('stop-scrim'),
    continueBtn: document.getElementById('continue-btn'),
    endBtn: document.getElementById('end-btn'),
    audioAmbient: document.getElementById('audio-ambient'),
    audioBreathing: document.getElementById('audio-breathing'),
  };

  let countdownTimer = null;
  let sessionTickTimer = null;
  let photoTimer = null;
  let ambientFadeTimer = null;
  let ambientFadeStarted = false;
  let ambientFadeComplete = false;

  // ===================== YouTube video background =====================

  const VIDEO_START_TIMEOUT_MS = 20000;
  const VIDEO_START_POLL_MS = 500;

  let ytPlayer = null;
  let ytApiRequested = false;
  let ytCurrentVideoId = null;
  let ytVideoStarted = false;
  let ytStartTimeoutTimer = null;
  let ytStartPollTimer = null;
  const ytReadyQueue = [];

  function loadYouTubeApi(callback) {
    if (window.YT && window.YT.Player) {
      callback();
      return;
    }
    ytReadyQueue.push(callback);
    if (ytApiRequested) return;
    ytApiRequested = true;
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') prevReady();
      ytReadyQueue.splice(0).forEach((cb) => cb());
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  function hasBgVideo() {
    return state.videoMode === 'on' && Boolean(SOUND_VIDEO_IDS[state.selectedSound]) && !state.videoUnavailable;
  }

  function isBgVideoMuted() {
    return Boolean(SOUND_VIDEO_MUTED[state.selectedSound]);
  }

  // If the video can't play (e.g. the page was opened as a file:// URL, the
  // video's embedding gets disabled, or it's region/age-restricted), YouTube
  // often serves a static error page inside the iframe that never loads its
  // own postMessage bridge -- so onError doesn't reliably fire. Instead we
  // fall back to the photo background if playback hasn't actually started
  // within VIDEO_START_TIMEOUT_MS of requesting it.
  function handleBgVideoError() {
    if (state.videoUnavailable) return;
    state.videoUnavailable = true;
    if (ytStartTimeoutTimer) { clearTimeout(ytStartTimeoutTimer); ytStartTimeoutTimer = null; }
    if (ytStartPollTimer) { clearInterval(ytStartPollTimer); ytStartPollTimer = null; }
    if (state.screen !== 'session') return;
    renderBackgrounds();
    // A muted video already has the local loop playing underneath it -- leave it alone.
    if (!state.isPaused && !isBgVideoMuted()) {
      els.audioAmbient.src = `assets/sounds/${state.selectedSound}.mp3`;
      els.audioAmbient.volume = ambientFadeStarted ? 0 : AMBIENT_VOLUME;
      els.audioAmbient.currentTime = 0;
      els.audioAmbient.play().catch(() => {});
    }
  }

  function ensureYtPlayer(videoId, startSeconds, volume, onReady) {
    if (ytPlayer) {
      if (ytCurrentVideoId !== videoId) {
        ytCurrentVideoId = videoId;
        ytPlayer.loadVideoById({ videoId, startSeconds });
      }
      onReady(ytPlayer);
      return;
    }
    ytCurrentVideoId = videoId;
    loadYouTubeApi(() => {
      ytPlayer = new YT.Player('yt-player-target', {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
          loop: 1,
          playlist: videoId,
          start: startSeconds,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(volume);
            onReady(ytPlayer);
          },
          onError: handleBgVideoError,
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.PLAYING) markVideoStarted();
          },
        },
      });
    });
  }

  function markVideoStarted() {
    if (ytVideoStarted) return;
    ytVideoStarted = true;
    if (ytStartTimeoutTimer) { clearTimeout(ytStartTimeoutTimer); ytStartTimeoutTimer = null; }
    if (ytStartPollTimer) { clearInterval(ytStartPollTimer); ytStartPollTimer = null; }
  }

  function playBgVideoIfNeeded(sound) {
    if (state.videoUnavailable) return;
    const videoId = SOUND_VIDEO_IDS[sound];
    if (!videoId) return;
    const startSeconds = SOUND_VIDEO_START_SECONDS[sound] || 0;
    const volume = SOUND_VIDEO_MUTED[sound] ? 0 : VIDEO_VOLUME;
    ensureYtPlayer(videoId, startSeconds, volume, (player) => {
      player.setVolume(volume);
      player.playVideo();
    });
    if (ytVideoStarted) return;
    // Rely on polling getPlayerState() as the source of truth, since the
    // onStateChange "playing" event can arrive late or not at all depending
    // on the browser/embedding context -- trusting it alone risks a false
    // fallback to photos while the video is actually already playing fine.
    if (!ytStartPollTimer) {
      ytStartPollTimer = setInterval(() => {
        if (ytPlayer && typeof ytPlayer.getPlayerState === 'function' &&
            ytPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
          markVideoStarted();
        }
      }, VIDEO_START_POLL_MS);
    }
    if (!ytStartTimeoutTimer) {
      ytStartTimeoutTimer = setTimeout(() => {
        ytStartTimeoutTimer = null;
        if (!ytVideoStarted) handleBgVideoError();
      }, VIDEO_START_TIMEOUT_MS);
    }
  }

  function pauseBgVideo() {
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
  }

  function stopBgVideo() {
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') ytPlayer.stopVideo();
  }

  // ===================== Screen switching =====================

  function showScreen(name) {
    state.screen = name;
    for (const key in els.screens) {
      const el = els.screens[key];
      const active = key === name;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', active ? 'false' : 'true');
    }
  }

  // ===================== Landing: duration =====================

  function setDurationOption(option) {
    state.selectedDurationOption = option;
    if (option === 'custom') {
      state.durationMinutes = state.customHours * 60 + state.customMinutes;
      els.customStepper.hidden = false;
    } else {
      state.durationMinutes = parseInt(option, 10);
      els.customStepper.hidden = true;
    }
    renderDurationChips();
  }

  function renderDurationChips() {
    els.durationChips.querySelectorAll('.chip').forEach((chip) => {
      chip.classList.toggle('is-selected', chip.dataset.duration === state.selectedDurationOption);
    });
  }

  function renderStepper() {
    els.hoursValue.textContent = state.customHours;
    els.minutesValue.textContent = state.customMinutes;
  }

  function updateCustomDuration() {
    state.durationMinutes = state.customHours * 60 + state.customMinutes;
  }

  els.durationChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    setDurationOption(chip.dataset.duration);
  });

  els.hoursInc.addEventListener('click', () => {
    state.customHours = Math.min(3, state.customHours + 1);
    renderStepper();
    updateCustomDuration();
  });
  els.hoursDec.addEventListener('click', () => {
    state.customHours = Math.max(0, state.customHours - 1);
    renderStepper();
    updateCustomDuration();
  });
  els.minutesInc.addEventListener('click', () => {
    state.customMinutes = state.customMinutes >= 55 ? 0 : state.customMinutes + 5;
    renderStepper();
    updateCustomDuration();
  });
  els.minutesDec.addEventListener('click', () => {
    state.customMinutes = state.customMinutes <= 0 ? 55 : state.customMinutes - 5;
    renderStepper();
    updateCustomDuration();
  });

  // ===================== Landing: sound =====================

  function setSelectedSound(sound) {
    state.selectedSound = sound;
    els.soundCards.querySelectorAll('.sound-card').forEach((card) => {
      card.classList.toggle('is-selected', card.dataset.sound === sound);
    });
  }

  els.soundCards.addEventListener('click', (e) => {
    const card = e.target.closest('.sound-card');
    if (!card) return;
    setSelectedSound(card.dataset.sound);
  });

  // ===================== Landing: video toggle =====================

  function setVideoMode(mode) {
    state.videoMode = mode;
    const isOn = mode === 'on';
    els.videoToggle.setAttribute('aria-checked', String(isOn));
    els.videoLabelOff.classList.toggle('is-active', !isOn);
    els.videoLabelOn.classList.toggle('is-active', isOn);
  }

  els.videoToggle.addEventListener('click', () => {
    setVideoMode(state.videoMode === 'on' ? 'off' : 'on');
  });

  setVideoMode(state.videoMode);

  // ===================== Landing: start =====================

  els.startBtn.addEventListener('click', () => {
    if (state.durationMinutes <= 0) return;
    startCountdown();
  });

  // ===================== Countdown =====================

  function startCountdown() {
    state.countdownVal = 3;
    showScreen('countdown');
    renderCountdownTick();

    // Kick off the video load/play here, inside the click-triggered call
    // stack, so the browser's autoplay-with-sound allowance still applies
    // once the session screen actually appears a few seconds from now.
    playBgVideoIfNeeded(state.selectedSound);

    countdownTimer = setInterval(() => {
      state.countdownVal -= 1;
      if (state.countdownVal <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        startSession();
        return;
      }
      renderCountdownTick();
    }, 1000);
  }

  function renderCountdownTick() {
    els.countdownNum.classList.remove('is-visible');
    els.countdownNum.textContent = state.countdownVal;
    // force reflow so the transition re-triggers on each tick
    void els.countdownNum.offsetWidth;
    els.countdownNum.classList.add('is-visible');
  }

  // ===================== Session =====================

  function setBgPhotoSrc(imgEl, sound, index) {
    imgEl.classList.remove('placeholder', 'sound-forest', 'sound-sea', 'sound-fireplace', 'sound-tropical-beach', 'sound-canadian-forest', 'sound-british-library');
    imgEl.removeAttribute('src');
    const url = `assets/images/${sound}-${index + 1}.jpg`;
    const probe = new Image();
    probe.onload = () => { imgEl.src = url; };
    probe.onerror = () => { imgEl.classList.add('placeholder', `sound-${sound}`); };
    probe.src = url;
  }

  function renderBackgrounds() {
    const hasVideo = hasBgVideo();
    els.bgVideo.hidden = !hasVideo;
    els.bgPhotos.forEach((img) => { img.hidden = hasVideo; });
    if (hasVideo) return;
    els.bgPhotos.forEach((img, i) => {
      setBgPhotoSrc(img, state.selectedSound, i);
      img.classList.toggle('active', i === state.bgIndex);
    });
  }

  function advanceBgIndex() {
    if (hasBgVideo()) return;
    state.bgIndex = (state.bgIndex + 1) % IMAGES_PER_SOUND;
    els.bgPhotos.forEach((img, i) => {
      img.classList.toggle('active', i === state.bgIndex);
    });
  }

  function setPauseButtonState(isPaused) {
    els.pauseBtn.classList.toggle('is-paused', isPaused);
    els.pauseBtn.setAttribute('aria-label', isPaused ? 'Resume' : 'Pause');
  }

  function sessionTick() {
    const totalSeconds = state.durationMinutes * 60;
    state.elapsedSeconds += 1;
    const pct = Math.min(100, (state.elapsedSeconds / totalSeconds) * 100);
    els.progressFill.style.width = `${pct}%`;

    const remainingSeconds = totalSeconds - state.elapsedSeconds;
    if (!ambientFadeStarted && remainingSeconds <= AMBIENT_FADE_OUT_SECONDS) {
      ambientFadeStarted = true;
      fadeOutAmbient();
    }

    if (state.elapsedSeconds >= totalSeconds) {
      endSession();
    }
  }

  function startSessionTimers() {
    sessionTickTimer = setInterval(sessionTick, 1000);
    photoTimer = setInterval(advanceBgIndex, PHOTO_INTERVAL_MS);
  }

  function startSession() {
    state.elapsedSeconds = 0;
    state.bgIndex = 0;
    state.showStopConfirm = false;
    state.isPaused = false;
    state.videoUnavailable = false;
    ytVideoStarted = false;
    ambientFadeStarted = false;
    ambientFadeComplete = false;
    els.stopScrim.hidden = true;
    els.progressFill.style.width = '0%';
    setPauseButtonState(false);

    renderBackgrounds();
    playBgVideoIfNeeded(state.selectedSound);
    showScreen('session');

    // When a background video is providing its own ambient sound, skip the
    // local nature-sound loop so it doesn't clash with the video's audio.
    // Muted videos are silent, so the local loop plays underneath them instead.
    if (!hasBgVideo() || isBgVideoMuted()) {
      els.audioAmbient.src = `assets/sounds/${state.selectedSound}.mp3`;
      els.audioAmbient.volume = AMBIENT_VOLUME;
      els.audioAmbient.currentTime = 0;
      els.audioAmbient.play().catch(() => {});
    }

    els.audioBreathing.src = 'assets/sounds/breathing-pacer.mp3';
    els.audioBreathing.volume = BREATHING_VOLUME;
    els.audioBreathing.currentTime = 0;
    els.audioBreathing.play().catch(() => {});

    startSessionTimers();
  }

  function pauseSession() {
    if (state.isPaused) return;
    state.isPaused = true;
    clearSessionTimers();
    els.audioAmbient.pause();
    els.audioBreathing.pause();
    pauseBgVideo();
    setPauseButtonState(true);
  }

  function resumeSession() {
    if (!state.isPaused) return;
    state.isPaused = false;
    setPauseButtonState(false);

    if (!ambientFadeComplete) {
      els.audioAmbient.play().catch(() => {});
      playBgVideoIfNeeded(state.selectedSound);
      if (ambientFadeStarted) fadeOutAmbient();
    }
    els.audioBreathing.play().catch(() => {});

    startSessionTimers();
  }

  function stopAudio() {
    if (ambientFadeTimer) { clearInterval(ambientFadeTimer); ambientFadeTimer = null; }
    if (ytStartTimeoutTimer) { clearTimeout(ytStartTimeoutTimer); ytStartTimeoutTimer = null; }
    if (ytStartPollTimer) { clearInterval(ytStartPollTimer); ytStartPollTimer = null; }
    els.audioAmbient.pause();
    els.audioAmbient.currentTime = 0;
    els.audioAmbient.volume = AMBIENT_VOLUME;
    els.audioBreathing.pause();
    els.audioBreathing.currentTime = 0;
    stopBgVideo();
  }

  // Ambient nature loop (or, for video-backed sounds, the video's own audio)
  // fades to silence over the final AMBIENT_FADE_OUT_SECONDS of the session,
  // so it's fully stopped before the session (and the breathing loop) ends.
  // The breathing loop keeps playing until the end.
  function fadeOutAmbient() {
    if (ambientFadeTimer) return;
    const hasVideo = hasBgVideo() && !isBgVideoMuted();
    const startVolume = hasVideo ? VIDEO_VOLUME : els.audioAmbient.volume;
    if (startVolume <= 0) { ambientFadeComplete = true; return; }
    const steps = (AMBIENT_FADE_OUT_SECONDS * 1000) / AMBIENT_FADE_STEP_MS;
    const volumeStep = startVolume / steps;
    let stepsTaken = 0;

    ambientFadeTimer = setInterval(() => {
      stepsTaken += 1;
      const nextVolume = startVolume - volumeStep * stepsTaken;
      if (nextVolume <= 0 || stepsTaken >= steps) {
        clearInterval(ambientFadeTimer);
        ambientFadeTimer = null;
        ambientFadeComplete = true;
        if (hasVideo) {
          pauseBgVideo();
        } else {
          els.audioAmbient.pause();
          els.audioAmbient.volume = 0;
        }
      } else if (hasVideo) {
        if (ytPlayer) ytPlayer.setVolume(Math.round(nextVolume));
      } else {
        els.audioAmbient.volume = nextVolume;
      }
    }, AMBIENT_FADE_STEP_MS);
  }

  function clearSessionTimers() {
    if (sessionTickTimer) { clearInterval(sessionTickTimer); sessionTickTimer = null; }
    if (photoTimer) { clearInterval(photoTimer); photoTimer = null; }
    if (ambientFadeTimer) { clearInterval(ambientFadeTimer); ambientFadeTimer = null; }
  }

  function endSession() {
    clearSessionTimers();
    stopAudio();
    state.elapsedSeconds = 0;
    state.bgIndex = 0;
    state.showStopConfirm = false;
    state.isPaused = false;
    setPauseButtonState(false);
    els.stopScrim.hidden = true;
    showScreen('landing');
  }

  // ===================== Pause =====================

  function togglePause() {
    if (state.isPaused) resumeSession();
    else pauseSession();
  }

  els.pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
  });

  // Tap anywhere on the session screen to pause/resume, except the Stop
  // button (has its own action) and the stop-confirmation dialog (its own
  // buttons should not also toggle pause underneath).
  els.screens.session.addEventListener('click', (e) => {
    if (state.showStopConfirm) return;
    if (e.target.closest('.session-controls')) return;
    if (e.target.closest('.modal-scrim')) return;
    togglePause();
  });

  // ===================== Stop confirmation =====================

  els.stopBtn.addEventListener('click', () => {
    state.showStopConfirm = true;
    els.stopScrim.hidden = false;
  });

  els.continueBtn.addEventListener('click', () => {
    state.showStopConfirm = false;
    els.stopScrim.hidden = true;
  });

  els.endBtn.addEventListener('click', () => {
    endSession();
  });

  // ===================== Init =====================

  function init() {
    renderStepper();
    setDurationOption('10');
    setSelectedSound('forest');
    showScreen('landing');
  }

  init();
})();
