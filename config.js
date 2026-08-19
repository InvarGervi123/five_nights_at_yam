/**
 * Five Nights at Yam - הגדרות משחק ראשיות (Configuration File)
 * ניתן לשנות כאן בקלות כל ערך במשחק: זמנים, מהירויות, רמות קושי, סאונד ונתיבים.
 */

const GAME_CONFIG = {
  // === הגדרות זמן ולילות ===
  time: {
    hourDurationSeconds: 45, // כמה שניות נמשכת כל שעה במשחק (סה"כ 6 שעות = 270 שניות ללילה)
    totalHoursPerNight: 6,   // שעות מ-12AM עד 6AM
  },

  // === הגדרות חשמל וסוללה (Power & Battery) ===
  power: {
    startPower: 100,         // סוללה התחלתית (%)
    baseDrainPerSecond: 0.12,// קצב פריקה בסיסי לשנייה (מאוורר שולחני דולק)
    doorDrainPerSecond: 0.25,// תוספת פריקה עבור כל דלת סגורה
    lightDrainPerSecond: 0.20,// תוספת פריקה עבור כל אור דולק
    monitorDrainPerSecond: 0.22, // תוספת פריקה כשהמצלמה פתוחה
  },

  // === הגדרות מובייל ושליטה (Touch & Controls) ===
  controls: {
    panSensitivityMouse: 1.0,  // רגישות תזוזת מבט בעכבר
    panSensitivityTouch: 1.2,  // רגישות גרירה במגע (טלפונים)
    officeMaxPanPx: 380,       // מקסימום הזזת משרד ימינה/שמאלה בפיקסלים
    autoCenterSpeed: 0.1,      // מהירות החזרה למרכז
  },

  // === רמות קושי של האויבים לפי לילות (AI Difficulty 0-20) ===
  nightDifficulty: {
    1: { yam: 3,  invar: 1,  yamHaredi: 0,  invarHaredi: 0 },
    2: { yam: 6,  invar: 3,  yamHaredi: 2,  invarHaredi: 1 },
    3: { yam: 10, invar: 6,  yamHaredi: 5,  invarHaredi: 2 },
    4: { yam: 14, invar: 10, yamHaredi: 9,  invarHaredi: 4 },
    5: { yam: 18, invar: 14, yamHaredi: 13, invarHaredi: 7 },
    6: { yam: 20, invar: 17, yamHaredi: 16, invarHaredi: 10 }, // לילה 6 - סיוט
  },

  // === מרווחי תנועה של ה-AI (בשניות) ===
  aiTickInterval: {
    yam: 4.5,          // כל כמה שניות ים מנסה לבצע מהלך
    invar: 3.5,        // כל כמה שניות ינוור מעלה את מד הריצה
    yamHaredi: 5.0,    // כל כמה שניות ים החרדי זז
    invarHaredi: 8.0,  // כל כמה שניות נבדק סיכוי להופעת ינוור החרדי במשרד
  },

  // === הגדרות זמן תגובה של השחקן (בשניות) ===
  defenseTimes: {
    doorAttackDelay: 3.2,     // כמה שניות יש לשחקן לסגור דלת כשדמות מציצה
    invarSprintTime: 2.6,     // כמה שניות יש לשחקן לסגור דלת שמאל מרגע שמיעת הריצה
    invarHarediReaction: 1.6, // כמה שניות יש לשחקן להרים מצלמה כשינוור החרדי מופיע במשרד!
  },

  // === נתיבי תמונות (Image Assets) ===
  images: {
    backgrounds: {
      office: 'images/backgrounds/room.jpg',
      court: 'images/backgrounds/בית משפט.png',
      objection: 'images/backgrounds/התנגדות.png',
      logo: 'images/backgrounds/לוגו מוסד.png',
    },
    characters: {
      yam: 'images/characters/yam.png',
      yamCurious: 'images/characters/yam_curious.png',
      yamAngry: 'images/characters/yam_angry.png',
      yamAlien: 'images/characters/yam_alien.png',
      yamHappy: 'images/characters/yam_happy.png',
      yamHorny: 'images/characters/yam_horny.png',
      yamSad: 'images/characters/yam_sad.png',
      yamSleepy: 'images/characters/yam_sleepy.png',
      yamSurprise: 'images/characters/yam_surpise.png',
      yamDead: 'images/characters/yam_dead.png',
      yamFood1: 'images/characters/yam_boss_animation_food_1.png',
      yamFood2: 'images/characters/yam_boss_animation_food_2.png',
      yamFood3: 'images/characters/yam_boss_animation_food_3.png',
      bossFight: 'images/characters/Boss_fight.png',
      invar: 'images/characters/invar.png',
      yamHaredi: 'images/characters/ים חרדי.png',
      invarHaredi: 'images/characters/ינוור החרדי.png',
    }
  },

  // === נתיבי קבצי סאונד (Audio Assets) ===
  sounds: {
    menu: 'audio/ים דייט סימולטור - תפריט ראשי.mp3',
    ambient: 'audio/the_clockwork_void_extend.mp3',
    ambientVoid: 'audio/the_clockwork_void.mp3',
    panic: 'audio/Panic.mp3',
    boss: 'audio/boss_fight.mp3',
    phoneCall: 'audio/פיניקס בייט_ הסנגור לענייני קלוריות.mp3',
    baldi: 'audio/baldi_sound.mp3',
    click: 'audio/click.mp3',
    break: 'audio/break.mp3',
    crack: 'audio/crack.mp3',
    dodge: 'audio/dodge.mp3',
    gameOver: 'audio/game_over.mp3',
    heal: 'audio/healing.mp3',
    hit: 'audio/hit.mp3',
    inject: 'audio/inject.mp3',
    rip: 'audio/rip.mp3',
    triumph: 'audio/truimph.mp3',
    tammy: 'audio/בואי תמי (גרסא לדייטים).mp3',
    dramatic: 'audio/גישה פיזית ודרמטית.mp3',
    adventures: 'audio/נתיבים מיוחדים והרפתקאות.mp3',
  },

  // === הגדרות מצלמות האבטחה (CCTV Rooms) ===
  cameras: [
    { id: 'cam1a', name: 'CAM 1A - אולם הכניסה', shortName: '1A', x: 48, y: 16 },
    { id: 'cam1b', name: 'CAM 1B - הבמה המרכזית (בית המשפט)', shortName: '1B', x: 48, y: 36 },
    { id: 'cam2a', name: 'CAM 2A - מסדרון שמאל', shortName: '2A', x: 22, y: 55 },
    { id: 'cam2b', name: 'CAM 2B - פתח דלת שמאל', shortName: '2B', x: 22, y: 78 },
    { id: 'cam3',  name: 'CAM 3 - המטבח וחדר האוכל', shortName: '3',  x: 76, y: 40 },
    { id: 'cam4a', name: 'CAM 4A - מסדרון ימין', shortName: '4A', x: 74, y: 58 },
    { id: 'cam4b', name: 'CAM 4B - פתח דלת ימין', shortName: '4B', x: 74, y: 78 },
    { id: 'cam5',  name: 'CAM 5 - חדר המוסד (מאורת ינוור)', shortName: '5', x: 14, y: 30 },
    { id: 'cam6',  name: 'CAM 6 - חדר ההתנגדות', shortName: '6', x: 86, y: 72 },
  ]
};

if (typeof window !== 'undefined') {
  window.GAME_CONFIG = GAME_CONFIG;
}
