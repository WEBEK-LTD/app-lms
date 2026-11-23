#!/usr/bin/env python3
"""Roadmap 207: the ringtones of Yallapp Business, made here from code.

Every sound is synthesised by this script (sine partials, plucked strings,
noise bursts and envelopes; no recordings, no samples from anywhere else), so
they are Yallapp's own. Run it from business/ after changing a tone:

    python3 tool/ringtones.py

It writes, for each ringtone in RINGTONES:

- assets/sounds/ring_<id>.m4a                     the app's preview and in-app ring (AAC)
- android/app/src/main/res/raw/yb_ring_<id>.ogg   Android's notification channels (Vorbis)
- ios/Runner/Sounds/yb_ring_<id>.caf              iOS pushes, one ring (IMA4)
- ios/Runner/Sounds/yb_ring_<id>_long.caf         iOS pushes that ring on: the ring again
                                                  and again for about 25 seconds (Apple's
                                                  limit is 30)

Needs numpy and ffmpeg (with libvorbis). The ids must match
lib/core/services/ringtones.dart and platform/web/src/lib/owner/push-sounds.ts.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

RATE = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def t_axis(seconds: float) -> np.ndarray:
    return np.arange(int(seconds * RATE)) / RATE


def env(seconds: float, attack: float = 0.004, decay: float = 0.6) -> np.ndarray:
    """A fast attack and an exponential decay (decay: seconds to fall to ~1/e)."""
    t = t_axis(seconds)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def tone(freq: float, seconds: float, partials=((1, 1.0),), attack=0.004, decay=0.6, vibrato=0.0) -> np.ndarray:
    t = t_axis(seconds)
    phase_mod = vibrato * np.sin(2 * np.pi * 5.5 * t)
    out = np.zeros_like(t)
    for ratio, amp in partials:
        out += amp * np.sin(2 * np.pi * freq * ratio * t + phase_mod * ratio)
    return out * env(seconds, attack, decay)


def bell(freq: float, seconds: float = 1.6, decay: float = 0.7) -> np.ndarray:
    # Inharmonic partials of a struck bell, the high ones dying first.
    t = t_axis(seconds)
    out = np.zeros_like(t)
    for ratio, amp, d in ((0.5, 0.35, 1.2), (1.0, 1.0, 1.0), (1.19, 0.45, 0.8), (1.5, 0.4, 0.6), (2.0, 0.35, 0.5), (2.74, 0.25, 0.35), (3.76, 0.15, 0.2)):
        out += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t / (decay * d))
    return out * np.clip(t / 0.002, 0, 1)


def marimba(freq: float, seconds: float = 0.9) -> np.ndarray:
    return tone(freq, seconds, ((1, 1.0), (4, 0.25), (10, 0.05)), attack=0.002, decay=0.28)


def xylo(freq: float, seconds: float = 0.5) -> np.ndarray:
    return tone(freq, seconds, ((1, 1.0), (3, 0.35), (6.3, 0.12)), attack=0.001, decay=0.12)


def pluck(freq: float, seconds: float = 1.4) -> np.ndarray:
    """A plucked string: harmonics whose higher ones fade sooner."""
    t = t_axis(seconds)
    out = np.zeros_like(t)
    for k in range(1, 9):
        out += (1.0 / k) * np.sin(2 * np.pi * freq * k * t) * np.exp(-t * k / 0.9)
    return out * np.clip(t / 0.0015, 0, 1)


def square(freq: float, seconds: float, duty: float = 0.5, decay: float = 10.0) -> np.ndarray:
    t = t_axis(seconds)
    raw = np.where((t * freq) % 1.0 < duty, 1.0, -1.0)
    # Soften the edges a little (a one-pole low-pass), so it isn't harsh.
    out = np.empty_like(raw)
    acc = 0.0
    for i, v in enumerate(raw):
        acc += 0.35 * (v - acc)
        out[i] = acc
    gate = np.clip(t / 0.003, 0, 1) * np.clip((seconds - t) / 0.01, 0, 1)
    return 0.55 * out * gate * np.exp(-t / decay)


def chirp(f0: float, f1: float, seconds: float) -> np.ndarray:
    t = t_axis(seconds)
    f = f0 * (f1 / f0) ** (t / seconds)
    phase = 2 * np.pi * np.cumsum(f) / RATE
    gate = np.sin(np.pi * np.clip(t / seconds, 0, 1)) ** 1.5
    return np.sin(phase) * gate


def noise_burst(seconds: float, decay: float, seed: int = 3, low: float = 0.15) -> np.ndarray:
    rng = np.random.default_rng(seed)
    raw = rng.uniform(-1, 1, int(seconds * RATE))
    out = np.empty_like(raw)
    acc = 0.0
    for i, v in enumerate(raw):
        acc += low * (v - acc)
        out[i] = acc
    return out * env(seconds, 0.0005, decay)


def place(track: np.ndarray, sound: np.ndarray, at: float, gain: float = 1.0) -> None:
    start = int(at * RATE)
    end = min(len(track), start + len(sound))
    track[start:end] += gain * sound[: end - start]


def silence(seconds: float) -> np.ndarray:
    return np.zeros(int(seconds * RATE))


def room(x: np.ndarray, mix: float = 0.18, seconds: float = 0.9) -> np.ndarray:
    """A small room: the sound convolved with a short decaying noise tail."""
    rng = np.random.default_rng(7)
    n = int(seconds * RATE)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (RATE * seconds / 5))
    ir /= np.sqrt(np.sum(ir**2))
    wet = np.convolve(x, ir)[: len(x)]
    return (1 - mix) * x + mix * wet


def note(name: str) -> float:
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + 12 * (octave - 4)) / 12)


# The ringtones -------------------------------------------------------------


def counter_bell():
    tr = silence(2.6)
    place(tr, bell(note("E6"), 1.6, 0.5), 0.0)
    place(tr, bell(note("E6"), 1.6, 0.5), 0.45)
    place(tr, bell(note("B5"), 2.0, 0.6), 0.9, 0.9)
    return room(tr)


def kitchen_ticket():
    tr = silence(2.2)
    for i, n in enumerate(("G5", "C6", "G5", "C6")):
        place(tr, tone(note(n), 0.9, ((1, 1), (2, 0.3), (3, 0.12)), 0.003, 0.25), i * 0.22)
    place(tr, tone(note("E6"), 1.3, ((1, 1), (2, 0.3)), 0.003, 0.45), 0.95)
    return room(tr)


def marimba_run():
    tr = silence(2.0)
    for i, n in enumerate(("C5", "E5", "G5", "C6", "G5", "C6")):
        place(tr, marimba(note(n)), i * 0.14)
    place(tr, marimba(note("E6"), 1.1), 0.9)
    return room(tr, 0.22)


def harp_glide():
    tr = silence(2.8)
    for i, n in enumerate(("D4", "F#4", "A4", "D5", "F#5", "A5", "D6")):
        place(tr, pluck(note(n), 1.8), i * 0.09, 0.8)
    return room(tr, 0.25, 1.2)


def digital_beep():
    tr = silence(1.6)
    for k in range(2):
        for i in range(3):
            place(tr, square(2200, 0.09, decay=1.0), k * 0.75 + i * 0.14)
    return tr


def rush_hour():
    # Urgent: two pitches alternating fast, three times, then a rising call.
    tr = silence(2.4)
    for i in range(6):
        f = note("A5") if i % 2 == 0 else note("E6")
        place(tr, tone(f, 0.16, ((1, 1), (2, 0.5), (3, 0.3), (5, 0.1)), 0.002, 0.5) * np.clip((0.16 - t_axis(0.16)) / 0.01, 0, 1), i * 0.17)
    place(tr, chirp(note("A5"), note("A6"), 0.5) * 0.9, 1.1)
    place(tr, chirp(note("A5"), note("A6"), 0.5) * 0.9, 1.7)
    return tr


def cash_drawer():
    tr = silence(1.8)
    for i, (f, g) in enumerate(((3200, 0.6), (4100, 0.5), (3600, 0.5), (4800, 0.4))):
        place(tr, bell(f / 2, 0.7, 0.25), i * 0.07, g)
    place(tr, bell(note("C7") / 2, 1.3, 0.5), 0.45, 0.9)
    place(tr, bell(note("G6") / 2, 1.3, 0.5), 0.62, 0.7)
    return room(tr)


def doorbell():
    tr = silence(2.6)
    place(tr, tone(note("E5"), 1.4, ((1, 1), (2, 0.4), (3, 0.15), (4.2, 0.05)), 0.003, 0.8), 0.0)
    place(tr, tone(note("C5"), 1.9, ((1, 1), (2, 0.4), (3, 0.15), (4.2, 0.05)), 0.003, 1.0), 0.55)
    return room(tr, 0.25)


def xylo_run():
    tr = silence(1.6)
    for i, n in enumerate(("C6", "D6", "E6", "G6", "A6", "C7")):
        place(tr, xylo(note(n)), i * 0.075)
    for i, n in enumerate(("C7", "A6", "C7")):
        place(tr, xylo(note(n), 0.7), 0.6 + i * 0.16)
    return room(tr)


def soft_pulse():
    tr = silence(2.4)
    for i in range(4):
        place(tr, tone(note("A4"), 0.6, ((1, 1), (2, 0.25), (3, 0.08)), 0.03, 0.22), i * 0.3, 0.8)
    place(tr, tone(note("E5"), 1.0, ((1, 1), (2, 0.2)), 0.03, 0.4), 1.25)
    return room(tr, 0.3)


def bird_chirp():
    tr = silence(1.8)
    for i, (a, b, d) in enumerate(((2600, 4200, 0.09), (2800, 4600, 0.08), (3000, 5000, 0.07))):
        place(tr, chirp(a, b, d), i * 0.13)
    for i, (a, b, d) in enumerate(((4200, 2600, 0.12), (4600, 2800, 0.1))):
        place(tr, chirp(a, b, d), 0.7 + i * 0.18)
    return room(tr, 0.15)


def sunrise():
    tr = silence(2.8)
    for i, n in enumerate(("C5", "E5", "G5", "B5", "D6")):
        place(tr, tone(note(n), 2.4 - i * 0.12, ((1, 1), (2, 0.2), (3, 0.06)), 0.06, 0.9), i * 0.12, 0.6)
    return room(tr, 0.3, 1.4)


def arcade():
    tr = silence(1.4)
    for i, n in enumerate(("C6", "E6", "G6", "C7", "G6", "C7", "E7")):
        place(tr, square(note(n), 0.08, decay=0.5), i * 0.085, 0.8)
    place(tr, square(note("C7"), 0.3, decay=0.25), 0.65, 0.8)
    return tr


def soft_drop():
    tr = silence(1.2)
    t = t_axis(0.25)
    f = 900 * (2.2 ** (t / 0.25))
    drop = np.sin(2 * np.pi * np.cumsum(f) / RATE) * env(0.25, 0.002, 0.07)
    place(tr, drop, 0.0)
    place(tr, drop * 0.6, 0.22)
    return room(tr, 0.3)


def pop_up():
    tr = silence(0.9)
    place(tr, tone(note("G5"), 0.3, ((1, 1), (2, 0.2)), 0.002, 0.07), 0.0)
    place(tr, tone(note("D6"), 0.5, ((1, 1), (2, 0.2)), 0.002, 0.12), 0.09)
    return room(tr, 0.2)


def wood_knock():
    tr = silence(1.6)
    knock = tone(380, 0.25, ((1, 1), (2.3, 0.4), (4.1, 0.15)), 0.0005, 0.035) + 0.15 * noise_burst(0.25, 0.004)
    for at in (0.0, 0.16, 0.32, 0.8, 0.96):
        place(tr, knock, at)
    return room(tr, 0.08, 0.3)


def chime_classic():
    """The chime Kitchen mode always played (assets/sounds/new_order.wav), kept as the first choice."""
    with wave.open(os.path.join(ROOT, "assets", "sounds", "new_order.wav")) as w:
        frames = w.readframes(w.getnframes())
        width = w.getsampwidth()
        channels = w.getnchannels()
        rate = w.getframerate()
    data = np.frombuffer(frames, dtype={1: np.int8, 2: np.int16}[width]).astype(np.float64)
    if channels > 1:
        data = data.reshape(-1, channels).mean(axis=1)
    data /= float(2 ** (8 * width - 1))
    if rate != RATE:
        x = np.arange(int(len(data) * RATE / rate)) * rate / RATE
        data = np.interp(x, np.arange(len(data)), data)
    return data


# id → (maker, gap before it rings again in the long iOS version)
RINGTONES = {
    "chime": (chime_classic, 0.4),
    "counter_bell": (counter_bell, 0.3),
    "kitchen_ticket": (kitchen_ticket, 0.4),
    "marimba": (marimba_run, 0.4),
    "harp": (harp_glide, 0.2),
    "digital": (digital_beep, 0.3),
    "rush_hour": (rush_hour, 0.2),
    "cash_drawer": (cash_drawer, 0.4),
    "doorbell": (doorbell, 0.3),
    "xylophone": (xylo_run, 0.4),
    "soft_pulse": (soft_pulse, 0.3),
    "chirp": (bird_chirp, 0.5),
    "sunrise": (sunrise, 0.2),
    "arcade": (arcade, 0.5),
    "soft_drop": (soft_drop, 0.6),
    "pop": (pop_up, 0.6),
    "knock": (wood_knock, 0.4),
}

LONG_SECONDS = 25.0


def finish(x: np.ndarray, peak: float = 0.89) -> np.ndarray:
    x = x - np.mean(x)
    fade = int(0.03 * RATE)
    x[-fade:] *= np.linspace(1, 0, fade)
    top = np.max(np.abs(x)) or 1.0
    return x * (peak / top)


def write_wav(path: str, x: np.ndarray) -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


def ffmpeg(src: str, dst: str, *args: str) -> None:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, *args, "-map_metadata", "-1", dst], check=True)


def main() -> int:
    sounds = os.path.join(ROOT, "assets", "sounds")
    raw = os.path.join(ROOT, "android", "app", "src", "main", "res", "raw")
    ios = os.path.join(ROOT, "ios", "Runner", "Sounds")
    for d in (sounds, raw, ios):
        os.makedirs(d, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for rid, (make, gap) in RINGTONES.items():
            one = finish(make())
            once = os.path.join(tmp, f"{rid}.wav")
            write_wav(once, one)
            times = max(1, int(LONG_SECONDS // (len(one) / RATE + gap)))
            long = np.concatenate([np.concatenate([one, silence(gap)]) for _ in range(times)])
            longpath = os.path.join(tmp, f"{rid}_long.wav")
            write_wav(longpath, long)
            ffmpeg(once, os.path.join(sounds, f"ring_{rid}.m4a"), "-ac", "1", "-c:a", "aac", "-b:a", "64k")
            ffmpeg(once, os.path.join(raw, f"yb_ring_{rid}.ogg"), "-ac", "1", "-c:a", "libvorbis", "-q:a", "3")
            ffmpeg(once, os.path.join(ios, f"yb_ring_{rid}.caf"), "-ac", "1", "-ar", "22050", "-c:a", "adpcm_ima_qt", "-f", "caf")
            ffmpeg(longpath, os.path.join(ios, f"yb_ring_{rid}_long.caf"), "-ac", "1", "-ar", "16000", "-c:a", "adpcm_ima_qt", "-f", "caf")
            print(f"{rid}: {len(one) / RATE:.2f} s, long {len(long) / RATE:.1f} s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
