<script setup lang="ts">
import type { FormError, FormSubmitEvent } from "@nuxt/ui";
import type {
  RegistrationLibraryCardStatus,
  StudentAccessRequest,
  StudentAccessRequestStatus,
  StudentAccessRequestType,
} from "~/composables/useStudentSelfRegistration";

definePageMeta({
  layout: "librarian",
  title: "Student Registration Approvals",
});

const registration = useStudentSelfRegistration();
const members = useLibraryMembers();
const cardPrintQueue = useLibraryCardPrintQueue();
const route = useRoute();
const toast = useToast();

const requestType = ref<StudentAccessRequestType>("Registration");
const requestStatus = ref<StudentAccessRequestStatus | "All">(
  "Pending Verification",
);
const search = ref("");
const page = ref(1);
const pageSize = 20;
const loading = ref(false);
const requests = ref<StudentAccessRequest[]>([]);
const pagination = reactive({ pageCount: 1, total: 0 });
const summary = reactive({
  pendingRegistrations: 0,
  approvedRegistrations: 0,
  rejectedRegistrations: 0,
  pendingCredentialRequests: 0,
});

const selectedRequest = ref<StudentAccessRequest | null>(null);
const detailsOpen = ref(false);
const verifyOpen = ref(false);
const rejectOpen = ref(false);
const resetOpen = ref(false);
const credentialsOpen = ref(false);
const actionLoading = ref(false);
const cardStatusOpen = ref(false);
const cardStatusLoading = ref(false);
const openingPrintFor = ref<string | null>(null);
const cardStatusRequest = ref<StudentAccessRequest | null>(null);
const cardStatusTarget = ref<RegistrationLibraryCardStatus>("On Process");
const credentials = ref<{
  username: string;
  email: string;
  temporaryPassword: string;
  passwordMode: "Generated" | "Manual";
} | null>(null);

const verifyForm = reactive({
  notes: "",
});
const rejectReason = ref("");
const resetForm = reactive({
  reason: "",
  identityConfirmed: false,
  passwordMode: "Generated" as "Generated" | "Manual",
  temporaryPassword: "",
  confirmTemporaryPassword: "",
});
const showResetPassword = ref(false);

const typeOptions = [
  { label: "Registration Verification", value: "Registration" },
  { label: "Credential Assistance", value: "Credential Recovery" },
];
const statusOptions = [
  { label: "All", value: "All" },
  { label: "Pending", value: "Pending Verification" },
  { label: "Approved", value: "Verified" },
  { label: "Rejected", value: "Rejected" },
  { label: "Completed", value: "Completed" },
  { label: "Cancelled", value: "Cancelled" },
];

function statusColor(status: StudentAccessRequestStatus) {
  if (status === "Pending Verification") return "warning";
  if (status === "Verified" || status === "Completed") return "success";
  if (status === "Rejected") return "error";
  return "neutral";
}

function statusLabel(status: StudentAccessRequestStatus) {
  if (status === "Pending Verification") return "Pending";
  if (status === "Verified") return "Approved";
  return status;
}

function requestPhotoUrl(request?: StudentAccessRequest | null) {
  return request?.photoPreviewUrl || request?.student?.photoUrl || null;
}

function registrationCardStatus(
  request?: StudentAccessRequest | null,
): RegistrationLibraryCardStatus | null {
  const status = request?.student?.libraryCardStatus;
  return status === "On Process" || status === "Printed" || status === "Released"
    ? status
    : null;
}

function cardStatusColor(status?: string | null) {
  if (status === "Released") return "success";
  if (status === "Printed") return "primary";
  if (status === "On Process") return "warning";
  return "neutral";
}

function nextCardStatus(
  request?: StudentAccessRequest | null,
): RegistrationLibraryCardStatus | null {
  return request?.student?.libraryCardStatus === "None"
    ? "On Process"
    : null;
}

function cardActionLabel() {
  return "Start Card Preparation";
}

function cardActionIcon() {
  return "i-lucide-play";
}

const cardWorkflowSteps: Array<{
  value: RegistrationLibraryCardStatus;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: "On Process",
    label: "Preparing",
    description: "Student information and card layout are being checked.",
    icon: "i-lucide-file-check-2",
  },
  {
    value: "Printed",
    label: "Printed",
    description: "The physical Library Card is ready for final checking.",
    icon: "i-lucide-printer-check",
  },
  {
    value: "Released",
    label: "Released",
    description: "The Library Card has been received by the Student.",
    icon: "i-lucide-handshake",
  },
];

function cardStatusRank(status?: string | null) {
  if (status === "On Process") return 1;
  if (status === "Printed") return 2;
  if (status === "Released") return 3;
  return 0;
}

function cardStepState(
  request: StudentAccessRequest,
  step: RegistrationLibraryCardStatus,
) {
  const currentRank = cardStatusRank(request.student?.libraryCardStatus);
  const stepRank = cardStatusRank(step);

  if (currentRank > stepRank) return "complete";
  if (currentRank === stepRank) return "current";
  return "upcoming";
}

function studentInitials(request?: StudentAccessRequest | null) {
  if (!request) return "ST";
  const initials = [request.firstName, request.lastName]
    .map((part) => part?.trim()?.charAt(0))
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return initials || "ST";
}

function openVerifyFromDetails() {
  const request = selectedRequest.value;
  if (!request) return;
  detailsOpen.value = false;
  void openVerify(request);
}

function openRejectFromDetails() {
  const request = selectedRequest.value;
  if (!request) return;
  detailsOpen.value = false;
  openReject(request);
}

function openResetFromDetails() {
  const request = selectedRequest.value;
  if (!request) return;
  detailsOpen.value = false;
  openReset(request);
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

async function loadRequests() {
  loading.value = true;
  try {
    const response = await registration.listRequests({
      type: requestType.value,
      status: requestStatus.value,
      search: search.value,
      page: page.value,
      pageSize,
    });
    requests.value = response.data;
    pagination.pageCount = response.meta.pagination.pageCount;
    pagination.total = response.meta.pagination.total;
    summary.pendingRegistrations = response.meta.summary.pendingRegistrations;
    summary.approvedRegistrations = response.meta.summary.approvedRegistrations;
    summary.rejectedRegistrations = response.meta.summary.rejectedRegistrations;
    summary.pendingCredentialRequests =
      response.meta.summary.pendingCredentialRequests;
  } catch (error) {
    toast.add({
      title: "Unable to load Student requests",
      description: registration.errorMessage(error),
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}

async function loadRequestDetails(request: StudentAccessRequest) {
  selectedRequest.value = request;
  try {
    selectedRequest.value = await registration.getRequest(request.documentId);
  } catch (error) {
    toast.add({
      title: "Unable to load complete registration information",
      description: registration.errorMessage(error),
      color: "error",
    });
  }
}

async function openDetails(request: StudentAccessRequest) {
  detailsOpen.value = true;
  await loadRequestDetails(request);
}

async function openVerify(request: StudentAccessRequest) {
  verifyForm.notes = "";
  verifyOpen.value = true;
  await loadRequestDetails(request);
}

function openReject(request: StudentAccessRequest) {
  selectedRequest.value = request;
  rejectReason.value = "";
  rejectOpen.value = true;
}

function openReset(request: StudentAccessRequest) {
  selectedRequest.value = request;
  Object.assign(resetForm, {
    reason: "",
    identityConfirmed: false,
    passwordMode: "Generated",
    temporaryPassword: "",
    confirmTemporaryPassword: "",
  });
  resetOpen.value = true;
}

function openCardStatusUpdate(request: StudentAccessRequest) {
  const target = nextCardStatus(request);
  if (!target) return;
  cardStatusRequest.value = request;
  cardStatusTarget.value = target;
  cardStatusOpen.value = true;
}


async function openCardPrinting(request: StudentAccessRequest) {
  if (!request.student?.documentId || openingPrintFor.value) return;

  openingPrintFor.value = request.documentId;

  try {
    const response = await members.listStudents({
      search: request.studentNo,
      page: 1,
      pageSize: 20,
    });

    const student = response.data.find(
      (item) =>
        item.documentId === request.student?.documentId ||
        item.studentNo === request.studentNo,
    );

    if (!student) {
      throw new Error(
        "The approved Student could not be loaded from the Student Library Members page.",
      );
    }

    cardPrintQueue.setPrintQueue([student], route.fullPath);
    detailsOpen.value = false;
    await navigateTo("/librarian/library-card-print");
  } catch (error) {
    toast.add({
      title: "Unable to open card printing",
      description: registration.errorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    openingPrintFor.value = null;
  }
}

function resetErrors(state: typeof resetForm): FormError[] {
  const errors: FormError[] = [];
  if (state.reason.trim().length < 5) {
    errors.push({
      name: "reason",
      message: "Enter how the Student identity was validated.",
    });
  }
  if (!state.identityConfirmed) {
    errors.push({
      name: "identityConfirmed",
      message: "Confirm that the Student identity was checked in person.",
    });
  }
  if (state.passwordMode === "Manual") {
    if (state.temporaryPassword.length < 12) {
      errors.push({
        name: "temporaryPassword",
        message: "Temporary password must contain at least 12 characters.",
      });
    }
    if (state.temporaryPassword !== state.confirmTemporaryPassword) {
      errors.push({
        name: "confirmTemporaryPassword",
        message: "Password confirmation does not match.",
      });
    }
  }
  return errors;
}

async function submitVerification(event: FormSubmitEvent<typeof verifyForm>) {
  if (!selectedRequest.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await registration.verifyRegistration(
      selectedRequest.value.documentId,
      event.data,
    );
    verifyOpen.value = false;
    toast.add({
      title: "Student registration approved",
      description:
        "The Library Card is now On Process. Continue from the Approved list after the card has been printed.",
      color: "success",
    });

    if (requestStatus.value !== "Verified") {
      requestStatus.value = "Verified";
      page.value = 1;
    } else {
      await loadRequests();
    }
  } catch (error) {
    toast.add({
      title: "Approval failed",
      description: registration.errorMessage(error),
      color: "error",
    });
  } finally {
    actionLoading.value = false;
  }
}

async function submitCardStatusUpdate() {
  const request = cardStatusRequest.value;
  if (!request || cardStatusLoading.value) return;

  cardStatusLoading.value = true;
  try {
    const updated = await registration.updateLibraryCardStatus(
      request.documentId,
      cardStatusTarget.value,
    );

    requests.value = requests.value.map((item) =>
      item.documentId === updated.documentId ? updated : item,
    );

    if (selectedRequest.value?.documentId === updated.documentId) {
      selectedRequest.value = updated;
    }

    cardStatusRequest.value = updated;
    cardStatusOpen.value = false;

    toast.add({
      title: "Library Card preparation started",
      description:
        "Continue the printing, Printed status, and release steps from the Library Card Print page.",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Unable to update Library Card status",
      description: registration.errorMessage(error),
      color: "error",
    });
  } finally {
    cardStatusLoading.value = false;
  }
}

async function submitRejection() {
  if (!selectedRequest.value || actionLoading.value) return;
  if (rejectReason.value.trim().length < 5) {
    toast.add({
      title: "Reason required",
      description: "Enter a clear reason for rejecting the request.",
      color: "warning",
    });
    return;
  }
  actionLoading.value = true;
  try {
    await registration.rejectRequest(
      selectedRequest.value.documentId,
      rejectReason.value,
    );
    rejectOpen.value = false;
    toast.add({ title: "Request rejected", color: "success" });
    await loadRequests();
  } catch (error) {
    toast.add({
      title: "Unable to reject request",
      description: registration.errorMessage(error),
      color: "error",
    });
  } finally {
    actionLoading.value = false;
  }
}

async function submitReset(event: FormSubmitEvent<typeof resetForm>) {
  if (!selectedRequest.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    const result = await registration.resetCredentials(
      selectedRequest.value.documentId,
      event.data,
    );
    credentials.value = result.credentials;
    resetOpen.value = false;
    credentialsOpen.value = true;
    toast.add({
      title: "Student credentials reset",
      description: "All existing Student sessions were invalidated.",
      color: "success",
    });
    await loadRequests();
  } catch (error) {
    toast.add({
      title: "Credential reset failed",
      description: registration.errorMessage(error),
      color: "error",
    });
  } finally {
    actionLoading.value = false;
  }
}

async function copyCredentials() {
  if (!credentials.value) return;
  await navigator.clipboard.writeText(
    [
      `Username: ${credentials.value.username}`,
      `Email: ${credentials.value.email}`,
      `Temporary password: ${credentials.value.temporaryPassword}`,
    ].join("\n"),
  );
  toast.add({ title: "Credentials copied", color: "success" });
}

watch([requestType, requestStatus], () => {
  page.value = 1;
  loadRequests();
});
watch(page, loadRequests);

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadRequests();
  }, 350);
});

onMounted(loadRequests);
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <section class="rounded-xl border border-default bg-default p-5 shadow-sm sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <UBadge label="Library Users" color="success" variant="soft" />
          <h1 class="mt-3 text-2xl font-black text-highlighted sm:text-3xl">
            Student Registration Approvals
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Review submitted Student membership applications and approve verified records. Printing and card release are managed from the Library Card Print page.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            to="/librarian/student-self-registration"
            label="Registration QR Code"
            icon="i-lucide-qr-code"
            color="neutral"
            variant="outline"
          />
          <UButton
            label="Refresh Requests"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="loading"
            @click="loadRequests"
          />
        </div>
      </div>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-xl border border-warning/30 bg-warning/5 p-5">
        <p class="text-sm font-semibold text-muted">Pending Registrations</p>
        <p class="mt-2 text-3xl font-black text-highlighted">{{ summary.pendingRegistrations }}</p>
      </div>
      <div class="rounded-xl border border-success/30 bg-success/5 p-5">
        <p class="text-sm font-semibold text-muted">Approved Registrations</p>
        <p class="mt-2 text-3xl font-black text-highlighted">{{ summary.approvedRegistrations }}</p>
      </div>
      <div class="rounded-xl border border-error/30 bg-error/5 p-5">
        <p class="text-sm font-semibold text-muted">Rejected Registrations</p>
        <p class="mt-2 text-3xl font-black text-highlighted">{{ summary.rejectedRegistrations }}</p>
      </div>
      <div class="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <p class="text-sm font-semibold text-muted">Credential Requests</p>
        <p class="mt-2 text-3xl font-black text-highlighted">{{ summary.pendingCredentialRequests }}</p>
      </div>
    </section>

    <section class="overflow-hidden rounded-xl border border-default bg-default shadow-sm">
      <div class="border-b border-default p-5 sm:p-6">
        <div class="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <div>
            <h2 class="text-lg font-bold text-highlighted">Student Requests</h2>
            <p class="mt-1 text-sm text-muted">Review registration verification and credential assistance separately.</p>
          </div>
          <USelect v-model="requestType" :items="typeOptions" class="w-full lg:w-64" />
          <USelect v-model="requestStatus" :items="statusOptions" class="w-full lg:w-56" />
        </div>
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search request number, Student number, name, email, or username" class="mt-4 w-full" />
      </div>

      <div v-if="loading" class="flex min-h-48 items-center justify-center">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
      </div>

      <div v-else-if="!requests.length" class="p-10 text-center text-muted">
        <UIcon name="i-lucide-inbox" class="mx-auto size-12 opacity-50" />
        <p class="mt-3 font-semibold text-highlighted">No matching requests</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-default text-left text-sm">
          <thead class="bg-elevated/80 text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th class="px-5 py-3">No.</th>
              <th class="px-5 py-3">Student</th>
              <th class="px-5 py-3">Student Number</th>
              <th class="px-5 py-3">Level / Program</th>
              <th class="px-5 py-3">Registration</th>
              <th class="px-5 py-3">Library Card</th>
              <th class="px-5 py-3">Submitted</th>
              <th class="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="(request, index) in requests"
              :key="request.documentId"
              class="align-middle transition-colors hover:bg-elevated/50"
            >
              <td class="whitespace-nowrap px-5 py-4 text-muted">
                {{ (page - 1) * pageSize + index + 1 }}
              </td>
              <td class="min-w-64 px-5 py-4">
                <div class="flex items-center gap-3">
                  <img
                    v-if="requestPhotoUrl(request)"
                    :src="requestPhotoUrl(request) || ''"
                    :alt="request.fullName"
                    class="size-11 shrink-0 rounded-full border border-default object-cover"
                  >
                  <div
                    v-else
                    class="flex size-11 shrink-0 items-center justify-center rounded-full bg-elevated font-bold text-muted"
                  >
                    {{ request.firstName?.charAt(0) }}{{ request.lastName?.charAt(0) }}
                  </div>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-highlighted">{{ request.fullName }}</p>
                    <p class="truncate text-xs text-muted">{{ request.email || 'No email provided' }}</p>
                    <p class="mt-1 text-xs font-mono text-muted">{{ request.requestNo }}</p>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap px-5 py-4 font-mono font-semibold text-highlighted">
                {{ request.studentNo }}
              </td>
              <td class="min-w-56 px-5 py-4">
                <p class="font-medium text-highlighted">{{ request.educationalLevel || '—' }}</p>
                <p class="mt-1 text-xs text-muted">
                  {{ request.course || 'No program provided' }}
                  <span v-if="request.yearLevel"> • Year {{ request.yearLevel }}</span>
                </p>
              </td>
              <td class="whitespace-nowrap px-5 py-4">
                <UBadge
                  :label="statusLabel(request.status)"
                  :color="statusColor(request.status)"
                  variant="soft"
                />
              </td>
              <td class="min-w-44 px-5 py-4">
                <template v-if="request.type === 'Registration' && request.student">
                  <UBadge
                    :label="request.student.libraryCardStatus || 'On Process'"
                    :color="cardStatusColor(request.student.libraryCardStatus)"
                    variant="soft"
                  />
                  <p
                    v-if="request.student.libraryCardStatus === 'Released'"
                    class="mt-1 text-xs text-muted"
                  >
                    Released {{ formatDateOnly(request.student.libraryCardReleaseDate) }}
                  </p>
                  <p v-else class="mt-1 text-xs text-muted">
                    {{ request.student.libraryCardNo || 'Card number pending' }}
                  </p>
                </template>
                <span v-else class="text-muted">—</span>
              </td>
              <td class="whitespace-nowrap px-5 py-4 text-muted">
                {{ formatDate(request.submittedAt) }}
              </td>
              <td class="whitespace-nowrap px-5 py-4">
                <div class="flex justify-end gap-1.5">
                  <UButton
                    label="View"
                    icon="i-lucide-eye"
                    color="neutral"
                    variant="soft"
                    size="sm"
                    @click="openDetails(request)"
                  />
                  <UButton
                    v-if="request.type === 'Registration' && request.status === 'Verified' && nextCardStatus(request)"
                    :label="cardActionLabel()"
                    :icon="cardActionIcon()"
                    color="primary"
                    variant="soft"
                    size="sm"
                    @click="openCardStatusUpdate(request)"
                  />
                  <UButton
                    v-if="request.type === 'Registration' && request.status === 'Verified' && request.student && !nextCardStatus(request) && request.student.libraryCardStatus !== 'Released'"
                    label="Print Card"
                    icon="i-lucide-printer"
                    color="primary"
                    variant="soft"
                    size="sm"
                    :loading="openingPrintFor === request.documentId"
                    @click="openCardPrinting(request)"
                  />
                  <UButton
                    v-if="request.type === 'Registration' && request.status === 'Pending Verification'"
                    label="Approve"
                    icon="i-lucide-check"
                    color="success"
                    variant="soft"
                    size="sm"
                    @click="openVerify(request)"
                  />
                  <UButton
                    v-if="request.type === 'Credential Recovery' && request.status === 'Pending Verification'"
                    label="Reset"
                    icon="i-lucide-key-round"
                    color="warning"
                    variant="soft"
                    size="sm"
                    @click="openReset(request)"
                  />
                  <UButton
                    v-if="request.status === 'Pending Verification'"
                    label="Reject"
                    icon="i-lucide-x"
                    color="error"
                    variant="soft"
                    size="sm"
                    @click="openReject(request)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination.pageCount > 1" class="flex items-center justify-between border-t border-default p-4">
        <p class="text-sm text-muted">{{ pagination.total }} request(s)</p>
        <UPagination v-model:page="page" :total="pagination.total" :items-per-page="pageSize" />
      </div>
    </section>

    <UModal
      v-model:open="detailsOpen"
      :ui="{ content: 'sm:max-w-6xl max-h-[94dvh] overflow-hidden' }"
    >
      <template #content>
        <div v-if="selectedRequest" class="flex max-h-[94dvh] flex-col bg-default">
          <header class="flex shrink-0 items-start justify-between gap-4 border-b border-default px-5 py-4 sm:px-6">
            <div class="flex min-w-0 items-center gap-3">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon
                  :name="selectedRequest.type === 'Registration' ? 'i-lucide-user-round-check' : 'i-lucide-key-round'"
                  class="size-5"
                />
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="truncate text-lg font-bold text-highlighted sm:text-xl">
                    Student Registration Details
                  </h2>
                  <UBadge
                    :label="statusLabel(selectedRequest.status)"
                    :color="statusColor(selectedRequest.status)"
                    variant="soft"
                  />
                </div>
                <p class="mt-1 truncate text-sm text-muted">
                  {{ selectedRequest.requestNo }} · {{ selectedRequest.type }}
                </p>
              </div>
            </div>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              square
              aria-label="Close Student details"
              @click="detailsOpen = false"
            />
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto">
            <div class="grid gap-6 p-5 sm:p-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside class="space-y-4 lg:sticky lg:top-0 lg:self-start">
                <section class="overflow-hidden rounded-2xl border border-default bg-elevated shadow-sm">
                  <div class="relative bg-gradient-to-br from-primary/10 via-default to-success/5 p-4">
                    <img
                      v-if="requestPhotoUrl(selectedRequest)"
                      :src="requestPhotoUrl(selectedRequest) || ''"
                      :alt="`${selectedRequest.fullName} registration photo`"
                      class="aspect-[4/5] w-full rounded-xl border border-default bg-default object-cover shadow-sm"
                    >
                    <div
                      v-else
                      class="flex aspect-[4/5] w-full items-center justify-center rounded-xl border border-dashed border-default bg-default"
                    >
                      <div class="flex size-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                        {{ studentInitials(selectedRequest) }}
                      </div>
                    </div>
                  </div>
                  <div class="border-t border-default p-4 text-center">
                    <p class="text-lg font-bold text-highlighted">{{ selectedRequest.fullName }}</p>
                    <p class="mt-1 font-mono text-sm font-semibold text-primary">
                      {{ selectedRequest.studentNo }}
                    </p>
                    <p class="mt-2 text-sm leading-5 text-muted">
                      {{ selectedRequest.course || selectedRequest.educationalLevel || 'Student' }}
                      <span v-if="selectedRequest.yearLevel"> · Year {{ selectedRequest.yearLevel }}</span>
                      <span v-if="selectedRequest.section"> · Section {{ selectedRequest.section }}</span>
                    </p>
                  </div>
                </section>

                <section class="rounded-2xl border border-default bg-default p-4 shadow-sm">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">Quick status</p>
                  <div class="mt-3 space-y-3">
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-sm text-muted">Registration</span>
                      <UBadge
                        :label="statusLabel(selectedRequest.status)"
                        :color="statusColor(selectedRequest.status)"
                        variant="soft"
                      />
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-sm text-muted">Library Card</span>
                      <UBadge
                        :label="selectedRequest.student?.libraryCardStatus || 'Not started'"
                        :color="cardStatusColor(selectedRequest.student?.libraryCardStatus)"
                        variant="soft"
                      />
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <span class="text-sm text-muted">Submitted</span>
                      <span class="text-right text-sm font-medium text-highlighted">
                        {{ formatDate(selectedRequest.submittedAt) }}
                      </span>
                    </div>
                  </div>
                </section>
              </aside>

              <main class="min-w-0 space-y-5">
                <section class="rounded-2xl border border-default bg-default shadow-sm">
                  <div class="flex items-center gap-3 border-b border-default px-4 py-3 sm:px-5">
                    <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UIcon name="i-lucide-graduation-cap" class="size-4" />
                    </div>
                    <div>
                      <h3 class="font-semibold text-highlighted">Student and Academic Information</h3>
                      <p class="text-xs text-muted">Basic information submitted for Library membership.</p>
                    </div>
                  </div>
                  <dl class="grid gap-x-6 gap-y-5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Full Name</dt>
                      <dd class="mt-1.5 font-semibold text-highlighted">{{ selectedRequest.fullName }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Student Number</dt>
                      <dd class="mt-1.5 font-mono font-semibold text-highlighted">{{ selectedRequest.studentNo }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Educational Level</dt>
                      <dd class="mt-1.5 text-highlighted">{{ selectedRequest.educationalLevel || '—' }}</dd>
                    </div>
                    <div class="sm:col-span-2 xl:col-span-1">
                      <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Course / Program</dt>
                      <dd class="mt-1.5 text-highlighted">{{ selectedRequest.course || '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Year / Grade</dt>
                      <dd class="mt-1.5 text-highlighted">{{ selectedRequest.yearLevel || '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Section</dt>
                      <dd class="mt-1.5 text-highlighted">{{ selectedRequest.section || '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Academic Year</dt>
                      <dd class="mt-1.5 text-highlighted">{{ selectedRequest.academicYear || '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Semester</dt>
                      <dd class="mt-1.5 text-highlighted">{{ selectedRequest.semester || '—' }}</dd>
                    </div>
                    <div v-if="selectedRequest.enrollmentReference">
                      <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Enrollment Reference</dt>
                      <dd class="mt-1.5 break-all text-highlighted">{{ selectedRequest.enrollmentReference }}</dd>
                    </div>
                  </dl>
                </section>

                <div class="grid gap-5 xl:grid-cols-2">
                  <section class="rounded-2xl border border-default bg-default shadow-sm">
                    <div class="flex items-center gap-3 border-b border-default px-4 py-3 sm:px-5">
                      <div class="flex size-9 items-center justify-center rounded-lg bg-success/10 text-success">
                        <UIcon name="i-lucide-contact-round" class="size-4" />
                      </div>
                      <div>
                        <h3 class="font-semibold text-highlighted">Contact Information</h3>
                        <p class="text-xs text-muted">Details used for Library notices.</p>
                      </div>
                    </div>
                    <dl class="space-y-4 p-4 sm:p-5">
                      <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-mail" class="mt-0.5 size-4 shrink-0 text-muted" />
                        <div class="min-w-0">
                          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Email Address</dt>
                          <dd class="mt-1 break-all text-sm text-highlighted">{{ selectedRequest.email || '—' }}</dd>
                        </div>
                      </div>
                      <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-phone" class="mt-0.5 size-4 shrink-0 text-muted" />
                        <div>
                          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Contact Number</dt>
                          <dd class="mt-1 text-sm text-highlighted">{{ selectedRequest.contactNo || '—' }}</dd>
                        </div>
                      </div>
                      <div class="flex items-start gap-3">
                        <UIcon name="i-lucide-map-pin" class="mt-0.5 size-4 shrink-0 text-muted" />
                        <div>
                          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Address</dt>
                          <dd class="mt-1 whitespace-pre-wrap text-sm leading-6 text-highlighted">{{ selectedRequest.address || '—' }}</dd>
                        </div>
                      </div>
                    </dl>
                  </section>

                  <section class="rounded-2xl border border-default bg-default shadow-sm">
                    <div class="flex items-center gap-3 border-b border-default px-4 py-3 sm:px-5">
                      <div class="flex size-9 items-center justify-center rounded-lg bg-warning/10 text-warning">
                        <UIcon name="i-lucide-id-card" class="size-4" />
                      </div>
                      <div>
                        <h3 class="font-semibold text-highlighted">Portal and Library Card</h3>
                        <p class="text-xs text-muted">Account and physical card information.</p>
                      </div>
                    </div>
                    <dl class="space-y-4 p-4 sm:p-5">
                      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <div>
                          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Portal Username</dt>
                          <dd class="mt-1 font-mono text-sm font-semibold text-highlighted">{{ selectedRequest.portalUsername || '—' }}</dd>
                        </div>
                        <div>
                          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Card Number</dt>
                          <dd class="mt-1 font-mono text-sm font-semibold text-highlighted">{{ selectedRequest.student?.libraryCardNo || '—' }}</dd>
                        </div>
                      </div>
                      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <div>
                          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Card Status</dt>
                          <dd class="mt-1.5">
                            <UBadge
                              :label="selectedRequest.student?.libraryCardStatus || 'Not started'"
                              :color="cardStatusColor(selectedRequest.student?.libraryCardStatus)"
                              variant="soft"
                            />
                          </dd>
                        </div>
                        <div>
                          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Date Released</dt>
                          <dd class="mt-1 text-sm text-highlighted">{{ formatDateOnly(selectedRequest.student?.libraryCardReleaseDate) }}</dd>
                        </div>
                      </div>
                    </dl>
                  </section>
                </div>

                <section
                  v-if="selectedRequest.type === 'Registration'"
                  class="rounded-2xl border border-default bg-elevated/40 p-4 shadow-sm sm:p-5"
                >
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-badge-check" class="size-5 text-primary" />
                        <h3 class="font-semibold text-highlighted">Library Card Release Progress</h3>
                      </div>
                      <p class="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
                        {{ selectedRequest.status === 'Verified'
                          ? 'This page shows the current progress. Printing, Mark as Printed, and Release actions are completed from the Library Card Print page.'
                          : 'Library Card processing becomes available after the registration has been approved.' }}
                      </p>
                    </div>
                    <div v-if="selectedRequest.status === 'Verified'" class="flex flex-wrap gap-2">
                      <UButton
                        v-if="nextCardStatus(selectedRequest)"
                        :label="cardActionLabel()"
                        :icon="cardActionIcon()"
                        color="primary"
                        @click="openCardStatusUpdate(selectedRequest)"
                      />
                      <UButton
                        v-if="selectedRequest.student && !nextCardStatus(selectedRequest) && selectedRequest.student.libraryCardStatus !== 'Released'"
                        label="Open Card Printing"
                        icon="i-lucide-printer"
                        color="primary"
                        variant="soft"
                        :loading="openingPrintFor === selectedRequest.documentId"
                        @click="openCardPrinting(selectedRequest)"
                      />
                    </div>
                  </div>

                  <ol class="mt-5 grid gap-3 md:grid-cols-3">
                    <li
                      v-for="(step, index) in cardWorkflowSteps"
                      :key="step.value"
                      class="relative rounded-xl border p-4 transition"
                      :class="{
                        'border-success/40 bg-success/5': selectedRequest.status === 'Verified' && cardStepState(selectedRequest, step.value) === 'complete',
                        'border-primary bg-primary/5 ring-1 ring-primary/20': selectedRequest.status === 'Verified' && cardStepState(selectedRequest, step.value) === 'current',
                        'border-default bg-default': selectedRequest.status !== 'Verified' || cardStepState(selectedRequest, step.value) === 'upcoming',
                      }"
                    >
                      <div class="flex items-start gap-3">
                        <div
                          class="flex size-9 shrink-0 items-center justify-center rounded-full"
                          :class="{
                            'bg-success text-white': selectedRequest.status === 'Verified' && cardStepState(selectedRequest, step.value) === 'complete',
                            'bg-primary text-white': selectedRequest.status === 'Verified' && cardStepState(selectedRequest, step.value) === 'current',
                            'bg-elevated text-muted': selectedRequest.status !== 'Verified' || cardStepState(selectedRequest, step.value) === 'upcoming',
                          }"
                        >
                          <UIcon
                            :name="selectedRequest.status === 'Verified' && cardStepState(selectedRequest, step.value) === 'complete' ? 'i-lucide-check' : step.icon"
                            class="size-4"
                          />
                        </div>
                        <div class="min-w-0">
                          <p class="text-xs font-semibold uppercase tracking-wide text-muted">Step {{ index + 1 }}</p>
                          <p class="mt-1 font-semibold text-highlighted">{{ step.label }}</p>
                          <p class="mt-1 text-xs leading-5 text-muted">{{ step.description }}</p>
                          <UBadge
                            v-if="selectedRequest.status === 'Verified' && cardStepState(selectedRequest, step.value) !== 'upcoming'"
                            class="mt-3"
                            :label="cardStepState(selectedRequest, step.value) === 'complete' ? 'Completed' : 'Current step'"
                            :color="cardStepState(selectedRequest, step.value) === 'complete' ? 'success' : 'primary'"
                            variant="soft"
                          />
                        </div>
                      </div>
                    </li>
                  </ol>
                </section>

                <section v-if="selectedRequest.reviewNotes" class="rounded-2xl border border-default bg-elevated/40 p-4 sm:p-5">
                  <div class="flex items-start gap-3">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral/10 text-muted">
                      <UIcon name="i-lucide-notebook-text" class="size-4" />
                    </div>
                    <div>
                      <h3 class="font-semibold text-highlighted">Review Notes</h3>
                      <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted">{{ selectedRequest.reviewNotes }}</p>
                    </div>
                  </div>
                </section>
              </main>
            </div>
          </div>

          <footer class="flex shrink-0 flex-col-reverse gap-3 border-t border-default bg-default px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p class="text-xs text-muted">
              Review the Student information before approval. Continue physical card processing from the Library Card Print page.
            </p>
            <div class="flex flex-wrap justify-end gap-2">
              <UButton
                label="Close"
                color="neutral"
                variant="outline"
                @click="detailsOpen = false"
              />
              <template v-if="selectedRequest.status === 'Pending Verification'">
                <UButton
                  label="Reject"
                  icon="i-lucide-x"
                  color="error"
                  variant="soft"
                  @click="openRejectFromDetails"
                />
                <UButton
                  v-if="selectedRequest.type === 'Registration'"
                  label="Approve Registration"
                  icon="i-lucide-check"
                  color="success"
                  @click="openVerifyFromDetails"
                />
                <UButton
                  v-else
                  label="Reset Credentials"
                  icon="i-lucide-key-round"
                  color="warning"
                  @click="openResetFromDetails"
                />
              </template>
              <template v-else-if="selectedRequest.type === 'Registration' && selectedRequest.status === 'Verified'">
                <UButton
                  v-if="nextCardStatus(selectedRequest)"
                  :label="cardActionLabel()"
                  :icon="cardActionIcon()"
                  color="primary"
                  @click="openCardStatusUpdate(selectedRequest)"
                />
                <UButton
                  v-else-if="selectedRequest.student?.libraryCardStatus !== 'Released'"
                  label="Open Card Printing"
                  icon="i-lucide-printer"
                  color="primary"
                  :loading="openingPrintFor === selectedRequest.documentId"
                  @click="openCardPrinting(selectedRequest)"
                />
              </template>
            </div>
          </footer>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="verifyOpen" :dismissible="!actionLoading" :ui="{ content: 'sm:max-w-xl' }">
      <template #content>
        <UForm :state="verifyForm" class="space-y-5 p-6" @submit="submitVerification">
          <div>
            <h2 class="text-xl font-bold text-highlighted">Approve Student Registration</h2>
            <p class="mt-2 text-sm text-muted">Confirm the Student identity and current enrollment information before activating full Library privileges.</p>
          </div>
          <div v-if="requestPhotoUrl(selectedRequest)" class="flex items-center gap-4 rounded-2xl border border-default bg-elevated p-4">
            <img :src="requestPhotoUrl(selectedRequest) || ''" :alt="selectedRequest?.fullName" class="size-24 rounded-xl object-cover">
            <div>
              <p class="font-semibold text-highlighted">{{ selectedRequest.fullName }}</p>
              <p class="mt-1 text-sm text-muted">{{ selectedRequest.studentNo }} • {{ selectedRequest.course }}</p>
              <p class="mt-1 text-xs text-muted">Confirm that the photo and submitted information match the Student's school records before approval.</p>
            </div>
          </div>
          <UFormField name="notes" label="Verification Notes">
            <UTextarea v-model="verifyForm.notes" :rows="4" class="w-full" />
          </UFormField>
          <UAlert color="info" variant="soft" icon="i-lucide-shield-check" title="Approval effect" description="Approval activates the Student profile, membership, Portal account, and saves the submitted photo for the Library Card." />
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="actionLoading" @click="verifyOpen = false" />
            <UButton type="submit" label="Approve Student" icon="i-lucide-badge-check" color="success" :loading="actionLoading" />
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal
      v-model:open="cardStatusOpen"
      :dismissible="!cardStatusLoading"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #content>
        <div v-if="cardStatusRequest" class="space-y-5 p-6">
          <div>
            <h2 class="text-xl font-bold text-highlighted">
              Start Library Card Preparation
            </h2>
            <p class="mt-2 text-sm text-muted">
              {{ cardStatusRequest.fullName }} · {{ cardStatusRequest.studentNo }}
            </p>
          </div>

          <div class="rounded-2xl border border-default bg-elevated p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase text-muted">Current Status</p>
                <UBadge
                  class="mt-2"
                  :label="cardStatusRequest.student?.libraryCardStatus || 'Not available'"
                  :color="cardStatusColor(cardStatusRequest.student?.libraryCardStatus)"
                  variant="soft"
                />
              </div>
              <UIcon name="i-lucide-arrow-right" class="size-5 text-muted" />
              <div class="text-right">
                <p class="text-xs font-semibold uppercase text-muted">New Status</p>
                <UBadge
                  class="mt-2"
                  :label="cardStatusTarget"
                  :color="cardStatusColor(cardStatusTarget)"
                  variant="soft"
                />
              </div>
            </div>
          </div>

          <UAlert
            color="primary"
            variant="soft"
            icon="i-lucide-play"
            title="Begin card preparation"
            description="This moves the card to On Process. Printing, Mark as Printed, and Release are completed from the Library Card Print page."
          />

          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="cardStatusLoading"
              @click="cardStatusOpen = false"
            />
            <UButton
              label="Start Preparation"
              icon="i-lucide-play"
              color="primary"
              :loading="cardStatusLoading"
              @click="submitCardStatusUpdate"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="rejectOpen" :dismissible="!actionLoading" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <div class="space-y-5 p-6">
          <div>
            <h2 class="text-xl font-bold text-highlighted">Reject Request</h2>
            <p class="mt-2 text-sm text-muted">For a registration request, rejection blocks the new account and cancels the pending membership.</p>
          </div>
          <UFormField label="Reason" required>
            <UTextarea v-model="rejectReason" :rows="4" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="actionLoading" @click="rejectOpen = false" />
            <UButton label="Reject Request" icon="i-lucide-x" color="error" :loading="actionLoading" @click="submitRejection" />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="resetOpen" :dismissible="!actionLoading" :ui="{ content: 'sm:max-w-xl' }">
      <template #content>
        <UForm :state="resetForm" :validate="resetErrors" class="space-y-5 p-6" @submit="submitReset">
          <div>
            <h2 class="text-xl font-bold text-highlighted">Reset Student Credentials</h2>
            <p class="mt-2 text-sm text-muted">Proceed only after comparing the Student’s school ID or enrollment document with the existing Library record.</p>
          </div>
          <UFormField name="reason" label="Identity Validation Notes" required>
            <UTextarea v-model="resetForm.reason" :rows="3" placeholder="Describe the school ID, enrollment document, or official record checked." class="w-full" />
          </UFormField>
          <UFormField name="identityConfirmed">
            <UCheckbox
              v-model="resetForm.identityConfirmed"
              label="I personally verified the Student's identity against the existing Library record before resetting the credentials."
            />
          </UFormField>
          <div class="grid grid-cols-2 gap-2 rounded-xl bg-elevated p-1">
            <UButton label="Generate Password" :color="resetForm.passwordMode === 'Generated' ? 'warning' : 'neutral'" :variant="resetForm.passwordMode === 'Generated' ? 'solid' : 'ghost'" @click="resetForm.passwordMode = 'Generated'" />
            <UButton label="Enter Password" :color="resetForm.passwordMode === 'Manual' ? 'warning' : 'neutral'" :variant="resetForm.passwordMode === 'Manual' ? 'solid' : 'ghost'" @click="resetForm.passwordMode = 'Manual'" />
          </div>
          <template v-if="resetForm.passwordMode === 'Manual'">
            <UFormField name="temporaryPassword" label="Temporary Password" required>
              <UInput v-model="resetForm.temporaryPassword" :type="showResetPassword ? 'text' : 'password'" class="w-full">
                <template #trailing>
                  <UButton type="button" :icon="showResetPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" color="neutral" variant="ghost" square @click="showResetPassword = !showResetPassword" />
                </template>
              </UInput>
            </UFormField>
            <UFormField name="confirmTemporaryPassword" label="Confirm Temporary Password" required>
              <UInput v-model="resetForm.confirmTemporaryPassword" type="password" class="w-full" />
            </UFormField>
          </template>
          <UAlert color="warning" variant="soft" icon="i-lucide-log-out" title="All existing sessions will be invalidated" description="The Student must sign in again using the newly issued credentials." />
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="actionLoading" @click="resetOpen = false" />
            <UButton type="submit" label="Reset Credentials" icon="i-lucide-key-round" color="warning" :loading="actionLoading" />
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="credentialsOpen" :dismissible="false" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <div v-if="credentials" class="space-y-5 p-6">
          <div>
            <h2 class="text-xl font-bold text-highlighted">One-Time Student Credentials</h2>
            <p class="mt-2 text-sm text-muted">Give these credentials only to the verified Student. The password will not be displayed again after closing.</p>
          </div>
          <div class="space-y-3 rounded-2xl border border-warning/30 bg-warning/5 p-4 font-mono text-sm">
            <p><strong>Username:</strong> {{ credentials.username }}</p>
            <p><strong>Email:</strong> {{ credentials.email }}</p>
            <p class="break-all"><strong>Temporary password:</strong> {{ credentials.temporaryPassword }}</p>
          </div>
          <div class="flex justify-end gap-2">
            <UButton label="Copy Credentials" icon="i-lucide-copy" color="neutral" variant="outline" @click="copyCredentials" />
            <UButton label="I Have Provided Them Securely" color="success" @click="credentialsOpen = false; credentials = null" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
