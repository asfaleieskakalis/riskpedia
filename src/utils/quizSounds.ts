let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioCtx();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

function scheduleTone(
  ctx: AudioContext,
  frequency: number,
  startOffsetSec: number,
  durationSec: number,
  peakGain: number,
  type: OscillatorType = 'sine'
): void {
  const startTime = ctx.currentTime + startOffsetSec;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + durationSec + 0.02);
}

export function playQuizAnswerSound(isCorrect: boolean): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (isCorrect) {
      // Warm ascending major third chime (C5 -> E5)
      scheduleTone(ctx, 523.25, 0, 0.14, 0.065, 'sine');
      scheduleTone(ctx, 659.25, 0.08, 0.22, 0.075, 'sine');
    } else {
      // Gentle soft descending cue (D4 -> B3)
      scheduleTone(ctx, 293.66, 0, 0.14, 0.055, 'triangle');
      scheduleTone(ctx, 246.94, 0.09, 0.22, 0.05, 'sine');
    }
  } catch {
    // Audio playback unavailable or blocked
  }
}

export function playQuizCompleteSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Subtle 3-note completion triad (C5 -> E5 -> G5)
    scheduleTone(ctx, 523.25, 0, 0.15, 0.055, 'sine');
    scheduleTone(ctx, 659.25, 0.09, 0.16, 0.06, 'sine');
    scheduleTone(ctx, 783.99, 0.18, 0.28, 0.07, 'sine');
  } catch {
    // Audio playback unavailable or blocked
  }
}
