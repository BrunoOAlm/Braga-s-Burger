const INTRO_KEY = 'bragas_intro_seen';

export function hasSeenIntro(): boolean {
  if (typeof window === 'undefined') return true;
  return window.sessionStorage.getItem(INTRO_KEY) === 'true';
}

export function markIntroSeen(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(INTRO_KEY, 'true');
}
