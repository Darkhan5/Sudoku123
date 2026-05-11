import type { Settings } from "../../types";
import { getExperiencePack } from "@/lib/domain/experiencePacks";

type FeedbackTone = "tap" | "success" | "combo" | "victory" | "sabotage" | "error" | "rank-up";

const FREQUENCIES: Record<FeedbackTone, number> = {
  tap: 520,
  success: 760,
  combo: 920,
  victory: 1040,
  sabotage: 360,
  error: 220,
  "rank-up": 1180
};

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

function playTone(context: AudioContext, tone: FeedbackTone, frequency: number, startAt: number, duration: number, volume: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = tone === "error" ? "sawtooth" : tone === "sabotage" || tone === "combo" ? "triangle" : "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function soundProfile(settings: Pick<Settings, "theme">): "quiet-electric" | "page-asmr" | "soft-sine" {
  return getExperiencePack(settings.theme ?? "standard").layers.sound as "quiet-electric" | "page-asmr" | "soft-sine";
}

export function playFeedback(settings: Pick<Settings, "sound" | "theme">, tone: FeedbackTone): void {
  if (!settings.sound) return;
  const context = getAudioContext();
  if (!context) return;
  const profile = soundProfile(settings);

  if (profile === "quiet-electric") {
    const base = tone === "error" ? 180 : tone === "victory" || tone === "rank-up" ? 880 : 640;
    playTone(context, "tap", base, context.currentTime, 0.045, 0.018);
    playTone(context, "tap", base * 1.5, context.currentTime + 0.018, 0.035, 0.012);
    return;
  }

  if (profile === "page-asmr") {
    const base = tone === "error" ? 180 : tone === "victory" || tone === "rank-up" ? 620 : 420;
    playTone(context, "tap", base, context.currentTime, 0.08, 0.018);
    if (tone === "victory" || tone === "rank-up") playTone(context, "tap", 520, context.currentTime + 0.06, 0.12, 0.012);
    return;
  }

  if (tone === "combo") {
    playTone(context, tone, FREQUENCIES.combo, context.currentTime, 0.11, 0.038);
    playTone(context, tone, 1220, context.currentTime + 0.055, 0.12, 0.032);
    return;
  }

  if (tone === "sabotage") {
    playTone(context, tone, FREQUENCIES.sabotage, context.currentTime, 0.07, 0.026);
    playTone(context, tone, 260, context.currentTime + 0.045, 0.08, 0.02);
    return;
  }

  playTone(context, tone, FREQUENCIES[tone], context.currentTime, 0.12, tone === "victory" || tone === "rank-up" ? 0.08 : 0.045);
}
