// All sound is synthesized with WebAudio, no audio files: a happy blip that
// climbs with the combo, a golden arpeggio, a low buzz for a bad catch, a
// little fanfare on level up and a slide down on game over. The context is
// created on the first user gesture, so browsers never block it, and M mutes.
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.35;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, seconds, type, when, slideTo) {
    if (context === null || master === null || muted) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.5, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    catch(combo) {
      if (!ensure()) return;
      const step = Math.min(combo, 12);
      tone(520 + step * 32, 0.12, 'sine', 0);
      tone(780 + step * 32, 0.1, 'sine', 0.06);
    },
    gold() {
      if (!ensure()) return;
      tone(880, 0.12, 'triangle', 0);
      tone(1108, 0.12, 'triangle', 0.08);
      tone(1318, 0.2, 'triangle', 0.16);
    },
    bad() {
      if (!ensure()) return;
      tone(160, 0.25, 'sawtooth', 0, 70);
    },
    level() {
      if (!ensure()) return;
      tone(523, 0.12, 'triangle', 0);
      tone(659, 0.12, 'triangle', 0.1);
      tone(784, 0.12, 'triangle', 0.2);
      tone(1046, 0.22, 'triangle', 0.3);
    },
    over() {
      if (!ensure()) return;
      tone(392, 0.22, 'triangle', 0, 370);
      tone(311, 0.22, 'triangle', 0.2, 294);
      tone(233, 0.4, 'triangle', 0.4, 180);
    },
    click() {
      if (!ensure()) return;
      tone(660, 0.07, 'sine', 0);
    },
  };
}
