<script setup lang="ts">
import type {
  AdminLibrarySettings,
  AdminSettingsSection,
} from "~/composables/useAdminSettings";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Library Settings",
});

const api = useAdminSettings();
const libraryOptions = useLibraryOptions();
const auth = useAuth();
const toast = useToast();

const activeSection = ref<AdminSettingsSection>("general");
const loading = ref(false);
const savingSection = ref<AdminSettingsSection | null>(null);
const confirmOpen = ref(false);
const pendingSection = ref<AdminSettingsSection | null>(null);
const settings = ref<AdminLibrarySettings | null>(null);

const forms = reactive({
  general: {
    institutionName: "",
    libraryName: "",
    institutionAddress: "",
    contactEmail: "",
    contactNumber: "",
    timeZone: "Asia/Manila" as const,
    currentAcademicYear: "",
    currentSemester: "",
  },
  borrowing: {
    studentBorrowLimit: 5,
    facultyBorrowLimit: 10,
    studentLoanDays: 7,
    facultyLoanDays: 365,
    studentMaxRenewals: 1,
    facultyMaxRenewals: 2,
    allowBorrowWithOverdue: false,
    allowBorrowWithUnpaidFine: false,
  },
  membership: {
    validityMonths: 5,
    requireActiveStudentMembership: true,
    requireEnrollmentVerification: true,
    defaultLibraryCardStatus: "On Process" as
      | "None"
      | "On Process"
      | "Printed"
      | "Released",
    libraryCardReplacementFee: 0,
  },
  reservations: {
    studentMaxActiveReservations: 3,
    facultyMaxActiveReservations: 5,
    expirationDays: 3,
    pickupDays: 2,
    allowReserveAvailableBooks: true,
  },
  fines: {
    overdueFinePerDay: 0,
    graceDays: 0,
    maximumOverdueFine: 0,
    damagedBookFee: 0,
    lostBookProcessingFee: 0,
  },
});

const snapshots = reactive<Record<AdminSettingsSection, string>>({
  general: "",
  borrowing: "",
  membership: "",
  reservations: "",
  fines: "",
});

const sectionItems = [
  {
    value: "general" as const,
    label: "General Information",
    description: "Institution identity and current academic term",
    icon: "i-lucide-building-2",
  },
  {
    value: "borrowing" as const,
    label: "Borrowing Rules",
    description: "Book limits, loan periods, and restrictions",
    icon: "i-lucide-book-open-check",
  },
  {
    value: "membership" as const,
    label: "Membership and Cards",
    description: "Validity, verification, and Library Card rules",
    icon: "i-lucide-id-card",
  },
  {
    value: "reservations" as const,
    label: "Reservation Rules",
    description: "Reservation limits, expiration, and pickup periods",
    icon: "i-lucide-calendar-clock",
  },
  {
    value: "fines" as const,
    label: "Fines and Penalties",
    description: "Approved amounts for overdue, damaged, and lost books",
    icon: "i-lucide-receipt-text",
  },
];

const cardStatusItems = [
  "None",
  "On Process",
  "Printed",
  "Released",
];

const currentSection = computed(() =>
  sectionItems.find(item => item.value === activeSection.value)
  ?? sectionItems[0]!,
);

const pendingChanges = computed(() => {
  const section = pendingSection.value;
  if (!section || !settings.value) return [];

  const current = forms[section] as Record<string, unknown>;
  const original = settings.value[section] as Record<string, unknown>;

  return Object.keys(current).filter(
    key => JSON.stringify(current[key]) !== JSON.stringify(original[key]),
  );
});

function serialize(section: AdminSettingsSection) {
  return JSON.stringify(forms[section]);
}

function isDirty(section: AdminSettingsSection) {
  return serialize(section) !== snapshots[section];
}

function copyIntoForms(value: AdminLibrarySettings) {
  for (const section of [
    "general",
    "borrowing",
    "membership",
    "reservations",
    "fines",
  ] as AdminSettingsSection[]) {
    Object.assign(forms[section], value[section]);
    snapshots[section] = serialize(section);
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "Not updated yet";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

async function load(force = false) {
  if (loading.value) return;
  loading.value = true;

  try {
    settings.value = await api.get();
    copyIntoForms(settings.value);

    if (force) {
      toast.add({
        title: "Settings reloaded",
        description: "The latest saved Library rules are now displayed.",
        color: "success",
        icon: "i-lucide-refresh-cw",
      });
    }
  } catch (error) {
    toast.add({
      title: "Unable to load Library settings",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

function requestSave(section: AdminSettingsSection) {
  if (!settings.value || !isDirty(section)) return;
  pendingSection.value = section;
  confirmOpen.value = true;
}

function resetSection(section: AdminSettingsSection) {
  if (!settings.value) return;
  Object.assign(forms[section], settings.value[section]);
  snapshots[section] = serialize(section);
}

async function confirmSave() {
  const section = pendingSection.value;

  if (!section || !settings.value || savingSection.value) return;

  savingSection.value = section;

  try {
    const updated = await api.update(
      section,
      settings.value.version,
      { ...forms[section] } as never,
    );

    settings.value = updated;
    copyIntoForms(updated);
    confirmOpen.value = false;
    pendingSection.value = null;

    toast.add({
      title: "Library settings saved",
      description: `${sectionItems.find(item => item.value === section)?.label} were updated and recorded in the Audit Log.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    const message = auth.getErrorMessage(error);

    toast.add({
      title: "Settings were not saved",
      description: message,
      color: "error",
      icon: "i-lucide-circle-alert",
    });

    if (/changed by another administrator|version/i.test(message)) {
      await load();
      confirmOpen.value = false;
      pendingSection.value = null;
    }
  } finally {
    savingSection.value = null;
  }
}

function humanizeField(field: string) {
  const value = field.replace(/([A-Z])/g, " $1").trim();
  return value.charAt(0).toUpperCase() + value.slice(1);
}

onMounted(async () => {
  await Promise.allSettled([
    load(),
    libraryOptions.loadOperational(),
  ]);
});
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
    <AdminPageHeader
      eyebrow="Library Configuration"
      title="Library Settings"
      description="Control the official Library policies used for borrowing, memberships, reservations, and fines. Changes apply to future transactions and are recorded in the security Audit Log."
      icon="i-lucide-settings-2"
    >
      <template #actions>
        <UButton
          label="Reload"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="loading"
          @click="load(true)"
        />
        <UButton
          label="View Audit Log"
          icon="i-lucide-scroll-text"
          color="neutral"
          variant="soft"
          to="/admin/audit-logs"
        />
      </template>
    </AdminPageHeader>

    <UAlert
      v-if="libraryOptions.error.value"
      color="warning"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Semester options could not be refreshed"
      :description="libraryOptions.error.value"
      :actions="[{ label: 'Retry', onClick: () => libraryOptions.loadOperational() }]"
    />

    <UAlert
      color="warning"
      variant="soft"
      icon="i-lucide-shield-alert"
      title="Administrative policy changes affect Library operations"
      description="Review every value carefully. The server validates all limits, prevents simultaneous administrators from overwriting one another, and records successful and failed changes."
    />

    <div
      v-if="settings"
      class="grid gap-3 rounded-2xl border border-default bg-elevated/30 p-4 sm:grid-cols-3"
    >
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">
          Settings Version
        </p>
        <p class="mt-1 text-lg font-bold text-highlighted">
          Version {{ settings.version }}
        </p>
      </div>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">
          Last Updated
        </p>
        <p class="mt-1 text-sm font-semibold text-highlighted">
          {{ formatDateTime(settings.updatedAt) }}
        </p>
      </div>
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">
          Updated By
        </p>
        <p class="mt-1 text-sm font-semibold text-highlighted">
          {{ settings.updatedBy || "System default" }}
        </p>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <UCard :ui="{ body: 'p-2 sm:p-2' }" class="h-fit xl:sticky xl:top-6">
        <nav aria-label="Library settings sections" class="space-y-1">
          <button
            v-for="item in sectionItems"
            :key="item.value"
            type="button"
            class="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition"
            :class="activeSection === item.value
              ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
              : 'text-default hover:bg-elevated'"
            @click="activeSection = item.value"
          >
            <UIcon :name="item.icon" class="mt-0.5 size-5 shrink-0" />
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2 text-sm font-semibold">
                {{ item.label }}
                <span
                  v-if="isDirty(item.value)"
                  class="size-2 rounded-full bg-warning"
                  aria-label="Unsaved changes"
                />
              </span>
              <span class="mt-1 block text-xs leading-5 text-muted">
                {{ item.description }}
              </span>
            </span>
          </button>
        </nav>
      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="border-b border-default p-5 sm:p-6">
          <div class="flex items-start gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="currentSection.icon" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-bold text-highlighted">
                {{ currentSection.label }}
              </h2>
              <p class="mt-1 text-sm text-muted">
                {{ currentSection.description }}.
              </p>
            </div>
          </div>
        </div>

        <div v-if="loading && !settings" class="space-y-4 p-6">
          <USkeleton v-for="index in 6" :key="index" class="h-14 w-full" />
        </div>

        <div v-else class="p-5 sm:p-6">
          <div v-if="activeSection === 'general'" class="grid gap-5 md:grid-cols-2">
            <UFormField label="Institution Name" required>
              <UInput v-model="forms.general.institutionName" class="w-full" />
            </UFormField>
            <UFormField label="Library or Office Name" required>
              <UInput v-model="forms.general.libraryName" class="w-full" />
            </UFormField>
            <UFormField label="Institution Address" class="md:col-span-2">
              <UTextarea v-model="forms.general.institutionAddress" :rows="3" class="w-full" />
            </UFormField>
            <UFormField label="Contact Email">
              <UInput v-model="forms.general.contactEmail" type="email" class="w-full" />
            </UFormField>
            <UFormField label="Contact Number">
              <UInput v-model="forms.general.contactNumber" class="w-full" />
            </UFormField>
            <UFormField label="Current Academic Year" required>
              <UInput
                v-model="forms.general.currentAcademicYear"
                placeholder="2026-2027"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Current Semester" required>
              <USelect
                v-model="forms.general.currentSemester"
                :items="libraryOptions.semesters.value"
                value-key="value"
                label-key="label"
                placeholder="Select the current semester"
                class="w-full"
                :disabled="libraryOptions.loading.value"
              />
            </UFormField>
            <UFormField label="System Time Zone">
              <UInput v-model="forms.general.timeZone" disabled class="w-full" />
            </UFormField>
          </div>

          <div v-else-if="activeSection === 'borrowing'" class="space-y-6">
            <div class="grid gap-5 md:grid-cols-2">
              <UFormField label="Student Book Limit" hint="Maximum active borrowed books">
                <UInput v-model.number="forms.borrowing.studentBorrowLimit" type="number" min="1" max="20" class="w-full" />
              </UFormField>
              <UFormField label="Faculty Book Limit" hint="Maximum active borrowed books">
                <UInput v-model.number="forms.borrowing.facultyBorrowLimit" type="number" min="1" max="50" class="w-full" />
              </UFormField>
              <UFormField label="Student Loan Period" hint="Number of calendar days">
                <UInput v-model.number="forms.borrowing.studentLoanDays" type="number" min="1" max="90" class="w-full" />
              </UFormField>
              <UFormField label="Faculty Loan Period" hint="Use 365 for annual loans or set the number of days before the department audit">
                <UInput v-model.number="forms.borrowing.facultyLoanDays" type="number" min="1" max="730" class="w-full" />
              </UFormField>
              <UFormField label="Student Renewal Limit">
                <UInput v-model.number="forms.borrowing.studentMaxRenewals" type="number" min="0" max="5" class="w-full" />
              </UFormField>
              <UFormField label="Faculty Renewal Limit">
                <UInput v-model.number="forms.borrowing.facultyMaxRenewals" type="number" min="0" max="10" class="w-full" />
              </UFormField>
            </div>
            <div class="divide-y divide-default rounded-xl border border-default">
              <div class="flex items-start justify-between gap-4 p-4">
                <div>
                  <p class="text-sm font-semibold text-highlighted">Allow borrowing with an overdue book</p>
                  <p class="mt-1 text-xs leading-5 text-muted">Normally disabled so overdue items must be resolved before a new loan.</p>
                </div>
                <USwitch v-model="forms.borrowing.allowBorrowWithOverdue" />
              </div>
              <div class="flex items-start justify-between gap-4 p-4">
                <div>
                  <p class="text-sm font-semibold text-highlighted">Allow borrowing with an unpaid fine</p>
                  <p class="mt-1 text-xs leading-5 text-muted">Stored as policy for fine-account integration. Keep disabled unless approved.</p>
                </div>
                <USwitch v-model="forms.borrowing.allowBorrowWithUnpaidFine" />
              </div>
            </div>
          </div>

          <div v-else-if="activeSection === 'membership'" class="space-y-6">
            <UAlert
              color="info"
              variant="soft"
              icon="i-lucide-calendar-range"
              title="Semester dates are managed by the Librarian"
              description="The active academic year, semester opening, and exact membership-validity dates are configured under Academic Term and Membership Validity in the Librarian Portal."
            />
            <div class="grid gap-5 md:grid-cols-2">
              <UFormField label="Fallback Membership Validity" hint="Months used only when no term expiry date exists">
                <UInput v-model.number="forms.membership.validityMonths" type="number" min="1" max="24" class="w-full" />
              </UFormField>
              <UFormField label="Default Library Card Status">
                <USelect v-model="forms.membership.defaultLibraryCardStatus" :items="cardStatusItems" class="w-full" />
              </UFormField>
              <UFormField label="Library Card Replacement Fee">
                <UInput v-model.number="forms.membership.libraryCardReplacementFee" type="number" min="0" step="0.01" class="w-full">
                  <template #leading>₱</template>
                </UInput>
              </UFormField>
            </div>
            <div class="divide-y divide-default rounded-xl border border-default">
              <div class="flex items-start justify-between gap-4 p-4">
                <div>
                  <p class="text-sm font-semibold text-highlighted">Require active Student membership</p>
                  <p class="mt-1 text-xs leading-5 text-muted">Students without an active membership cannot borrow books or record Library entry.</p>
                </div>
                <USwitch v-model="forms.membership.requireActiveStudentMembership" />
              </div>
              <div class="flex items-start justify-between gap-4 p-4">
                <div>
                  <p class="text-sm font-semibold text-highlighted">Require enrollment verification</p>
                  <p class="mt-1 text-xs leading-5 text-muted">Membership renewal requires confirmation of current enrollment.</p>
                </div>
                <USwitch v-model="forms.membership.requireEnrollmentVerification" />
              </div>
            </div>
          </div>

          <div v-else-if="activeSection === 'reservations'" class="space-y-6">
            <div class="grid gap-5 md:grid-cols-2">
              <UFormField label="Student Active Reservation Limit">
                <UInput v-model.number="forms.reservations.studentMaxActiveReservations" type="number" min="1" max="20" class="w-full" />
              </UFormField>
              <UFormField label="Faculty Active Reservation Limit">
                <UInput v-model.number="forms.reservations.facultyMaxActiveReservations" type="number" min="1" max="30" class="w-full" />
              </UFormField>
              <UFormField label="Reservation Expiration" hint="Maximum calendar days after creation">
                <UInput v-model.number="forms.reservations.expirationDays" type="number" min="1" max="30" class="w-full" />
              </UFormField>
              <UFormField label="Pickup Period" hint="Days allowed after a book is ready">
                <UInput v-model.number="forms.reservations.pickupDays" type="number" min="1" max="14" class="w-full" />
              </UFormField>
            </div>
            <div class="flex items-start justify-between gap-4 rounded-xl border border-default p-4">
              <div>
                <p class="text-sm font-semibold text-highlighted">Allow reservation when copies are available</p>
                <p class="mt-1 text-xs leading-5 text-muted">When disabled, a title can only be reserved when no physical copy is currently available.</p>
              </div>
              <USwitch v-model="forms.reservations.allowReserveAvailableBooks" />
            </div>
          </div>

          <div v-else class="space-y-6">
            <UAlert
              color="info"
              variant="soft"
              icon="i-lucide-info"
              title="Automatic school-day fine policy"
              description="Overdue fines are calculated automatically on Monday to Friday only. Weekends and dates entered by the Librarian under Fines and No-Fine Days are excluded. Cashier Official Receipt verification is required before a fine is marked paid."
            />
            <div class="grid gap-5 md:grid-cols-2">
              <UFormField label="Overdue Fine per Day">
                <UInput v-model.number="forms.fines.overdueFinePerDay" type="number" min="0" step="0.01" class="w-full"><template #leading>₱</template></UInput>
              </UFormField>
              <UFormField label="Grace Period" hint="Days before overdue fines begin">
                <UInput v-model.number="forms.fines.graceDays" type="number" min="0" max="30" class="w-full" />
              </UFormField>
              <UFormField label="Maximum Overdue Fine" hint="Enter 0 when there is no configured maximum">
                <UInput v-model.number="forms.fines.maximumOverdueFine" type="number" min="0" step="0.01" class="w-full"><template #leading>₱</template></UInput>
              </UFormField>
              <UFormField label="Damaged Book Fee">
                <UInput v-model.number="forms.fines.damagedBookFee" type="number" min="0" step="0.01" class="w-full"><template #leading>₱</template></UInput>
              </UFormField>
              <UFormField label="Lost Book Processing Fee">
                <UInput v-model.number="forms.fines.lostBookProcessingFee" type="number" min="0" step="0.01" class="w-full"><template #leading>₱</template></UInput>
              </UFormField>
            </div>
          </div>
        </div>

        <div class="flex flex-col-reverse gap-3 border-t border-default bg-elevated/30 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p class="text-xs text-muted">
            <span v-if="isDirty(activeSection)" class="font-semibold text-warning">Unsaved changes</span>
            <span v-else>No unsaved changes in this section.</span>
          </p>
          <div class="flex gap-2">
            <UButton
              label="Reset"
              color="neutral"
              variant="ghost"
              :disabled="!isDirty(activeSection) || Boolean(savingSection)"
              @click="resetSection(activeSection)"
            />
            <UButton
              label="Review and Save"
              icon="i-lucide-save"
              :disabled="!isDirty(activeSection) || Boolean(savingSection)"
              :loading="savingSection === activeSection"
              @click="requestSave(activeSection)"
            />
          </div>
        </div>
      </UCard>
    </div>

    <UModal
      v-model:open="confirmOpen"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #content>
        <div class="space-y-5 bg-default p-6">
          <div>
            <h2 class="text-xl font-bold text-highlighted">
              Confirm Library Policy Change
            </h2>
            <p class="mt-1 text-sm text-muted">
              Review the policy section before saving.
            </p>
          </div>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Confirm this administrative change"
            description="The saved values will become the active policy for future Library transactions and the action will be recorded in the Audit Log."
          />

          <div>
            <p class="text-sm font-semibold text-highlighted">
              {{ sectionItems.find(item => item.value === pendingSection)?.label }}
            </p>
            <p class="mt-1 text-xs text-muted">
              {{ pendingChanges.length }} field{{ pendingChanges.length === 1 ? '' : 's' }} will be changed.
            </p>
          </div>

          <ul class="space-y-2 rounded-xl border border-default p-4">
            <li
              v-for="field in pendingChanges"
              :key="field"
              class="flex items-center gap-2 text-sm text-default"
            >
              <UIcon name="i-lucide-dot" class="size-4 text-primary" />
              {{ humanizeField(field) }}
            </li>
          </ul>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="Boolean(savingSection)"
              @click="() => { confirmOpen = false; }"
            />
            <UButton
              label="Save Policy Changes"
              icon="i-lucide-shield-check"
              :loading="Boolean(savingSection)"
              @click="confirmSave"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
