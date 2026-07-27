import { ref } from "vue";
import type {
  BarcodeFormat,
  DetectedBarcode,
} from "vue-qrcode-reader";

export interface BarcodeScanResult {
  value: string;
  format: BarcodeFormat | string;
  detectedAt: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  cornerPoints: Array<{
    x: number;
    y: number;
  }>;
}

interface UseBarcodeScanResultOptions {
  duplicateCooldownMs?: number;
}

function normalizeBarcodeValue(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

function normalizeFormat(format: unknown) {
  return String(format ?? "unknown")
    .trim()
    .toLowerCase();
}

export function useBarcodeScanResult(
  options: UseBarcodeScanResultOptions = {},
) {
  const duplicateCooldownMs =
    options.duplicateCooldownMs ?? 60_000;

  const lastDetectedValue = ref("");
  const lastDetectedFormat = ref("");
  const lastDetectedAt = ref<number | null>(null);
  const recentValues = new Map<string, number>();

  function removeExpiredValues(now = Date.now()) {
    for (const [value, detectedAt] of recentValues) {
      if (now - detectedAt >= duplicateCooldownMs) {
        recentValues.delete(value);
      }
    }
  }

  function createResult(
    detectedCodes: DetectedBarcode[],
  ): BarcodeScanResult | null {
    const now = Date.now();
    removeExpiredValues(now);

    const detectedCode = detectedCodes.find((code) =>
      normalizeBarcodeValue(code.rawValue),
    );

    if (!detectedCode) {
      return null;
    }

    const value = normalizeBarcodeValue(
      detectedCode.rawValue,
    );
    const format = normalizeFormat(
      detectedCode.format,
    );
    const previousDetection = recentValues.get(value);

    if (
      previousDetection !== undefined &&
      now - previousDetection < duplicateCooldownMs
    ) {
      return null;
    }

    recentValues.set(value, now);
    lastDetectedValue.value = value;
    lastDetectedFormat.value = format;
    lastDetectedAt.value = now;

    const boundingBox = detectedCode.boundingBox
      ? {
          x: detectedCode.boundingBox.x,
          y: detectedCode.boundingBox.y,
          width: detectedCode.boundingBox.width,
          height: detectedCode.boundingBox.height,
        }
      : null;

    const cornerPoints = Array.from(
      detectedCode.cornerPoints ?? [],
      (point) => ({
        x: point.x,
        y: point.y,
      }),
    );

    return {
      value,
      format,
      detectedAt: now,
      boundingBox,
      cornerPoints,
    };
  }

  function clearRecentValue(value: string) {
    recentValues.delete(normalizeBarcodeValue(value));
  }

  function reset() {
    recentValues.clear();
    lastDetectedValue.value = "";
    lastDetectedFormat.value = "";
    lastDetectedAt.value = null;
  }

  async function playSuccessFeedback() {
    if (!import.meta.client) {
      return;
    }

    navigator.vibrate?.(80);

    try {
      const AudioContextConstructor =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (!AudioContextConstructor) {
        return;
      }

      const context = new AudioContextConstructor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        880,
        context.currentTime,
      );
      gain.gain.setValueAtTime(
        0.0001,
        context.currentTime,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.14,
        context.currentTime + 0.01,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        context.currentTime + 0.12,
      );

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.13);

      window.setTimeout(() => {
        void context.close();
      }, 220);
    } catch {
      // Audio feedback is optional and must not block scanning.
    }
  }

  return {
    lastDetectedValue,
    lastDetectedFormat,
    lastDetectedAt,
    createResult,
    clearRecentValue,
    reset,
    playSuccessFeedback,
  };
}
