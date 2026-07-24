<script setup lang="ts">
import type {
  MembershipRecord,
  StudentMember,
} from "~/composables/useLibraryMembers";
import {
  yearGradeLabel,
} from "~/constants/studentPrograms";
import {
  normalizeLibraryCardDesign,
  type LibraryCardDesign,
} from "~/composables/useLibraryCardDesign";

type DownloadSide =
  | "front"
  | "back"
  | "both";

type DisplaySide =
  | "front"
  | "back"
  | "both";

type StudentWithAddress =
  StudentMember & {
    address?: string;
  };

const props = withDefaults(
  defineProps<{
    student: StudentMember;
    membership?: MembershipRecord | null;
    showActions?: boolean;
    design?: Partial<LibraryCardDesign>;
    previewMode?: boolean;
    displaySide?: DisplaySide;

    /**
     * Keeps the card at its full design size internally and scales the
     * completed card to the available preview width. This prevents text,
     * photos, and labels from being clipped in narrow page columns.
     */
    fitPreview?: boolean;
  }>(),
  {
    membership: null,
    showActions: true,
    design: undefined,
    previewMode: false,
    displaySide: "both",
    fitPreview: false,
  },
);

const toast = useToast();
const designStore =
  useLibraryCardDesign();

const frontCard =
  ref<HTMLElement | null>(null);
const backCard =
  ref<HTMLElement | null>(null);
const bothCards =
  ref<HTMLElement | null>(null);
const previewViewport =
  ref<HTMLElement | null>(null);
const barcodeElement =
  ref<SVGSVGElement | null>(null);

const CARD_WIDTH = 560;
const CARD_HEIGHT =
  CARD_WIDTH / 1.586;
const CARD_GAP = 20;

const previewScale = ref(1);
let previewResizeObserver:
  ResizeObserver | null = null;

const downloading =
  ref<DownloadSide | null>(null);
const logoFailed = ref(false);
const backLogoFailed = ref(false);
const backgroundFailed = ref(false);
const barcodeError = ref("");

const activeMembership = computed(
  () =>
    props.membership ??
    props.student.membership,
);

const showFront = computed(
  () =>
    props.displaySide === "front" ||
    props.displaySide === "both",
);

const showBack = computed(
  () =>
    props.displaySide === "back" ||
    props.displaySide === "both",
);

const cardDesign = computed(() =>
  normalizeLibraryCardDesign(
    props.design ??
      designStore.design.value,
  ),
);

const resolvedLogo = computed(() =>
  designStore.assetUrl(
    cardDesign.value.logoUrl,
  ),
);

const resolvedBackLogo = computed(
  () =>
    designStore.assetUrl(
      cardDesign.value.backLogoUrl,
    ),
);

const resolvedBackground = computed(
  () =>
    designStore.assetUrl(
      cardDesign.value.backgroundImage,
    ),
);

const studentAddress = computed(
  () =>
    (
      props.student as StudentWithAddress
    ).address?.trim() ?? "",
);

const barcodeValue = computed(
  () =>
    props.student.barcode?.trim() ||
    props.student.libraryCardNo?.trim() ||
    props.student.studentNo?.trim() ||
    "",
);

const initials = computed(() =>
  [
    props.student.firstName,
    props.student.lastName,
  ]
    .filter(Boolean)
    .map((value) =>
      value.charAt(0).toUpperCase(),
    )
    .join(""),
);

const middleInitials = computed(() =>
  props.student.middleName
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
        `${part.charAt(0).toUpperCase()}.`,
    )
    .join(" ") ?? "",
);

const formattedName = computed(() =>
  [
    props.student.lastName
      ? `${props.student.lastName.toUpperCase()},`
      : "",
    props.student.firstName.toUpperCase(),
    middleInitials.value,
    props.student.suffix.toUpperCase(),
  ]
    .filter(Boolean)
    .join(" "),
);

const yearSection = computed(() =>
  [
    yearGradeLabel(
      props.student
        .educationalLevel,
      props.student.yearLevel,
    ).toUpperCase(),
    props.student.section,
  ]
    .filter(Boolean)
    .join(" • "),
);

const membershipStatus = computed(
  () =>
    activeMembership.value?.status ??
    "Expired",
);

const statusLabelClass = computed(() => {
  switch (membershipStatus.value) {
    case "Active":
      return "status-active";
    case "Suspended":
      return "status-suspended";
    default:
      return "status-expired";
  }
});

const frontClass = computed(() => [
  `layout-${cardDesign.value.frontLayout}`,
  `photo-${cardDesign.value.photoShape}`,
]);

const backClass = computed(() => [
  `back-${cardDesign.value.backStyle}`,
  `back-layout-${cardDesign.value.backLayout}`,
]);

const cssVariables = computed(
  () =>
    ({
      "--card-primary":
        cardDesign.value.primaryColor,
      "--card-secondary":
        cardDesign.value.secondaryColor,
      "--card-accent":
        cardDesign.value.accentColor,
      "--card-surface":
        cardDesign.value.surfaceColor,
      "--card-text":
        cardDesign.value.textColor,
      "--card-muted":
        cardDesign.value.mutedTextColor,
      "--card-photo-border":
        cardDesign.value.photoBorderColor,
      "--card-radius":
        `${cardDesign.value.cornerRadius}px`,
      "--card-overlay":
        String(
          cardDesign.value.overlayOpacity /
            100,
        ),
      "--card-base-font-size":
        `${16 * (cardDesign.value.fontScale / 100)}px`,
      "--card-background-position":
        cardDesign.value.backgroundPosition,
      "--card-back-logo-size":
        `${cardDesign.value.backLogoSize}px`,
    }) as Record<string, string>,
);

const visibleSideCount = computed(
  () =>
    Number(showFront.value) +
    Number(showBack.value),
);

const previewNaturalHeight = computed(
  () =>
    CARD_HEIGHT *
      visibleSideCount.value +
    CARD_GAP *
      Math.max(
        visibleSideCount.value - 1,
        0,
      ),
);

const previewViewportStyle = computed(
  () => {
    if (!props.fitPreview) {
      return undefined;
    }

    return {
      height:
        `${previewNaturalHeight.value * previewScale.value}px`,
    };
  },
);

const cardPairStyle = computed(
  () => {
    if (!props.fitPreview) {
      return cssVariables.value;
    }

    return {
      ...cssVariables.value,
      width: `${CARD_WIDTH}px`,
      transform:
        `scale(${previewScale.value})`,
      transformOrigin: "top left",
    };
  },
);

function updatePreviewScale() {
  if (
    !props.fitPreview ||
    !previewViewport.value
  ) {
    previewScale.value = 1;
    return;
  }

  const availableWidth =
    previewViewport.value.clientWidth;

  previewScale.value = Math.min(
    Math.max(
      availableWidth / CARD_WIDTH,
      0.1,
    ),
    1,
  );
}

function connectPreviewObserver() {
  if (
    !import.meta.client ||
    !props.fitPreview ||
    !previewViewport.value
  ) {
    return;
  }

  previewResizeObserver?.disconnect();

  previewResizeObserver =
    new ResizeObserver(() => {
      updatePreviewScale();
    });

  previewResizeObserver.observe(
    previewViewport.value,
  );

  updatePreviewScale();
}

function cardBackgroundStyle() {
  const design = cardDesign.value;

  if (
    design.backgroundMode === "image" &&
    resolvedBackground.value &&
    !backgroundFailed.value
  ) {
    return {
      backgroundImage:
        `url("${resolvedBackground.value}")`,
      backgroundPosition:
        design.backgroundPosition,
    };
  }

  if (
    design.backgroundMode ===
    "gradient"
  ) {
    return {
      backgroundImage:
        `linear-gradient(135deg, ${design.primaryColor}, ${design.secondaryColor})`,
    };
  }

  return {
    backgroundColor:
      design.primaryColor,
  };
}

function studentPhotoUrl() {
  return designStore.assetUrl(
    props.student.photoUrl,
  );
}

async function renderBarcode() {
  if (
    !import.meta.client ||
    !barcodeElement.value ||
    !cardDesign.value.showBarcode ||
    !barcodeValue.value
  ) {
    return;
  }

  try {
    barcodeError.value = "";

    const { default: JsBarcode } =
      await import("jsbarcode");

    JsBarcode(
      barcodeElement.value,
      barcodeValue.value,
      {
        format: "CODE128",
        width: 1.55,
        height: 50,
        margin: 3,
        displayValue: true,
        fontSize: 11,
        fontOptions: "bold",
        background: "#FFFFFF",
        lineColor:
          cardDesign.value.primaryColor,
      },
    );
  } catch (error) {
    console.error(error);
    barcodeError.value =
      "Unable to render barcode.";
  }
}

async function renderBarcodeWhenReady() {
  if (
    !import.meta.client ||
    !showBack.value ||
    !cardDesign.value.showBarcode
  ) {
    return;
  }

  await nextTick();

  // The Back side is conditionally rendered. Waiting for one animation
  // frame guarantees that the SVG ref exists before JsBarcode runs.
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  await renderBarcode();
}

function downloadTarget(
  side: DownloadSide,
): HTMLElement | null {
  if (side === "front") {
    return frontCard.value;
  }

  if (side === "back") {
    return backCard.value;
  }

  return bothCards.value;
}

async function downloadCard(
  side: DownloadSide,
) {
  const target = downloadTarget(side);

  if (
    !import.meta.client ||
    !target
  ) {
    return;
  }

  downloading.value = side;

  try {
    const { toPng } =
      await import("html-to-image");

    const dataUrl = await toPng(
      target,
      {
        backgroundColor: "#FFFFFF",
        cacheBust: false,
        pixelRatio: 3,
        skipFonts: true,
      },
    );

    const link =
      document.createElement("a");

    const suffix =
      side === "both"
        ? "front-and-back"
        : side;

    link.href = dataUrl;
    link.download =
      `${props.student.libraryCardNo}-${suffix}.png`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.add({
      title:
        "Library card downloaded",
      description:
        `${props.student.libraryCardNo}-${suffix}.png was created.`,
      color: "success",
      icon: "i-lucide-download",
    });
  } catch (error) {
    toast.add({
      title: "Download failed",
      description:
        error instanceof Error
          ? error.message
          : "Unable to download the library card.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    downloading.value = null;
  }
}

onMounted(async () => {
  if (!props.design) {
    await designStore.loadDesign();
  }

  await nextTick();
  connectPreviewObserver();
  await renderBarcodeWhenReady();
});

onBeforeUnmount(() => {
  previewResizeObserver?.disconnect();
  previewResizeObserver = null;
});

watch(
  resolvedBackground,
  () => {
    backgroundFailed.value = false;
  },
);

watch(
  resolvedBackLogo,
  () => {
    backLogoFailed.value = false;
  },
);

watch(
  [
    () => props.displaySide,
    () => props.fitPreview,
  ],
  async () => {
    await nextTick();
    connectPreviewObserver();
    updatePreviewScale();
    await renderBarcodeWhenReady();
  },
);

watch(
  [
    () => barcodeValue.value,
    () => cardDesign.value.primaryColor,
    () => cardDesign.value.showBarcode,
    () => cardDesign.value.backLayout,
  ],
  async () => {
    await renderBarcodeWhenReady();
  },
);

defineExpose({
  downloadCard,
  renderBarcode,
});
</script>

<template>
  <div class="space-y-5">
    <div
      ref="previewViewport"
      class="card-preview-viewport"
      :class="{
        'fit-preview':
          fitPreview,
      }"
      :style="previewViewportStyle"
    >
      <div
        ref="bothCards"
        class="library-card-pair"
        :class="{
          'designer-preview':
            previewMode,
          'single-side-preview':
            displaySide !== 'both',
          'scaled-card-pair':
            fitPreview,
        }"
        :style="cardPairStyle"
      >
      <!-- FRONT -->
      <section
        v-if="showFront"
        ref="frontCard"
        class="library-card-shell library-card-front"
        :class="frontClass"
        aria-label="Front of student library card"
      >
        <div
          class="front-background"
          :style="cardBackgroundStyle()"
        >
          <img
            v-if="
              cardDesign.backgroundMode ===
                'image' &&
              resolvedBackground
            "
            :src="resolvedBackground"
            alt=""
            class="background-preloader"
            crossorigin="anonymous"
            @error="
              backgroundFailed = true
            "
          />
        </div>

        <div class="front-overlay" />
        <div class="front-pattern" />

        <div class="front-content">
          <header class="brand-row">
            <div class="brand-lockup">
              <div
                v-if="cardDesign.showLogo"
                class="institution-logo"
              >
                <img
                  v-if="
                    resolvedLogo &&
                    !logoFailed
                  "
                  :src="resolvedLogo"
                  alt=""
                  crossorigin="anonymous"
                  @error="
                    logoFailed = true
                  "
                />

                <span v-else>
                  SNCBT
                </span>
              </div>

              <div class="brand-copy">
                <p class="brand-name">
                  {{
                    cardDesign.institutionName
                  }}
                </p>
                <p class="brand-tagline">
                  {{
                    cardDesign.frontTagline
                  }}
                </p>
              </div>
            </div>

            <div class="card-type">
              <span>LIBRARY</span>
              <strong>
                {{
                  cardDesign.cardTitle
                }}
              </strong>
            </div>
          </header>

          <div class="identity-area">
            <div
              v-if="cardDesign.showPhoto"
              class="student-photo"
            >
              <img
                v-if="studentPhotoUrl()"
                :src="studentPhotoUrl()"
                :alt="student.fullName"
                crossorigin="anonymous"
              />

              <span v-else>
                {{ initials }}
              </span>
            </div>

            <div class="identity-copy">
              <p class="identity-label">
                REGISTERED STUDENT
              </p>

              <h2 class="identity-name">
                {{ formattedName }}
              </h2>

              <p
                v-if="cardDesign.showCourse"
                class="identity-program"
              >
                {{ student.course }}
              </p>

              <div class="identity-meta">
                <div
                  v-if="
                    cardDesign.showStudentNumber
                  "
                >
                  <span>
                    STUDENT NUMBER
                  </span>
                  <strong>
                    {{ student.studentNo }}
                  </strong>
                </div>

                <div
                  v-if="
                    cardDesign.showCardNumber
                  "
                >
                  <span>
                    LIBRARY CARD
                  </span>
                  <strong>
                    {{
                      student.libraryCardNo
                    }}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <footer class="front-footer">
            <span>
              {{
                cardDesign.departmentLabel
              }}
            </span>

            <div
              v-if="
                cardDesign
                  .showMembershipStatus
              "
              class="front-status"
              :class="
                statusLabelClass
              "
            >
              {{ membershipStatus }}
            </div>
          </footer>
        </div>
      </section>

      <!-- BACK -->
      <section
        v-if="showBack"
        ref="backCard"
        class="library-card-shell library-card-back"
        :class="backClass"
        aria-label="Back of student library card"
      >
        <div class="back-decoration" />

        <div class="back-content">
          <header class="back-header">
            <div>
              <p class="back-eyebrow">
                SNCBT LIBRARY
              </p>
              <h2>
                {{ cardDesign.backTitle }}
              </h2>
            </div>

            <div
              v-if="
                cardDesign.showBackLogo
              "
              class="back-logo"
            >
              <img
                v-if="
                  resolvedBackLogo &&
                  !backLogoFailed
                "
                :src="
                  resolvedBackLogo
                "
                alt="Library logo"
                crossorigin="anonymous"
                @error="
                  backLogoFailed = true
                "
              />

              <span v-else>
                LIBRARY
              </span>
            </div>
          </header>

          <div class="back-notice">
            {{ cardDesign.noticeText }}
          </div>

          <div
            class="back-body"
            :class="{
              'back-body-barcode-only':
                !cardDesign.showBackStudentDetails,
            }"
          >
            <div
              v-if="
                cardDesign
                  .showBackStudentDetails
              "
              class="cardholder-panel"
            >
              <div class="cardholder-heading">
                <div class="cardholder-avatar">
                  {{ initials }}
                </div>

                <div>
                  <span>
                    CARDHOLDER
                  </span>
                  <strong>
                    {{ formattedName }}
                  </strong>
                </div>
              </div>

              <dl class="student-detail-grid">
                <div
                  v-if="
                    cardDesign
                      .showStudentNumber
                  "
                >
                  <dt>
                    Student Number
                  </dt>
                  <dd>
                    {{ student.studentNo }}
                  </dd>
                </div>

                <div
                  v-if="
                    cardDesign
                      .showCardNumber
                  "
                >
                  <dt>
                    Library Card
                  </dt>
                  <dd>
                    {{
                      student.libraryCardNo
                    }}
                  </dd>
                </div>

                <div>
                  <dt>
                    Educational Level
                  </dt>
                  <dd>
                    {{
                      student.educationalLevel
                    }}
                  </dd>
                </div>

                <div
                  v-if="
                    cardDesign.showCourse
                  "
                  class="detail-wide"
                >
                  <dt>
                    Course / Program
                  </dt>
                  <dd>
                    {{ student.course }}
                  </dd>
                </div>

                <div
                  v-if="
                    cardDesign
                      .showYearSection &&
                    yearSection
                  "
                >
                  <dt>
                    Year / Section
                  </dt>
                  <dd>
                    {{ yearSection }}
                  </dd>
                </div>

                <div
                  v-if="
                    cardDesign.showEmail &&
                    student.email
                  "
                >
                  <dt>
                    Email
                  </dt>
                  <dd>
                    {{ student.email }}
                  </dd>
                </div>

                <div
                  v-if="
                    cardDesign.showAddress &&
                    studentAddress
                  "
                  class="detail-wide"
                >
                  <dt>
                    Address
                  </dt>
                  <dd>
                    {{ studentAddress }}
                  </dd>
                </div>
              </dl>
            </div>

            <div class="credential-panel">
              <div
                v-if="cardDesign.showBarcode"
                class="barcode-panel"
              >
                <svg
                  v-if="barcodeValue"
                  ref="barcodeElement"
                  class="barcode-svg"
                  role="img"
                  :aria-label="`Library barcode ${barcodeValue} for ${student.fullName}`"
                />

                <div
                  v-else
                  class="barcode-missing"
                >
                  <strong>Barcode unavailable</strong>
                  <span>No library-card number was returned.</span>
                </div>

                <p
                  v-if="barcodeError"
                  class="barcode-error"
                >
                  {{ barcodeError }}
                </p>
              </div>

              <div
                v-if="
                  cardDesign.showCardNumber
                "
                class="credential-card-no"
              >
                <span>
                  LIBRARY CARD NUMBER
                </span>
                <strong>
                  {{
                    student.libraryCardNo
                  }}
                </strong>
              </div>

              <div class="signature-block">
                <span class="signature-line" />
                <strong>
                  {{
                    cardDesign
                      .librarianLabel
                  }}
                </strong>
                <small>
                  LIBRARIAN
                </small>
              </div>
            </div>
          </div>

          <footer class="back-footer">
            <span>
              {{
                cardDesign.backFooterText
              }}
            </span>
            <strong>
              {{ student.studentNo }}
            </strong>
          </footer>
        </div>
      </section>
      </div>
    </div>

    <div
      v-if="showActions"
      class="grid gap-2 sm:grid-cols-3"
    >
      <UButton
        label="Download Front"
        icon="i-lucide-download"
        color="neutral"
        variant="outline"
        block
        :loading="
          downloading === 'front'
        "
        :disabled="
          downloading !== null
        "
        @click="
          downloadCard('front')
        "
      />

      <UButton
        label="Download Back"
        icon="i-lucide-download"
        color="neutral"
        variant="outline"
        block
        :loading="
          downloading === 'back'
        "
        :disabled="
          downloading !== null
        "
        @click="
          downloadCard('back')
        "
      />

      <UButton
        label="Download Both"
        icon="i-lucide-images"
        color="primary"
        block
        :loading="
          downloading === 'both'
        "
        :disabled="
          downloading !== null
        "
        @click="
          downloadCard('both')
        "
      />
    </div>
  </div>
</template>

<style scoped>
.card-preview-viewport {
  width: 100%;
}

.card-preview-viewport.fit-preview {
  position: relative;
  width: 100%;
  max-width: 620px;
  margin-inline: auto;
  overflow: hidden;
}

.library-card-pair {
  display: grid;
  gap: 1.25rem;
  justify-items: center;
}

.fit-preview
  .scaled-card-pair {
  grid-template-columns:
    minmax(0, 1fr) !important;
  gap: 20px;
  justify-items: stretch;
  will-change: transform;
}

.fit-preview
  .library-card-shell {
  width: 560px;
  min-width: 560px;
  max-width: none;
}

.single-side-preview {
  grid-template-columns: minmax(0, 1fr);
}

.single-side-preview
  .library-card-shell {
  width: min(100%, 620px);
}

.library-card-shell {
  position: relative;
  width: min(100%, 560px);
  aspect-ratio: 1.586 / 1;
  overflow: hidden;
  border: 1px solid
    rgb(148 163 184 / 35%);
  border-radius: var(--card-radius);
  background: var(--card-surface);
  color: var(--card-text);
  box-shadow:
    0 24px 55px
      rgb(15 23 42 / 22%),
    0 5px 15px
      rgb(15 23 42 / 12%);
  font-family:
    Arial,
    Helvetica,
    sans-serif;
  font-size:
    var(--card-base-font-size);
  isolation: isolate;
}

.front-background,
.front-overlay,
.front-pattern,
.back-decoration {
  position: absolute;
  inset: 0;
}

.front-background {
  z-index: -4;
  background-color:
    var(--card-primary);
  background-position:
    var(--card-background-position);
  background-size: cover;
}

.background-preloader {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.front-overlay {
  z-index: -3;
  opacity: var(--card-overlay);
  background:
    linear-gradient(
      105deg,
      rgb(5 18 38 / 100%)
        0%,
      var(--card-primary)
        54%,
      rgb(5 18 38 / 26%)
        100%
    );
}

.front-pattern {
  z-index: -2;
  background:
    radial-gradient(
      circle at 82% 16%,
      rgb(56 189 248 / 18%),
      transparent 28%
    ),
    linear-gradient(
      120deg,
      transparent 62%,
      rgb(255 255 255 / 7%)
        62.2%,
      transparent 62.8%
    );
}

.front-content {
  display: flex;
  height: 100%;
  flex-direction: column;
  padding:
    clamp(1rem, 3.5vw, 1.45rem);
}

.brand-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.brand-lockup {
  display: flex;
  min-width: 0;
  max-width: 72%;
  align-items: center;
  gap: 0.7rem;
}

.institution-logo,
.back-logo {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid
    rgb(255 255 255 / 82%);
  border-radius: 9999px;
  background: rgb(255 255 255 / 94%);
  color: var(--card-primary);
  font-weight: 900;
}

.institution-logo {
  width: 3.15rem;
  height: 3.15rem;
  font-size: 0.58rem;
  box-shadow:
    0 8px 18px
      rgb(0 0 0 / 18%);
}

.back-logo {
  width:
    var(
      --card-back-logo-size,
      44px
    );
  height:
    var(
      --card-back-logo-size,
      44px
    );
  font-size: 0.46rem;
}

.institution-logo img,
.back-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.brand-name {
  margin: 0;
  font-size: clamp(
    0.64rem,
    2.3vw,
    0.92rem
  );
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: 0.045em;
}

.brand-tagline {
  margin: 0.22rem 0 0;
  color: var(--card-muted);
  font-size: clamp(
    0.42rem,
    1.45vw,
    0.58rem
  );
  font-weight: 700;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}

.card-type {
  text-align: right;
}

.card-type span {
  display: block;
  color: var(--card-accent);
  font-size: clamp(
    0.42rem,
    1.5vw,
    0.58rem
  );
  font-weight: 900;
  letter-spacing: 0.22em;
}

.card-type strong {
  display: block;
  margin-top: 0.14rem;
  font-size: clamp(
    0.62rem,
    2.15vw,
    0.86rem
  );
  line-height: 1;
  letter-spacing: 0.06em;
}

.identity-area {
  display: grid;
  grid-template-columns:
    minmax(4.5rem, 24%)
    minmax(0, 1fr);
  flex: 1;
  gap: clamp(
    0.9rem,
    3vw,
    1.35rem
  );
  align-items: center;
  padding-top: 0.7rem;
}

.student-photo {
  display: flex;
  width: 100%;
  aspect-ratio: 3 / 4;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 3px solid
    var(--card-photo-border);
  background:
    linear-gradient(
      145deg,
      #E2E8F0,
      #FFFFFF
    );
  color: var(--card-primary);
  font-size: clamp(
    1.1rem,
    4vw,
    1.8rem
  );
  font-weight: 900;
  box-shadow:
    0 12px 28px
      rgb(0 0 0 / 28%);
}

.photo-rounded
  .student-photo {
  border-radius: 1rem;
}

.photo-square
  .student-photo {
  border-radius: 0.25rem;
}

.photo-circle
  .student-photo {
  aspect-ratio: 1;
  border-radius: 9999px;
}

.student-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.identity-copy {
  min-width: 0;
  max-height: 100%;
}

.brand-name,
.identity-name,
.identity-program {
  overflow-wrap: anywhere;
}

.identity-label {
  margin: 0;
  color: var(--card-accent);
  font-size: clamp(
    0.44rem,
    1.5vw,
    0.6rem
  );
  font-weight: 900;
  letter-spacing: 0.17em;
}

.identity-name {
  margin: 0.32rem 0 0;
  font-size: clamp(
    0.96rem,
    3.25vw,
    1.45rem
  );
  font-weight: 900;
  line-height: 1.06;
  text-transform: uppercase;
}

.identity-program {
  margin: 0.48rem 0 0;
  color: var(--card-muted);
  font-size: clamp(
    0.58rem,
    2vw,
    0.8rem
  );
  font-weight: 800;
  line-height: 1.2;
  text-transform: uppercase;
}

.identity-meta {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  margin-top: 0.8rem;
}

.identity-meta span {
  display: block;
  color: var(--card-muted);
  font-size: clamp(
    0.4rem,
    1.3vw,
    0.52rem
  );
  font-weight: 800;
  letter-spacing: 0.11em;
}

.identity-meta strong {
  display: block;
  margin-top: 0.12rem;
  font-family:
    "Courier New",
    monospace;
  font-size: clamp(
    0.58rem,
    2vw,
    0.8rem
  );
  font-weight: 900;
  letter-spacing: 0.035em;
}

.front-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding-top: 0.55rem;
  border-top: 1px solid
    rgb(255 255 255 / 22%);
  color: var(--card-muted);
  font-size: clamp(
    0.45rem,
    1.6vw,
    0.62rem
  );
  font-weight: 900;
  letter-spacing: 0.12em;
}

.front-status {
  border-radius: 9999px;
  padding: 0.22rem 0.55rem;
  font-size: clamp(
    0.4rem,
    1.35vw,
    0.52rem
  );
  font-weight: 900;
  letter-spacing: 0.08em;
}

.status-active {
  background: #DCFCE7;
  color: #166534;
}

.status-suspended {
  background: #FEF3C7;
  color: #92400E;
}

.status-expired {
  background: #FEE2E2;
  color: #991B1B;
}

/* FRONT LAYOUT OPTIONS */
.layout-split
  .front-overlay {
  opacity: 1;
  background:
    linear-gradient(
      90deg,
      var(--card-primary)
        0%,
      var(--card-primary)
        59%,
      rgb(7 26 51 / 48%)
        59.5%,
      rgb(7 26 51 / 18%)
        100%
    );
}

.layout-split
  .identity-area {
  max-width: 72%;
}

.layout-minimal {
  color: var(--card-primary);
  background: var(--card-surface);
}

.layout-minimal
  .front-background {
  opacity: 0.1;
}

.layout-minimal
  .front-overlay {
  opacity: 1;
  background:
    linear-gradient(
      90deg,
      rgb(255 255 255 / 98%)
        0%,
      rgb(255 255 255 / 94%)
        66%,
      rgb(255 255 255 / 70%)
        100%
    );
}

.layout-minimal
  .brand-name,
.layout-minimal
  .identity-name,
.layout-minimal
  .identity-meta strong,
.layout-minimal
  .card-type strong {
  color: var(--card-primary);
}

.layout-minimal
  .brand-tagline,
.layout-minimal
  .identity-program,
.layout-minimal
  .identity-meta span,
.layout-minimal
  .front-footer {
  color: #475569;
}

.layout-minimal
  .front-footer {
  border-color: #CBD5E1;
}

.layout-glass
  .identity-area {
  align-items: stretch;
}

.layout-glass
  .identity-copy {
  align-self: center;
  border: 1px solid
    rgb(255 255 255 / 28%);
  border-radius: 1rem;
  background:
    rgb(7 26 51 / 72%);
  padding: 0.9rem;
  box-shadow:
    0 16px 30px
      rgb(0 0 0 / 18%);
}

.layout-diagonal
  .front-pattern {
  background:
    linear-gradient(
      118deg,
      transparent 0%,
      transparent 56%,
      rgb(255 255 255 / 10%)
        56.3%,
      rgb(255 255 255 / 4%)
        76%,
      transparent 76.3%
    ),
    radial-gradient(
      circle at 88% 18%,
      rgb(255 255 255 / 14%),
      transparent 24%
    );
}

.layout-diagonal
  .student-photo {
  transform: rotate(-2deg);
}

.layout-portrait
  .identity-area {
  grid-template-columns:
    minmax(0, 1fr)
    minmax(7rem, 30%);
}

.layout-portrait
  .student-photo {
  grid-column: 2;
  grid-row: 1;
}

.layout-portrait
  .identity-copy {
  grid-column: 1;
  grid-row: 1;
}

.layout-portrait
  .identity-name {
  font-size: clamp(
    1rem,
    3.5vw,
    1.55rem
  );
}

/* BACK */
.library-card-back {
  background: var(--card-primary);
}

.back-decoration {
  background:
    radial-gradient(
      circle at 90% 8%,
      rgb(56 189 248 / 18%),
      transparent 28%
    ),
    linear-gradient(
      145deg,
      transparent 0%,
      rgb(255 255 255 / 5%)
        48%,
      transparent 49%
    );
}

.back-content {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  padding:
    clamp(0.95rem, 3.2vw, 1.35rem);
}

.back-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.back-eyebrow {
  margin: 0;
  color: var(--card-accent);
  font-size: clamp(
    0.42rem,
    1.45vw,
    0.56rem
  );
  font-weight: 900;
  letter-spacing: 0.17em;
}

.back-header h2 {
  margin: 0.18rem 0 0;
  font-size: clamp(
    0.78rem,
    2.6vw,
    1.05rem
  );
  font-weight: 900;
  letter-spacing: 0.045em;
}

.back-notice {
  margin-top: 0.45rem;
  border-radius: 0.6rem;
  background:
    rgb(255 255 255 / 9%);
  padding: 0.38rem 0.65rem;
  color: var(--card-muted);
  text-align: center;
  font-size: clamp(
    0.4rem,
    1.35vw,
    0.53rem
  );
  font-weight: 900;
  letter-spacing: 0.065em;
}

.back-body {
  display: grid;
  grid-template-columns:
    minmax(0, 1.15fr)
    minmax(8.5rem, 0.85fr);
  min-height: 0;
  flex: 1;
  gap: 0.7rem;
  margin-top: 0.6rem;
}

.cardholder-panel,
.credential-panel {
  border: 1px solid
    rgb(255 255 255 / 16%);
  border-radius: 0.85rem;
  background:
    rgb(255 255 255 / 8%);
}

.cardholder-panel {
  min-width: 0;
  padding: 0.65rem;
}

.cardholder-heading {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid
    rgb(255 255 255 / 14%);
}

.cardholder-avatar {
  display: flex;
  width: 2.35rem;
  height: 2.35rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background:
    var(--card-accent);
  color: var(--card-primary);
  font-size: 0.72rem;
  font-weight: 900;
}

.cardholder-heading span,
.credential-card-no span {
  display: block;
  color: var(--card-muted);
  font-size: clamp(
    0.36rem,
    1.2vw,
    0.48rem
  );
  font-weight: 800;
  letter-spacing: 0.1em;
}

.cardholder-heading strong {
  display: block;
  margin-top: 0.08rem;
  font-size: clamp(
    0.5rem,
    1.7vw,
    0.68rem
  );
  line-height: 1.12;
}

.student-detail-grid {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 0.42rem 0.6rem;
  margin: 0.55rem 0 0;
}

.student-detail-grid div {
  min-width: 0;
}

.student-detail-grid dt {
  color: var(--card-muted);
  font-size: clamp(
    0.34rem,
    1.05vw,
    0.44rem
  );
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.student-detail-grid dd {
  margin: 0.08rem 0 0;
  overflow: hidden;
  color: var(--card-text);
  font-size: clamp(
    0.42rem,
    1.35vw,
    0.54rem
  );
  font-weight: 800;
  line-height: 1.18;
  text-overflow: ellipsis;
}

.detail-wide {
  grid-column: 1 / -1;
}

.credential-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 0.65rem;
}

.barcode-panel {
  display: flex;
  min-height: 4.7rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 0.55rem;
  background: #FFFFFF;
  padding: 0.24rem;
}

.barcode-svg {
  display: block;
  width: 100%;
  height: 4.2rem;
  min-height: 4.2rem;
  overflow: visible;
}

.barcode-missing {
  display: flex;
  min-height: 4.2rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #475569;
  text-align: center;
}

.barcode-missing strong,
.barcode-missing span {
  display: block;
}

.barcode-missing strong {
  font-size: 0.7rem;
}

.barcode-missing span {
  margin-top: 0.15rem;
  font-size: 0.55rem;
}

.barcode-error {
  color: #B91C1C;
  font-size: 0.55rem;
}

.credential-card-no {
  margin-top: 0.48rem;
  text-align: center;
}

.credential-card-no strong {
  display: block;
  margin-top: 0.1rem;
  color: var(--card-text);
  font-family:
    "Courier New",
    monospace;
  font-size: clamp(
    0.58rem,
    2vw,
    0.78rem
  );
  font-weight: 900;
}

.signature-block {
  margin-top: auto;
  padding-top: 0.55rem;
  text-align: center;
}

.signature-line {
  display: block;
  margin-bottom: 0.18rem;
  border-top: 1px solid
    rgb(255 255 255 / 45%);
}

.signature-block strong,
.signature-block small {
  display: block;
}

.signature-block strong {
  font-size: clamp(
    0.4rem,
    1.35vw,
    0.54rem
  );
}

.signature-block small {
  margin-top: 0.08rem;
  color: var(--card-muted);
  font-size: clamp(
    0.32rem,
    1vw,
    0.42rem
  );
  font-weight: 800;
}

.back-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.42rem;
  color: var(--card-muted);
  font-size: clamp(
    0.34rem,
    1.1vw,
    0.44rem
  );
  font-weight: 700;
}

.back-footer span {
  max-width: 82%;
}

.back-footer strong {
  color: var(--card-text);
}

 .back-body-barcode-only {
  grid-template-columns: 1fr;
}

.back-body-barcode-only
  .credential-panel {
  width: min(100%, 22rem);
  justify-self: center;
}

/* BACK LAYOUT OPTIONS */
.back-layout-profile
  .back-body {
  grid-template-columns: 1fr;
  grid-template-rows:
    minmax(0, 1fr)
    auto;
}

.back-layout-profile
  .cardholder-panel {
  padding: 0.55rem 0.65rem;
}

.back-layout-profile
  .student-detail-grid {
  grid-template-columns:
    repeat(3, minmax(0, 1fr));
}

.back-layout-profile
  .credential-panel {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    minmax(8rem, 0.55fr);
  grid-template-rows: auto auto;
  align-items: center;
  gap: 0.35rem 0.65rem;
}

.back-layout-profile
  .barcode-panel {
  grid-row: 1 / 3;
}

.back-layout-profile
  .credential-card-no,
.back-layout-profile
  .signature-block {
  margin: 0;
  padding: 0;
}

.back-layout-minimal
  .back-body {
  grid-template-columns: 1fr;
}

.back-layout-minimal
  .cardholder-panel {
  display: none;
}

.back-layout-minimal
  .credential-panel {
  align-items: center;
  justify-content: center;
  padding: 1rem 1.5rem;
}

.back-layout-minimal
  .barcode-panel {
  width: 82%;
  min-height: 5.4rem;
}

.back-layout-minimal
  .signature-block {
  width: 62%;
}

.back-light {
  background:
    var(--card-surface);
  color: var(--card-primary);
}

.back-light
  .back-decoration {
  background:
    linear-gradient(
      145deg,
      rgb(15 39 71 / 7%),
      transparent
    );
}

.back-light
  .back-header h2,
.back-light
  .credential-card-no strong,
.back-light
  .back-footer strong,
.back-light
  .student-detail-grid dd,
.back-light
  .cardholder-heading strong {
  color: var(--card-primary);
}

.back-light
  .back-notice,
.back-light
  .cardholder-panel,
.back-light
  .credential-panel {
  border-color: #CBD5E1;
  background: #F8FAFC;
}

.back-light
  .back-notice,
.back-light
  .back-footer,
.back-light
  .back-eyebrow,
.back-light
  .cardholder-heading span,
.back-light
  .credential-card-no span,
.back-light
  .student-detail-grid dt,
.back-light
  .signature-block small {
  color: #475569;
}

.back-light
  .cardholder-heading,
.back-light
  .signature-line {
  border-color: #94A3B8;
}

.back-gradient {
  background:
    linear-gradient(
      135deg,
      var(--card-primary),
      var(--card-secondary)
    );
}

@media (min-width: 1240px) {
  .library-card-pair {
    grid-template-columns:
      minmax(0, 1fr)
      minmax(0, 1fr);
    align-items: start;
  }

  .designer-preview,
  .single-side-preview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .brand-tagline {
    display: none;
  }

  .back-body {
    grid-template-columns:
      minmax(0, 1fr)
      minmax(6.8rem, 0.75fr);
  }

  .student-detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
