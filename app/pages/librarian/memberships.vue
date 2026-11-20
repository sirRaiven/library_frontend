<script setup lang="ts">
import AppFilterBar from "~/components/shared/AppFilterBar.vue";
import AppRecordCard from "~/components/shared/AppRecordCard.vue";
import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";
import AppStatusBadge from "~/components/shared/AppStatusBadge.vue";

import { appLogger } from "~/utils/app-logger";
import type { MembershipListItem, StudentMember } from "~/composables/useLibraryMembers";
import type { TableColumn } from "@nuxt/ui";
import StudentLibraryCard from "~/components/librarian/StudentLibraryCard.vue";
import LiveBarcodeScanner from "~/components/librarian/visits/LiveBarcodeScanner.vue";
import type { BarcodeScanResult } from "~/composables/useBarcodeScanResult";

definePageMeta({ layout: "librarian", title: "Library Cards" });

const route = useRoute();
const workspace = useLibrarianWorkspace();
const members = useLibraryMembers();
const librarySettings = useLibrarySettings();
const termManager = useMembershipTerm();
const libraryOptions = useLibraryOptions();
const fines = useLibraryFines();
const auth = useAuth();
const toast = useToast();

const barcode = ref("");
const scannedStudent = ref<StudentMember | null>(null);
const canRenew = ref(false);
const lookupReason = ref<string | null>(null);
const lookupLoading = ref(false);
const renewing = ref(false);
const replacementOpen = ref(false);
const replacementSaving = ref(false);
const replacementReason = ref("");
const previewSide = ref<"front" | "back">("front");

const memberships = ref<MembershipListItem[]>([]);
const search = ref("");
const statusFilter = ref("All");
const ALL_SEMESTERS = "__all__";
const semesterFilter = ref(ALL_SEMESTERS);
const academicYearFilter = ref("");
const page = ref(1);
const pageSize = 10;
const loading = ref(false);
const recordsError = ref("");

const pagination = reactive({ page: 1, pageSize, pageCount: 1, total: 0 });
const summary = reactive({ totalMemberships: 0, active: 0, expired: 0, suspended: 0 });

function defaultExpiry() {
  const date = new Date();
  date.setMonth(date.getMonth() + 5);
  return date.toISOString().slice(0, 10);
}

const renewal = reactive({
  academicTermCode: "",
  academicYear: "",
  semester: "",
  issuedDate: new Date().toISOString().slice(0, 10),
  expiryDate: defaultExpiry(),
  enrollmentVerified: false,
  enrollmentReference: "",
  remarks: "",
});

const activeTerm = computed(() => termManager.term.value);
const termIsOpen = computed(() => activeTerm.value.status === "Open");

function syncRenewalTerm() {
  const selectedTerm = activeTerm.value.academicTerm
    ?? librarySettings.settings.value.general.currentAcademicTerm
    ?? null;

  Object.assign(renewal, {
    academicTermCode: selectedTerm?.code ?? "",
    academicYear: selectedTerm?.academicYear ?? activeTerm.value.academicYear,
    semester: selectedTerm?.semesterName ?? activeTerm.value.semester,
    issuedDate: activeTerm.value.validFrom,
    expiryDate: activeTerm.value.validUntil,
  });
}

const statusItems = ["All", "Active", "Expired", "Suspended", "Cancelled"];
const semesterItems = computed(() => [
  { label: "All Semesters", value: ALL_SEMESTERS },
  ...libraryOptions.semesters.value,
]);

const columns: TableColumn<MembershipListItem>[] = [
  { id: "student", header: "Student" },
  { id: "term", header: "Academic Term" },
  { id: "validity", header: "Validity" },
  { accessorKey: "status", header: "Status" },
  { id: "verified", header: "Verified By" },
  { id: "actions", header: "Actions" },
];

const cards = computed(() => [
  { label: "Membership Records", value: summary.totalMemberships },
  { label: "Active", value: summary.active },
  { label: "Expired", value: summary.expired },
  { label: "Suspended", value: summary.suspended },
]);

function statusColor(value?: string | null) {
  if (value === "Active") return "success";
  if (value === "Suspended") return "warning";
  return "error";
}

async function lookupCard() {
  if (!barcode.value.trim()) return;
  lookupLoading.value = true;
  try {
    const response = await members.lookupStudentCard(barcode.value);
    scannedStudent.value = response.data.student;
    previewSide.value = "front";
    canRenew.value = response.data.canRenew;
    lookupReason.value = response.data.reason;
  } catch (error) {
    scannedStudent.value = null;
    canRenew.value = false;
    toast.add({ title: "Card not found", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    lookupLoading.value = false;
  }
}

async function handleCameraBarcodeDetected(
  result: BarcodeScanResult,
) {
  const detectedBarcode = result.value.trim();

  if (
    !detectedBarcode ||
    lookupLoading.value ||
    renewing.value
  ) {
    return;
  }

  barcode.value = detectedBarcode;
  await lookupCard();
}

async function renewMembership() {
  if (!scannedStudent.value) return;
  if (!termIsOpen.value) {
    toast.add({
      title: "Membership renewal is closed",
      description: "Open the academic term before renewing Student memberships.",
      color: "warning",
      icon: "i-lucide-calendar-x-2",
    });
    return;
  }
  syncRenewalTerm();
  if (
    librarySettings.settings.value.membership.requireEnrollmentVerification &&
    !renewal.enrollmentVerified
  ) {
    toast.add({
      title: "Enrollment verification required",
      description: "Confirm that the student submitted a current enrollment document.",
      color: "warning",
      icon: "i-lucide-file-check-2",
    });
    return;
  }

  renewing.value = true;
  try {
    const response = await members.renewMembership({
      barcode: scannedStudent.value.barcode,
      ...renewal,
    });
    scannedStudent.value = response.data.student;
    toast.add({
      title: "Membership renewed",
      description: `${response.data.student.fullName} is active for ${response.data.membership.semester}, ${response.data.membership.academicYear}.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
    renewal.enrollmentVerified = false;
    renewal.enrollmentReference = "";
    renewal.remarks = "";
  } catch (error) {
    toast.add({ title: "Renewal failed", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    renewing.value = false;
  }
}

function openReplacementCharge() {
  if (!scannedStudent.value) return;
  replacementReason.value = "Lost Library Card replacement";
  replacementOpen.value = true;
}

async function createReplacementCharge() {
  if (!scannedStudent.value || !replacementReason.value.trim()) return;
  replacementSaving.value = true;
  try {
    const response = await fines.createCardReplacement(
      scannedStudent.value.documentId,
      replacementReason.value.trim(),
    );
    scannedStudent.value.libraryCardStatus = "Replacement";
    replacementOpen.value = false;
    toast.add({
      title: "Replacement charge created",
      description: `${response.data.fineNo} — ${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(response.data.amount)}. Verify the cashier OR under Fines & Payments before processing the replacement card.`,
      color: "success",
      icon: "i-lucide-receipt-text",
    });
  } catch (error) {
    toast.add({
      title: "Unable to create replacement charge",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    replacementSaving.value = false;
  }
}

function clearScanner() {
  barcode.value = "";
  scannedStudent.value = null;
  previewSide.value = "front";
  canRenew.value = false;
  lookupReason.value = null;
}

let membershipRequest = 0;

async function loadMemberships() {
  if (workspace.value !== "records") return;
  const request = ++membershipRequest;
  loading.value = true;
  recordsError.value = "";
  try {
    const response = await members.listMemberships({
      search: settledFilters.value.search.trim(),
      status: statusFilter.value,
      semester: semesterFilter.value === ALL_SEMESTERS ? "" : semesterFilter.value,
      academicYear: settledFilters.value.academicYear.trim(),
      page: page.value,
      pageSize,
    });
    if (request !== membershipRequest) return;
    memberships.value = response.data;
    Object.assign(pagination, response.meta.pagination);
    Object.assign(summary, response.meta.summary);
  } catch (error) {
    if (request !== membershipRequest) return;
    recordsError.value = auth.getErrorMessage(error);
  } finally {
    if (request === membershipRequest) loading.value = false;
  }
}

const settledFilters = ref({ search: "", academicYear: "" });
watch([search, academicYearFilter], ([searchText, academicYear], _, onCleanup) => {
  const timer = setTimeout(() => {
    settledFilters.value = { search: searchText, academicYear };
  }, 350);
  onCleanup(() => clearTimeout(timer));
});

watch([statusFilter, semesterFilter, settledFilters], () => {
  if (page.value === 1) void loadMemberships();
  else page.value = 1;
});
watch(page, () => void loadMemberships());
watch(workspace, (value) => {
  if (value === "records") void loadMemberships();
});

watch(
  () => route.query.barcode,
  async (value) => {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value === barcode.value
    ) {
      return;
    }

    barcode.value = value.trim();
    await lookupCard();
  },
);

onMounted(async () => {
  if (workspace.value === "records") void loadMemberships();
  else document.getElementById("membership-scanner")?.focus();

  const [settingsResult, termResult] = await Promise.allSettled([
    librarySettings.load(true),
    termManager.load(true),
    libraryOptions.loadOperational(),
  ]);

  if (settingsResult.status === "rejected" || termResult.status === "rejected") {
    appLogger.warn("Operational Library settings could not be loaded.", {
      settings: settingsResult.status === "rejected" ? settingsResult.reason : null,
      term: termResult.status === "rejected" ? termResult.reason : null,
    });
  }

  syncRenewalTerm();
  renewal.enrollmentVerified =
    !librarySettings.settings.value.membership.requireEnrollmentVerification;

  if (typeof route.query.barcode === "string") {
    barcode.value = route.query.barcode.trim();
    await lookupCard();
  }
});
</script>

<template>
  <UContainer class="sncbt-page-shell sncbt-staff-page sncbt-specialist-page">
    <div class="sncbt-staff-content w-full space-y-6 mb-12">
      <LibrarianPageHeader
        eyebrow="Membership & Cards"
        title="Membership Renewal"
        description="Scan a Student Library Card, verify enrollment, and renew membership using the current academic term."
        icon="i-lucide-id-card"
      >
        <template #actions>
          <UButton to="/librarian/membership-term" label="Membership Term" icon="i-lucide-calendar-range" color="neutral" variant="outline" />
        </template>
      </LibrarianPageHeader>

      <UAlert
        v-if="libraryOptions.error.value"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Semester options could not be refreshed"
        :description="libraryOptions.error.value"
        :actions="[{ label: 'Retry', onClick: () => libraryOptions.loadOperational() }]"
      />

      <LibrarianWorkspaceTabs v-model="workspace" work-label="Renew Membership" records-label="Membership History">
        <template #work>
          <div class="sncbt-workflow-layout grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
            <UCard class="sncbt-scanner-station">
              <template #header>
                <div class="flex items-center gap-3">
                  <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
                    <UIcon name="i-lucide-scan-barcode" class="size-5" />
                  </div>
                  <div>
                    <h2 class="font-semibold text-highlighted">Scan Library Card</h2>
                    <p class="text-sm text-muted">Barcode scanners can submit by pressing Enter.</p>
                  </div>
                </div>
              </template>

              <form
                class="space-y-3"
                @submit.prevent="lookupCard"
              >
                <div
                  class="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-stretch"
                >
                  <UInput
                    v-model="barcode"
                    icon="i-lucide-scan-barcode"
                    placeholder="Scan barcode, card number, or student number"
                    autocomplete="off"
                    size="xl"
                    id="membership-scanner"
                    aria-label="Library card barcode or student number"
                    :loading="lookupLoading"
                    class="w-full md:min-w-52 md:flex-1"
                  >
                    <template #trailing>
                      <UKbd>Enter</UKbd>
                    </template>
                  </UInput>

                  <LiveBarcodeScanner
                    :disabled="lookupLoading || renewing"
                    title="Scan Student Library Card"
                    button-label="Use Camera"
                    ready-description="Place the complete permanent Library Card barcode inside the guide."
                    processing-label="Finding student"
                    processing-description="Please wait while the student and membership record are being checked."
                    storage-key="sncbt-membership-renewal-camera"
                    :duplicate-cooldown-ms="60000"
                    :detection-hold-ms="900"
                    @detected="handleCameraBarcodeDetected"
                  />

                  <UButton
                    type="submit"
                    label="Find Student"
                    icon="i-lucide-search"
                    color="primary"
                    size="xl"
                    :loading="lookupLoading"
                    :disabled="!barcode.trim() || lookupLoading"
                    class="shrink-0"
                  />
                </div>

                <p class="text-xs text-muted">
                  Use a physical barcode scanner, the camera scanner, or type the student number manually.
                </p>
              </form>

              <div
                v-if="scannedStudent"
                class="mt-6 grid gap-6 lg:grid-cols-2"
              >
                <div class="min-w-0 space-y-3">
                  <div
                    class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <h3 class="font-semibold text-highlighted">
                        Library Card Preview
                      </h3>
                      <p class="mt-1 text-sm text-muted">
                        Preview one full side at a time. The card is scaled
                        proportionally without clipping its content, and the Back
                        side renders the permanent library-card barcode.
                      </p>
                    </div>

                    <div
                      class="inline-flex w-full rounded-xl border border-default bg-elevated p-1 sm:w-auto"
                      role="group"
                      aria-label="Choose library card side"
                    >
                      <UButton
                        label="Front"
                        icon="i-lucide-contact"
                        size="sm"
                        class="flex-1 sm:flex-none"
                        :color="previewSide === 'front' ? 'primary' : 'neutral'"
                        :variant="previewSide === 'front' ? 'solid' : 'ghost'"
                        :aria-pressed="previewSide === 'front'"
                        @click="() => { previewSide = 'front' }"
                      />

                      <UButton
                        label="Back"
                        icon="i-lucide-scan-barcode"
                        size="sm"
                        class="flex-1 sm:flex-none"
                        :color="previewSide === 'back' ? 'primary' : 'neutral'"
                        :variant="previewSide === 'back' ? 'solid' : 'ghost'"
                        :aria-pressed="previewSide === 'back'"
                        @click="() => { previewSide = 'back' }"
                      />
                    </div>
                  </div>

                  <div
                    class="rounded-2xl border border-default bg-elevated/30 p-3 sm:p-5"
                  >
                    <StudentLibraryCard
                      :student="scannedStudent"
                      :membership="scannedStudent.membership"
                      :show-actions="false"
                      :display-side="previewSide"
                      fit-preview
                    />
                  </div>

                  <UAlert
                    color="info"
                    variant="soft"
                    icon="i-lucide-scan-barcode"
                    title="Permanent barcode"
                    :description="`Barcode value: ${scannedStudent.barcode}. Membership validity and renewal are verified in the system instead of being printed on the card.`"
                  />
                </div>

                <div
                  class="min-w-0 space-y-4 rounded-2xl border border-default bg-elevated/20 p-4 sm:p-5"
                >
                  <div class="rounded-2xl border border-default bg-elevated/50 p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="font-semibold text-highlighted">{{ scannedStudent.fullName }}</p>
                        <p class="mt-1 text-sm text-muted">{{ scannedStudent.studentNo }} • {{ scannedStudent.course }}</p>
                      </div>
                      <UBadge :color="statusColor(scannedStudent.membership?.status)" variant="soft">{{ scannedStudent.membership?.status ?? "Expired" }}</UBadge>
                    </div>
                  </div>

                  <UAlert v-if="!canRenew" color="error" variant="soft" icon="i-lucide-circle-alert" title="Renewal unavailable" :description="lookupReason ?? 'This student cannot be renewed.'" />

                  <div class="rounded-2xl border border-primary/25 bg-primary/5 p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="font-semibold text-highlighted">Active Academic Term</p>
                        <p class="mt-1 text-xs text-muted">Renewal dates are controlled from Academic Term and Membership Validity.</p>
                      </div>
                      <UBadge :color="termIsOpen ? 'success' : 'warning'" variant="soft">
                        {{ activeTerm.status }}
                      </UBadge>
                    </div>
                    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div><p class="text-xs uppercase text-muted">Academic Year</p><p class="mt-1 font-semibold">{{ activeTerm.academicYear }}</p></div>
                      <div><p class="text-xs uppercase text-muted">Semester</p><p class="mt-1 font-semibold">{{ activeTerm.semester }}</p></div>
                      <div><p class="text-xs uppercase text-muted">Valid From</p><p class="mt-1 font-semibold">{{ activeTerm.validFrom }}</p></div>
                      <div><p class="text-xs uppercase text-muted">Valid Until</p><p class="mt-1 font-semibold">{{ activeTerm.validUntil }}</p></div>
                    </div>
                  </div>

                  <UAlert
                    v-if="!termIsOpen"
                    color="warning"
                    variant="soft"
                    icon="i-lucide-calendar-x-2"
                    title="Membership renewal is closed"
                    description="Open the academic term before renewing a Student membership."
                  />

                  <div class="grid gap-4 md:grid-cols-2">
                    <UFormField
                      label="Enrollment Reference"
                      hint="Optional"
                      description="Reference number or document identifier when available."
                      class="sm:col-span-2"
                    >
                      <UInput
                        v-model="renewal.enrollmentReference"
                        placeholder="Leave blank when not applicable"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      label="Remarks"
                      hint="Optional"
                      class="sm:col-span-2"
                    >
                      <UTextarea
                        v-model="renewal.remarks"
                        :rows="2"
                        placeholder="Additional renewal notes"
                        class="w-full"
                      />
                    </UFormField>
                  </div>

                  <div class="rounded-xl border border-default bg-default p-4">
                    <UCheckbox v-if="librarySettings.settings.value.membership.requireEnrollmentVerification" v-model="renewal.enrollmentVerified" label="The student submitted a copy of enrollment for the selected semester." />
                  </div>

                  <div class="grid gap-3 sm:grid-cols-3">
                    <UButton label="Scan Another" icon="i-lucide-scan-line" color="neutral" variant="outline" block @click="clearScanner" />
                    <UButton label="Lost Card / Replace" icon="i-lucide-credit-card" color="warning" variant="outline" block @click="openReplacementCharge" />
                    <UButton label="Renew Membership" icon="i-lucide-rotate-cw" color="primary" block :disabled="!termIsOpen || !canRenew || (librarySettings.settings.value.membership.requireEnrollmentVerification && !renewal.enrollmentVerified)" :loading="renewing" @click="renewMembership" />
                  </div>
                </div>
              </div>
            </UCard>

            <UCard>
              <template #header><h2 class="font-semibold text-highlighted">Renewal Checklist</h2></template>
              <ol class="list-decimal space-y-2 pl-4">
                <li v-for="step in [
                  'Receive the student library card.',
                  'Verify the new-semester enrollment copy.',
                  'Scan the permanent barcode.',
                  'Confirm the academic term and validity date.',
                  'Complete renewal and return the card.'
                ]" :key="step" class="pl-1 text-sm text-muted">{{ step }}</li>
              </ol>
              <template #footer>
                <UAlert color="info" variant="soft" icon="i-lucide-info" title="Faculty are excluded" description="Faculty use the barcode on their faculty ID and do not require semester membership renewal." />
              </template>
            </UCard>
          </div>
        </template>

        <template #records>
          <dl class="mb-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-default bg-default p-4 sm:grid-cols-4" aria-label="Membership summary" :aria-busy="loading">
            <div v-for="card in cards" :key="card.label" class="min-w-0">
              <dt class="text-xs font-medium text-muted">{{ card.label }}</dt>
              <dd class="mt-1 text-xl font-semibold tabular-nums text-highlighted">{{ loading || recordsError ? '—' : card.value }}</dd>
            </div>
          </dl>

          <UCard>
            <template #header>
              <AppFilterBar title="Membership History" description="One record is retained for every Student and academic term.">
                <template #search>
                  <UInput v-model="search" icon="i-lucide-search" placeholder="Search Student or membership number" aria-label="Search membership records" class="w-full" />
                </template>
                <template #filters>
                  <div class="grid gap-2 sm:grid-cols-3">
                    <UInput v-model="academicYearFilter" placeholder="Academic year" aria-label="Membership academic year" />
                    <USelect v-model="semesterFilter" :items="semesterItems" value-key="value" label-key="label" :disabled="libraryOptions.loading.value" aria-label="Membership semester" />
                    <USelect v-model="statusFilter" :items="statusItems" aria-label="Membership status" />
                  </div>
                </template>
              </AppFilterBar>
            </template>

            <div v-if="loading" class="space-y-3">
              <USkeleton v-for="index in 5" :key="index" class="h-12 w-full" />
            </div>
            <UAlert
              v-else-if="recordsError"
              color="error"
              variant="soft"
              title="Records could not be loaded"
              :description="recordsError"
              :actions="[{ label: 'Try again', onClick: loadMemberships }]"
            />

            <div v-else-if="memberships.length === 0" class="py-8 text-center">
              <UIcon name="i-lucide-id-card" class="mx-auto size-10 text-dimmed" />
              <h3 class="mt-3 font-semibold text-highlighted">No membership records found</h3>
            </div>

            <AppResponsiveDataView v-else mobile-label="Membership records" desktop-label="Membership records table">
              <template #mobile>
                <div class="sncbt-mobile-record-list">
                  <AppRecordCard
                    v-for="membership in memberships"
                    :key="membership.documentId"
                    :title="membership.student.fullName"
                    :subtitle="`${membership.student.studentNo} · ${membership.membershipNo}`"
                  >
                    <template #status>
                      <AppStatusBadge :label="membership.status ?? membership.storedStatus" :tone="(membership.status ?? membership.storedStatus) === 'Active' ? 'success' : (membership.status ?? membership.storedStatus) === 'Suspended' ? 'warning' : 'error'" />
                    </template>
                    <template #meta>
                      <span>{{ membership.semester }} · {{ membership.academicYear }}</span>
                      <span>{{ membership.issuedDate }} to {{ membership.expiryDate }}</span>
                      <span>{{ membership.enrollmentVerified ? 'Enrollment verified' : 'Enrollment not verified' }}</span>
                    </template>
                    <template #actions>
                      <UButton
                        :to="`/librarian/students/${encodeURIComponent(membership.student.documentId)}/record`"
                        label="Student Record"
                        icon="i-lucide-notebook-tabs"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        :aria-label="`View Student Record for ${membership.student.fullName}`"
                      />
                    </template>
                  </AppRecordCard>
                </div>
              </template>
              <template #desktop>
                <UTable :data="memberships" :columns="columns">
                          <template #student-cell="{ row }">
                            <p class="font-semibold text-highlighted">{{ row.original.student.fullName }}</p>
                            <p class="text-xs text-muted">{{ row.original.student.studentNo }} • {{ row.original.membershipNo }}</p>
                          </template>
                          <template #term-cell="{ row }">
                            <p class="font-medium text-highlighted">{{ row.original.semester }}</p>
                            <p class="text-xs text-muted">{{ row.original.academicYear }} • {{ row.original.renewalType }}</p>
                          </template>
                          <template #validity-cell="{ row }">
                            <p class="text-sm">{{ row.original.issuedDate }}</p>
                            <p class="text-xs text-muted">to {{ row.original.expiryDate }}</p>
                          </template>
                          <template #status-cell="{ row }">
                            <UBadge :color="statusColor(row.original.status)" variant="soft">{{ row.original.status }}</UBadge>
                          </template>
                          <template #verified-cell="{ row }">
                            <p class="text-sm text-highlighted">{{ row.original.verifiedBy ?? "Librarian" }}</p>
                            <p class="text-xs text-muted">{{ row.original.enrollmentVerified ? "Enrollment verified" : "Not verified" }}</p>
                          </template>
                          <template #actions-cell="{ row }">
                            <UButton
                              :to="`/librarian/students/${encodeURIComponent(row.original.student.documentId)}/record`"
                              label="Student Record"
                              icon="i-lucide-notebook-tabs"
                              color="neutral"
                              variant="ghost"
                              size="sm"
                              :aria-label="`View Student Record for ${row.original.student.fullName}`"
                            />
                          </template>
                        </UTable>
              </template>
            </AppResponsiveDataView>

            <template v-if="!recordsError" #footer>
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-sm text-muted">{{ pagination.total }} membership records</p>
                <UPagination v-if="pagination.pageCount > 1" v-model:page="page" :total="pagination.total" :items-per-page="pageSize" :sibling-count="0" />
              </div>
            </template>
          </UCard>
        </template>
      </LibrarianWorkspaceTabs>
    </div>


    <UModal v-model:open="replacementOpen" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <div class="space-y-5 bg-default p-6">
          <div>
            <h2 class="text-xl font-bold text-highlighted">Library Card Replacement</h2>
            <p class="mt-1 text-sm text-muted">Create a replacement charge for {{ scannedStudent?.fullName }}. The replacement card can be processed only after the Cashier OR is verified.</p>
          </div>
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-philippine-peso"
            :title="`Replacement Fee: ${new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(librarySettings.settings.value.membership.libraryCardReplacementFee || 50)}`"
            description="The Student must pay at the Cashier and present the Official Receipt to the Librarian."
          />
          <UFormField label="Reason" required>
            <UTextarea v-model="replacementReason" :rows="3" placeholder="Example: Lost Library Card" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="() => { replacementOpen = false; }" />
            <UButton label="Create Replacement Charge" icon="i-lucide-receipt-text" color="warning" :loading="replacementSaving" :disabled="!replacementReason.trim()" @click="createReplacementCharge" />
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
