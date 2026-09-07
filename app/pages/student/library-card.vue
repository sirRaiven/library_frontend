<script setup lang="ts">
import StudentLibraryCard from
  "~/components/librarian/StudentLibraryCard.vue";
import type {
  MembershipRecord,
  MembershipStatus,
  StudentMember,
} from "~/composables/useLibraryMembers";
import type {
  LibraryCardDesign,
} from "~/composables/useLibraryCardDesign";

type CardSide =
  | "front"
  | "back"
  | "both";

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "Digital Library Card",
  roleTitle: "Student",
});

const libraryCard =
  useStudentLibraryCard();
const librarySettings = useLibrarySettings();
const toast = useToast();
const displaySide =
  ref<Exclude<CardSide, "both">>(
    "front",
  );

const watermarkItems = Array.from(
  { length: 12 },
  (_, index) => index,
);
const watermarkClock = ref(new Date());
let watermarkTimer: ReturnType<typeof setInterval> | null = null;
let lastProtectionNotice = 0;

const watermarkText = computed(() => {
  const student = libraryCard.card.value?.student;
  const viewedAt = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(watermarkClock.value);

  if (!student) return `SNCBT LIBRARY • VIEW ONLY • ${viewedAt}`;

  return `${student.fullName} • ${student.studentNo} • VIEW ONLY • ${viewedAt}`;
});

function notifyViewOnlyProtection() {
  const now = Date.now();
  if (now - lastProtectionNotice < 2500) return;
  lastProtectionNotice = now;

  toast.add({
    title: "View-only Library Card",
    description:
      "Downloading, printing, copying, and ordinary save actions are disabled. Present the live card from your authenticated Student Portal.",
    color: "warning",
    icon: "i-lucide-shield-alert",
  });
}

function formatDate(
  value: string | null,
) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Manila",
    },
  ).format(
    new Date(
      `${value.slice(0, 10)}T00:00:00+08:00`,
    ),
  );
}

function formatDateTime(
  value: string | null,
) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat(
    "en-PH",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Manila",
    },
  ).format(new Date(value));
}

function daysDescription(
  days: number | null,
) {
  if (days === null) {
    return "No expiry date recorded";
  }

  if (days < 0) {
    const count = Math.abs(days);
    return `Expired ${count} day${
      count === 1 ? "" : "s"
    } ago`;
  }

  if (days === 0) {
    return "Expires today";
  }

  return `${days} day${
    days === 1 ? "" : "s"
  } remaining`;
}

function membershipStatus(
  value: string,
): MembershipStatus {
  if (
    value === "Active" ||
    value === "Expired" ||
    value === "Suspended" ||
    value === "Cancelled"
  ) {
    return value;
  }

  return null;
}

const membershipRecord = computed<
  MembershipRecord | null
>(() => {
  const source =
    libraryCard.card.value?.membership;

  if (!source?.documentId) {
    return null;
  }

  const status =
    membershipStatus(source.status);

  const storedSemester = source.semester?.trim() || null;
  const operationalSemester =
    librarySettings.settings.value.general.currentSemester?.trim() || null;
  const semester = storedSemester ?? operationalSemester ?? "Not recorded";

  return {
    documentId: source.documentId,
    membershipNo:
      source.membershipNo ?? "",
    academicYear:
      source.academicYear ?? "",
    semester,
    issuedDate: source.issuedDate ?? "",
    expiryDate: source.expiryDate ?? "",
    status,
    storedStatus: status ?? "Expired",
    renewalType:
      source.renewalType === "Renewal"
        ? "Renewal"
        : "Initial",
    enrollmentVerified:
      source.enrollmentVerified,
    verifiedAt: source.verifiedAt,
  };
});

const studentRecord = computed<
  StudentMember | null
>(() => {
  const source =
    libraryCard.card.value?.student;

  if (!source) {
    return null;
  }

  return {
    documentId: source.documentId,
    studentNo: source.studentNo,
    libraryCardNo:
      source.libraryCardNo ?? "",
    barcode:
      source.barcode ??
      source.libraryCardNo ??
      source.studentNo,
    firstName: source.firstName,
    middleName: source.middleName,
    lastName: source.lastName,
    suffix: source.suffix,
    fullName: source.fullName,
    sex: source.sex,
    educationalLevel:
      source.educationalLevel as
        StudentMember["educationalLevel"],
    course: source.course,
    yearLevel: source.yearLevel,
    section: source.section ?? "",
    email: source.email ?? "",
    contactNo: source.contactNo ?? "",
    address: source.address ?? "",
    photoUrl: source.photoUrl,
    libraryCardStatus:
      source.libraryCardStatus as
        StudentMember["libraryCardStatus"],
    libraryCardReleaseDate:
      source.libraryCardReleaseDate,
    status: source.studentStatus as
      StudentMember["status"],
    membership:
      membershipRecord.value,
  };
});

const activeDesign = computed<
  Partial<LibraryCardDesign>
>(() =>
  libraryCard.card.value?.design
    ?.config ?? {},
);

async function load() {
  try {
    await Promise.all([
      libraryCard.load(),
      librarySettings.load().catch(() => undefined),
    ]);
  } catch {
    toast.add({
      title:
        "Unable to load your Library Card",
      description:
        libraryCard.error.value,
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

onMounted(() => {
  void load();
  watermarkTimer = setInterval(() => {
    watermarkClock.value = new Date();
  }, 60_000);
});

onBeforeUnmount(() => {
  if (watermarkTimer) clearInterval(watermarkTimer);
});
</script>

<template>
  <div class="sncbt-page-shell space-y-6 ">
    <StudentPageHeader
      eyebrow="Membership and Identification"
      title="Digital Library Card"
      description="Present your live, view-only Library Card and review your current membership validity from your authenticated Student account."
      icon="i-lucide-id-card"
    >
      <template #actions>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="libraryCard.loading.value"
          @click="load"
        />
      </template>
    </StudentPageHeader>

    <UAlert
      v-if="libraryCard.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Library Card record could not be loaded"
      :description="libraryCard.error.value"
    />

    <div
      v-if="libraryCard.loading.value && !libraryCard.card.value"
      class="space-y-4"
    >
      <USkeleton class="aspect-[2.9/1] w-full rounded-3xl" />
      <div class="grid gap-4 md:grid-cols-2">
        <USkeleton class="h-56 rounded-2xl" />
        <USkeleton class="h-56 rounded-2xl" />
      </div>
    </div>

    <template v-else-if="libraryCard.card.value">
      <UAlert
        v-if="!libraryCard.card.value.eligibility.canUseDigitalCard"
        color="warning"
        variant="soft"
        icon="i-lucide-shield-alert"
        title="Library Card verification is required"
        description="You may review the record, but the card is not valid for Library transactions until all eligibility requirements are satisfied."
      >
        <template #actions>
          <UButton
            to="/student/dashboard"
            label="Review Account Notices"
            color="warning"
            variant="outline"
            size="sm"
          />
        </template>
      </UAlert>

      <UAlert
        color="warning"
        variant="soft"
        icon="i-lucide-shield-ban"
        title="View-only digital identification"
        description="Downloading and browser printing are disabled. Do not capture, copy, or share this card. Library personnel may require the live Student Portal display for verification."
      />

      <UCard
        :ui="{
          body: 'space-y-5 p-4 sm:p-6',
        }"
      >
        <template #header>
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="flex items-start gap-3">
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              >
                <UIcon
                  name="i-lucide-palette"
                  class="size-5"
                />
              </div>

              <div>
                <h2
                  class="font-bold text-highlighted"
                >
                  Official Student Library Card
                </h2>
                <p class="text-sm text-muted">
                  Uses the active layout saved by the Librarian in the Library Card Designer.
                </p>
                <p
                  class="mt-1 text-xs font-semibold text-primary"
                >
                  Active design:
                  {{
                    libraryCard.card.value.design.name
                  }}
                  <span
                    v-if="libraryCard.card.value.design.updatedAt"
                    class="font-normal text-muted"
                  >
                    • Updated
                    {{
                      formatDateTime(
                        libraryCard.card.value.design.updatedAt,
                      )
                    }}
                  </span>
                </p>
              </div>
            </div>

            <div
              class="inline-flex w-fit rounded-xl border border-default bg-elevated/40 p-1"
            >
              <UButton
                label="Front"
                icon="i-lucide-contact"
                size="sm"
                :color="
                  displaySide === 'front'
                    ? 'primary'
                    : 'neutral'
                "
                :variant="
                  displaySide === 'front'
                    ? 'solid'
                    : 'ghost'
                "
                @click="() => { displaySide = 'front'; }"
              />
              <UButton
                label="Back"
                icon="i-lucide-scan-barcode"
                size="sm"
                :color="
                  displaySide === 'back'
                    ? 'primary'
                    : 'neutral'
                "
                :variant="
                  displaySide === 'back'
                    ? 'solid'
                    : 'ghost'
                "
                @click="() => { displaySide = 'back'; }"
              />
            </div>
          </div>
        </template>

        <div
          v-if="studentRecord"
          class="protected-card-display relative overflow-hidden rounded-2xl"
          role="img"
          aria-label="View-only Student Library Card"
          @contextmenu.prevent="notifyViewOnlyProtection"
          @copy.prevent="notifyViewOnlyProtection"
          @cut.prevent="notifyViewOnlyProtection"
          @dragstart.prevent="notifyViewOnlyProtection"
        >
          <StudentLibraryCard
            :student="studentRecord"
            :membership="membershipRecord"
            :design="activeDesign"
            :display-side="displaySide"
            :show-actions="false"
            :allow-export="false"
            fit-preview
          />

          <div
            class="pointer-events-none absolute inset-0 z-20 grid select-none grid-cols-2 content-around overflow-hidden opacity-[0.16]"
            aria-hidden="true"
          >
            <span
              v-for="item in watermarkItems"
              :key="item"
              class="-rotate-[24deg] whitespace-nowrap px-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-xs"
            >
              {{ watermarkText }}
            </span>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex items-start gap-3">
            <UIcon
              name="i-lucide-eye"
              class="mt-0.5 size-5 shrink-0 text-warning"
            />
            <div>
              <p class="text-sm font-bold text-highlighted">
                Live Student Portal display only
              </p>
              <p class="mt-1 text-xs text-muted">
                Download and print controls are not available. Present this page while signed in when Library personnel request identification.
              </p>
            </div>
          </div>

          <UBadge
            label="VIEW ONLY"
            color="warning"
            variant="soft"
            size="lg"
            class="w-fit shrink-0"
          />
        </div>

        <p
          class="rounded-xl border border-default bg-elevated/30 p-3 text-xs text-muted"
        >
          Changes saved by the Librarian in
          <strong>Card Designer</strong> are loaded here after Refresh. Student accounts can view the design but cannot download or print it.
        </p>
      </UCard>

      <div class="grid gap-5 xl:grid-cols-2 mb-12">
        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon name="i-lucide-badge-check" class="size-5" />
              </div>
              <div>
                <h2 class="font-bold text-highlighted">Membership Record</h2>
                <p class="text-sm text-muted">Current term and eligibility information</p>
              </div>
            </div>
          </template>

          <dl class="grid gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-bold uppercase tracking-wide text-muted">Membership Number</dt>
              <dd class="mt-1 font-semibold text-highlighted">
                {{ libraryCard.card.value.membership.membershipNo || 'Not registered' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-wide text-muted">Status</dt>
              <dd class="mt-1">
                <StudentStatusBadge :status="libraryCard.card.value.membership.status" />
              </dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-wide text-muted">Academic Year</dt>
              <dd class="mt-1 font-semibold text-highlighted">
                {{ libraryCard.card.value.membership.academicYear || 'Not available' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-wide text-muted">Semester</dt>
              <dd class="mt-1 font-semibold text-highlighted">
                {{ libraryCard.card.value.membership.semester || 'Not available' }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-wide text-muted">Issued Date</dt>
              <dd class="mt-1 font-semibold text-highlighted">
                {{ formatDate(libraryCard.card.value.membership.issuedDate) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-wide text-muted">Expiry Date</dt>
              <dd class="mt-1 font-semibold text-highlighted">
                {{ formatDate(libraryCard.card.value.membership.expiryDate) }}
              </dd>
              <p class="mt-1 text-xs text-muted">
                {{ daysDescription(libraryCard.card.value.membership.daysRemaining) }}
              </p>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-wide text-muted">Enrollment Verification</dt>
              <dd class="mt-1">
                <StudentStatusBadge
                  :status="libraryCard.card.value.membership.enrollmentVerified ? 'Verified' : 'Not Verified'"
                />
              </dd>
            </div>
            <div>
              <dt class="text-xs font-bold uppercase tracking-wide text-muted">Library Card Status</dt>
              <dd class="mt-1">
                <StudentStatusBadge :status="libraryCard.card.value.student.libraryCardStatus" />
              </dd>
            </div>
          </dl>
        </UCard>

        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <template #header>
            <div class="flex items-center gap-3">
              <div
                class="flex size-10 items-center justify-center rounded-xl"
                :class="libraryCard.card.value.renewal.required
                  ? 'bg-warning/10 text-warning'
                  : 'bg-success/10 text-success'"
              >
                <UIcon
                  :name="libraryCard.card.value.renewal.required
                    ? 'i-lucide-calendar-sync'
                    : 'i-lucide-circle-check-big'"
                  class="size-5"
                />
              </div>
              <div>
                <h2 class="font-bold text-highlighted">Membership Renewal</h2>
                <p class="text-sm text-muted">Requirements and next action</p>
              </div>
            </div>
          </template>

          <UAlert
            :color="libraryCard.card.value.renewal.required ? 'warning' : 'success'"
            variant="soft"
            :icon="libraryCard.card.value.renewal.required
              ? 'i-lucide-calendar-clock'
              : 'i-lucide-shield-check'"
            :title="libraryCard.card.value.renewal.required
              ? 'Renewal is required or approaching'
              : 'Membership remains current'"
            :description="libraryCard.card.value.renewal.message"
          />

          <ol class="mt-5 space-y-3">
            <li
              v-for="(requirement, index) in libraryCard.card.value.renewal.requirements"
              :key="requirement"
              class="flex gap-3 text-sm text-toned"
            >
              <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {{ index + 1 }}
              </span>
              <span>{{ requirement }}</span>
            </li>
          </ol>

          <p class="mt-5 rounded-xl border border-default bg-elevated/40 p-3 text-xs text-muted">
            Online membership renewal is not enabled. Library personnel must verify enrollment and update the official membership record.
          </p>
        </UCard>
      </div>

      <UAlert
        v-if="libraryCard.card.value.eligibility.reasons.length"
        color="warning"
        variant="outline"
        icon="i-lucide-list-checks"
        title="Requirements affecting Library Card validity"
      >
        <template #description>
          <ul class="mt-2 list-disc space-y-1 ps-5 text-sm">
            <li
              v-for="reason in libraryCard.card.value.eligibility.reasons"
              :key="reason"
            >
              {{ reason }}
            </li>
          </ul>
        </template>
      </UAlert>
    </template>

    <div class="print-only-warning" aria-hidden="true">
      <div>
        <strong>Printing is disabled.</strong>
        <span>Open the authenticated Student Portal to present the live Library Card.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.protected-card-display {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.print-only-warning {
  display: none;
}

@media print {
  .protected-card-display {
    display: none !important;
  }

  .print-only-warning {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex !important;
    align-items: center;
    justify-content: center;
    background: white;
    color: black;
    padding: 2rem;
    text-align: center;
  }

  .print-only-warning > div {
    display: grid;
    gap: 0.75rem;
    max-width: 36rem;
    border: 2px solid #111827;
    border-radius: 1rem;
    padding: 2rem;
  }
}
</style>
