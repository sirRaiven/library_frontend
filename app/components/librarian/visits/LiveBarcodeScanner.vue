<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import type {
  BarcodeFormat,
  DetectedBarcode,
  EmittedError,
} from "vue-qrcode-reader";
import {
  useBarcodeScanResult,
  type BarcodeScanResult,
} from "~/composables/useBarcodeScanResult";

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    formats?: BarcodeFormat[];
  }>(),
  {
    disabled: false,
    formats: () => ["code_128"],
  },
);

const emit = defineEmits<{
  detected: [result: BarcodeScanResult];
}>();

const QrcodeStream = defineAsyncComponent({
  loader: () =>
    import("vue-qrcode-reader").then((module) => module.QrcodeStream),
  suspensible: false,
});

type ScannerStatus =
  | "idle"
  | "starting"
  | "ready"
  | "detected"
  | "processing"
  | "error";

interface CameraItem {
  label: string;
  value: string;
}

interface CameraCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
}

const CAMERA_STORAGE_KEY = "sncbt-library-entry-camera";
const DETECTION_HOLD_MS = 900;

const open = ref(false);
const minimized = ref(false);
const panel = ref<HTMLElement | null>(null);
const status = ref<ScannerStatus>("idle");
const errorMessage = ref("");
const errorName = ref("");
const streamKey = ref(0);
const detectionPaused = ref(false);
const detectedValue = ref("");
const detectedFormat = ref("");
const cameraItems = ref<CameraItem[]>([]);
const selectedCameraId = ref("");
const torchSupported = ref(false);
const torchEnabled = ref(false);
const position = reactive({
  x: 16,
  y: 16,
});

let dragStart: {
  pointerX: number;
  pointerY: number;
  panelX: number;
  panelY: number;
} | null = null;
let detectionTimer: ReturnType<typeof setTimeout> | undefined;

const {
  createResult,
  reset: resetDetectionHistory,
  playSuccessFeedback,
} = useBarcodeScanResult({
  duplicateCooldownMs: 60_000,
});

const streamPaused = computed(
  () => props.disabled || minimized.value || detectionPaused.value,
);

const cameraConstraints = computed<MediaTrackConstraints>(() => {
  const commonConstraints: MediaTrackConstraints = {
    width: {
      ideal: 1920,
    },
    height: {
      ideal: 1080,
    },
    frameRate: {
      ideal: 30,
      max: 60,
    },
  };

  if (selectedCameraId.value) {
    return {
      ...commonConstraints,
      deviceId: {
        exact: selectedCameraId.value,
      },
    };
  }

  return {
    ...commonConstraints,
    facingMode: {
      ideal: "environment",
    },
  };
});

const panelStyle = computed(() => ({
  transform: `translate3d(${Math.round(
    position.x,
  )}px, ${Math.round(position.y)}px, 0)`,
}));

const activeCameraLabel = computed(
  () =>
    cameraItems.value.find((camera) => camera.value === selectedCameraId.value)
      ?.label ??
    (selectedCameraId.value ? "Selected camera" : "Default camera"),
);

const statusDetails = computed(() => {
  const details: Record<
    ScannerStatus,
    {
      label: string;
      description: string;
      icon: string;
      color: "neutral" | "info" | "success" | "error";
      guideClass: string;
      dotClass: string;
    }
  > = {
    idle: {
      label: "Camera stopped",
      description: "Open the camera to begin scanning.",
      icon: "i-lucide-camera-off",
      color: "neutral",
      guideClass: "border-white/75",
      dotClass: "bg-neutral-400",
    },
    starting: {
      label: "Starting camera",
      description: "Preparing the camera and barcode detector…",
      icon: "i-lucide-loader-circle",
      color: "info",
      guideClass: "border-info",
      dotClass: "bg-info",
    },
    ready: {
      label: "Ready to scan",
      description: "Place the complete barcode inside the guide.",
      icon: "i-lucide-scan-line",
      color: "info",
      guideClass: "border-success/90",
      dotClass: "bg-success",
    },
    detected: {
      label: "Barcode detected",
      description: detectedValue.value || "The barcode was read successfully.",
      icon: "i-lucide-circle-check-big",
      color: "success",
      guideClass: "border-success shadow-[0_0_34px_rgba(34,197,94,0.55)]",
      dotClass: "bg-success",
    },
    processing: {
      label: "Recording time-in",
      description: "Please wait while the entry is being saved.",
      icon: "i-lucide-loader-circle",
      color: "info",
      guideClass: "border-info/80",
      dotClass: "bg-info",
    },
    error: {
      label: "Camera unavailable",
      description: errorMessage.value || "The camera scanner could not start.",
      icon: "i-lucide-circle-alert",
      color: "error",
      guideClass: "border-error",
      dotClass: "bg-error",
    },
  };

  return details[status.value];
});

function normalizeCameraError(error: EmittedError | Error) {
  const rawMessage = String(error.message ?? "");

  if (/failed to fetch/i.test(rawMessage)) {
    return "The barcode decoder could not load its required files. Check the internet connection or Content Security Policy, then try again.";
  }

  if (/barcode.?detector|barcode detection/i.test(rawMessage)) {
    return "The barcode decoder failed to initialize. Reload the page after clearing the Nuxt and browser cache.";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow camera permission in the browser, then try again.";
    case "NotFoundError":
      return "No camera was found. Connect a webcam or choose another camera.";
    case "NotSupportedError":
    case "InsecureContextError":
      return "Camera access requires localhost or a secure HTTPS connection.";
    case "NotReadableError":
    case "AbortError":
      return "The camera is being used by another application. Close that application and try again.";
    case "OverconstrainedError":
      return "The selected camera does not support the requested settings. Choose another camera.";
    case "StreamApiNotSupportedError":
      return "This browser does not support camera streaming. Use the latest Chrome or Edge.";
    default:
      return error.message || "The camera scanner could not be started.";
  }
}

/**
 * vue-qrcode-reader calls this function for its tracking canvas.
 * Keep it independent from Vue reactive state because it can run many times per second.
 */
function paintDetectedBarcode(
  detectedCodes: DetectedBarcode[],
  context: CanvasRenderingContext2D,
) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  for (const detectedCode of detectedCodes) {
    const points = Array.from(detectedCode.cornerPoints ?? []);

    context.save();
    context.lineWidth = Math.max(3, context.canvas.width / 280);
    context.strokeStyle = "#22c55e";
    context.shadowColor = "rgba(34, 197, 94, 0.9)";
    context.shadowBlur = 14;

    if (points.length > 1) {
      context.beginPath();
      context.moveTo(points[0]!.x, points[0]!.y);

      for (const point of points.slice(1)) {
        context.lineTo(point.x, point.y);
      }

      context.closePath();
      context.stroke();
    } else if (detectedCode.boundingBox) {
      const { x, y, width, height } = detectedCode.boundingBox;
      context.strokeRect(x, y, width, height);
    }

    if (detectedCode.boundingBox) {
      const { x, y, width, height } = detectedCode.boundingBox;
      const centerY = y + height / 2;

      context.lineWidth = 2;
      context.strokeStyle = "rgba(134, 239, 172, 0.95)";
      context.beginPath();
      context.moveTo(x, centerY);
      context.lineTo(x + width, centerY);
      context.stroke();
    }

    context.restore();
  }
}

function clampPosition() {
  if (!import.meta.client || !panel.value) {
    return;
  }

  const margin = window.innerWidth < 640 ? 12 : 20;
  const rect = panel.value.getBoundingClientRect();

  position.x = Math.min(
    Math.max(position.x, margin),
    Math.max(margin, window.innerWidth - rect.width - margin),
  );
  position.y = Math.min(
    Math.max(position.y, margin),
    Math.max(margin, window.innerHeight - rect.height - margin),
  );
}

async function placePanel() {
  await nextTick();

  if (!import.meta.client || !panel.value) {
    return;
  }

  const margin = window.innerWidth < 640 ? 12 : 24;
  const rect = panel.value.getBoundingClientRect();

  position.x = Math.max(margin, window.innerWidth - rect.width - margin);
  position.y = Math.max(margin, window.innerHeight - rect.height - margin);

  clampPosition();
}

function beginDrag(event: PointerEvent) {
  if (event.button !== 0 || !panel.value) {
    return;
  }

  dragStart = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    panelX: position.x,
    panelY: position.y,
  };

  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function movePanel(event: PointerEvent) {
  if (!dragStart) {
    return;
  }

  position.x = dragStart.panelX + event.clientX - dragStart.pointerX;
  position.y = dragStart.panelY + event.clientY - dragStart.pointerY;

  clampPosition();
}

function endDrag() {
  dragStart = null;
}

async function refreshCameras() {
  if (!import.meta.client || !navigator.mediaDevices) {
    cameraItems.value = [];
    return;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === "videoinput");

  cameraItems.value = videoDevices.map((device, index) => ({
    value: device.deviceId,
    label: device.label || `Camera ${index + 1}`,
  }));

  if (
    selectedCameraId.value &&
    !cameraItems.value.some((camera) => camera.value === selectedCameraId.value)
  ) {
    selectedCameraId.value = "";
    localStorage.removeItem(CAMERA_STORAGE_KEY);
  }
}

async function handleCameraOn(
  capabilitiesPayload:
    | Partial<CameraCapabilities>
    | Promise<Partial<CameraCapabilities>>,
) {
  const capabilities = await Promise.resolve(capabilitiesPayload);

  torchSupported.value = capabilities.torch === true;

  if (!torchSupported.value) {
    torchEnabled.value = false;
  }

  errorMessage.value = "";
  errorName.value = "";
  status.value = props.disabled ? "processing" : "ready";

  await refreshCameras();
}

function handleCameraOff() {
  if (open.value && !minimized.value && status.value !== "error") {
    status.value = "starting";
  }
}

function handleCameraError(error: EmittedError | Error) {
  errorName.value = error.name || "CameraError";
  if (error.name === "OverconstrainedError" && selectedCameraId.value) {
    selectedCameraId.value = "";
    localStorage.removeItem(CAMERA_STORAGE_KEY);
    torchEnabled.value = false;
    status.value = "starting";
    streamKey.value += 1;
    return;
  }

  errorMessage.value = normalizeCameraError(error);
  status.value = "error";
  console.error("[LiveBarcodeScanner]", {
    name: error.name,
    message: error.message,
  });
}

async function handleDetectedCodes(detectedCodes: DetectedBarcode[]) {
  if (props.disabled || detectionPaused.value) {
    return;
  }

  const result = createResult(detectedCodes);

  if (!result) {
    return;
  }

  detectedValue.value = result.value;
  detectedFormat.value = result.format;
  status.value = "detected";
  detectionPaused.value = true;

  clearTimeout(detectionTimer);
  await playSuccessFeedback();
  emit("detected", result);

  detectionTimer = setTimeout(() => {
    detectionPaused.value = false;

    if (!props.disabled && open.value) {
      status.value = "ready";
    }
  }, DETECTION_HOLD_MS);
}

async function openScanner() {
  if (props.disabled) {
    return;
  }

  open.value = true;
  minimized.value = false;
  errorMessage.value = "";
  errorName.value = "";

  if (!import.meta.client) {
    status.value = "starting";
    return;
  }

  if (!window.isSecureContext) {
    errorName.value = "InsecureContextError";
    errorMessage.value =
      "Camera access is blocked on an insecure address. Open the system through localhost or HTTPS.";
    status.value = "error";
    await placePanel();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    errorName.value = "StreamApiNotSupportedError";
    errorMessage.value =
      "This browser cannot access camera streams. Update Chrome or Edge and try again.";
    status.value = "error";
    await placePanel();
    return;
  }

  status.value = "starting";
  streamKey.value += 1;

  await placePanel();
}

function closeScanner() {
  open.value = false;
  minimized.value = false;
  torchEnabled.value = false;
  detectionPaused.value = false;
  status.value = "idle";
  clearTimeout(detectionTimer);
}

async function toggleScanner() {
  if (open.value) {
    closeScanner();
  } else {
    await openScanner();
  }
}

function toggleMinimized() {
  minimized.value = !minimized.value;

  if (!minimized.value && status.value !== "error") {
    status.value = props.disabled ? "processing" : "starting";
  }

  void nextTick(clampPosition);
}

function restartScanner() {
  errorMessage.value = "";
  errorName.value = "";
  torchEnabled.value = false;
  status.value = "starting";
  streamKey.value += 1;
}

function handleCameraChange(value: string | number | undefined) {
  const deviceId = String(value ?? "");

  selectedCameraId.value = deviceId;
  torchEnabled.value = false;
  status.value = "starting";
  streamKey.value += 1;

  if (deviceId) {
    localStorage.setItem(CAMERA_STORAGE_KEY, deviceId);
  } else {
    localStorage.removeItem(CAMERA_STORAGE_KEY);
  }
}

function selectNextCamera() {
  if (cameraItems.value.length < 2) {
    return;
  }

  const currentIndex = cameraItems.value.findIndex(
    (camera) => camera.value === selectedCameraId.value,
  );
  const nextIndex =
    currentIndex < 0 ? 0 : (currentIndex + 1) % cameraItems.value.length;

  handleCameraChange(cameraItems.value[nextIndex]?.value);
}

function toggleTorch() {
  if (!torchSupported.value) {
    return;
  }

  torchEnabled.value = !torchEnabled.value;
  status.value = "starting";
}

function handleDeviceChange() {
  void refreshCameras();
}

watch(
  () => props.disabled,
  (disabled) => {
    if (!open.value || status.value === "error") {
      return;
    }

    status.value = disabled
      ? "processing"
      : detectionPaused.value
        ? "detected"
        : "ready";
  },
);

onMounted(() => {
  if (import.meta.client) {
    selectedCameraId.value = localStorage.getItem(CAMERA_STORAGE_KEY) ?? "";

    window.addEventListener("resize", clampPosition, { passive: true });
    navigator.mediaDevices?.addEventListener(
      "devicechange",
      handleDeviceChange,
    );
  }
});

onBeforeUnmount(() => {
  clearTimeout(detectionTimer);
  resetDetectionHistory();

  if (import.meta.client) {
    window.removeEventListener("resize", clampPosition);
    navigator.mediaDevices?.removeEventListener(
      "devicechange",
      handleDeviceChange,
    );
  }
});
</script>

<template>
  <div class="contents">
    <UTooltip
      :text="open ? 'Close camera scanner' : 'Open live camera scanner'"
    >
      <UButton
        type="button"
        :label="open ? 'Close Camera' : 'Camera Scanner'"
        :icon="open ? 'i-lucide-camera-off' : 'i-lucide-camera'"
        color="neutral"
        variant="outline"
        size="xl"
        :disabled="disabled"
        :loading="status === 'starting' && open"
        :aria-pressed="open"
        @click="toggleScanner"
      />
    </UTooltip>

    <ClientOnly>
      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <section
            v-if="open"
            ref="panel"
            :style="panelStyle"
            class="fixed left-0 top-0 z-[100] w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-default bg-default shadow-2xl will-change-transform sm:w-[28rem]"
            role="dialog"
            aria-label="Live barcode camera scanner"
            data-scanner-engine="vue-qrcode-reader-5.7.3"
          >
            <header
              class="flex touch-none select-none items-center justify-between gap-3 border-b border-default bg-elevated/95 px-3 py-2.5 backdrop-blur"
              @pointerdown="beginDrag"
              @pointermove="movePanel"
              @pointerup="endDrag"
              @pointercancel="endDrag"
            >
              <div class="flex min-w-0 items-center gap-2">
                <div
                  class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"
                >
                  <UIcon name="i-lucide-scan-barcode" class="size-4.5" />
                </div>

                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-highlighted">
                    Live Barcode Scanner
                  </p>
                  <p class="truncate text-xs text-muted">
                    {{ activeCameraLabel }}
                  </p>
                </div>
              </div>

              <div class="flex shrink-0 items-center gap-1" @pointerdown.stop>
                <UTooltip text="Switch camera">
                  <UButton
                    icon="i-lucide-refresh-cw"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    square
                    :disabled="cameraItems.length < 2"
                    aria-label="Switch camera"
                    @click="selectNextCamera"
                  />
                </UTooltip>

                <UTooltip
                  :text="minimized ? 'Restore camera' : 'Minimize camera'"
                >
                  <UButton
                    :icon="minimized ? 'i-lucide-maximize-2' : 'i-lucide-minus'"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    square
                    :aria-label="
                      minimized ? 'Restore camera' : 'Minimize camera'
                    "
                    @click="toggleMinimized"
                  />
                </UTooltip>

                <UTooltip text="Close camera">
                  <UButton
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    square
                    aria-label="Close camera scanner"
                    @click="closeScanner"
                  />
                </UTooltip>
              </div>
            </header>

            <div v-show="!minimized">
              <div class="relative aspect-video overflow-hidden bg-black">
                <QrcodeStream
                  :key="streamKey"
                  class="live-barcode-stream absolute inset-0 size-full"
                  :constraints="cameraConstraints"
                  :formats="formats"
                  :paused="streamPaused"
                  :torch="torchEnabled"
                  :track="paintDetectedBarcode"
                  @detect="handleDetectedCodes"
                  @camera-on="handleCameraOn"
                  @camera-off="handleCameraOff"
                  @error="handleCameraError"
                />

                <div
                  v-if="status === 'starting'"
                  class="absolute inset-0 z-30 grid place-items-center bg-black/65 text-white"
                >
                  <div class="text-center">
                    <UIcon
                      name="i-lucide-loader-circle"
                      class="mx-auto size-9 animate-spin"
                    />
                    <p class="mt-3 text-sm font-semibold">Starting camera…</p>
                  </div>
                </div>

                <div
                  v-else-if="status === 'error'"
                  class="absolute inset-0 z-30 flex items-center justify-center bg-black/85 px-6 text-center text-white"
                >
                  <div>
                    <UIcon
                      name="i-lucide-circle-alert"
                      class="mx-auto size-10 text-error"
                    />
                    <p class="mt-3 text-sm font-semibold">
                      {{ errorMessage }}
                    </p>
                    <p
                      v-if="errorName"
                      class="mt-2 font-mono text-[10px] text-white/55"
                    >
                      {{ errorName }}
                    </p>
                    <UButton
                      class="mt-4"
                      label="Try Again"
                      icon="i-lucide-refresh-cw"
                      color="neutral"
                      size="sm"
                      @click="restartScanner"
                    />
                  </div>
                </div>

                <template v-else>
                  <div
                    class="pointer-events-none absolute left-3 top-3 z-20"
                    aria-live="polite"
                  >
                    <UBadge
                      :color="statusDetails.color"
                      variant="solid"
                      size="lg"
                      class="gap-1.5 shadow-lg"
                    >
                      <UIcon
                        :name="statusDetails.icon"
                        :class="{
                          'animate-spin': status === 'processing',
                        }"
                        class="size-3.5"
                      />
                      {{ statusDetails.label }}
                    </UBadge>
                  </div>

                  <div
                    :class="statusDetails.guideClass"
                    class="pointer-events-none absolute inset-x-[5%] top-1/2 z-20 h-[48%] -translate-y-1/2 rounded-xl border-2 transition-[border-color,box-shadow] duration-150"
                  >
                    <span class="scanner-corner scanner-corner-tl" />
                    <span class="scanner-corner scanner-corner-tr" />
                    <span class="scanner-corner scanner-corner-bl" />
                    <span class="scanner-corner scanner-corner-br" />
                    <span v-if="status === 'ready'" class="scanner-line" />
                  </div>

                  <Transition
                    enter-active-class="transition duration-150"
                    enter-from-class="scale-90 opacity-0"
                    enter-to-class="scale-100 opacity-100"
                    leave-active-class="transition duration-150"
                    leave-from-class="scale-100 opacity-100"
                    leave-to-class="scale-95 opacity-0"
                  >
                    <div
                      v-if="status === 'detected'"
                      class="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-success/20 backdrop-blur-[1px]"
                    >
                      <div
                        class="max-w-[85%] rounded-2xl border border-success/60 bg-black/80 px-5 py-4 text-center text-white shadow-2xl"
                      >
                        <UIcon
                          name="i-lucide-circle-check-big"
                          class="mx-auto size-10 text-success"
                        />
                        <p class="mt-2 text-sm font-semibold">
                          Barcode detected
                        </p>
                        <p
                          class="mt-1 break-all font-mono text-base font-bold text-success-300"
                        >
                          {{ detectedValue }}
                        </p>
                        <p class="mt-1 text-[11px] text-white/70">
                          {{
                            detectedFormat.replaceAll("_", " ").toUpperCase()
                          }}
                        </p>
                      </div>
                    </div>
                  </Transition>

                  <div
                    class="pointer-events-none absolute inset-x-3 bottom-3 z-20 rounded-xl bg-black/65 px-3 py-2 text-center text-xs font-medium text-white backdrop-blur-sm"
                  >
                    {{ statusDetails.description }}
                  </div>
                </template>
              </div>

              <div
                class="space-y-3 border-t border-default bg-default px-3 py-3"
              >
                <div class="flex items-center gap-2">
                  <USelect
                    v-if="cameraItems.length"
                    :model-value="selectedCameraId"
                    :items="cameraItems"
                    value-key="value"
                    label-key="label"
                    size="sm"
                    class="min-w-0 flex-1"
                    aria-label="Select camera"
                    @update:model-value="handleCameraChange"
                  />

                  <div v-else class="min-w-0 flex-1 text-xs text-muted">
                    {{ activeCameraLabel }}
                  </div>

                  <UTooltip text="Refresh camera list">
                    <UButton
                      icon="i-lucide-refresh-cw"
                      color="neutral"
                      variant="soft"
                      size="sm"
                      square
                      aria-label="Refresh available cameras"
                      @click="refreshCameras"
                    />
                  </UTooltip>

                  <UTooltip
                    v-if="torchSupported"
                    :text="
                      torchEnabled
                        ? 'Turn off flashlight'
                        : 'Turn on flashlight'
                    "
                  >
                    <UButton
                      :icon="
                        torchEnabled
                          ? 'i-lucide-flashlight-off'
                          : 'i-lucide-flashlight'
                      "
                      :color="torchEnabled ? 'warning' : 'neutral'"
                      variant="soft"
                      size="sm"
                      square
                      :aria-pressed="torchEnabled"
                      @click="toggleTorch"
                    />
                  </UTooltip>
                </div>

                <div class="flex items-center justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-2">
                    <span class="relative flex size-2.5 shrink-0">
                      <span
                        v-if="status === 'ready'"
                        :class="statusDetails.dotClass"
                        class="absolute inline-flex size-full animate-ping rounded-full opacity-55"
                      />
                      <span
                        :class="statusDetails.dotClass"
                        class="relative inline-flex size-2.5 rounded-full"
                      />
                    </span>
                    <p class="truncate text-xs text-muted">
                      {{ statusDetails.label }}
                    </p>
                  </div>

                  <UBadge color="neutral" variant="soft" size="sm">
                    CODE 128
                  </UBadge>
                </div>
              </div>
            </div>
          </section>
        </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<style scoped>
.live-barcode-stream {
  background: #000;
}

.live-barcode-stream :deep(video),
.live-barcode-stream :deep(canvas) {
  position: absolute !important;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}

.live-barcode-stream :deep(video) {
  z-index: 1;
}

.live-barcode-stream :deep(canvas) {
  z-index: 2;
  pointer-events: none;
}

.scanner-corner {
  position: absolute;
  width: 1.4rem;
  height: 1.4rem;
  color: #22c55e;
}

.scanner-corner-tl {
  left: -0.18rem;
  top: -0.18rem;
  border-left: 0.24rem solid;
  border-top: 0.24rem solid;
  border-top-left-radius: 0.55rem;
}

.scanner-corner-tr {
  right: -0.18rem;
  top: -0.18rem;
  border-right: 0.24rem solid;
  border-top: 0.24rem solid;
  border-top-right-radius: 0.55rem;
}

.scanner-corner-bl {
  bottom: -0.18rem;
  left: -0.18rem;
  border-bottom: 0.24rem solid;
  border-left: 0.24rem solid;
  border-bottom-left-radius: 0.55rem;
}

.scanner-corner-br {
  right: -0.18rem;
  bottom: -0.18rem;
  border-right: 0.24rem solid;
  border-bottom: 0.24rem solid;
  border-bottom-right-radius: 0.55rem;
}

.scanner-line {
  position: absolute;
  left: 3%;
  right: 3%;
  top: 8%;
  height: 0.16rem;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    #22c55e 18%,
    #86efac 50%,
    #22c55e 82%,
    transparent
  );
  box-shadow: 0 0 14px rgb(34 197 94 / 85%);
  animation: scanner-sweep 1.15s ease-in-out infinite alternate;
}

@keyframes scanner-sweep {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(7.2rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .scanner-line {
    top: 50%;
    animation: none;
  }
}
</style>
