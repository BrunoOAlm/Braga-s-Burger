import { describe, it, expect, beforeEach } from 'vitest';
import { hasSeenIntro, markIntroSeen } from './intro';

describe('intro gate', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('hasSeenIntro é false numa sessão nova', () => {
    expect(hasSeenIntro()).toBe(false);
  });

  it('hasSeenIntro vira true depois de markIntroSeen', () => {
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });
});
