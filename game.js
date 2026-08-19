/**
 * ====================================================================
 * Five Nights at Yam - מנוע המשחק המרכזי (Core Game Engine)
 * כולל: ניהול מצב, מערכת סאונד Web Audio & HTML5, בינה מלאכותית,
 * משרד פנורמי עם שליטה במגע/עכבר, טאבלט מצלמות, סוללה וג'אמפסקרים.
 * ====================================================================
 */

'use strict';

// ====================================================================
// 1. מנהל שמירות והתקדמות (Save & Progress Manager)
// ====================================================================
class SaveManager {
  constructor() {
    this.storageKey = 'FNAY_SAVE_DATA';
    this.data = {
      currentNight: 1,
      unlockedNight: 1,
      stars: [false, false, false], // כוכב 1: לילה 5, כוכב 2: לילה 6, כוכב 3: 20/20/20
      settings: {
        volMaster: 0.8,
        volMusic: 0.7,
        volSfx: 0.85,
        panSens: 1.0,
        crtEnabled: true
      }
    };
    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.data = { ...this.data, ...parsed, settings: { ...this.data.settings, ...parsed.settings } };
      }
    } catch (e) {
      console.warn('Could not load save from localStorage', e);
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  unlockNight(nightNum) {
    if (nightNum > this.data.unlockedNight) {
      this.data.unlockedNight = nightNum;
    }
    this.data.currentNight = this.data.unlockedNight;
    this.save();
  }

  setCurrentNight(nightNum) {
    this.data.currentNight = nightNum;
    if (nightNum > this.data.unlockedNight) {
      this.data.unlockedNight = nightNum;
    }
    this.save();
  }

  awardStar(index) {
    if (index >= 0 && index < 3) {
      this.data.stars[index] = true;
      this.save();
    }
  }

  reset() {
    localStorage.removeItem(this.storageKey);
    this.data.currentNight = 1;
    this.data.unlockedNight = 1;
    this.data.stars = [false, false, false];
    this.save();
  }
}

// ====================================================================
// 2. מנהל אודיו מקיף (Audio Manager)
// ====================================================================
class AudioManager {
  constructor(saveManager) {
    this.saveManager = saveManager;
    this.audioCtx = null;
    this.sounds = {};
    this.currentMusic = null;
    this.currentAmbient = null;
    this.phoneAudio = null;
    this.activeSfxClones = new Set();
    this.initWebAudio();
    this.preloadSounds();
  }

  initWebAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.audioCtx = new AudioContext();
    }
  }

  resumeContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  preloadSounds() {
    const s = GAME_CONFIG.sounds;
    for (const [key, path] of Object.entries(s)) {
      const audio = new Audio(path);
      audio.preload = 'auto';
      this.sounds[key] = audio;
    }
  }

  getMasterVolume() {
    return this.saveManager.data.settings.volMaster;
  }

  getMusicVolume() {
    return this.saveManager.data.settings.volMusic * this.getMasterVolume();
  }

  getSfxVolume() {
    return this.saveManager.data.settings.volSfx * this.getMasterVolume();
  }

  // השמעת SFX קצר וממוקד - סאונדים ארוכים כמו baldi נחתכים אחרי שנייה
  playSfx(key, loop = false, maxDuration = null) {
    this.resumeContext();
    const sound = this.sounds[key];
    if (!sound) return null;
    try {
      sound.pause();
      sound.currentTime = 0;
      sound.volume = this.getSfxVolume();
      sound.loop = loop;
      sound.play().catch(() => {});

      // אם זה סאונד ארוך כמו baldi, חותכים אותו אחרי 1.2 שניות
      const cutoffs = {
        baldi: 1.2,
        crack: 1.0,
        rip: 1.4,
        gameOver: 1.8,
        phoneCall: null
      };

      const duration = maxDuration !== null ? maxDuration : cutoffs[key];
      if (duration) {
        if (sound._stopTimeout) clearTimeout(sound._stopTimeout);
        sound._stopTimeout = setTimeout(() => {
          try {
            sound.pause();
            sound.currentTime = 0;
          } catch (e) {}
        }, duration * 1000);
      }

      return sound;
    } catch (e) {
      return null;
    }
  }

  stopAllSounds() {
    this.stopMusic();
    this.stopAmbient();
    this.stopPhoneCall();
    for (const sound of Object.values(this.sounds)) {
      try {
        sound.pause();
        sound.currentTime = 0;
      } catch (e) {}
    }
  }

  playMusic(key, loop = true) {
    this.resumeContext();
    this.stopMusic();
    const sound = this.sounds[key];
    if (!sound) return;
    try {
      sound.pause();
      sound.currentTime = 0;
      sound.volume = this.getMusicVolume();
      sound.loop = loop;
      sound.play().catch(() => {});
      this.currentMusic = sound;
    } catch (e) {}
  }

  stopMusic() {
    if (this.currentMusic) {
      try {
        this.currentMusic.pause();
        this.currentMusic.currentTime = 0;
      } catch (e) {}
      this.currentMusic = null;
    }
  }

  playAmbient(key = 'ambient') {
    this.resumeContext();
    this.stopAmbient();
    const sound = this.sounds[key];
    if (!sound) return;
    try {
      sound.pause();
      sound.currentTime = 0;
      sound.volume = this.getMusicVolume() * 0.75;
      sound.loop = true;
      sound.play().catch(() => {});
      this.currentAmbient = sound;
    } catch (e) {}
  }

  stopAmbient() {
    if (this.currentAmbient) {
      try {
        this.currentAmbient.pause();
        this.currentAmbient.currentTime = 0;
      } catch (e) {}
      this.currentAmbient = null;
    }
  }

  playPhoneCall() {
    this.stopPhoneCall();
    const audio = this.sounds['phoneCall'];
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = this.getSfxVolume() * 0.9;
      audio.play().catch(() => {});
      this.phoneAudio = audio;
    } catch (e) {}
  }

  stopPhoneCall() {
    if (this.phoneAudio) {
      try {
        this.phoneAudio.pause();
        this.phoneAudio.currentTime = 0;
      } catch (e) {}
      this.phoneAudio = null;
    }
  }

  // סינתיסייזר פנימי לסאונדים מיידיים וקליקים של מצלמות
  playBeep(freq = 440, type = 'sine', duration = 0.08) {
    if (!this.audioCtx) return;
    this.resumeContext();
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(this.getSfxVolume() * 0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }
}

// ====================================================================
// 3. מחלקת המשחק המרכזית (FNAF Game Engine)
// ====================================================================
class FiveNightsAtYam {
  constructor() {
    this.saveManager = new SaveManager();
    this.audio = new AudioManager(this.saveManager);
    
    // מצבי משחק
    this.gameState = 'MENU'; // MENU, INTRO, PLAYING, BLACKOUT, JUMPSCARE, GAMEOVER, WIN, CUSTOM_NIGHT
    this.currentNight = 1;
    this.isCustomNight = false;
    
    // שעה וסוללה
    this.gameHour = 0; // 0 = 12 AM, 1 = 1 AM, ..., 6 = 6 AM
    this.hourProgress = 0;
    this.power = 100;
    this.powerDrainLevel = 1;
    this.isBlackout = false;
    
    // משרד ותאורה
    this.officePanX = 0;
    this.targetPanX = 0;
    this.leftDoorClosed = false;
    this.rightDoorClosed = false;
    this.leftLightOn = false;
    this.rightLightOn = false;
    this.isTouchDragging = false;
    this.lastTouchX = 0;
    
    // מצלמות
    this.isMonitorOpen = false;
    this.activeCameraId = 'cam1b';
    this.musicBoxValue = 100; // 0 עד 100
    this.isWindingMusicBox = false;
    
    // בינה מלאכותית (AI)
    this.aiLevels = { yam: 3, invar: 1, yamHaredi: 0, invarHaredi: 0 };
    this.animatronics = {
      yam: { location: 'cam1b', stage: 0, atDoor: false, attacking: false },
      invar: { location: 'cam5', stage: 0, sprinting: false, sprintTimer: 0 },
      yamHaredi: { location: 'cam1b', stage: 0, atDoor: false, attacking: false },
      invarHaredi: { inOffice: false, timer: 0 }
    };
    
    // טיימרים
    this.mainLoopInterval = null;
    this.aiTickTimer = null;
    this.lastTickTime = performance.now();
    
    this.initDOM();
    this.initStaticNoise();
    this.bindEvents();
    this.updateMenuUI();
    this.applySettings();
  }

  // ================= DOM & UI Elements =================
  initDOM() {
    this.dom = {
      crtFilter: document.body,
      screens: {
        menu: document.getElementById('main-menu'),
        intro: document.getElementById('night-intro-screen'),
        game: document.getElementById('game-screen'),
        gameOver: document.getElementById('game-over-screen'),
        win: document.getElementById('win-6am-screen'),
        customNight: document.getElementById('custom-night-screen'),
      },
      menu: {
        char: document.getElementById('menu-character'),
        stars: document.getElementById('menu-stars'),
        btnNewGame: document.getElementById('btn-new-game'),
        btnContinue: document.getElementById('btn-continue'),
        btnNight6: document.getElementById('btn-night-6'),
        btnCustomNight: document.getElementById('btn-custom-night'),
        btnHowToPlay: document.getElementById('btn-how-to-play'),
        btnSettings: document.getElementById('btn-settings'),
        continueNightNum: document.getElementById('continue-night-num'),
      },
      intro: {
        timeText: document.getElementById('intro-time-text'),
        nightText: document.getElementById('intro-night-text'),
      },
      game: {
        hudTime: document.getElementById('hud-time'),
        hudNight: document.getElementById('hud-night'),
        hudPowerPercent: document.getElementById('hud-power-percent'),
        usageBars: document.getElementById('usage-bars'),
        officeViewport: document.getElementById('office-viewport'),
        officeRoom: document.getElementById('office-room'),
        posterYam: document.getElementById('poster-yam'),
        officeHarediInvar: document.getElementById('office-haredi-invar'),
        blackoutEyes: document.getElementById('blackout-eyes'),
        // דלת שמאל
        leftDoorShutter: document.getElementById('left-door-shutter'),
        leftDoorLightBeam: document.getElementById('left-door-light-beam'),
        leftDoorEnemy: document.getElementById('left-door-enemy'),
        btnLeftDoor: document.getElementById('btn-left-door'),
        btnLeftLight: document.getElementById('btn-left-light'),
        // דלת ימין
        rightDoorShutter: document.getElementById('right-door-shutter'),
        rightDoorLightBeam: document.getElementById('right-door-light-beam'),
        rightDoorEnemy: document.getElementById('right-door-enemy'),
        btnRightDoor: document.getElementById('btn-right-door'),
        btnRightLight: document.getElementById('btn-right-light'),
        // פליפ בר וטאבלט
        flipBar: document.getElementById('camera-flip-bar'),
        tablet: document.getElementById('cctv-tablet'),
        cctvCamTitle: document.getElementById('cctv-cam-title'),
        cctvTimestamp: document.getElementById('cctv-timestamp'),
        cctvBgImage: document.getElementById('cctv-bg-image'),
        cctvCharsLayer: document.getElementById('cctv-characters-layer'),
        camButtonsGrid: document.getElementById('cam-buttons-grid'),
        musicBoxContainer: document.getElementById('music-box-container'),
        btnWindMusic: document.getElementById('btn-wind-music'),
        musicBoxBar: document.getElementById('music-box-bar'),
        phoneBanner: document.getElementById('phone-call-banner'),
        btnMuteCall: document.getElementById('btn-mute-call'),
      },
      jumpscare: {
        overlay: document.getElementById('jumpscare-overlay'),
        image: document.getElementById('jumpscare-image'),
      },
      gameOver: {
        cause: document.getElementById('game-over-cause'),
        timeSurvived: document.getElementById('game-over-time-survived'),
        btnRetry: document.getElementById('btn-retry-night'),
        btnMenu: document.getElementById('btn-game-over-menu'),
      },
      win: {
        nightTitle: document.getElementById('win-night-title'),
        btnNext: document.getElementById('btn-next-night'),
        btnMenu: document.getElementById('btn-win-menu'),
      },
      customNight: {
        aiDisplays: {
          yam: document.getElementById('ai-val-yam'),
          invar: document.getElementById('ai-val-invar'),
          yamHaredi: document.getElementById('ai-val-yamHaredi'),
          invarHaredi: document.getElementById('ai-val-invarHaredi'),
        },
        btnStart: document.getElementById('btn-start-custom-night'),
        btnBack: document.getElementById('btn-back-from-custom'),
      },
      modals: {
        settings: document.getElementById('settings-modal'),
        btnCloseSettings: document.getElementById('btn-close-settings'),
        howToPlay: document.getElementById('how-to-play-modal'),
        btnCloseGuide: document.getElementById('btn-close-guide'),
      },
      settingsControls: {
        volMaster: document.getElementById('vol-master'),
        volMusic: document.getElementById('vol-music'),
        volSfx: document.getElementById('vol-sfx'),
        valVolMaster: document.getElementById('val-vol-master'),
        valVolMusic: document.getElementById('val-vol-music'),
        valVolSfx: document.getElementById('val-vol-sfx'),
        panSens: document.getElementById('pan-sens'),
        valPanSens: document.getElementById('val-pan-sens'),
        toggleCrt: document.getElementById('toggle-crt'),
        btnFullscreen: document.getElementById('btn-toggle-fullscreen'),
        btnResetSave: document.getElementById('btn-reset-save'),
      },
      rotateHint: {
        banner: document.getElementById('rotate-device-hint'),
        btnDismiss: document.getElementById('btn-dismiss-rotate'),
      }
    };
    this.buildCameraButtons();
  }

  // בניית כפתורי המצלמות במפה
  buildCameraButtons() {
    const grid = this.dom.game.camButtonsGrid;
    grid.innerHTML = '';
    GAME_CONFIG.cameras.forEach(cam => {
      const btn = document.createElement('button');
      btn.className = `cam-btn ${cam.id === this.activeCameraId ? 'active' : ''}`;
      btn.id = `btn-cam-${cam.id}`;
      btn.textContent = `CAM ${cam.shortName}`;
      btn.style.left = `${cam.x}%`;
      btn.style.top = `${cam.y}%`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectCamera(cam.id);
      });
      grid.appendChild(btn);
    });
  }

  // אפקט שלג ורעש וידאו CRT על Canvas
  initStaticNoise() {
    const canvas = document.getElementById('static-noise-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = Math.floor(window.innerWidth / 3);
      canvas.height = Math.floor(window.innerHeight / 3);
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const renderNoise = () => {
      if (this.saveManager.data.settings.crtEnabled) {
        const w = canvas.width;
        const h = canvas.height;
        const imgData = ctx.createImageData(w, h);
        const buffer = new Uint32Array(imgData.data.buffer);
        const len = buffer.length;
        for (let i = 0; i < len; i++) {
          if (Math.random() < 0.1) {
            const val = Math.random() < 0.5 ? 255 : 0;
            buffer[i] = (255 << 24) | (val << 16) | (val << 8) | val;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }
      requestAnimationFrame(renderNoise);
    };
    requestAnimationFrame(renderNoise);
  }

  // ================= חיבור אירועי ממשק ומקלדת =================
  bindEvents() {
    // תפריט ראשי
    this.dom.menu.btnNewGame.addEventListener('click', () => this.startNight(1));
    this.dom.menu.btnContinue.addEventListener('click', () => {
      const nightToLoad = Math.max(this.saveManager.data.currentNight || 1, this.saveManager.data.unlockedNight || 1);
      this.startNight(nightToLoad);
    });
    this.dom.menu.btnNight6.addEventListener('click', () => this.startNight(6));
    this.dom.menu.btnCustomNight.addEventListener('click', () => this.openCustomNightScreen());
    this.dom.menu.btnHowToPlay.addEventListener('click', () => this.openGuideModal());
    this.dom.menu.btnSettings.addEventListener('click', () => this.openSettingsModal());

    // חלונות מודאל
    this.dom.modals.btnCloseSettings.addEventListener('click', () => this.closeModals());
    this.dom.modals.btnCloseGuide.addEventListener('click', () => this.closeModals());
    this.dom.rotateHint.btnDismiss.addEventListener('click', () => {
      this.dom.rotateHint.banner.classList.remove('force-show');
    });

    // מסך משחק: גרירה בעכבר ובמגע לתזוזת משרד
    const vp = this.dom.game.officeViewport;
    vp.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    
    // מגע למובייל (Touch Pan)
    vp.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isTouchDragging = true;
        this.lastTouchX = e.touches[0].clientX;
      }
    }, { passive: true });

    vp.addEventListener('touchmove', (e) => {
      if (this.isTouchDragging && e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const deltaX = (touchX - this.lastTouchX) * GAME_CONFIG.controls.panSensitivityTouch * this.saveManager.data.settings.panSens;
        this.targetPanX = Math.max(-GAME_CONFIG.controls.officeMaxPanPx, Math.min(GAME_CONFIG.controls.officeMaxPanPx, this.targetPanX + deltaX));
        this.lastTouchX = touchX;
      }
    }, { passive: true });

    vp.addEventListener('touchend', () => {
      this.isTouchDragging = false;
    });

    // פוסטר לחיץ עם צפצוף באף
    this.dom.game.posterYam.addEventListener('click', () => {
      this.audio.playSfx('baldi');
    });

    // דלתות ואורות
    this.dom.game.btnLeftDoor.addEventListener('click', () => this.toggleDoor('left'));
    this.dom.game.btnRightDoor.addEventListener('click', () => this.toggleDoor('right'));
    
    // אור שמאל (Hold or Click)
    this.dom.game.btnLeftLight.addEventListener('mousedown', () => this.setLight('left', true));
    this.dom.game.btnLeftLight.addEventListener('mouseup', () => this.setLight('left', false));
    this.dom.game.btnLeftLight.addEventListener('touchstart', (e) => { e.preventDefault(); this.setLight('left', true); });
    this.dom.game.btnLeftLight.addEventListener('touchend', (e) => { e.preventDefault(); this.setLight('left', false); });

    // אור ימין
    this.dom.game.btnRightLight.addEventListener('mousedown', () => this.setLight('right', true));
    this.dom.game.btnRightLight.addEventListener('mouseup', () => this.setLight('right', false));
    this.dom.game.btnRightLight.addEventListener('touchstart', (e) => { e.preventDefault(); this.setLight('right', true); });
    this.dom.game.btnRightLight.addEventListener('touchend', (e) => { e.preventDefault(); this.setLight('right', false); });

    // פליפ בר של המצלמות
    this.dom.game.flipBar.addEventListener('click', () => this.toggleMonitor());
    
    // מתיחת תיבת נגינה ב-CAM 5
    const startWinding = (e) => {
      e.preventDefault();
      this.isWindingMusicBox = true;
      this.audio.playSfx('inject');
    };
    const stopWinding = (e) => {
      e.preventDefault();
      this.isWindingMusicBox = false;
    };
    this.dom.game.btnWindMusic.addEventListener('mousedown', startWinding);
    this.dom.game.btnWindMusic.addEventListener('mouseup', stopWinding);
    this.dom.game.btnWindMusic.addEventListener('touchstart', startWinding);
    this.dom.game.btnWindMusic.addEventListener('touchend', stopWinding);

    // השתקת שיחת טלפון
    this.dom.game.btnMuteCall.addEventListener('click', () => {
      this.audio.stopPhoneCall();
      this.dom.game.phoneBanner.classList.add('hidden');
    });

    // כפתורי Game Over וניצחון
    this.dom.gameOver.btnRetry.addEventListener('click', () => this.startNight(this.currentNight, this.isCustomNight));
    this.dom.gameOver.btnMenu.addEventListener('click', () => this.showScreen('menu'));
    this.dom.win.btnNext.addEventListener('click', () => this.startNight(this.currentNight + 1));
    this.dom.win.btnMenu.addEventListener('click', () => this.showScreen('menu'));

    // Custom Night Controls
    document.querySelectorAll('.ai-btn-add').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const char = e.target.dataset.char;
        this.aiLevels[char] = Math.min(20, (this.aiLevels[char] || 0) + 1);
        this.updateCustomNightUI();
        this.audio.playBeep(600, 'square', 0.05);
      });
    });

    document.querySelectorAll('.ai-btn-sub').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const char = e.target.dataset.char;
        this.aiLevels[char] = Math.max(0, (this.aiLevels[char] || 0) - 1);
        this.updateCustomNightUI();
        this.audio.playBeep(400, 'square', 0.05);
      });
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.dataset.preset;
        if (preset === 'easy') this.aiLevels = { yam: 5, invar: 5, yamHaredi: 5, invarHaredi: 0 };
        if (preset === 'medium') this.aiLevels = { yam: 10, invar: 10, yamHaredi: 10, invarHaredi: 5 };
        if (preset === 'hard') this.aiLevels = { yam: 15, invar: 15, yamHaredi: 15, invarHaredi: 10 };
        if (preset === 'max') this.aiLevels = { yam: 20, invar: 20, yamHaredi: 20, invarHaredi: 20 };
        this.updateCustomNightUI();
        this.audio.playSfx('click');
      });
    });

    this.dom.customNight.btnStart.addEventListener('click', () => {
      this.startNight(7, true);
    });
    this.dom.customNight.btnBack.addEventListener('click', () => {
      this.showScreen('menu');
    });

    // הגדרות Sliders
    this.dom.settingsControls.volMaster.addEventListener('input', (e) => {
      this.saveManager.data.settings.volMaster = e.target.value / 100;
      this.dom.settingsControls.valVolMaster.textContent = `${e.target.value}%`;
      this.saveManager.save();
    });
    this.dom.settingsControls.volMusic.addEventListener('input', (e) => {
      this.saveManager.data.settings.volMusic = e.target.value / 100;
      this.dom.settingsControls.valVolMusic.textContent = `${e.target.value}%`;
      this.saveManager.save();
    });
    this.dom.settingsControls.volSfx.addEventListener('input', (e) => {
      this.saveManager.data.settings.volSfx = e.target.value / 100;
      this.dom.settingsControls.valVolSfx.textContent = `${e.target.value}%`;
      this.saveManager.save();
    });
    this.dom.settingsControls.panSens.addEventListener('input', (e) => {
      this.saveManager.data.settings.panSens = e.target.value / 100;
      this.dom.settingsControls.valPanSens.textContent = `${e.target.value}%`;
      this.saveManager.save();
    });
    this.dom.settingsControls.toggleCrt.addEventListener('change', (e) => {
      this.saveManager.data.settings.crtEnabled = e.target.checked;
      this.applySettings();
      this.saveManager.save();
    });
    this.dom.settingsControls.btnFullscreen.addEventListener('click', () => {
      this.toggleFullscreen();
    });
    this.dom.settingsControls.btnResetSave.addEventListener('click', () => {
      if (confirm('האם אתה בטוח שברצונך לאפס את כל נתוני ההתקדמות?')) {
        this.saveManager.reset();
        this.updateMenuUI();
        this.closeModals();
      }
    });

    // מקשי קיצור במקלדת (Keyboard Shortcuts for FNAF Fans)
    window.addEventListener('keydown', (e) => {
      if (this.gameState !== 'PLAYING') return;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ש') this.toggleDoor('left');
      if (e.key === 'd' || e.key === 'D' || e.key === 'ג') this.toggleDoor('right');
      if (e.key === 'q' || e.key === 'Q' || e.key === '/') this.setLight('left', !this.leftLightOn);
      if (e.key === 'e' || e.key === 'E' || e.key === 'ק') this.setLight('right', !this.rightLightOn);
      if (e.key === ' ' || e.key === 's' || e.key === 'S' || e.key === 'ד') this.toggleMonitor();
      // מקש לבדיקות: P או פ למעבר שעה קדימה
      if (e.key === 'p' || e.key === 'P' || e.key === 'פ') this.advanceHour();
    });
  }

  // ================= תזוזת משרד פנורמית =================
  handleMouseMove(e) {
    if (this.gameState !== 'PLAYING' || this.isMonitorOpen) return;
    const vp = this.dom.game.officeViewport;
    const rect = vp.getBoundingClientRect();
    const mouseRatio = (e.clientX - rect.left) / rect.width; // 0 (left) עד 1 (right)
    
    // חישוב היסט פנורמי
    const maxPan = GAME_CONFIG.controls.officeMaxPanPx;
    this.targetPanX = (0.5 - mouseRatio) * 2 * maxPan * GAME_CONFIG.controls.panSensitivityMouse * this.saveManager.data.settings.panSens;
  }

  updateOfficePan() {
    this.officePanX += (this.targetPanX - this.officePanX) * 0.15;
    this.dom.game.officeRoom.style.transform = `translateX(calc(-50% + ${this.officePanX}px))`;
  }

  // ================= ניהול מסכים =================
  showScreen(screenName) {
    this.gameState = screenName === 'game' ? 'PLAYING' : screenName.toUpperCase();
    for (const [key, el] of Object.entries(this.dom.screens)) {
      if (key === screenName) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }

    if (screenName === 'menu') {
      this.updateMenuUI();
      this.audio.stopAllSounds();
      this.audio.playMusic('menu');
      this.dom.jumpscare.overlay.classList.add('hidden');
    }
  }

  updateMenuUI() {
    const data = this.saveManager.data;
    this.dom.menu.continueNightNum.textContent = `לילה ${data.unlockedNight}`;
    
    // נעילת / פתיחת לילה 6 ו-Custom Night
    if (data.unlockedNight >= 6) {
      this.dom.menu.btnNight6.classList.remove('locked');
      this.dom.menu.btnNight6.removeAttribute('disabled');
    }
    if (data.unlockedNight >= 7 || data.stars[0]) {
      this.dom.menu.btnCustomNight.classList.remove('locked');
      this.dom.menu.btnCustomNight.removeAttribute('disabled');
    }

    // ציור כוכבי ניצחון
    this.dom.menu.stars.innerHTML = '';
    data.stars.forEach(hasStar => {
      if (hasStar) {
        const star = document.createElement('span');
        star.textContent = '★';
        this.dom.menu.stars.appendChild(star);
      }
    });
  }

  openCustomNightScreen() {
    this.aiLevels = { yam: 20, invar: 20, yamHaredi: 20, invarHaredi: 20 };
    this.updateCustomNightUI();
    this.showScreen('customNight');
  }

  updateCustomNightUI() {
    for (const [char, val] of Object.entries(this.aiLevels)) {
      if (this.dom.customNight.aiDisplays[char]) {
        this.dom.customNight.aiDisplays[char].textContent = val;
      }
    }
  }

  openSettingsModal() {
    this.dom.modals.settings.classList.remove('hidden');
  }

  openGuideModal() {
    this.dom.modals.howToPlay.classList.remove('hidden');
  }

  closeModals() {
    this.dom.modals.settings.classList.add('hidden');
    this.dom.modals.howToPlay.classList.add('hidden');
  }

  applySettings() {
    const s = this.saveManager.data.settings;
    if (s.crtEnabled) {
      this.dom.crtFilter.classList.remove('disabled');
    } else {
      this.dom.crtFilter.classList.add('disabled');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // ================= התחלת לילה (Start Night) =================
  startNight(nightNum, custom = false) {
    this.currentNight = nightNum;
    this.isCustomNight = custom;
    if (!custom) {
      this.saveManager.setCurrentNight(nightNum);
    }
    this.gameHour = 0;
    this.hourProgress = 0;
    this.power = GAME_CONFIG.power.startPower;
    this.isBlackout = false;
    this.leftDoorClosed = false;
    this.rightDoorClosed = false;
    this.leftLightOn = false;
    this.rightLightOn = false;
    this.isMonitorOpen = false;
    this.musicBoxValue = 100;
    this.isWindingMusicBox = false;

    // הגדרת רמות קושי AI
    if (custom) {
      // רמות מוגדרות מ-Custom Night
    } else {
      const diff = GAME_CONFIG.nightDifficulty[nightNum] || { yam: 15, invar: 10, yamHaredi: 8, invarHaredi: 4 };
      this.aiLevels = { ...diff };
    }

    // איפוס מיקומי אויבים
    this.animatronics = {
      yam: { location: 'cam1b', stage: 0, atDoor: false, attacking: false },
      invar: { location: 'cam5', stage: 0, sprinting: false, sprintTimer: 0 },
      yamHaredi: { location: 'cam1b', stage: 0, atDoor: false, attacking: false },
      invarHaredi: { inOffice: false, timer: 0 }
    };

    this.updateDoorVisuals();
    this.updatePowerUI();
    this.updateClockUI();

    // הצגת מעברון לילה
    this.showScreen('intro');
    this.dom.intro.timeText.textContent = '12:00 AM';
    this.dom.intro.nightText.textContent = custom ? 'Custom Night' : `לילה ${nightNum}`;
    this.audio.stopMusic();
    this.audio.playBeep(330, 'sine', 0.8);

    setTimeout(() => {
      this.showScreen('game');
      this.audio.playAmbient(nightNum >= 5 ? 'boss' : 'ambient');
      
      // שיחת טלפון בלילה 1
      if (nightNum === 1 && !custom) {
        this.dom.game.phoneBanner.classList.remove('hidden');
        this.audio.playPhoneCall();
      } else {
        this.dom.game.phoneBanner.classList.add('hidden');
      }

      this.lastTickTime = performance.now();
      this.startMainLoop();
    }, 2400);
  }

  // ================= לולאת המשחק המרכזית (Main Game Loop) =================
  startMainLoop() {
    if (this.mainLoopInterval) clearInterval(this.mainLoopInterval);
    
    this.mainLoopInterval = setInterval(() => {
      if (this.gameState !== 'PLAYING') return;
      
      const now = performance.now();
      const dt = (now - this.lastTickTime) / 1000;
      this.lastTickTime = now;

      this.updateOfficePan();
      this.updatePower(dt);
      this.updateClock(dt);
      this.updateMusicBox(dt);
      this.updateAI(dt);
      this.updateCCTVFeed();
    }, 50);
  }

  // ================= ניהול חשמל וסוללה (Power & Battery) =================
  updatePower(dt) {
    if (this.isBlackout) return;

    let drain = GAME_CONFIG.power.baseDrainPerSecond;
    let usageBarsCount = 1;

    if (this.leftDoorClosed) { drain += GAME_CONFIG.power.doorDrainPerSecond; usageBarsCount++; }
    if (this.rightDoorClosed) { drain += GAME_CONFIG.power.doorDrainPerSecond; usageBarsCount++; }
    if (this.leftLightOn) { drain += GAME_CONFIG.power.lightDrainPerSecond; usageBarsCount++; }
    if (this.rightLightOn) { drain += GAME_CONFIG.power.lightDrainPerSecond; usageBarsCount++; }
    if (this.isMonitorOpen) { drain += GAME_CONFIG.power.monitorDrainPerSecond; usageBarsCount++; }

    this.power = Math.max(0, this.power - drain * dt);
    this.powerDrainLevel = usageBarsCount;
    this.updatePowerUI();

    if (this.power <= 0 && !this.isBlackout) {
      this.triggerBlackout();
    }
  }

  updatePowerUI() {
    this.dom.game.hudPowerPercent.textContent = `${Math.ceil(this.power)}%`;
    
    // שינוי צבעי סוללה
    if (this.power > 50) this.dom.game.hudPowerPercent.style.color = 'var(--fnaf-green)';
    else if (this.power > 20) this.dom.game.hudPowerPercent.style.color = 'var(--fnaf-gold)';
    else this.dom.game.hudPowerPercent.style.color = 'var(--fnaf-red)';

    // עדכון פסי צריכה
    const bars = this.dom.game.usageBars.children;
    for (let i = 0; i < bars.length; i++) {
      if (i < this.powerDrainLevel) {
        bars[i].className = 'bar active';
        if (i < 2) bars[i].classList.add('bar-green');
        else if (i < 4) bars[i].classList.add('bar-yellow');
        else bars[i].classList.add('bar-red');
      } else {
        bars[i].className = 'bar';
      }
    }
  }

  // נפילת חשמל (0% Power Blackout)
  triggerBlackout() {
    this.isBlackout = true;
    this.gameState = 'BLACKOUT';
    
    // פתיחת כל הדלתות וסגירת אורות ומצלמות
    this.leftDoorClosed = false;
    this.rightDoorClosed = false;
    this.leftLightOn = false;
    this.rightLightOn = false;
    this.closeMonitor();
    this.updateDoorVisuals();
    
    this.audio.stopAmbient();
    this.audio.stopPhoneCall();
    this.audio.playSfx('break');
    
    // החשכת המשרד לחלוטין
    this.dom.game.officeRoom.style.filter = 'brightness(8%) contrast(150%)';
    this.dom.game.blackoutEyes.classList.remove('hidden');
    
    // נגינת תיבת נגינה בחושך
    setTimeout(() => {
      if (this.gameState !== 'BLACKOUT') return;
      this.audio.playMusic('tammy', true);
      
      // ג'אמפסקר חושך לאחר זמן אקראי (3-6 שניות)
      const blackoutDelay = 3000 + Math.random() * 3500;
      setTimeout(() => {
        if (this.gameState === 'BLACKOUT') {
          this.triggerJumpscare('yam', 'נגמר החשמל במשרד!');
        }
      }, blackoutDelay);
    }, 1500);
  }

  // ================= ניהול שעון וזמן לילה (Clock & Night Progression) =================
  advanceHour() {
    if (this.gameState !== 'PLAYING') return;
    this.hourProgress = 0;
    this.gameHour++;
    this.updateClockUI();

    // עלייה באגרסיביות אויבים בכל שעה
    this.aiLevels.yam = Math.min(20, this.aiLevels.yam + 1);
    this.aiLevels.invar = Math.min(20, this.aiLevels.invar + 1);

    this.audio.playBeep(523, 'sine', 0.2);

    if (this.gameHour >= GAME_CONFIG.time.totalHoursPerNight) {
      this.winNight();
    }
  }

  updateClock(dt) {
    if (this.isBlackout) return;

    this.hourProgress += dt;
    if (this.hourProgress >= GAME_CONFIG.time.hourDurationSeconds) {
      this.advanceHour();
    }
  }

  updateClockUI() {
    const hours = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM', '6 AM'];
    this.dom.game.hudTime.textContent = hours[this.gameHour] || '6 AM';
    this.dom.game.hudNight.textContent = this.isCustomNight ? 'Custom' : `לילה ${this.currentNight}`;
  }

  // ================= ניצחון 6:00 בבוקר =================
  winNight() {
    this.gameState = 'WIN';
    if (this.mainLoopInterval) clearInterval(this.mainLoopInterval);
    
    this.closeMonitor();
    this.audio.stopAmbient();
    this.audio.stopMusic();
    this.audio.stopPhoneCall();
    this.audio.playSfx('triumph');

    // פתיחת הלילה הבא והענקת כוכבים
    if (!this.isCustomNight) {
      if (this.currentNight === 5) this.saveManager.awardStar(0);
      if (this.currentNight === 6) this.saveManager.awardStar(1);
      this.saveManager.unlockNight(this.currentNight + 1);
    } else {
      if (this.aiLevels.yam === 20 && this.aiLevels.invar === 20 && this.aiLevels.yamHaredi === 20 && this.aiLevels.invarHaredi === 20) {
        this.saveManager.awardStar(2); // כוכב 20/20/20!
      }
    }

    this.dom.win.nightTitle.textContent = this.isCustomNight ? 'שרדת את Custom Night!' : `סיימת את לילה ${this.currentNight}!`;
    this.showScreen('win');
  }

  // ================= דלתות ותאורה (Doors & Lights) =================
  toggleDoor(side) {
    if (this.isBlackout) return;
    if (side === 'left') {
      this.leftDoorClosed = !this.leftDoorClosed;
      this.audio.playSfx('hit');
    } else {
      this.rightDoorClosed = !this.rightDoorClosed;
      this.audio.playSfx('hit');
    }
    this.updateDoorVisuals();
  }

  setLight(side, state) {
    if (this.isBlackout) return;
    if (side === 'left') {
      this.leftLightOn = state;
      if (state) this.audio.playBeep(120, 'sawtooth', 0.05);
    } else {
      this.rightLightOn = state;
      if (state) this.audio.playBeep(120, 'sawtooth', 0.05);
    }
    this.updateDoorVisuals();
  }

  updateDoorVisuals() {
    // דלת שמאל
    if (this.leftDoorClosed) {
      this.dom.game.leftDoorShutter.classList.remove('open');
      this.dom.game.btnLeftDoor.classList.add('active');
    } else {
      this.dom.game.leftDoorShutter.classList.add('open');
      this.dom.game.btnLeftDoor.classList.remove('active');
    }

    // אור שמאל
    if (this.leftLightOn) {
      this.dom.game.leftDoorLightBeam.classList.add('lit');
      this.dom.game.btnLeftLight.classList.add('active');
      // חשיפת אויב בפתח דלת שמאל
      if (this.animatronics.yam.atDoor && this.animatronics.yam.location === 'cam2b') {
        this.dom.game.leftDoorEnemy.src = GAME_CONFIG.images.characters.yamAngry;
        this.dom.game.leftDoorEnemy.classList.remove('hidden');
      } else {
        this.dom.game.leftDoorEnemy.classList.add('hidden');
      }
    } else {
      this.dom.game.leftDoorLightBeam.classList.remove('lit');
      this.dom.game.btnLeftLight.classList.remove('active');
      this.dom.game.leftDoorEnemy.classList.add('hidden');
    }

    // דלת ימין
    if (this.rightDoorClosed) {
      this.dom.game.rightDoorShutter.classList.remove('open');
      this.dom.game.btnRightDoor.classList.add('active');
    } else {
      this.dom.game.rightDoorShutter.classList.add('open');
      this.dom.game.btnRightDoor.classList.remove('active');
    }

    // אור ימין
    if (this.rightLightOn) {
      this.dom.game.rightDoorLightBeam.classList.add('lit');
      this.dom.game.btnRightLight.classList.add('active');
      // חשיפת ים החרדי בפתח ימין
      if (this.animatronics.yamHaredi.atDoor && this.animatronics.yamHaredi.location === 'cam4b') {
        this.dom.game.rightDoorEnemy.src = GAME_CONFIG.images.characters.yamHaredi;
        this.dom.game.rightDoorEnemy.classList.remove('hidden');
      } else {
        this.dom.game.rightDoorEnemy.classList.add('hidden');
      }
    } else {
      this.dom.game.rightDoorLightBeam.classList.remove('lit');
      this.dom.game.btnRightLight.classList.remove('active');
      this.dom.game.rightDoorEnemy.classList.add('hidden');
    }
  }

  // ================= טאבלט מצלמות (CCTV System) =================
  toggleMonitor() {
    if (this.isBlackout || this.gameState !== 'PLAYING') return;
    if (this.isMonitorOpen) {
      this.closeMonitor();
    } else {
      this.openMonitor();
    }
  }

  openMonitor() {
    this.isMonitorOpen = true;
    this.dom.game.tablet.classList.remove('tablet-down');
    this.audio.playSfx('click');

    // אם ינוור החרדי היה במשרד – הרמת המצלמה מגרשת אותו!
    if (this.animatronics.invarHaredi.inOffice) {
      this.banishInvarHaredi();
    }

    this.selectCamera(this.activeCameraId);
  }

  closeMonitor() {
    this.isMonitorOpen = false;
    this.dom.game.tablet.classList.add('tablet-down');
    this.audio.playSfx('click');
  }

  selectCamera(camId) {
    this.activeCameraId = camId;
    this.audio.playBeep(480, 'square', 0.04);
    
    // עדכון כפתור פעיל במפה
    document.querySelectorAll('.cam-btn').forEach(btn => {
      if (btn.id === `btn-cam-${camId}`) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const camData = GAME_CONFIG.cameras.find(c => c.id === camId);
    if (camData) {
      this.dom.game.cctvCamTitle.textContent = camData.name;
    }

    // הצגת / הסתרת תיבת נגינה ב-CAM 5
    if (camId === 'cam5') {
      this.dom.game.musicBoxContainer.classList.remove('hidden');
    } else {
      this.dom.game.musicBoxContainer.classList.add('hidden');
    }

    this.updateCCTVFeed();
  }

  // עדכון התצוגה במצלמה הפעילה
  updateCCTVFeed() {
    if (!this.isMonitorOpen) return;

    // עדכון שעון מצלמה
    const now = new Date();
    this.dom.game.cctvTimestamp.textContent = now.toTimeString().split(' ')[0];

    const camId = this.activeCameraId;
    let bgSrc = GAME_CONFIG.images.backgrounds.court;
    
    // רקעים לפי מצלמה
    if (camId === 'cam1b') bgSrc = GAME_CONFIG.images.backgrounds.court;
    else if (camId === 'cam6') bgSrc = GAME_CONFIG.images.backgrounds.objection;
    else if (camId === 'cam5') bgSrc = GAME_CONFIG.images.backgrounds.logo;
    else bgSrc = GAME_CONFIG.images.backgrounds.office;

    this.dom.game.cctvBgImage.src = bgSrc;

    // שכבת דמויות במצלמה
    const charsLayer = this.dom.game.cctvCharsLayer;
    charsLayer.innerHTML = '';

    // בדיקה מי מהדמויות נמצא בחדר הזה
    if (this.animatronics.yam.location === camId) {
      const img = document.createElement('img');
      img.className = 'cctv-char-sprite';
      
      if (camId === 'cam3') {
        // אנימציית אוכל במטבח!
        const foodFrames = [GAME_CONFIG.images.characters.yamFood1, GAME_CONFIG.images.characters.yamFood2, GAME_CONFIG.images.characters.yamFood3];
        img.src = foodFrames[Math.floor(Date.now() / 400) % 3];
      } else if (camId === 'cam1b') {
        img.src = GAME_CONFIG.images.characters.yam;
      } else if (camId === 'cam2a' || camId === 'cam4a') {
        img.src = GAME_CONFIG.images.characters.yamCurious;
      } else {
        img.src = GAME_CONFIG.images.characters.yamAngry;
      }
      charsLayer.appendChild(img);
    }

    if (this.animatronics.yamHaredi.location === camId) {
      const img = document.createElement('img');
      img.className = 'cctv-char-sprite';
      img.src = GAME_CONFIG.images.characters.yamHaredi;
      charsLayer.appendChild(img);
    }

    if (camId === 'cam5' && this.animatronics.invar.location === 'cam5' && !this.animatronics.invar.sprinting) {
      const img = document.createElement('img');
      img.className = 'cctv-char-sprite';
      img.src = GAME_CONFIG.images.characters.invar;
      charsLayer.appendChild(img);
    }
  }

  // ================= תיבת הנגינה של ינוור (CAM 5 Music Box) =================
  updateMusicBox(dt) {
    if (this.isWindingMusicBox) {
      this.musicBoxValue = Math.min(100, this.musicBoxValue + 28 * dt);
    } else {
      // ירידה בקצב תלוי ברמת הקושי של ינוור
      const drainRate = 3.5 + (this.aiLevels.invar * 0.35);
      this.musicBoxValue = Math.max(0, this.musicBoxValue - drainRate * dt);
    }

    this.dom.game.musicBoxBar.style.width = `${this.musicBoxValue}%`;
    if (this.musicBoxValue < 25) {
      this.dom.game.musicBoxBar.style.background = 'var(--fnaf-red)';
    } else {
      this.dom.game.musicBoxBar.style.background = 'linear-gradient(90deg, var(--fnaf-green), var(--fnaf-gold))';
    }

    // אם תיבת הנגינה מתרוקנת – ינוור מתחיל לרוץ!
    if (this.musicBoxValue <= 0 && !this.animatronics.invar.sprinting) {
      this.triggerInvarSprint();
    }
  }

  // ================= מערכת בינה מלאכותית של האויבים (AI Engine) =================
  updateAI(dt) {
    // 1. AI של ים (Yam)
    this.processYamAI(dt);

    // 2. AI של ינוור הראנר (Invar Sprint)
    this.processInvarAI(dt);

    // 3. AI של ים החרדי (Yam Haredi)
    this.processYamHarediAI(dt);

    // 4. AI של ינוור החרדי (Invar Haredi Hallucination)
    this.processInvarHarediAI(dt);
  }

  // --- בינה מלאכותית של ים ---
  processYamAI(dt) {
    const yam = this.animatronics.yam;
    const ai = this.aiLevels.yam;
    if (ai <= 0) return;

    if (!yam.tickTimer) yam.tickTimer = 0;
    yam.tickTimer += dt;

    if (yam.tickTimer >= GAME_CONFIG.aiTickInterval.yam) {
      yam.tickTimer = 0;
      
      // גלגול סיכוי תנועה (1 עד 20)
      const roll = Math.floor(Math.random() * 20) + 1;
      if (roll <= ai) {
        this.moveYam();
      }
    }

    // אם ים עומד ליד הדלת – בדיקת תקיפה
    if (yam.atDoor) {
      if (!yam.doorTimer) yam.doorTimer = 0;
      yam.doorTimer += dt;

      if (yam.doorTimer >= GAME_CONFIG.defenseTimes.doorAttackDelay) {
        // אם הדלת הרלוונטית לא סגורה – ג'אמפסקר!
        if (yam.location === 'cam2b' && !this.leftDoorClosed) {
          this.triggerJumpscare('yam', 'ים חדר דרך הדלת השמאלית!');
        } else if (yam.location === 'cam4b' && !this.rightDoorClosed) {
          this.triggerJumpscare('yam', 'ים חדר דרך הדלת הימנית!');
        } else {
          // הדלת הייתה סגורה – ים נחסם וחוזר אחורה!
          this.audio.playSfx('hit');
          yam.atDoor = false;
          yam.doorTimer = 0;
          yam.location = Math.random() < 0.5 ? 'cam1a' : 'cam3';
          this.updateDoorVisuals();
        }
      }
    }
  }

  moveYam() {
    const yam = this.animatronics.yam;
    const path = ['cam1b', 'cam1a', 'cam2a', 'cam2b']; // נתיב שמאל
    const altPath = ['cam1b', 'cam3', 'cam4a', 'cam4b']; // נתיב ימין/מטבח

    if (yam.location === 'cam1b') {
      yam.location = Math.random() < 0.5 ? 'cam1a' : 'cam3';
    } else if (yam.location === 'cam1a') {
      yam.location = 'cam2a';
    } else if (yam.location === 'cam3') {
      yam.location = 'cam4a';
    } else if (yam.location === 'cam2a') {
      yam.location = 'cam2b';
      yam.atDoor = true;
      yam.doorTimer = 0;
    } else if (yam.location === 'cam4a') {
      yam.location = 'cam4b';
      yam.atDoor = true;
      yam.doorTimer = 0;
    }
    this.updateDoorVisuals();
  }

  // --- בינה מלאכותית של ינוור (Invar Foxy Sprint) ---
  processInvarAI(dt) {
    const invar = this.animatronics.invar;
    if (invar.sprinting) {
      invar.sprintTimer += dt;
      if (invar.sprintTimer >= GAME_CONFIG.defenseTimes.invarSprintTime) {
        invar.sprinting = false;
        invar.sprintTimer = 0;

        // בדיקה אם דלת שמאל סגורה
        if (this.leftDoorClosed) {
          // חסימה מוצלחת!
          this.audio.playSfx('hit');
          this.audio.playSfx('break');
          this.power = Math.max(0, this.power - 3); // דפיקה בדלת שואבת 3% סוללה
          invar.location = 'cam5';
          this.musicBoxValue = 75; // איפוס חלקי
        } else {
          // ג'אמפסקר של ינוור!
          this.triggerJumpscare('invar', 'ינוור פרץ בריצה דרך דלת שמאל!');
        }
      }
    }
  }

  triggerInvarSprint() {
    const invar = this.animatronics.invar;
    invar.sprinting = true;
    invar.sprintTimer = 0;
    invar.location = 'cam2a';
    
    // השמעת סאונד צעדי ריצה ואזהרה
    this.audio.playSfx('baldi');
    this.audio.playSfx('crack');
    
    // אם השחקן צופה בטאבלט, נשמע קליק
    if (this.isMonitorOpen) {
      this.updateCCTVFeed();
    }
  }

  // --- בינה מלאכותית של ים החרדי (Yam Haredi) ---
  processYamHarediAI(dt) {
    const haredi = this.animatronics.yamHaredi;
    const ai = this.aiLevels.yamHaredi;
    if (ai <= 0) return;

    if (!haredi.tickTimer) haredi.tickTimer = 0;
    haredi.tickTimer += dt;

    if (haredi.tickTimer >= GAME_CONFIG.aiTickInterval.yamHaredi) {
      haredi.tickTimer = 0;
      const roll = Math.floor(Math.random() * 20) + 1;
      if (roll <= ai) {
        // התקדמות במסדרון ימין
        if (haredi.location === 'cam1b') haredi.location = 'cam4a';
        else if (haredi.location === 'cam4a') {
          haredi.location = 'cam4b';
          haredi.atDoor = true;
          haredi.doorTimer = 0;
        }
        this.updateDoorVisuals();
      }
    }

    if (haredi.atDoor) {
      if (!haredi.doorTimer) haredi.doorTimer = 0;
      haredi.doorTimer += dt;
      if (haredi.doorTimer >= GAME_CONFIG.defenseTimes.doorAttackDelay) {
        if (!this.rightDoorClosed) {
          this.triggerJumpscare('yamHaredi', 'ים החרדי התגנב דרך דלת ימין!');
        } else {
          this.audio.playSfx('hit');
          haredi.atDoor = false;
          haredi.doorTimer = 0;
          haredi.location = 'cam1b';
          this.updateDoorVisuals();
        }
      }
    }
  }

  // --- בינה מלאכותית של ינוור החרדי (Invar Haredi Hallucination) ---
  processInvarHarediAI(dt) {
    const harediInvar = this.animatronics.invarHaredi;
    const ai = this.aiLevels.invarHaredi;
    if (ai <= 0) return;

    if (!harediInvar.inOffice) {
      if (!harediInvar.spawnTimer) harediInvar.spawnTimer = 0;
      harediInvar.spawnTimer += dt;

      if (harediInvar.spawnTimer >= GAME_CONFIG.aiTickInterval.invarHaredi) {
        harediInvar.spawnTimer = 0;
        const roll = Math.floor(Math.random() * 20) + 1;
        if (roll <= ai && !this.isMonitorOpen) {
          // השתגרות ישירה למשרד!
          this.spawnInvarHaredi();
        }
      }
    } else {
      // כשינוור החרדי במשרד – ספירה לאחור!
      harediInvar.timer += dt;
      if (harediInvar.timer >= GAME_CONFIG.defenseTimes.invarHarediReaction) {
        this.triggerJumpscare('invarHaredi', 'בהית בינוור החרדי במשרד זמן רב מדי!');
      }
    }
  }

  spawnInvarHaredi() {
    this.animatronics.invarHaredi.inOffice = true;
    this.animatronics.invarHaredi.timer = 0;
    this.dom.game.officeHarediInvar.classList.remove('hidden');
    this.audio.playSfx('crack');
  }

  banishInvarHaredi() {
    if (this.animatronics.invarHaredi.inOffice) {
      this.animatronics.invarHaredi.inOffice = false;
      this.animatronics.invarHaredi.timer = 0;
      this.dom.game.officeHarediInvar.classList.add('hidden');
      this.audio.playSfx('dodge');
    }
  }

  // ================= ג'אמפסקר ו-GAME OVER =================
  triggerJumpscare(characterKey, causeText = 'נתפסת!') {
    if (this.gameState === 'JUMPSCARE' || this.gameState === 'GAMEOVER') return;
    this.gameState = 'JUMPSCARE';
    
    if (this.mainLoopInterval) clearInterval(this.mainLoopInterval);

    this.closeMonitor();
    this.audio.stopAllSounds();

    // בחירת תמונת ג'אמפסקר
    let jumpscareImg = GAME_CONFIG.images.characters.yamAngry;
    if (characterKey === 'invar') jumpscareImg = GAME_CONFIG.images.characters.invar;
    else if (characterKey === 'yamHaredi') jumpscareImg = GAME_CONFIG.images.characters.yamHaredi;
    else if (characterKey === 'invarHaredi') jumpscareImg = GAME_CONFIG.images.characters.invarHaredi;
    else if (this.currentNight >= 5) jumpscareImg = GAME_CONFIG.images.characters.bossFight;

    this.dom.jumpscare.image.src = jumpscareImg;
    this.dom.jumpscare.overlay.classList.remove('hidden');

    // סאונד צרחה קורעת ורעידה
    this.audio.playSfx('rip');
    this.audio.playSfx('gameOver');

    // מעבר למסך GAME OVER אחרי 2.2 שניות
    setTimeout(() => {
      this.dom.jumpscare.overlay.classList.add('hidden');
      this.showGameOver(causeText);
    }, 2200);
  }

  showGameOver(causeText) {
    this.gameState = 'GAMEOVER';
    this.audio.stopAllSounds();
    this.dom.gameOver.cause.textContent = causeText;
    const hours = ['12 AM', '1 AM', '2 AM', '3 AM', '4 AM', '5 AM'];
    this.dom.gameOver.timeSurvived.textContent = `שרדת עד: ${hours[this.gameHour] || '12 AM'}`;
    this.showScreen('gameOver');
  }
}

// ================= אתחול המשחק בטעינת הדף =================
window.addEventListener('DOMContentLoaded', () => {
  window.game = new FiveNightsAtYam();
});

// רישום Service Worker לעבודה 100% Offline (פעיל כשהמשחק רץ בשרת / PWA)
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
