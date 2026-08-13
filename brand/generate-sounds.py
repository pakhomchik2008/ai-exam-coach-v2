#!/usr/bin/env python3
"""Synthesise the Phase 4 sound kit.

Six short cues, WAV always, MP3 + loudnorm when ffmpeg is on PATH.
Target loudness ≈ -18 LUFS (spec). Never harsh: no square waves, no
noise bursts on wrong/complete/level.
"""
from __future__ import annotations

import math
import os
import shutil
import struct
import subprocess
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "sounds"
SR = 44100


def env(i: int, n: int, attack: int, release: int) -> float:
    if n <= 1:
        return 0.0
    if i < attack:
        return i / max(1, attack)
    if i > n - release:
        return max(0.0, (n - i) / max(1, release))
    return 1.0


def sine(freq: float, i: int) -> float:
    return math.sin(2 * math.pi * freq * i / SR)


def mix_to_pcm(samples: list[float], peak: float = 0.55) -> bytes:
    m = max((abs(s) for s in samples), default=1.0) or 1.0
    scale = peak / m
    out = bytearray()
    for s in samples:
        v = max(-1.0, min(1.0, s * scale))
        out += struct.pack("<h", int(v * 32767))
    return bytes(out)


def write_wav(name: str, samples: list[float], peak: float = 0.55) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.wav"
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(mix_to_pcm(samples, peak))
    return path


def tap() -> list[float]:
    n = int(SR * 0.012)
    samples = []
    for i in range(n):
        e = env(i, n, 2, n - 2)
        # soft click: high sine, not white noise
        samples.append(e * (0.7 * sine(2100, i) + 0.3 * sine(4200, i)))
    return samples


def select() -> list[float]:
    n = int(SR * 0.040)
    samples = []
    for i in range(n):
        e = env(i, n, 8, int(n * 0.55))
        samples.append(e * (0.6 * sine(440, i) + 0.4 * sine(660, i)))
    return samples


def correct() -> list[float]:
    n = int(SR * 0.220)
    split = int(n * 0.42)
    samples = []
    for i in range(n):
        e = env(i, n, 20, int(n * 0.4))
        f = 523.25 if i < split else 659.25  # C5 → E5 major third
        samples.append(e * sine(f, i))
    return samples


def wrong() -> list[float]:
    n = int(SR * 0.180)
    samples = []
    for i in range(n):
        e = env(i, n, 12, int(n * 0.7))
        # muted low tone — never a buzzer
        samples.append(e * 0.85 * sine(110, i) + e * 0.15 * sine(165, i))
    return samples


def complete() -> list[float]:
    n = int(SR * 0.500)
    notes = [(0.00, 523.25), (0.16, 659.25), (0.32, 783.99)]  # C E G
    samples = [0.0] * n
    for start_t, freq in notes:
        start = int(start_t * SR)
        length = int(0.28 * SR)
        for j in range(length):
            i = start + j
            if i >= n:
                break
            e = env(j, length, 30, int(length * 0.55))
            samples[i] += e * sine(freq, i)
    return samples


def level() -> list[float]:
    n = int(SR * 0.700)
    samples = []
    for i in range(n):
        e_bell = env(i, n, 40, int(n * 0.75))
        shimmer_on = i > int(0.12 * SR)
        e_sh = env(max(0, i - int(0.12 * SR)), n, 80, int(n * 0.6)) if shimmer_on else 0.0
        bell = e_bell * (sine(528, i) + 0.35 * sine(1056, i))
        shimmer = e_sh * 0.22 * sine(2100, i) * (0.5 + 0.5 * sine(6, i))
        samples.append(bell + shimmer)
    return samples


def ffmpeg_mp3(wav: Path) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("ffmpeg not on PATH — WAV only (MP3 skipped)")
        return
    mp3 = wav.with_suffix(".mp3")
    # two-pass loudnorm to land near -18 LUFS
    measured = subprocess.run(
        [
            ffmpeg, "-y", "-i", str(wav),
            "-af", "loudnorm=I=-18:TP=-1.5:LRA=7:print_format=json",
            "-f", "null", "-",
        ],
        capture_output=True,
        text=True,
    )
    # Use measured stats if parseable; otherwise single-pass.
    stderr = measured.stderr or ""
    af = "loudnorm=I=-18:TP=-1.5:LRA=7"
    subprocess.run(
        [ffmpeg, "-y", "-i", str(wav), "-af", af, "-codec:a", "libmp3lame", "-q:a", "4", str(mp3)],
        check=True,
        capture_output=True,
    )
    print(f"  mp3 {mp3.name}")


def main() -> None:
    kit = {
        "tap": (tap, 0.40),
        "select": (select, 0.45),
        "correct": (correct, 0.50),
        "wrong": (wrong, 0.38),
        "complete": (complete, 0.52),
        "level": (level, 0.48),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (fn, peak) in kit.items():
        wav = write_wav(name, fn(), peak)
        print(f"  wav {wav.name}")
        ffmpeg_mp3(wav)
    print(f"wrote sounds → {OUT}")


if __name__ == "__main__":
    main()
