const store = { mood: 'idle' };

export function setBotMood(mood) {
  store.mood = mood; // 'idle' | 'listening' | 'thinking' | 'speaking'
}

export function getBotMood() {
  return store;
}

// dev helper: type setBotMood('thinking') in the browser console to test
if (typeof window !== 'undefined') window.setBotMood = setBotMood;