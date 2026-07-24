
<script setup lang="ts">
import type {
  CroppedStudentPhoto,
} from "~/types/studentPhoto";

const props = withDefaults(
  defineProps<{
    modelValue?: CroppedStudentPhoto | null;
    existingUrl?: string | null;
    required?: boolean;
    allowRemove?: boolean;
    disabled?: boolean;
    title?: string;
    description?: string;
  }>(),
  {
    modelValue: null,
    existingUrl: null,
    required: false,
    allowRemove: false,
    disabled: false,
    title: "Student Photo",
    description:
      "Upload a clear front-facing photo, then drag and zoom to fit the 1:1 crop.",
  },
);

const emit = defineEmits<{
  "update:modelValue": [
    value: CroppedStudentPhoto | null,
  ];
  remove: [];
}>();

const runtimeConfig =
  useRuntimeConfig();

const fileInput =
  ref<HTMLInputElement | null>(null);
const cropImage =
  ref<HTMLImageElement | null>(null);
const cropStage =
  ref<HTMLElement | null>(null);

const cropOpen = ref(false);
const sourceUrl = ref("");
const sourceName = ref("");
const errorMessage = ref("");

const naturalWidth = ref(0);
const naturalHeight = ref(0);
const stageSize = ref(360);

const zoom = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const dragging = ref(false);

let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;
let resizeObserver:
  ResizeObserver | null = null;

const MAX_FILE_BYTES =
  10 * 1024 * 1024;
const OUTPUT_SIZE = 800;

const resolvedExistingUrl =
  computed(() =>
    resolveAssetUrl(
      props.existingUrl,
    ),
  );

const effectivePreview =
  computed(
    () =>
      props.modelValue?.previewUrl ||
      resolvedExistingUrl.value,
  );

const hasPhoto = computed(
  () =>
    Boolean(effectivePreview.value),
);

const baseScale = computed(() => {
  if (
    !naturalWidth.value ||
    !naturalHeight.value ||
    !stageSize.value
  ) {
    return 1;
  }

  return Math.max(
    stageSize.value /
      naturalWidth.value,
    stageSize.value /
      naturalHeight.value,
  );
});

const currentScale = computed(
  () =>
    baseScale.value *
    zoom.value,
);

const displayedWidth = computed(
  () =>
    naturalWidth.value *
    currentScale.value,
);

const displayedHeight = computed(
  () =>
    naturalHeight.value *
    currentScale.value,
);

const imageStyle = computed(() => {
  const left =
    (stageSize.value -
      displayedWidth.value) /
      2 +
    offsetX.value;

  const top =
    (stageSize.value -
      displayedHeight.value) /
      2 +
    offsetY.value;

  return {
    width:
      `${displayedWidth.value}px`,
    height:
      `${displayedHeight.value}px`,
    left: `${left}px`,
    top: `${top}px`,
  };
});

function resolveAssetUrl(
  value?: string | null,
): string {
  const source =
    value?.trim() ?? "";

  if (!source) {
    return "";
  }

  if (
    source.startsWith(
      "http://",
    ) ||
    source.startsWith(
      "https://",
    ) ||
    source.startsWith(
      "blob:",
    ) ||
    source.startsWith(
      "data:",
    )
  ) {
    return source;
  }

  if (
    source.startsWith(
      "/uploads/",
    )
  ) {
    const strapiUrl =
      String(
        runtimeConfig.public
          .strapiUrl ??
          "http://localhost:1337",
      ).replace(/\/$/, "");

    return `${strapiUrl}${source}`;
  }

  return source;
}

function openFilePicker() {
  if (props.disabled) {
    return;
  }

  fileInput.value?.click();
}

function clearSourceUrl() {
  if (
    sourceUrl.value.startsWith(
      "blob:",
    )
  ) {
    URL.revokeObjectURL(
      sourceUrl.value,
    );
  }

  sourceUrl.value = "";
}

function resetCrop() {
  zoom.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;

  nextTick(() => {
    constrainOffsets();
  });
}

function maxOffsetX(): number {
  return Math.max(
    (
      displayedWidth.value -
      stageSize.value
    ) / 2,
    0,
  );
}

function maxOffsetY(): number {
  return Math.max(
    (
      displayedHeight.value -
      stageSize.value
    ) / 2,
    0,
  );
}

function constrainOffsets() {
  offsetX.value = Math.min(
    Math.max(
      offsetX.value,
      -maxOffsetX(),
    ),
    maxOffsetX(),
  );

  offsetY.value = Math.min(
    Math.max(
      offsetY.value,
      -maxOffsetY(),
    ),
    maxOffsetY(),
  );
}

function measureStage() {
  if (!cropStage.value) {
    return;
  }

  stageSize.value =
    cropStage.value.clientWidth;

  constrainOffsets();
}

function connectResizeObserver() {
  if (
    !import.meta.client ||
    !cropStage.value
  ) {
    return;
  }

  resizeObserver?.disconnect();

  resizeObserver =
    new ResizeObserver(() => {
      measureStage();
    });

  resizeObserver.observe(
    cropStage.value,
  );

  measureStage();
}

async function selectFile(
  event: Event,
) {
  const input =
    event.target as HTMLInputElement;
  const file =
    input.files?.[0];

  input.value = "";

  if (!file) {
    return;
  }

  errorMessage.value = "";

  if (
    ![
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(file.type)
  ) {
    errorMessage.value =
      "Use a JPG, PNG, or WebP image.";
    return;
  }

  if (
    file.size >
    MAX_FILE_BYTES
  ) {
    errorMessage.value =
      "The image must not exceed 10 MB.";
    return;
  }

  clearSourceUrl();

  sourceUrl.value =
    URL.createObjectURL(file);
  sourceName.value =
    file.name;
  naturalWidth.value = 0;
  naturalHeight.value = 0;
  resetCrop();
  cropOpen.value = true;

  await nextTick();
  connectResizeObserver();
}

function onImageLoaded() {
  const image =
    cropImage.value;

  if (!image) {
    return;
  }

  naturalWidth.value =
    image.naturalWidth;
  naturalHeight.value =
    image.naturalHeight;

  resetCrop();
  measureStage();
}

function beginDrag(
  event: PointerEvent,
) {
  if (
    !cropImage.value ||
    props.disabled
  ) {
    return;
  }

  dragging.value = true;
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragOriginX = offsetX.value;
  dragOriginY = offsetY.value;

  cropStage.value?.setPointerCapture(
    event.pointerId,
  );
}

function moveDrag(
  event: PointerEvent,
) {
  if (!dragging.value) {
    return;
  }

  offsetX.value =
    dragOriginX +
    event.clientX -
    dragStartX;

  offsetY.value =
    dragOriginY +
    event.clientY -
    dragStartY;

  constrainOffsets();
}

function endDrag(
  event: PointerEvent,
) {
  dragging.value = false;

  if (
    cropStage.value?.hasPointerCapture(
      event.pointerId,
    )
  ) {
    cropStage.value.releasePointerCapture(
      event.pointerId,
    );
  }
}

function nudge(
  x: number,
  y: number,
) {
  offsetX.value += x;
  offsetY.value += y;
  constrainOffsets();
}

function onStageKeydown(
  event: KeyboardEvent,
) {
  const step =
    event.shiftKey
      ? 12
      : 4;

  if (
    event.key ===
    "ArrowLeft"
  ) {
    event.preventDefault();
    nudge(-step, 0);
  }

  if (
    event.key ===
    "ArrowRight"
  ) {
    event.preventDefault();
    nudge(step, 0);
  }

  if (
    event.key ===
    "ArrowUp"
  ) {
    event.preventDefault();
    nudge(0, -step);
  }

  if (
    event.key ===
    "ArrowDown"
  ) {
    event.preventDefault();
    nudge(0, step);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(
              new Error(
                "The cropped photo could not be created.",
              ),
            );
          }
        },
        "image/jpeg",
        0.92,
      );
    },
  );
}

async function applyCrop() {
  const image =
    cropImage.value;

  if (
    !image ||
    !naturalWidth.value ||
    !naturalHeight.value
  ) {
    errorMessage.value =
      "Wait for the image to finish loading.";
    return;
  }

  try {
    errorMessage.value = "";

    const left =
      (
        stageSize.value -
        displayedWidth.value
      ) /
        2 +
      offsetX.value;

    const top =
      (
        stageSize.value -
        displayedHeight.value
      ) /
        2 +
      offsetY.value;

    const sourceX =
      Math.max(
        -left /
          currentScale.value,
        0,
      );

    const sourceY =
      Math.max(
        -top /
          currentScale.value,
        0,
      );

    const sourceSize =
      stageSize.value /
      currentScale.value;

    const canvas =
      document.createElement(
        "canvas",
      );

    canvas.width =
      OUTPUT_SIZE;
    canvas.height =
      OUTPUT_SIZE;

    const context =
      canvas.getContext(
        "2d",
        {
          alpha: false,
        },
      );

    if (!context) {
      throw new Error(
        "The browser could not prepare the crop canvas.",
      );
    }

    context.fillStyle =
      "#ffffff";
    context.fillRect(
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    context.imageSmoothingEnabled =
      true;
    context.imageSmoothingQuality =
      "high";

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    const blob =
      await canvasToBlob(
        canvas,
      );

    const baseName =
      sourceName.value
        .replace(
          /\.[^.]+$/,
          "",
        )
        .replace(
          /[^a-zA-Z0-9_-]+/g,
          "-",
        )
        .replace(
          /-+/g,
          "-",
        )
        .replace(
          /^-|-$/g,
          "",
        ) ||
      "student-photo";

    const file =
      new File(
        [blob],
        `${baseName}-cropped.jpg`,
        {
          type:
            "image/jpeg",
          lastModified:
            Date.now(),
        },
      );

    const previewUrl =
      URL.createObjectURL(
        file,
      );

    emit(
      "update:modelValue",
      {
        file,
        previewUrl,
        width:
          OUTPUT_SIZE,
        height:
          OUTPUT_SIZE,
        originalName:
          sourceName.value,
      },
    );

    cropOpen.value = false;
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : "The photo could not be cropped.";
  }
}

function removePhoto() {
  emit(
    "update:modelValue",
    null,
  );
  emit("remove");
}

watch(
  zoom,
  () => {
    constrainOffsets();
  },
);

watch(
  cropOpen,
  async (open) => {
    if (open) {
      await nextTick();
      connectResizeObserver();
    }
  },
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  clearSourceUrl();
});
</script>

<template>
  <section
    class="rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5"
  >
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start"
    >
      <div
        class="relative mx-auto size-36 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-default bg-default sm:mx-0"
      >
        <img
          v-if="effectivePreview"
          :src="effectivePreview"
          alt="Student photo preview"
          class="h-full w-full object-cover"
        />

        <div
          v-else
          class="flex h-full w-full flex-col items-center justify-center px-3 text-center text-muted"
        >
          <UIcon
            name="i-lucide-user-round"
            class="size-10"
          />
          <span
            class="mt-2 text-xs font-medium"
          >
            No photo selected
          </span>
        </div>

        <div
          v-if="hasPhoto"
          class="absolute inset-x-0 bottom-0 bg-slate-950/70 px-2 py-1 text-center text-[11px] font-medium text-white"
        >
          1:1 Library Card Photo
        </div>
      </div>

      <div class="min-w-0 flex-1">
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <div
              class="flex items-center gap-2"
            >
              <h3
                class="font-semibold text-highlighted"
              >
                {{ title }}
              </h3>

              <UBadge
                v-if="required"
                color="error"
                variant="soft"
                size="sm"
              >
                Required
              </UBadge>
            </div>

            <p
              class="mt-1 text-sm leading-relaxed text-muted"
            >
              {{ description }}
            </p>
          </div>

          <div
            class="flex flex-wrap gap-2"
          >
            <UButton
              :label="
                hasPhoto
                  ? 'Change Photo'
                  : 'Choose Photo'
              "
              :icon="
                hasPhoto
                  ? 'i-lucide-image-up'
                  : 'i-lucide-upload'
              "
              color="primary"
              variant="soft"
              :disabled="disabled"
              @click="openFilePicker"
            />

            <UButton
              v-if="
                allowRemove &&
                hasPhoto
              "
              label="Remove"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              :disabled="disabled"
              @click="removePhoto"
            />
          </div>
        </div>

        <div
          class="mt-4 flex flex-wrap gap-2"
        >
          <UBadge
            color="neutral"
            variant="soft"
          >
            1:1 Ratio
          </UBadge>
          <UBadge
            color="neutral"
            variant="soft"
          >
            800 × 800 px
          </UBadge>
          <UBadge
            color="neutral"
            variant="soft"
          >
            JPG, PNG, or WebP
          </UBadge>
          <UBadge
            color="neutral"
            variant="soft"
          >
            Maximum 10 MB
          </UBadge>
        </div>

        <p
          v-if="modelValue"
          class="mt-3 flex items-center gap-2 text-sm text-success"
        >
          <UIcon
            name="i-lucide-circle-check"
            class="size-4"
          />
          The cropped photo is ready to upload.
        </p>

        <p
          v-if="errorMessage"
          class="mt-3 flex items-center gap-2 text-sm text-error"
        >
          <UIcon
            name="i-lucide-circle-alert"
            class="size-4"
          />
          {{ errorMessage }}
        </p>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="selectFile"
    />

    <UModal
      v-model:open="cropOpen"
      :dismissible="false"
      :ui="{
        content:
          'sm:max-w-xl max-h-[94dvh] overflow-y-auto',
      }"
    >
      <template #content>
        <div
          class="bg-default p-5 sm:p-6"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <h2
                class="text-xl font-bold text-highlighted"
              >
                Adjust Student Photo
              </h2>

              <p
                class="mt-1 text-sm text-muted"
              >
                Drag the image to reposition it and use the zoom control. The saved result is always a square 1:1 photo.
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              square
              aria-label="Close photo cropper"
              @click="
                cropOpen = false
              "
            />
          </div>

          <div
            ref="cropStage"
            tabindex="0"
            role="application"
            aria-label="Student photo crop area. Drag the image or use the arrow keys to reposition it."
            class="crop-stage mt-5"
            :class="{
              'cursor-grabbing':
                dragging,
            }"
            @pointerdown="beginDrag"
            @pointermove="moveDrag"
            @pointerup="endDrag"
            @pointercancel="endDrag"
            @keydown="onStageKeydown"
          >
            <img
              ref="cropImage"
              :src="sourceUrl"
              alt="Photo being cropped"
              draggable="false"
              class="crop-image"
              :style="imageStyle"
              @load="onImageLoaded"
            />

            <div
              class="crop-grid"
              aria-hidden="true"
            />

            <div
              class="crop-frame"
              aria-hidden="true"
            />
          </div>

          <div
            class="mt-5 space-y-2"
          >
            <div
              class="flex items-center justify-between gap-3"
            >
              <label
                for="student-photo-zoom"
                class="text-sm font-medium text-highlighted"
              >
                Zoom
              </label>

              <span
                class="text-sm text-muted"
              >
                {{
                  Math.round(
                    zoom * 100,
                  )
                }}%
              </span>
            </div>

            <input
              id="student-photo-zoom"
              v-model.number="zoom"
              type="range"
              min="1"
              max="3.5"
              step="0.01"
              class="w-full accent-current"
            />
          </div>

          <UAlert
            class="mt-4"
            color="info"
            variant="soft"
            icon="i-lucide-move"
            title="Cropping controls"
            description="Drag with a mouse or touch screen. You may also focus the crop area and use the arrow keys; hold Shift for larger movements."
          />

          <p
            v-if="errorMessage"
            class="mt-4 text-sm text-error"
          >
            {{ errorMessage }}
          </p>

          <div
            class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"
          >
            <UButton
              label="Reset Position"
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="ghost"
              @click="resetCrop"
            />

            <div
              class="flex flex-col-reverse gap-3 sm:flex-row"
            >
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                @click="
                  cropOpen = false
                "
              />

              <UButton
                label="Use This Photo"
                icon="i-lucide-crop"
                color="primary"
                @click="applyCrop"
              />
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </section>
</template>

<style scoped>
.crop-stage {
  position: relative;
  width: min(100%, 420px);
  aspect-ratio: 1;
  margin-inline: auto;
  overflow: hidden;
  border-radius: 1.25rem;
  background:
    linear-gradient(
      45deg,
      #e2e8f0 25%,
      transparent 25%
    ),
    linear-gradient(
      -45deg,
      #e2e8f0 25%,
      transparent 25%
    ),
    linear-gradient(
      45deg,
      transparent 75%,
      #e2e8f0 75%
    ),
    linear-gradient(
      -45deg,
      transparent 75%,
      #e2e8f0 75%
    );
  background-color: #f8fafc;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0;
  background-size:
    20px 20px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  outline: none;
}

.crop-stage:focus-visible {
  box-shadow:
    0 0 0 3px
      rgb(14 165 233 / 35%);
}

.crop-image {
  position: absolute;
  max-width: none;
  max-height: none;
  pointer-events: none;
  user-select: none;
}

.crop-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      to right,
      transparent 33.1%,
      rgb(255 255 255 / 60%)
        33.3%,
      transparent 33.5%,
      transparent 66.4%,
      rgb(255 255 255 / 60%)
        66.6%,
      transparent 66.8%
    ),
    linear-gradient(
      to bottom,
      transparent 33.1%,
      rgb(255 255 255 / 60%)
        33.3%,
      transparent 33.5%,
      transparent 66.4%,
      rgb(255 255 255 / 60%)
        66.6%,
      transparent 66.8%
    );
  pointer-events: none;
}

.crop-frame {
  position: absolute;
  inset: 0;
  border: 3px solid #ffffff;
  border-radius: 1.25rem;
  box-shadow:
    inset 0 0 0 999px
      rgb(15 23 42 / 8%),
    0 0 0 1px
      rgb(15 23 42 / 20%);
  pointer-events: none;
}
</style>
