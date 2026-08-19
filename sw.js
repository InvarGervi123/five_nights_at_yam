const CACHE_NAME = 'fnay-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './game.js',
  './manifest.json',
  './images/backgrounds/room.jpg',
  './images/backgrounds/בית משפט.png',
  './images/backgrounds/התנגדות.png',
  './images/backgrounds/לוגו מוסד.png',
  './images/characters/yam.png',
  './images/characters/yam_curious.png',
  './images/characters/yam_angry.png',
  './images/characters/yam_alien.png',
  './images/characters/yam_happy.png',
  './images/characters/yam_horny.png',
  './images/characters/yam_sad.png',
  './images/characters/yam_sleepy.png',
  './images/characters/yam_surpise.png',
  './images/characters/yam_dead.png',
  './images/characters/yam_boss_animation_food_1.png',
  './images/characters/yam_boss_animation_food_2.png',
  './images/characters/yam_boss_animation_food_3.png',
  './images/characters/Boss_fight.png',
  './images/characters/invar.png',
  './images/characters/ים חרדי.png',
  './images/characters/ינוור החרדי.png',
  './audio/ים דייט סימולטור - תפריט ראשי.mp3',
  './audio/the_clockwork_void_extend.mp3',
  './audio/the_clockwork_void.mp3',
  './audio/Panic.mp3',
  './audio/boss_fight.mp3',
  './audio/פיניקס בייט_ הסנגור לענייני קלוריות.mp3',
  './audio/baldi_sound.mp3',
  './audio/click.mp3',
  './audio/break.mp3',
  './audio/crack.mp3',
  './audio/dodge.mp3',
  './audio/game_over.mp3',
  './audio/healing.mp3',
  './audio/hit.mp3',
  './audio/inject.mp3',
  './audio/rip.mp3',
  './audio/truimph.mp3',
  './audio/בואי תמי (גרסא לדייטים).mp3',
  './audio/גישה פיזית ודרמטית.mp3',
  './audio/נתיבים מיוחדים והרפתקאות.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Some assets failed caching in sw:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
