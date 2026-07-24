<script setup lang="ts">
import type {
  MembershipRecord,
  StudentMember,
} from "~/composables/useLibraryMembers";
import {
  normalizeLibraryCardDesign,
  type LibraryCardDesign,
} from "~/composables/useLibraryCardDesign";

type DownloadSide =
  | "front"
  | "back"
  | "both";

const props = withDefaults(
  defineProps<{
    student: StudentMember;
    membership?: MembershipRecord | null;
    showActions?: boolean;
    design?: Partial<LibraryCardDesign>;
    previewMode?: boolean;
  }>(),
  {
    membership: null,
    showActions: true,
    design: undefined,
    previewMode: false,
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
const barcodeElement =
  ref<SVGSVGElement | null>(null);

const downloading =
  ref<DownloadSide | null>(null);
const logoFailed = ref(false);
const backgroundFailed = ref(false);
const barcodeError = ref("");

const activeMembership = computed(
  () =>
    props.membership ??
    props.student.membership,
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

const resolvedBackground = computed(
  () =>
    designStore.assetUrl(
      cardDesign.value.backgroundImage,
    ),
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
      "--card-background-position":
        cardDesign.value.backgroundPosition,
    }) as Record<string, string>,
);

const yearRows = [
  {
    value: 1,
    label: "1ST YEAR",
  },
  {
    value: 2,
    label: "2ND YEAR",
  },
  {
    value: 3,
    label: "3RD YEAR",
  },
  {
    value: 4,
    label: "4TH YEAR",
  },
  {
    value: 5,
    label: "5TH YEAR",
  },
];

const semesterColumns = [
  {
    value: "First Semester",
    label: "1ST SEM",
  },
  {
    value: "Second Semester",
    label: "2ND SEM",
  },
  {
    value: "Summer",
    label: "SUMMER",
  },
];

function validityText(
  yearLevel: number,
  semester: string,
): string {
  const membership =
    activeMembership.value;

  if (
    !membership ||
    props.student.yearLevel !==
      yearLevel ||
    membership.semester !==
      semester
  ) {
    return "";
  }

  return membership.academicYear;
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "NOT VALID";
  }

  const date = new Date(
    `${value}T00:00:00+08:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      month: "short",
      day: "2-digit",
      year: "numeric",
      timeZone: "Asia/Manila",
    },
  )
    .format(date)
    .toUpperCase();
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
    !cardDesign.value.showBarcode
  ) {
    return;
  }

  try {
    barcodeError.value = "";

    const { default: JsBarcode } =
      await import("jsbarcode");

    JsBarcode(
      barcodeElement.value,
      props.student.barcode,
      {
        format: "CODE128",
        width: 1.45,
        height: 42,
        margin: 2,
        displayValue: true,
        fontSize: 10,
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

        // The card uses system-safe fonts.
        // Prevent html-to-image from parsing and
        // downloading Nuxt's generated /_fonts URLs.
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
  await renderBarcode();
});

watch(
  resolvedBackground,
  () => {
    backgroundFailed.value = false;
  },
);

watch(
  [
    () => props.student.barcode,
    () => cardDesign.value.primaryColor,
    () => cardDesign.value.showBarcode,
  ],
  async () => {
    await nextTick();
    await renderBarcode();
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
      ref="bothCards"
      class="library-card-pair"
      :class="{
        'designer-preview':
          previewMode,
      }"
      :style="cssVariables"
    >
      <!-- MODERN FRONT -->
      <section
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
            <div
              class="brand-lockup"
            >
              <div
                v-if="
                  cardDesign.showLogo
                "
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
                v-if="
                  studentPhotoUrl()
                "
                :src="
                  studentPhotoUrl()
                "
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
                v-if="
                  cardDesign.showCourse
                "
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
              {{
                membershipStatus
              }}
            </div>
          </footer>
        </div>
      </section>

      <!-- MODERN BACK -->
      <section
        ref="backCard"
        class="library-card-shell library-card-back"
        :class="backClass"
        aria-label="Back of student library card"
      >
        <div class="back-glow" />

        <div class="back-content">
          <header class="back-header">
            <div>
              <p class="back-eyebrow">
                SNCBT LIBRARY ACCESS
              </p>
              <h2>
                {{
                  cardDesign.validityTitle
                }}
              </h2>
            </div>

            <div
              v-if="
                cardDesign
                  .showMembershipStatus
              "
              class="back-status"
              :class="
                statusLabelClass
              "
            >
              {{ membershipStatus }}
            </div>
          </header>

          <div class="back-notice">
            {{
              cardDesign.noticeText
            }}
          </div>

          <div class="back-grid">
            <div
              v-if="
                cardDesign
                  .showValidityTable
              "
              class="validity-panel"
            >
              <div
                class="validity-summary"
              >
                <div>
                  <span>
                    CURRENT TERM
                  </span>
                  <strong>
                    {{
                      activeMembership
                        ?.semester ??
                      "NOT RENEWED"
                    }}
                  </strong>
                </div>

                <div>
                  <span>
                    VALID UNTIL
                  </span>
                  <strong>
                    {{
                      formatDate(
                        activeMembership
                          ?.expiryDate,
                      )
                    }}
                  </strong>
                </div>
              </div>

              <table
                class="validity-table"
                aria-label="Semester validity table"
              >
                <thead>
                  <tr>
                    <th>
                      LEVEL
                    </th>
                    <th
                      v-for="
                        column in
                        semesterColumns
                      "
                      :key="
                        column.value
                      "
                    >
                      {{
                        column.label
                      }}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  <tr
                    v-for="
                      row in yearRows
                    "
                    :key="row.value"
                  >
                    <th>
                      {{ row.label }}
                    </th>

                    <td
                      v-for="
                        column in
                        semesterColumns
                      "
                      :key="
                        column.value
                      "
                      :class="{
                        'validity-current':
                          validityText(
                            row.value,
                            column.value,
                          ),
                      }"
                    >
                      {{
                        validityText(
                          row.value,
                          column.value,
                        )
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="credential-panel">
              <div class="credential-card-no">
                <span>
                  CARD NUMBER
                </span>
                <strong>
                  {{
                    student.libraryCardNo
                  }}
                </strong>
              </div>

              <div
                v-if="
                  cardDesign.showBarcode
                "
                class="barcode-panel"
              >
                <svg
                  ref="barcodeElement"
                  class="barcode-svg"
                  role="img"
                  :aria-label="`Library barcode for ${student.fullName}`"
                />

                <p
                  v-if="barcodeError"
                  class="barcode-error"
                >
                  {{ barcodeError }}
                </p>
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
.library-card-pair {
  display: grid;
  gap: 1.25rem;
  justify-items: center;
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
  isolation: isolate;
}

.front-background,
.front-overlay,
.front-pattern,
.back-glow {
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
      circle at 80% 18%,
      color-mix(
        in srgb,
        var(--card-accent)
          28%,
        transparent
      ),
      transparent 27%
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

.institution-logo {
  display: flex;
  width: 3.15rem;
  height: 3.15rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid
    rgb(255 255 255 / 82%);
  border-radius: 9999px;
  background: rgb(255 255 255 / 92%);
  color: var(--card-primary);
  font-size: 0.58rem;
  font-weight: 900;
  box-shadow:
    0 8px 18px
      rgb(0 0 0 / 18%);
}

.institution-logo img {
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

.identity-meta span,
.credential-card-no span,
.validity-summary span {
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

.front-status,
.back-status {
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

/* Split preset */
.layout-split
  .front-overlay {
  background:
    linear-gradient(
      90deg,
      var(--card-primary)
        0%,
      var(--card-primary)
        61%,
      rgb(7 26 51 / 48%)
        61.5%,
      rgb(7 26 51 / 22%)
        100%
    );
}

.layout-split
  .identity-area {
  max-width: 72%;
}

/* Minimal preset */
.layout-minimal {
  color: var(--card-primary);
  background: var(--card-surface);
}

.layout-minimal
  .front-background {
  opacity: 0.11;
}

.layout-minimal
  .front-overlay {
  background:
    linear-gradient(
      90deg,
      rgb(255 255 255 / 97%)
        0%,
      rgb(255 255 255 / 93%)
        64%,
      rgb(255 255 255 / 55%)
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

/* Back */
.library-card-back {
  background:
    var(--card-primary);
}

.back-glow {
  background:
    radial-gradient(
      circle at 86% 12%,
      color-mix(
        in srgb,
        var(--card-accent)
          30%,
        transparent
      ),
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
    clamp(1rem, 3.5vw, 1.4rem);
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
    0.74rem,
    2.5vw,
    1rem
  );
  font-weight: 900;
  letter-spacing: 0.045em;
}

.back-notice {
  margin-top: 0.55rem;
  border-radius: 0.6rem;
  background:
    rgb(255 255 255 / 9%);
  padding: 0.4rem 0.65rem;
  color: var(--card-muted);
  text-align: center;
  font-size: clamp(
    0.42rem,
    1.45vw,
    0.56rem
  );
  font-weight: 900;
  letter-spacing: 0.08em;
}

.back-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.45fr)
    minmax(8rem, 0.8fr);
  flex: 1;
  gap: 0.75rem;
  align-items: stretch;
  margin-top: 0.65rem;
}

.validity-panel,
.credential-panel {
  border: 1px solid
    rgb(255 255 255 / 15%);
  border-radius: 0.85rem;
  background:
    rgb(255 255 255 / 8%);
  backdrop-filter:
    blur(8px);
}

.validity-panel {
  padding: 0.55rem;
}

.validity-summary {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.42rem;
}

.validity-summary strong {
  display: block;
  margin-top: 0.08rem;
  font-size: clamp(
    0.48rem,
    1.65vw,
    0.64rem
  );
}

.validity-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 2px;
  font-size: clamp(
    0.36rem,
    1.25vw,
    0.49rem
  );
}

.validity-table th,
.validity-table td {
  height: clamp(
    0.95rem,
    3vw,
    1.2rem
  );
  border-radius: 0.22rem;
  padding: 0.08rem;
  text-align: center;
  vertical-align: middle;
}

.validity-table thead th {
  background:
    rgb(255 255 255 / 16%);
  color: var(--card-muted);
  font-weight: 900;
}

.validity-table tbody th {
  background:
    rgb(255 255 255 / 10%);
  color: var(--card-muted);
  font-weight: 900;
}

.validity-table td {
  background:
    rgb(255 255 255 / 6%);
  color: var(--card-text);
  font-weight: 700;
}

.validity-current {
  background:
    var(--card-accent) !important;
  color:
    var(--card-primary) !important;
  font-weight: 900 !important;
}

.credential-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 0.65rem;
}

.credential-card-no strong {
  display: block;
  margin-top: 0.12rem;
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

.barcode-panel {
  display: flex;
  min-height: 4.1rem;
  margin-top: 0.6rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 0.55rem;
  background: #FFFFFF;
  padding: 0.2rem;
}

.barcode-svg {
  display: block;
  width: 100%;
  height: auto;
  max-height: 3.6rem;
}

.barcode-error {
  color: #B91C1C;
  font-size: 0.55rem;
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
    0.42rem,
    1.45vw,
    0.56rem
  );
}

.signature-block small {
  margin-top: 0.08rem;
  color: var(--card-muted);
  font-size: clamp(
    0.34rem,
    1.1vw,
    0.44rem
  );
  font-weight: 800;
}

.back-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.48rem;
  color: var(--card-muted);
  font-size: clamp(
    0.36rem,
    1.2vw,
    0.47rem
  );
  font-weight: 700;
}

.back-footer strong {
  color: var(--card-text);
}

/* Light back preset */
.back-light {
  background:
    var(--card-surface);
  color: var(--card-primary);
}

.back-light
  .back-glow {
  background:
    linear-gradient(
      145deg,
      color-mix(
        in srgb,
        var(--card-secondary)
          9%,
        transparent
      ),
      transparent
    );
}

.back-light
  .back-header h2,
.back-light
  .credential-card-no strong,
.back-light
  .back-footer strong {
  color: var(--card-primary);
}

.back-light
  .back-notice,
.back-light
  .validity-panel,
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
  .validity-summary span,
.back-light
  .signature-block small {
  color: #475569;
}

.back-light
  .validity-table thead th,
.back-light
  .validity-table tbody th {
  background: #E8EEF6;
  color: var(--card-primary);
}

.back-light
  .validity-table td {
  background: #F1F5F9;
  color: var(--card-primary);
}

.back-light
  .signature-line {
  border-color: #64748B;
}

@media (min-width: 1240px) {
  .library-card-pair {
    grid-template-columns:
      minmax(0, 1fr)
      minmax(0, 1fr);
    align-items: start;
  }

  .designer-preview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .brand-tagline {
    display: none;
  }

  .back-grid {
    grid-template-columns:
      minmax(0, 1fr)
      minmax(6.7rem, 0.72fr);
  }
}
</style>
