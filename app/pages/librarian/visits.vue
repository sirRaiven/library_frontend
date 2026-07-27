
<script setup lang="ts">
import type {
  LibraryVisitMemberType,
  LibraryVisitRecord,
  LibraryVisitSummary,
} from "~/composables/useLibraryVisits";


type CameraFacingMode =
  | "environment"
  | "user";

interface CameraDetectedBarcode {
  rawValue: string;
  format?: string;
}

interface CameraBarcodeDetector {
  detect(
    source: CanvasImageSource,
  ): Promise<
    CameraDetectedBarcode[]
  >;
}

interface CameraBarcodeDetectorConstructor {
  new (
    options?: {
      formats?: string[];
    },
  ): CameraBarcodeDetector;
  getSupportedFormats?: () =>
    Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?:
      CameraBarcodeDetectorConstructor;
  }
}

definePageMeta({
  layout: "librarian",
  title: "Library Entry Log",
});

const visitsApi =
  useLibraryVisits();
const auth = useAuth();
const toast = useToast();

const scanInputWrapper =
  ref<HTMLElement | null>(
    null,
  );
const barcode = ref("");
const scanning = ref(false);
const loading = ref(false);

const cameraPanel =
  ref<HTMLElement | null>(
    null,
  );
const cameraVideo =
  ref<HTMLVideoElement | null>(
    null,
  );
const cameraOpen = ref(false);
const cameraMinimized =
  ref(false);
const cameraLoading =
  ref(false);
const cameraError = ref("");
const cameraFacingMode =
  ref<CameraFacingMode>(
    "environment",
  );
const cameraLastBarcode =
  ref("");
const cameraPosition =
  reactive({
    x: 16,
    y: 16,
  });

let cameraStream:
  MediaStream | null = null;
let cameraDetector:
  CameraBarcodeDetector | null =
    null;
let cameraAnimationFrame:
  number | null = null;
let cameraLastFrameAt = 0;
let cameraEmptyFrames = 0;
let cameraLastDetectedValue = "";
let cameraStartSequence = 0;
let cameraDragStart:
  | {
      pointerX: number;
      pointerY: number;
      panelX: number;
      panelY: number;
    }
  | null = null;

const CAMERA_FRAME_INTERVAL =
  180;
const CAMERA_CLEAR_FRAMES = 5;

const preferredBarcodeFormats = [
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "ean_13",
  "ean_8",
  "itf",
  "upc_a",
  "upc_e",
  "qr_code",
  "data_matrix",
];

const cameraPanelStyle =
  computed(() => ({
    transform: `translate3d(${Math.round(
      cameraPosition.x,
    )}px, ${Math.round(
      cameraPosition.y,
    )}px, 0)`,
  }));

const cameraStatus =
  computed(() => {
    if (cameraError.value) {
      return "Camera unavailable";
    }

    if (cameraLoading.value) {
      return "Starting camera…";
    }

    if (
      scanning.value &&
      cameraLastBarcode.value
    ) {
      return "Recording detected barcode…";
    }

    return "Point the camera at a barcode";
  });
const search = ref("");
const memberType =
  ref<
    | LibraryVisitMemberType
    | "all"
  >("all");
const page = ref(1);
const pageSize = 12;

function cameraErrorMessage(
  error: unknown,
) {
  if (
    error instanceof DOMException
  ) {
    if (
      error.name ===
        "NotAllowedError" ||
      error.name ===
        "SecurityError"
    ) {
      return "Camera access was blocked. Allow camera permission in the browser, then try again.";
    }

    if (
      error.name ===
      "NotFoundError"
    ) {
      return "No camera was found on this device.";
    }

    if (
      error.name ===
        "NotReadableError" ||
      error.name ===
        "AbortError"
    ) {
      return "The camera is already being used by another application.";
    }

    if (
      error.name ===
      "OverconstrainedError"
    ) {
      return "The selected camera is not available. Try switching cameras.";
    }
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "The camera could not be started.";
}

function stopCameraStream() {
  if (
    cameraAnimationFrame !==
    null
  ) {
    cancelAnimationFrame(
      cameraAnimationFrame,
    );
    cameraAnimationFrame =
      null;
  }

  for (const track of
    cameraStream?.getTracks() ??
    []) {
    track.stop();
  }

  cameraStream = null;
  cameraDetector = null;

  if (cameraVideo.value) {
    cameraVideo.value.srcObject =
      null;
  }
}

function closeCamera() {
  cameraStartSequence += 1;
  stopCameraStream();

  cameraOpen.value = false;
  cameraMinimized.value =
    false;
  cameraLoading.value = false;
  cameraError.value = "";
  cameraLastBarcode.value =
    "";
  cameraLastDetectedValue = "";
  cameraEmptyFrames = 0;
}

function clampCameraPosition() {
  if (
    !import.meta.client ||
    !cameraPanel.value
  ) {
    return;
  }

  const margin = 12;
  const rect =
    cameraPanel.value
      .getBoundingClientRect();
  const maxX = Math.max(
    margin,
    window.innerWidth -
      rect.width -
      margin,
  );
  const maxY = Math.max(
    margin,
    window.innerHeight -
      rect.height -
      margin,
  );

  cameraPosition.x =
    Math.min(
      Math.max(
        cameraPosition.x,
        margin,
      ),
      maxX,
    );
  cameraPosition.y =
    Math.min(
      Math.max(
        cameraPosition.y,
        margin,
      ),
      maxY,
    );
}

async function placeCameraPanel() {
  await nextTick();

  if (
    !cameraPanel.value ||
    !import.meta.client
  ) {
    return;
  }

  const margin =
    window.innerWidth < 640
      ? 12
      : 24;
  const rect =
    cameraPanel.value
      .getBoundingClientRect();

  cameraPosition.x =
    Math.max(
      margin,
      window.innerWidth -
        rect.width -
        margin,
    );
  cameraPosition.y =
    Math.max(
      margin,
      window.innerHeight -
        rect.height -
        margin,
    );

  clampCameraPosition();
}

function beginCameraDrag(
  event: PointerEvent,
) {
  if (
    event.button !== 0 ||
    !cameraPanel.value
  ) {
    return;
  }

  cameraDragStart = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    panelX:
      cameraPosition.x,
    panelY:
      cameraPosition.y,
  };

  (
    event.currentTarget as
      HTMLElement
  ).setPointerCapture?.(
    event.pointerId,
  );
}

function moveCameraPanel(
  event: PointerEvent,
) {
  if (!cameraDragStart) {
    return;
  }

  cameraPosition.x =
    cameraDragStart.panelX +
    event.clientX -
    cameraDragStart.pointerX;
  cameraPosition.y =
    cameraDragStart.panelY +
    event.clientY -
    cameraDragStart.pointerY;

  clampCameraPosition();
}

function endCameraDrag() {
  cameraDragStart = null;
}

async function createCameraDetector() {
  const Constructor =
    window.BarcodeDetector;

  if (!Constructor) {
    throw new Error(
      "Live barcode detection is not supported by this browser. Use the latest Chrome or Edge, or continue with the hardware scanner.",
    );
  }

  const supportedFormats =
    await Constructor
      .getSupportedFormats?.();

  const formats =
    supportedFormats?.length
      ? preferredBarcodeFormats.filter(
          (format) =>
            supportedFormats.includes(
              format,
            ),
        )
      : preferredBarcodeFormats;

  return formats.length
    ? new Constructor({
        formats,
      })
    : new Constructor();
}

async function detectCameraBarcode(
  frameTime: number,
) {
  if (
    !cameraOpen.value ||
    !cameraDetector ||
    !cameraVideo.value
  ) {
    return;
  }

  if (
    frameTime -
      cameraLastFrameAt <
    CAMERA_FRAME_INTERVAL
  ) {
    cameraAnimationFrame =
      requestAnimationFrame(
        detectCameraBarcode,
      );
    return;
  }

  cameraLastFrameAt =
    frameTime;

  const video =
    cameraVideo.value;

  if (
    video.readyState < 2 ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    cameraAnimationFrame =
      requestAnimationFrame(
        detectCameraBarcode,
      );
    return;
  }

  try {
    const detections =
      await cameraDetector.detect(
        video,
      );
    const detectedValue =
      detections
        .map((item) =>
          item.rawValue?.trim(),
        )
        .find(Boolean);

    if (detectedValue) {
      cameraEmptyFrames = 0;

      if (
        detectedValue !==
          cameraLastDetectedValue &&
        !scanning.value
      ) {
        cameraLastDetectedValue =
          detectedValue;
        cameraLastBarcode.value =
          detectedValue;
        barcode.value =
          detectedValue;

        await recordTimeIn();
      }
    } else {
      cameraEmptyFrames += 1;

      if (
        cameraEmptyFrames >=
        CAMERA_CLEAR_FRAMES
      ) {
        cameraLastDetectedValue =
          "";
        cameraEmptyFrames = 0;
      }
    }
  } catch (error) {
    // A single unreadable frame is normal.
    // Keep scanning unless the camera
    // itself has been closed.
    if (!cameraOpen.value) {
      return;
    }

    console.debug(
      "Camera barcode frame was not readable:",
      error,
    );
  }

  if (cameraOpen.value) {
    cameraAnimationFrame =
      requestAnimationFrame(
        detectCameraBarcode,
      );
  }
}

async function startCamera() {
  if (!import.meta.client) {
    return;
  }

  const initialMargin =
    window.innerWidth < 640
      ? 12
      : 24;
  const initialWidth =
    Math.min(
      384,
      window.innerWidth -
        initialMargin * 2,
    );

  cameraPosition.x =
    Math.max(
      initialMargin,
      window.innerWidth -
        initialWidth -
        initialMargin,
    );
  cameraPosition.y =
    Math.max(
      initialMargin,
      window.innerHeight -
        430 -
        initialMargin,
    );

  cameraOpen.value = true;
  cameraMinimized.value =
    false;
  cameraLoading.value = true;
  cameraError.value = "";
  cameraLastBarcode.value =
    "";

  const startSequence =
    ++cameraStartSequence;

  stopCameraStream();
  await placeCameraPanel();

  try {
    if (
      !window.isSecureContext ||
      !navigator.mediaDevices
        ?.getUserMedia
    ) {
      throw new Error(
        "Camera access requires HTTPS or localhost.",
      );
    }

    cameraDetector =
      await createCameraDetector();

    cameraStream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio: false,
          video: {
            facingMode: {
              ideal:
                cameraFacingMode.value,
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
        },
      );

    if (
      startSequence !==
        cameraStartSequence ||
      !cameraOpen.value
    ) {
      stopCameraStream();
      return;
    }

    await nextTick();

    if (!cameraVideo.value) {
      throw new Error(
        "The camera preview could not be prepared.",
      );
    }

    cameraVideo.value.srcObject =
      cameraStream;
    await cameraVideo.value.play();

    cameraLoading.value = false;
    cameraLastFrameAt = 0;
    cameraEmptyFrames = 0;
    cameraAnimationFrame =
      requestAnimationFrame(
        detectCameraBarcode,
      );

    await placeCameraPanel();
  } catch (error) {
    stopCameraStream();
    cameraLoading.value = false;
    cameraError.value =
      cameraErrorMessage(error);
  }
}

async function toggleCamera() {
  if (cameraOpen.value) {
    closeCamera();
    return;
  }

  await startCamera();
}

async function switchCamera() {
  cameraFacingMode.value =
    cameraFacingMode.value ===
    "environment"
      ? "user"
      : "environment";

  await startCamera();
}

function toggleCameraMinimized() {
  cameraMinimized.value =
    !cameraMinimized.value;

  nextTick(() => {
    clampCameraPosition();
  });
}

function philippineDate(
  value = new Date(),
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    )
      .formatToParts(value)
      .reduce<
        Record<string, string>
      >(
        (result, part) => {
          result[part.type] =
            part.value;
          return result;
        },
        {},
      );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

const fromDate =
  ref(philippineDate());
const toDate =
  ref(philippineDate());

const recentVisits =
  ref<LibraryVisitRecord[]>(
    [],
  );
const lastScan =
  ref<LibraryVisitRecord | null>(
    null,
  );
const summary =
  ref<LibraryVisitSummary>({
    totalVisits: 0,
    studentVisits: 0,
    facultyVisits: 0,
    uniqueVisitors: 0,
    busiestHour: null,
    firstEntryAt: null,
    latestEntryAt: null,
  });

const pagination = reactive({
  page: 1,
  pageSize,
  pageCount: 1,
  total: 0,
});

const memberTypeItems = [
  {
    label:
      "All Member Types",
    value: "all",
  },
  {
    label: "Students",
    value: "Student",
  },
  {
    label: "Faculty",
    value: "Faculty",
  },
];

const columns = [
  {
    id: "time",
    header: "Time In",
  },
  {
    id: "member",
    header: "Member",
  },
  {
    id: "memberType",
    header: "Type",
  },
  {
    id: "programDepartment",
    header:
      "Program / Department",
  },
  {
    accessorKey: "barcode",
    header: "Barcode",
  },
  {
    accessorKey: "recordedBy",
    header: "Recorded By",
  },
];

const summaryCards = computed(
  () => [
    {
      label:
        "Entries in Period",
      value:
        summary.value
          .totalVisits,
      icon:
        "i-lucide-log-in",
      description:
        "Recorded time-ins",
    },
    {
      label:
        "Student Visits",
      value:
        summary.value
          .studentVisits,
      icon:
        "i-lucide-graduation-cap",
      description:
        "Student card scans",
    },
    {
      label:
        "Faculty Visits",
      value:
        summary.value
          .facultyVisits,
      icon:
        "i-lucide-briefcase-business",
      description:
        "Faculty ID scans",
    },
    {
      label:
        "Unique Visitors",
      value:
        summary.value
          .uniqueVisitors,
      icon:
        "i-lucide-users-round",
      description:
        summary.value
          .busiestHour
          ? `Busiest hour: ${summary.value.busiestHour}`
          : "No activity yet",
    },
  ],
);

function focusScanner() {
  nextTick(() => {
    const input =
      scanInputWrapper.value
        ?.querySelector(
          "input",
        );

    if (
      !(input instanceof
        HTMLInputElement)
    ) {
      return;
    }

    input.focus();
    input.select();
  });
}

function formatTime(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        timeZone:
          "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      },
    )
    .format(
      new Date(value),
    );
}

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  return new Intl
    .DateTimeFormat(
      "en-PH",
      {
        timeZone:
          "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "medium",
      },
    )
    .format(
      new Date(value),
    );
}

function memberInitials(
  record: LibraryVisitRecord,
) {
  return record.memberName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0),
    )
    .join("")
    .toUpperCase();
}

async function loadVisits() {
  loading.value = true;

  try {
    const response =
      await visitsApi.list({
        from:
          fromDate.value,
        to:
          toDate.value,
        memberType:
          memberType.value,
        search:
          search.value,
        page: page.value,
        pageSize,
      });

    recentVisits.value =
      response.data;

    Object.assign(
      pagination,
      response.meta
        .pagination,
    );

    summary.value =
      response.meta.summary;
  } catch (error) {
    toast.add({
      title:
        "Entry records could not be loaded",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

async function recordTimeIn() {
  const value =
    barcode.value.trim();

  if (!value) {
    focusScanner();
    return;
  }

  scanning.value = true;

  try {
    const record =
      await visitsApi
        .timeIn(value);

    lastScan.value =
      record;
    barcode.value = "";

    toast.add({
      title:
        record.duplicate
          ? "Member already timed in"
          : "Library entry recorded",
      description:
        record.duplicate
          ? `${record.memberName} was already recorded at ${formatTime(
              record.timeIn,
            )}.`
          : `${record.memberName} timed in at ${formatTime(
              record.timeIn,
            )}.`,
      color:
        record.duplicate
          ? "warning"
          : "success",
      icon:
        record.duplicate
          ? "i-lucide-copy-check"
          : "i-lucide-circle-check",
    });

    page.value = 1;
    await loadVisits();
  } catch (error) {
    lastScan.value =
      null;

    toast.add({
      title:
        "Time-in was not recorded",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    scanning.value = false;
    focusScanner();
  }
}

function resetToday() {
  const today =
    philippineDate();

  fromDate.value =
    today;
  toDate.value =
    today;
  memberType.value =
    "all";
  search.value = "";
  page.value = 1;

  void loadVisits();
}

let searchTimer:
  ReturnType<
    typeof setTimeout
  > | undefined;

watch(search, () => {
  clearTimeout(
    searchTimer,
  );

  searchTimer =
    setTimeout(() => {
      page.value = 1;
      void loadVisits();
    }, 350);
});

watch(
  [
    fromDate,
    toDate,
    memberType,
    page,
  ],
  () => {
    void loadVisits();
  },
);

function handleVisibilityChange() {
  if (
    document.hidden &&
    cameraOpen.value
  ) {
    // Keep the preview open, but pause
    // scanning work while the page is
    // not visible.
    if (
      cameraAnimationFrame !==
      null
    ) {
      cancelAnimationFrame(
        cameraAnimationFrame,
      );
      cameraAnimationFrame =
        null;
    }
    return;
  }

  if (
    !document.hidden &&
    cameraOpen.value &&
    cameraDetector &&
    cameraAnimationFrame ===
      null
  ) {
    cameraAnimationFrame =
      requestAnimationFrame(
        detectCameraBarcode,
      );
  }
}

onMounted(() => {
  window.addEventListener(
    "pointermove",
    moveCameraPanel,
  );
  window.addEventListener(
    "pointerup",
    endCameraDrag,
  );
  window.addEventListener(
    "resize",
    clampCameraPosition,
    {
      passive: true,
    },
  );
  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange,
  );

  void loadVisits();
  focusScanner();
});

onBeforeUnmount(() => {
  clearTimeout(searchTimer);
  closeCamera();

  window.removeEventListener(
    "pointermove",
    moveCameraPanel,
  );
  window.removeEventListener(
    "pointerup",
    endCameraDrag,
  );
  window.removeEventListener(
    "resize",
    clampCameraPosition,
  );
  document.removeEventListener(
    "visibilitychange",
    handleVisibilityChange,
  );
});
</script>

<template>
  <UContainer
    class="py-6 sm:py-8"
  >
    <div
      class="mx-auto max-w-[1500px] space-y-6"
    >
      <header
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div
          class="flex items-start gap-3"
        >
          <div
            class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success"
          >
            <UIcon
              name="i-lucide-scan-line"
              class="size-6"
            />
          </div>

          <div>
            <div
              class="flex flex-wrap items-center gap-2"
            >
              <h1
                class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
              >
                Library Entry Log
              </h1>

              <UBadge
                color="success"
                variant="soft"
              >
                Time-in only
              </UBadge>
            </div>

            <p
              class="mt-1 max-w-3xl text-sm leading-relaxed text-muted"
            >
              Students scan their Library Card barcode and Faculty scan the barcode on their institutional ID. Each accepted scan records one Library visit; no time-out is required.
            </p>
          </div>
        </div>

        <UButton
          label="Open Visitor Reports"
          icon="i-lucide-file-chart-column"
          color="neutral"
          variant="outline"
          to="/librarian/reports"
        />
      </header>

      <UCard
        class="overflow-hidden border-success/30"
      >
        <template #header>
          <div
            class="flex items-center gap-3"
          >
            <div
              class="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success"
            >
              <UIcon
                name="i-lucide-scan-barcode"
                class="size-5"
              />
            </div>

            <div>
              <h2
                class="font-semibold text-highlighted"
              >
                Scan Member Card
              </h2>

              <p
                class="text-sm text-muted"
              >
                Hardware scanners normally submit by pressing Enter. The field automatically refocuses after every scan.
              </p>
            </div>
          </div>
        </template>

        <form
          class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          @submit.prevent="
            recordTimeIn
          "
        >
          <div
            ref="scanInputWrapper"
            class="w-full"
          >
            <UInput
              v-model="barcode"
              icon="i-lucide-scan-barcode"
              placeholder="Scan Student Library Card or Faculty ID barcode"
              autocomplete="off"
              size="xl"
              class="w-full"
              :disabled="scanning"
            />
          </div>

          <UTooltip
            :text="
              cameraOpen
                ? 'Close camera scanner'
                : 'Open camera barcode scanner'
            "
          >
            <UButton
              type="button"
              :label="
                cameraOpen
                  ? 'Close Camera'
                  : 'Camera Scanner'
              "
              :icon="
                cameraOpen
                  ? 'i-lucide-camera-off'
                  : 'i-lucide-camera'
              "
              color="neutral"
              variant="outline"
              size="xl"
              :loading="
                cameraLoading
              "
              :aria-pressed="
                cameraOpen
              "
              @click="
                toggleCamera
              "
            />
          </UTooltip>

          <UButton
            type="submit"
            label="Record Time-In"
            icon="i-lucide-log-in"
            color="success"
            size="xl"
            :loading="scanning"
          />
        </form>

        <UAlert
          class="mt-4"
          color="info"
          variant="soft"
          icon="i-lucide-shield-check"
          title="Registered members only"
          description="Students must have an Active profile and an active semester membership. Faculty must have an Active Faculty profile. Immediate duplicate scans are ignored for 60 seconds."
        />
      </UCard>

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
              v-if="cameraOpen"
              ref="cameraPanel"
              :style="
                cameraPanelStyle
              "
              class="fixed left-0 top-0 z-[100] w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-default bg-default shadow-2xl will-change-transform sm:w-96"
              role="dialog"
              aria-label="Live barcode camera scanner"
            >
              <header
                class="flex touch-none select-none items-center justify-between gap-3 border-b border-default bg-elevated/95 px-3 py-2.5 backdrop-blur"
                @pointerdown="
                  beginCameraDrag
                "
              >
                <div
                  class="flex min-w-0 items-center gap-2"
                >
                  <div
                    class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"
                  >
                    <UIcon
                      name="i-lucide-scan-barcode"
                      class="size-4.5"
                    />
                  </div>

                  <div
                    class="min-w-0"
                  >
                    <p
                      class="truncate text-sm font-semibold text-highlighted"
                    >
                      Live Barcode Scanner
                    </p>

                    <p
                      class="truncate text-xs text-muted"
                    >
                      {{
                        cameraStatus
                      }}
                    </p>
                  </div>
                </div>

                <div
                  class="flex shrink-0 items-center gap-1"
                  @pointerdown.stop
                >
                  <UTooltip
                    text="Switch camera"
                  >
                    <UButton
                      icon="i-lucide-refresh-cw"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      :disabled="
                        cameraLoading
                      "
                      aria-label="Switch between front and rear camera"
                      @click="
                        switchCamera
                      "
                    />
                  </UTooltip>

                  <UTooltip
                    :text="
                      cameraMinimized
                        ? 'Restore camera'
                        : 'Minimize camera'
                    "
                  >
                    <UButton
                      :icon="
                        cameraMinimized
                          ? 'i-lucide-maximize-2'
                          : 'i-lucide-minus'
                      "
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      :aria-label="
                        cameraMinimized
                          ? 'Restore camera preview'
                          : 'Minimize camera preview'
                      "
                      @click="
                        toggleCameraMinimized
                      "
                    />
                  </UTooltip>

                  <UTooltip
                    text="Close camera"
                  >
                    <UButton
                      icon="i-lucide-x"
                      color="neutral"
                      variant="ghost"
                      size="sm"
                      square
                      aria-label="Close camera scanner"
                      @click="
                        closeCamera
                      "
                    />
                  </UTooltip>
                </div>
              </header>

              <div
                v-show="
                  !cameraMinimized
                "
              >
                <div
                  class="relative aspect-[4/3] overflow-hidden bg-black"
                >
                  <video
                    ref="cameraVideo"
                    autoplay
                    muted
                    playsinline
                    class="size-full object-cover"
                  />

                  <div
                    v-if="
                      cameraLoading
                    "
                    class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white"
                  >
                    <UIcon
                      name="i-lucide-loader-circle"
                      class="size-8 animate-spin"
                    />

                    <p
                      class="text-sm font-medium"
                    >
                      Starting camera…
                    </p>
                  </div>

                  <div
                    v-else-if="
                      cameraError
                    "
                    class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center text-white"
                  >
                    <UIcon
                      name="i-lucide-camera-off"
                      class="size-9"
                    />

                    <p
                      class="text-sm font-medium"
                    >
                      {{
                        cameraError
                      }}
                    </p>

                    <UButton
                      label="Try Again"
                      icon="i-lucide-refresh-cw"
                      color="neutral"
                      variant="solid"
                      size="sm"
                      @click="
                        startCamera
                      "
                    />
                  </div>

                  <template
                    v-else
                  >
                    <div
                      class="pointer-events-none absolute inset-x-[12%] top-1/2 h-28 -translate-y-1/2 rounded-xl border-2 border-success shadow-[0_0_0_999px_rgba(0,0,0,0.35)]"
                    />

                    <div
                      class="pointer-events-none absolute inset-x-[15%] top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-success"
                    />

                    <p
                      class="pointer-events-none absolute inset-x-4 bottom-3 rounded-lg bg-black/60 px-3 py-2 text-center text-xs font-medium text-white backdrop-blur-sm"
                    >
                      Keep the barcode inside the guide
                    </p>
                  </template>
                </div>

                <footer
                  class="flex items-center justify-between gap-3 border-t border-default bg-default px-3 py-2.5"
                >
                  <div
                    class="flex min-w-0 items-center gap-2"
                  >
                    <span
                      class="relative flex size-2.5 shrink-0"
                    >
                      <span
                        v-if="
                          !cameraError
                        "
                        class="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60"
                      />

                      <span
                        :class="
                          cameraError
                            ? 'bg-error'
                            : 'bg-success'
                        "
                        class="relative inline-flex size-2.5 rounded-full"
                      />
                    </span>

                    <p
                      class="truncate text-xs text-muted"
                    >
                      {{
                        cameraLastBarcode
                          ? `Detected: ${cameraLastBarcode}`
                          : cameraStatus
                      }}
                    </p>
                  </div>

                  <UBadge
                    color="neutral"
                    variant="soft"
                    size="sm"
                  >
                    {{
                      cameraFacingMode ===
                      "environment"
                        ? "Rear camera"
                        : "Front camera"
                    }}
                  </UBadge>
                </footer>
              </div>
            </section>
          </Transition>
        </Teleport>
      </ClientOnly>

      <Transition
        enter-active-class="transition duration-200"
        enter-from-class="translate-y-2 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
      >
        <UCard
          v-if="lastScan"
          :class="
            lastScan.duplicate
              ? 'border-warning/40'
              : 'border-success/40'
          "
        >
          <div
            class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
          >
            <div
              class="flex min-w-0 items-center gap-4"
            >
              <UAvatar
                :src="
                  lastScan.member
                    ?.photoUrl ??
                  undefined
                "
                :text="
                  memberInitials(
                    lastScan,
                  )
                "
                :alt="
                  lastScan.memberName
                "
                size="2xl"
              />

              <div
                class="min-w-0"
              >
                <div
                  class="flex flex-wrap items-center gap-2"
                >
                  <h2
                    class="truncate text-xl font-bold text-highlighted"
                  >
                    {{
                      lastScan.memberName
                    }}
                  </h2>

                  <UBadge
                    :color="
                      lastScan.duplicate
                        ? 'warning'
                        : 'success'
                    "
                    variant="soft"
                  >
                    {{
                      lastScan.duplicate
                        ? "Already Recorded"
                        : "Time-In Successful"
                    }}
                  </UBadge>
                </div>

                <p
                  class="mt-1 text-sm text-muted"
                >
                  {{
                    lastScan.memberType
                  }}
                  ·
                  {{
                    lastScan.memberIdentifier
                  }}
                  ·
                  {{
                    lastScan.programDepartment
                  }}
                </p>

                <p
                  class="mt-2 font-mono text-xs text-dimmed"
                >
                  {{
                    lastScan.barcode
                  }}
                </p>
              </div>
            </div>

            <div
              class="rounded-2xl bg-elevated px-6 py-4 text-center lg:min-w-56"
            >
              <p
                class="text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Recorded Time
              </p>

              <p
                class="mt-1 text-2xl font-bold text-highlighted"
              >
                {{
                  formatTime(
                    lastScan.timeIn,
                  )
                }}
              </p>

              <p
                class="mt-1 text-xs text-muted"
              >
                {{
                  lastScan.visitNo
                }}
              </p>
            </div>
          </div>
        </UCard>
      </Transition>

      <section
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <UCard
          v-for="
            card in summaryCards
          "
          :key="card.label"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <p
                class="text-sm text-muted"
              >
                {{ card.label }}
              </p>

              <p
                class="mt-2 text-3xl font-bold text-highlighted"
              >
                {{ card.value }}
              </p>

              <p
                class="mt-1 text-xs text-muted"
              >
                {{
                  card.description
                }}
              </p>
            </div>

            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"
            >
              <UIcon
                :name="card.icon"
                class="size-5"
              />
            </div>
          </div>
        </UCard>
      </section>

      <UCard>
        <template #header>
          <div
            class="space-y-4"
          >
            <div
              class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <h2
                  class="font-semibold text-highlighted"
                >
                  Library Visit Records
                </h2>

                <p
                  class="mt-1 text-sm text-muted"
                >
                  A permanent attendance record is kept for every accepted card scan.
                </p>
              </div>

              <UButton
                label="Reset to Today"
                icon="i-lucide-calendar-days"
                color="neutral"
                variant="outline"
                @click="resetToday"
              />
            </div>

            <div
              class="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem_12rem]"
            >
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Search member, number, barcode, or program"
                class="w-full"
              />

              <UInput
                v-model="fromDate"
                type="date"
                icon="i-lucide-calendar-range"
                class="w-full"
              />

              <UInput
                v-model="toDate"
                type="date"
                icon="i-lucide-calendar-range"
                class="w-full"
              />

              <USelect
                v-model="
                  memberType
                "
                :items="
                  memberTypeItems
                "
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </div>
          </div>
        </template>

        <div
          v-if="loading"
          class="space-y-3"
        >
          <USkeleton
            v-for="item in 6"
            :key="item"
            class="h-20 w-full rounded-xl"
          />
        </div>

        <div
          v-else-if="
            recentVisits.length === 0
          "
          class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-elevated/20 p-8 text-center"
        >
          <div
            class="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success"
          >
            <UIcon
              name="i-lucide-door-open"
              class="size-7"
            />
          </div>

          <p
            class="mt-4 font-semibold text-highlighted"
          >
            No Library entries found
          </p>

          <p
            class="mt-1 max-w-md text-sm text-muted"
          >
            Scan a registered Student or Faculty card, or adjust the selected date range.
          </p>
        </div>

        <UTable
          v-else
          :data="recentVisits"
          :columns="columns"
        >
          <template
            #time-cell="{ row }"
          >
            <div>
              <p
                class="font-semibold text-highlighted"
              >
                {{
                  formatTime(
                    row.original
                      .timeIn,
                  )
                }}
              </p>

              <p
                class="text-xs text-muted"
              >
                {{
                  row.original
                    .visitDate
                }}
              </p>
            </div>
          </template>

          <template
            #member-cell="{ row }"
          >
            <div
              class="flex items-center gap-3"
            >
              <UAvatar
                :src="
                  row.original
                    .member
                    ?.photoUrl ??
                  undefined
                "
                :text="
                  memberInitials(
                    row.original,
                  )
                "
                :alt="
                  row.original
                    .memberName
                "
                size="md"
              />

              <div
                class="min-w-0"
              >
                <p
                  class="truncate font-semibold text-highlighted"
                >
                  {{
                    row.original
                      .memberName
                  }}
                </p>

                <p
                  class="truncate text-xs text-muted"
                >
                  {{
                    row.original
                      .memberIdentifier
                  }}
                </p>
              </div>
            </div>
          </template>

          <template
            #memberType-cell="{ row }"
          >
            <UBadge
              :color="
                row.original
                  .memberType ===
                'Student'
                  ? 'info'
                  : 'primary'
              "
              variant="soft"
            >
              {{
                row.original
                  .memberType
              }}
            </UBadge>
          </template>

          <template
            #programDepartment-cell="{ row }"
          >
            <p
              class="text-sm font-medium text-highlighted"
            >
              {{
                row.original
                  .programDepartment ||
                "Not recorded"
              }}
            </p>

            <p
              v-if="
                row.original
                  .educationalLevel
              "
              class="text-xs text-muted"
            >
              {{
                row.original
                  .educationalLevel
              }}
              <template
                v-if="
                  row.original
                    .yearLevel
                "
              >
                · Year
                {{
                  row.original
                    .yearLevel
                }}
              </template>
            </p>
          </template>

          <template
            #barcode-cell="{ row }"
          >
            <span
              class="rounded-lg bg-elevated px-2 py-1 font-mono text-xs font-semibold text-highlighted"
            >
              {{
                row.original
                  .barcode
              }}
            </span>
          </template>

          <template
            #recordedBy-cell="{ row }"
          >
            <span
              class="text-sm text-muted"
            >
              {{
                row.original
                  .recordedBy ||
                "Librarian"
              }}
            </span>
          </template>
        </UTable>

        <template #footer>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p
              class="text-sm text-muted"
            >
              {{
                pagination.total
              }}
              visit record{{
                pagination.total ===
                1
                  ? ""
                  : "s"
              }}
              · Latest:
              {{
                formatDateTime(
                  summary.latestEntryAt,
                )
              }}
            </p>

            <UPagination
              v-if="
                pagination.pageCount >
                1
              "
              v-model:page="page"
              :total="
                pagination.total
              "
              :items-per-page="
                pagination.pageSize
              "
              :sibling-count="1"
              show-edges
            />
          </div>
        </template>
      </UCard>
    </div>
  </UContainer>
</template>
