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

type SharedCardApi = {
  downloadCard: (
    side: CardSide,
  ) => Promise<boolean>;
  printCard: (
    side?: CardSide,
  ) => Promise<boolean>;
};

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "Digital Library Card",
  roleTitle: "Student",
});

const libraryCard =
  useStudentLibraryCard();
const toast = useToast();
const sharedCard =
  ref<SharedCardApi | null>(null);
const displaySide =
  ref<Exclude<CardSide, "both">>(
    "front",
  );
const cardAction = ref<string | null>(
  null,
);

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

  const semester =
    source.semester ===
      "Second Semester" ||
    source.semester === "Summer"
      ? source.semester
      : "First Semester";

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
    await libraryCard.load();
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

async function downloadCard(
  side: CardSide,
) {
  if (
    !libraryCard.card.value
      ?.eligibility.canDownload ||
    !sharedCard.value ||
    cardAction.value
  ) {
    return;
  }

  cardAction.value =
    `download-${side}`;

  try {
    const completed =
      await sharedCard.value
        .downloadCard(side);

    if (completed) {
      await libraryCard.recordActivity(
        "download",
      );
    }
  } finally {
    cardAction.value = null;
  }
}

async function printCard() {
  if (
    !libraryCard.card.value
      ?.eligibility.canPrint ||
    !sharedCard.value ||
    cardAction.value
  ) {
    return;
  }

  cardAction.value =
    `print-${displaySide.value}`;

  try {
    const completed =
      await sharedCard.value.printCard(
        displaySide.value,
      );

    if (completed) {
      await libraryCard.recordActivity(
        "print",
      );
    }
  } finally {
    cardAction.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <StudentPageHeader
      eyebrow="Membership and Identification"
      title="Digital Library Card"
      description="Review your permanent Library Card, current membership validity, and renewal requirements from your authenticated Student account."
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
        title="Library verification is required"
        description="You may review the card, but downloading and printing are disabled until all eligibility requirements are satisfied."
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
                @click="displaySide = 'front'"
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
                @click="displaySide = 'back'"
              />
            </div>
          </div>
        </template>

        <StudentLibraryCard
          v-if="studentRecord"
          ref="sharedCard"
          :student="studentRecord"
          :membership="membershipRecord"
          :design="activeDesign"
          :display-side="displaySide"
          :show-actions="false"
          fit-preview
        />

        <div
          class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
        >
          <UButton
            label="Download Front"
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
            block
            :disabled="
              !libraryCard.card.value.eligibility.canDownload ||
              Boolean(cardAction)
            "
            :loading="cardAction === 'download-front'"
            @click="downloadCard('front')"
          />

          <UButton
            label="Download Back"
            icon="i-lucide-download"
            color="neutral"
            variant="outline"
            block
            :disabled="
              !libraryCard.card.value.eligibility.canDownload ||
              Boolean(cardAction)
            "
            :loading="cardAction === 'download-back'"
            @click="downloadCard('back')"
          />

          <UButton
            label="Download Both"
            icon="i-lucide-images"
            color="primary"
            variant="soft"
            block
            :disabled="
              !libraryCard.card.value.eligibility.canDownload ||
              Boolean(cardAction)
            "
            :loading="cardAction === 'download-both'"
            @click="downloadCard('both')"
          />

          <UButton
            :label="`Print ${
              displaySide === 'front'
                ? 'Front'
                : 'Back'
            }`"
            icon="i-lucide-printer"
            color="neutral"
            variant="outline"
            block
            :disabled="
              !libraryCard.card.value.eligibility.canPrint ||
              Boolean(cardAction)
            "
            :loading="
              cardAction ===
                `print-${displaySide}`
            "
            @click="printCard"
          />
        </div>

        <p
          class="rounded-xl border border-default bg-elevated/30 p-3 text-xs text-muted"
        >
          Changes saved by the Librarian in
          <strong>Card Designer</strong> are loaded here after Refresh. The Student Portal does not maintain a separate card layout.
        </p>
      </UCard>

      <div class="grid gap-5 xl:grid-cols-2">
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

      <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-shield-check" class="size-5 text-primary" />
              <h2 class="font-bold text-highlighted">Digital Card Usage</h2>
            </div>
          </template>

          <ul class="grid gap-3 sm:grid-cols-2">
            <li
              v-for="notice in libraryCard.card.value.usageNotice"
              :key="notice"
              class="flex gap-3 rounded-xl border border-default bg-elevated/30 p-3 text-sm text-toned"
            >
              <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{{ notice }}</span>
            </li>
          </ul>
        </UCard>

        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-building-2" class="size-5 text-primary" />
              <h2 class="font-bold text-highlighted">Library Contact</h2>
            </div>
          </template>

          <div class="space-y-3 text-sm">
            <p class="font-semibold text-highlighted">
              {{ libraryCard.card.value.institution.libraryName }}
            </p>
            <p v-if="libraryCard.card.value.institution.address" class="flex gap-2 text-muted">
              <UIcon name="i-lucide-map-pin" class="mt-0.5 size-4 shrink-0" />
              <span>{{ libraryCard.card.value.institution.address }}</span>
            </p>
            <p v-if="libraryCard.card.value.institution.contactEmail" class="flex gap-2 text-muted">
              <UIcon name="i-lucide-mail" class="mt-0.5 size-4 shrink-0" />
              <span>{{ libraryCard.card.value.institution.contactEmail }}</span>
            </p>
            <p v-if="libraryCard.card.value.institution.contactNumber" class="flex gap-2 text-muted">
              <UIcon name="i-lucide-phone" class="mt-0.5 size-4 shrink-0" />
              <span>{{ libraryCard.card.value.institution.contactNumber }}</span>
            </p>
          </div>
        </UCard>
      </div>

      <UAlert
        v-if="libraryCard.card.value.eligibility.reasons.length"
        color="warning"
        variant="outline"
        icon="i-lucide-list-checks"
        title="Requirements preventing digital-card use"
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
  </div>
</template>
