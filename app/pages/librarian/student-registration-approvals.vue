<script setup lang="ts">
import type { FormError, FormSubmitEvent } from "@nuxt/ui";
import type {
  StudentAccessRequest,
  StudentAccessRequestStatus,
  StudentAccessRequestType,
} from "~/composables/useStudentSelfRegistration";

definePageMeta({
  layout: "librarian",
  title: "Student Registration Approvals",
});

const registration = useStudentSelfRegistration();
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
        "Borrowing, reservation, and Library Card eligibility now use the verified membership record.",
      color: "success",
    });
    await loadRequests();
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
    <section class="rounded-3xl border border-default bg-default p-5 shadow-sm sm:p-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <UBadge label="Library Users" color="success" variant="soft" />
          <h1 class="mt-3 text-2xl font-black text-highlighted sm:text-3xl">
            Student Registration Approvals
          </h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Review submitted Student membership applications and approve or reject each request after validating identity and enrollment.
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
      <div class="rounded-2xl border border-warning/30 bg-warning/5 p-5">
        <p class="text-sm font-semibold text-muted">Pending Registrations</p>
        <p class="mt-2 text-3xl font-black text-highlighted">{{ summary.pendingRegistrations }}</p>
      </div>
      <div class="rounded-2xl border border-success/30 bg-success/5 p-5">
        <p class="text-sm font-semibold text-muted">Approved Registrations</p>
        <p class="mt-2 text-3xl font-black text-highlighted">{{ summary.approvedRegistrations }}</p>
      </div>
      <div class="rounded-2xl border border-error/30 bg-error/5 p-5">
        <p class="text-sm font-semibold text-muted">Rejected Registrations</p>
        <p class="mt-2 text-3xl font-black text-highlighted">{{ summary.rejectedRegistrations }}</p>
      </div>
      <div class="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p class="text-sm font-semibold text-muted">Credential Requests</p>
        <p class="mt-2 text-3xl font-black text-highlighted">{{ summary.pendingCredentialRequests }}</p>
      </div>
    </section>

    <section class="overflow-hidden rounded-3xl border border-default bg-default shadow-sm">
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
              <th class="px-5 py-3">Status</th>
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
                    v-if="request.photoPreviewUrl || request.student?.photoUrl"
                    :src="request.photoPreviewUrl || request.student?.photoUrl || ''"
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

    <UModal v-model:open="detailsOpen" :ui="{ content: 'sm:max-w-4xl max-h-[92dvh] overflow-y-auto' }">
      <template #content>
        <div v-if="selectedRequest" class="p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-highlighted">{{ selectedRequest.requestNo }}</h2>
              <p class="mt-1 text-sm text-muted">{{ selectedRequest.type }}</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" square @click="detailsOpen = false" />
          </div>
          <div class="mt-6 grid gap-5 lg:grid-cols-[180px_1fr]">
            <div class="rounded-2xl border border-default bg-elevated p-3">
              <img
                v-if="selectedRequest.photoPreviewUrl"
                :src="selectedRequest.photoPreviewUrl"
                :alt="`${selectedRequest.fullName} registration photo`"
                class="aspect-square w-full rounded-xl object-cover"
              >
              <div v-else class="flex aspect-square items-center justify-center rounded-xl border border-dashed border-default text-muted">
                <UIcon name="i-lucide-image-off" class="size-10" />
              </div>
              <p class="mt-3 text-center text-xs text-muted">Student Library Card photo</p>
            </div>

            <dl class="grid gap-4 rounded-2xl border border-default p-4 sm:grid-cols-2">
              <div><dt class="text-xs font-semibold uppercase text-muted">Student</dt><dd class="mt-1 font-semibold">{{ selectedRequest.fullName }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Student Number</dt><dd class="mt-1 font-semibold">{{ selectedRequest.studentNo }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Educational Level</dt><dd class="mt-1">{{ selectedRequest.educationalLevel || '—' }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Course / Program</dt><dd class="mt-1">{{ selectedRequest.course || '—' }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Year / Grade</dt><dd class="mt-1">{{ selectedRequest.yearLevel || '—' }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Section</dt><dd class="mt-1">{{ selectedRequest.section || '—' }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Email</dt><dd class="mt-1 break-all">{{ selectedRequest.email || '—' }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Contact</dt><dd class="mt-1">{{ selectedRequest.contactNo || '—' }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Username</dt><dd class="mt-1 font-mono">{{ selectedRequest.portalUsername || '—' }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Status</dt><dd class="mt-1"><UBadge :label="statusLabel(selectedRequest.status)" :color="statusColor(selectedRequest.status)" /></dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Academic Year</dt><dd class="mt-1">{{ selectedRequest.academicYear || '—' }}</dd></div>
              <div><dt class="text-xs font-semibold uppercase text-muted">Semester</dt><dd class="mt-1">{{ selectedRequest.semester || '—' }}</dd></div>
              <div class="sm:col-span-2"><dt class="text-xs font-semibold uppercase text-muted">Address</dt><dd class="mt-1 whitespace-pre-wrap">{{ selectedRequest.address || '—' }}</dd></div>
              <div class="sm:col-span-2"><dt class="text-xs font-semibold uppercase text-muted">Submitted</dt><dd class="mt-1">{{ formatDate(selectedRequest.submittedAt) }}</dd></div>
              <div v-if="selectedRequest.reviewNotes" class="sm:col-span-2"><dt class="text-xs font-semibold uppercase text-muted">Review Notes</dt><dd class="mt-1 whitespace-pre-wrap">{{ selectedRequest.reviewNotes }}</dd></div>
            </dl>
          </div>
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
          <div v-if="selectedRequest?.photoPreviewUrl" class="flex items-center gap-4 rounded-2xl border border-default bg-elevated p-4">
            <img :src="selectedRequest.photoPreviewUrl" :alt="selectedRequest.fullName" class="size-24 rounded-xl object-cover">
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
