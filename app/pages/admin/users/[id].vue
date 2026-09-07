<script setup lang="ts">
import type {
  AdminManagedProfileType,
  AdminRoleSummary,
  AdminUserRecord,
} from "~/composables/useAdminUsers";
import type { AdminProfileCandidate } from "~/composables/useAdminAccountGovernance";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "User Details",
});

const route = useRoute();
const usersApi = useAdminUsers();
const rolesApi = useAdminRoles();
const governanceApi = useAdminAccountGovernance();
const auth = useAuth();
const toast = useToast();

const userId = computed(() => Number.parseInt(String(route.params.id), 10));
const monitoringChildActive = computed(() =>
  /^\/admin\/users\/[^/]+\/(activity|sessions|devices)$/.test(route.path),
);
const record = ref<AdminUserRecord | null>(null);
const roles = ref<AdminRoleSummary[]>([]);
const candidates = ref<AdminProfileCandidate[]>([]);
const loading = ref(true);
const saving = ref(false);
const candidateLoading = ref(false);
const editOpen = ref(false);
const linkOpen = ref(false);
const unlinkOpen = ref(false);
const statusOpen = ref(false);
const candidateSearch = ref("");
const selectedProfileDocumentId = ref("");
const linkReason = ref("");
const unlinkReason = ref("");
const pendingBlockedState = ref(false);
const statusReason = ref("");

const editForm = reactive({
  username: "",
  email: "",
  roleId: 0,
});

const manageableRoles = computed(() =>
  roles.value
    .filter(role => role.type !== "public")
    .filter(role =>
      auth.isSuperAdministrator.value ||
      !["administrator", "system-administrator", "super-administrator", "admin"].includes(role.type) ||
      role.id === record.value?.role?.id,
    )
    .map(role => ({ label: role.name, value: role.id })),
);

const expectedProfileType = computed<AdminManagedProfileType | null>(() => {
  const value = record.value?.profileGovernance.expectedType;
  return value === "Student" || value === "Faculty" || value === "Librarian"
    ? value
    : null;
});

function profileTypeIcon(type: AdminManagedProfileType): string {
  if (type === "Student") return "i-lucide-graduation-cap";
  if (type === "Faculty") return "i-lucide-briefcase-business";
  return "i-lucide-library";
}


const linkedProfile = computed(() => record.value?.profileGovernance.profile ?? null);
const facultyDetailsOptional = computed(() => expectedProfileType.value === "Faculty");

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function accountStatus(user: AdminUserRecord) {
  if (user.blocked) return "Blocked";
  if (!user.confirmed) return "Unconfirmed";
  return "Active";
}

async function loadAccount() {
  if (!Number.isInteger(userId.value) || userId.value <= 0) {
    throw createError({ statusCode: 404, statusMessage: "User account not found" });
  }

  loading.value = true;
  try {
    const [user, availableRoles] = await Promise.all([
      usersApi.get(userId.value),
      rolesApi.list(),
    ]);
    record.value = user;
    roles.value = availableRoles;
    Object.assign(editForm, {
      username: user.username,
      email: user.email,
      roleId: user.role?.id ?? 0,
    });
  } catch (error) {
    toast.add({
      title: "Unable to load account",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

async function loadCandidates() {
  if (!expectedProfileType.value) return;
  candidateLoading.value = true;

  try {
    const response = await governanceApi.listProfileCandidates({
      profileType: expectedProfileType.value,
      search: candidateSearch.value,
      includeUserId: userId.value,
      pageSize: 50,
    });
    candidates.value = response.data;

    if (
      linkedProfile.value?.type === expectedProfileType.value &&
      !selectedProfileDocumentId.value
    ) {
      selectedProfileDocumentId.value = linkedProfile.value.documentId;
    }
  } catch (error) {
    toast.add({
      title: "Unable to load available profiles",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    candidateLoading.value = false;
  }
}

async function openLink() {
  selectedProfileDocumentId.value =
    linkedProfile.value?.type === expectedProfileType.value
      ? linkedProfile.value.documentId
      : "";
  candidateSearch.value = "";
  linkReason.value = "";
  linkOpen.value = true;
  await loadCandidates();
}

async function saveProfileLink() {
  if (
    !record.value ||
    !expectedProfileType.value ||
    !selectedProfileDocumentId.value ||
    linkReason.value.trim().length < 5 ||
    saving.value
  ) {
    toast.add({
      title: "Complete the profile-link information",
      description: "Select a profile and provide a brief reason for the change.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  saving.value = true;
  try {
    record.value = await governanceApi.linkProfile(record.value.id, {
      profileType: expectedProfileType.value,
      profileDocumentId: selectedProfileDocumentId.value,
      reason: linkReason.value.trim(),
    });
    linkOpen.value = false;
    toast.add({
      title: "Profile connection updated",
      description: "The account is now connected to the selected institutional profile.",
      color: "success",
      icon: "i-lucide-link-2",
    });
  } catch (error) {
    toast.add({
      title: "Unable to connect profile",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}

async function removeProfileLink() {
  if (!record.value || unlinkReason.value.trim().length < 5 || saving.value) {
    toast.add({
      title: "Reason required",
      description: "Provide a brief reason before removing the profile connection.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  saving.value = true;
  try {
    record.value = await governanceApi.unlinkProfile(
      record.value.id,
      unlinkReason.value.trim(),
    );
    unlinkOpen.value = false;
    unlinkReason.value = "";
    toast.add({
      title: "Profile connection removed",
      description: "The institutional profile is no longer connected to this account.",
      color: "success",
      icon: "i-lucide-link-2-off",
    });
  } catch (error) {
    toast.add({
      title: "Unable to remove profile connection",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}

function openEdit() {
  if (!record.value) return;
  Object.assign(editForm, {
    username: record.value.username,
    email: record.value.email,
    roleId: record.value.role?.id ?? 0,
  });
  editOpen.value = true;
}

async function saveAccount() {
  if (!record.value || saving.value) return;
  saving.value = true;

  try {
    await usersApi.update(record.value.id, {
      username: editForm.username,
      email: editForm.email,
    });

    if (editForm.roleId && editForm.roleId !== record.value.role?.id) {
      await usersApi.assignRole(record.value.id, editForm.roleId);
    }

    editOpen.value = false;
    await loadAccount();
    toast.add({
      title: "Account updated",
      description: "The account identity and role were saved.",
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    toast.add({
      title: "Unable to update account",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}

function openStatus(blocked: boolean) {
  pendingBlockedState.value = blocked;
  statusReason.value = "";
  statusOpen.value = true;
}

async function confirmStatusChange() {
  if (!record.value || saving.value) return;
  if (statusReason.value.trim().length < 5) {
    toast.add({
      title: "Reason required",
      description: "Provide a clear reason containing at least 5 characters.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }
  saving.value = true;

  try {
    record.value = await usersApi.changeStatus(record.value.id, {
      blocked: pendingBlockedState.value,
      reason: statusReason.value.trim(),
    });
    statusOpen.value = false;
    toast.add({
      title: pendingBlockedState.value ? "Account blocked" : "Account restored",
      description: pendingBlockedState.value
        ? "The user can no longer sign in."
        : "The user can sign in again.",
      color: pendingBlockedState.value ? "warning" : "success",
      icon: pendingBlockedState.value
        ? "i-lucide-user-round-x"
        : "i-lucide-user-round-check",
    });
  } catch (error) {
    toast.add({
      title: "Unable to change account status",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}

let candidateTimer: ReturnType<typeof setTimeout> | undefined;
watch(candidateSearch, () => {
  if (!linkOpen.value) return;
  clearTimeout(candidateTimer);
  candidateTimer = setTimeout(loadCandidates, 300);
});

onMounted(() => {
  if (!monitoringChildActive.value) void loadAccount();
});

watch(monitoringChildActive, (isChild) => {
  if (!isChild && !record.value) void loadAccount();
});
</script>

<template>
  <NuxtPage v-if="monitoringChildActive" />

  <template v-else>
    <div class="sncbt-page-shell space-y-6">
    <AdminPageHeader
      eyebrow="Accounts and Access"
      title="User Details"
      description="Review the account identity, assigned role, access status, and Library details used by the assigned portal."
      icon="i-lucide-user-round-cog"
    >
      <template #actions>
        <UButton
          label="Back to Users"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="outline"
          to="/admin/users"
        />
      </template>
    </AdminPageHeader>

    <AdminUserMonitoringNav
      v-if="Number.isInteger(userId) && Boolean(userId)"
      :user-id="userId"
      active="overview"
    />

    <div v-if="loading" class="grid gap-4 lg:grid-cols-3">
      <USkeleton v-for="index in 6" :key="index" class="h-40 w-full" />
    </div>

    <template v-else-if="record">
      <UAlert
        v-if="record.profileGovernance.issues.length"
        :color="record.profileGovernance.status === 'Mismatch' ? 'error' : 'warning'"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="This account needs profile review"
        :description="record.profileGovernance.issues.join(' ')"
      />

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Account Status"
          :value="accountStatus(record)"
          :description="record.blocked ? 'Sign-in is currently disabled.' : 'Current application access state.'"
          :icon="record.blocked ? 'i-lucide-user-round-x' : 'i-lucide-user-round-check'"
          :tone="record.blocked ? 'error' : record.confirmed ? 'success' : 'warning'"
        />
        <AdminMetricCard
          label="Assigned Role"
          :value="record.role?.name || 'No role'"
          description="Controls what this account can access and manage in the Library System."
          icon="i-lucide-shield-check"
          tone="primary"
        />
        <AdminMetricCard
          :label="facultyDetailsOptional ? 'Faculty Library Details' : 'Profile Connection'"
          :value="record.profileGovernance.status"
          :description="facultyDetailsOptional
            ? (linkedProfile ? 'Faculty Library details are available.' : 'Faculty Library details are optional and prepared automatically when needed.')
            : record.profileGovernance.required
              ? `${record.profileGovernance.expectedType} profile required.`
              : 'No member profile is required.'"
          icon="i-lucide-link-2"
          :tone="record.profileGovernance.status === 'Linked' || record.profileGovernance.status === 'Not Required' ? 'success' : record.profileGovernance.status === 'Mismatch' ? 'error' : 'warning'"
        />
        <AdminMetricCard
          label="Account Created"
          :value="formatDate(record.createdAt).split(',')[0] ?? 'No record'"
          :description="`${record.provider || 'local'} authentication provider`"
          icon="i-lucide-calendar-days"
          tone="neutral"
        />
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <UCard>
          <template #header>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="text-lg font-bold text-highlighted">Account Information</h2>
                <p class="mt-1 text-sm text-muted">Application identity and sign-in controls.</p>
              </div>
              <UButton
                label="Edit Account"
                icon="i-lucide-pencil"
                color="neutral"
                variant="outline"
                @click="openEdit"
              />
            </div>
          </template>

          <dl class="grid gap-5 sm:grid-cols-2">
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Username</dt>
              <dd class="mt-1 font-semibold text-highlighted">{{ record.username }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Email Address</dt>
              <dd class="mt-1 break-all font-semibold text-highlighted">{{ record.email }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Assigned Role</dt>
              <dd class="mt-2">
                <UBadge :label="record.role?.name || 'No role assigned'" color="primary" variant="soft" />
              </dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Account Status</dt>
              <dd class="mt-2"><AdminStatusBadge :label="accountStatus(record)" /></dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Created</dt>
              <dd class="mt-1 text-sm text-default">{{ formatDate(record.createdAt) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Last Updated</dt>
              <dd class="mt-1 text-sm text-default">{{ formatDate(record.updatedAt) }}</dd>
            </div>
          </dl>

          <template #footer>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="record.blocked"
                label="Restore Account"
                icon="i-lucide-user-round-check"
                color="primary"
                variant="soft"
                @click="openStatus(false)"
              />
              <UButton
                v-else
                label="Block Account"
                icon="i-lucide-user-round-x"
                color="error"
                variant="soft"
                @click="openStatus(true)"
              />
            </div>
          </template>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="text-lg font-bold text-highlighted">Library Account Details</h2>
                <p class="mt-1 text-sm text-muted">Student and Librarian accounts use linked institutional records. Faculty details are optional and can be prepared automatically.</p>
              </div>
              <AdminProfileStatusBadge :status="record.profileGovernance.status" />
            </div>
          </template>

          <div v-if="linkedProfile" class="rounded-2xl border border-default bg-elevated/40 p-5">
            <div class="flex items-start gap-4">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon :name="profileTypeIcon(linkedProfile.type)" class="size-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-bold text-highlighted">{{ linkedProfile.fullName }}</p>
                  <UBadge :label="linkedProfile.type" color="primary" variant="soft" size="sm" />
                </div>
                <p class="mt-1 text-sm text-muted">{{ linkedProfile.code }}</p>
                <p v-if="linkedProfile.email" class="mt-1 break-all text-sm text-muted">{{ linkedProfile.email }}</p>
                <p v-if="linkedProfile.status" class="mt-3 text-xs font-medium text-default">Profile status: {{ linkedProfile.status }}</p>
              </div>
            </div>
          </div>

          <div v-else class="rounded-2xl border border-dashed border-default px-6 py-10 text-center">
            <UIcon name="i-lucide-link-2-off" class="mx-auto size-10 text-dimmed" />
            <h3 class="mt-3 font-semibold text-highlighted">
              {{ facultyDetailsOptional
                ? 'Faculty Library details have not been added yet'
                : expectedProfileType
                  ? `No ${expectedProfileType} profile connected`
                  : 'No institutional profile required' }}
            </h3>
            <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              {{ facultyDetailsOptional
                ? 'This does not block Faculty Portal access. A basic internal Faculty Library record is prepared automatically when needed, or you can connect an existing Faculty record here.'
                : expectedProfileType
                  ? `Connect this account to its existing ${expectedProfileType} record so the user receives the correct portal data.`
                  : 'Administrator accounts operate without a Student or Librarian member profile.' }}
            </p>
          </div>

          <template #footer>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="expectedProfileType"
                :label="facultyDetailsOptional
                  ? (linkedProfile ? 'Change Faculty Record' : 'Use Existing Faculty Record')
                  : (linkedProfile ? 'Change Profile Connection' : 'Connect Profile')"
                icon="i-lucide-link-2"
                @click="openLink"
              />
              <UButton
                v-if="record.profileGovernance.profiles.length"
                label="Remove Profile Connection"
                icon="i-lucide-link-2-off"
                color="error"
                variant="outline"
                @click="() => { unlinkOpen = true; }"
              />
              <UButton
                label="Open Account Review"
                icon="i-lucide-list-checks"
                color="neutral"
                variant="ghost"
                to="/admin/accounts-review"
              />
            </div>
          </template>
        </UCard>
      </div>

      <AdminAccountSecurityPanel
        :user-id="record.id"
        :username="record.username"
      />
    </template>
  </div>

  <UModal v-model:open="linkOpen" :ui="{ content: 'sm:max-w-2xl' }">
    <template #content>
      <div class="space-y-5 bg-default p-6">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Connect {{ expectedProfileType }} Profile</h2>
          <p class="mt-1 text-sm text-muted">Only unlinked profiles and the account's current profile are available.</p>
        </div>

        <UInput
          v-model="candidateSearch"
          icon="i-lucide-search"
          :placeholder="`Search ${expectedProfileType?.toLowerCase()} name, number, or email`"
          autocomplete="off"
          class="w-full"
        />

        <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
          <div v-if="candidateLoading" class="space-y-2">
            <USkeleton v-for="index in 4" :key="index" class="h-20 w-full" />
          </div>
          <template v-else>
            <button
              v-for="candidate in candidates"
              :key="candidate.documentId"
              type="button"
              class="flex w-full items-start gap-3 rounded-xl border p-4 text-left transition"
              :class="selectedProfileDocumentId === candidate.documentId ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-default hover:bg-elevated/60'"
              @click="selectedProfileDocumentId = candidate.documentId"
            >
              <div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon :name="profileTypeIcon(candidate.type)" class="size-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-highlighted">{{ candidate.fullName }}</p>
                  <UBadge v-if="candidate.linkedAccount" label="Current connection" color="info" variant="soft" size="sm" />
                </div>
                <p class="mt-1 text-sm text-muted">{{ candidate.code }}<span v-if="candidate.email"> · {{ candidate.email }}</span></p>
                <p v-if="candidate.status" class="mt-1 text-xs text-muted">Profile status: {{ candidate.status }}</p>
              </div>
              <UIcon
                :name="selectedProfileDocumentId === candidate.documentId ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                class="size-5 shrink-0"
                :class="selectedProfileDocumentId === candidate.documentId ? 'text-primary' : 'text-dimmed'"
              />
            </button>
          </template>
          <div v-if="!candidateLoading && !candidates.length" class="rounded-xl border border-dashed border-default px-5 py-10 text-center">
            <p class="font-semibold text-highlighted">No available profiles found</p>
            <p class="mt-1 text-sm text-muted">Adjust the search or verify that the profile is not linked to another account.</p>
          </div>
        </div>

        <UFormField label="Reason for this connection" required help="This reason is written to the administrator audit trail.">
          <UTextarea v-model="linkReason" :rows="3" class="w-full" placeholder="Example: Correcting an unlinked portal account" />
        </UFormField>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" :disabled="saving" @click="() => { linkOpen = false; }" />
          <UButton label="Save Profile Connection" icon="i-lucide-link-2" :loading="saving" @click="saveProfileLink" />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="unlinkOpen" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <div class="space-y-5 bg-default p-6">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Remove Profile Connection?</h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ facultyDetailsOptional
              ? 'Removing these Faculty details will not block Faculty Portal access. The system can prepare a basic internal Faculty Library record again when the account is used.'
              : 'The user may lose access to role-specific Library records until the correct profile is connected.' }}
          </p>
        </div>
        <UFormField label="Reason for removing the connection" required>
          <UTextarea v-model="unlinkReason" :rows="3" class="w-full" />
        </UFormField>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" :disabled="saving" @click="() => { unlinkOpen = false; }" />
          <UButton label="Remove Connection" icon="i-lucide-link-2-off" color="error" :loading="saving" @click="removeProfileLink" />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="editOpen" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <form class="space-y-5 bg-default p-6" @submit.prevent="saveAccount">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Edit User Account</h2>
          <p class="mt-1 text-sm text-muted">Student and Librarian roles require the correct linked record. Faculty Library details are optional and can be prepared automatically.</p>
        </div>
        <UFormField label="Username" required>
          <UInput v-model="editForm.username" class="w-full" />
        </UFormField>
        <UFormField label="Email Address" required>
          <UInput v-model="editForm.email" type="email" class="w-full" />
        </UFormField>
        <UFormField label="Application Role" required>
          <USelect v-model="editForm.roleId" :items="manageableRoles" class="w-full" />
        </UFormField>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" :disabled="saving" @click="() => { editOpen = false; }" />
          <UButton type="submit" label="Save Changes" icon="i-lucide-save" :loading="saving" />
        </div>
      </form>
    </template>
  </UModal>

  <UModal v-model:open="statusOpen" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <div class="space-y-5 bg-default p-6 text-center">
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl" :class="pendingBlockedState ? 'bg-error/10 text-error' : 'bg-success/10 text-success'">
          <UIcon :name="pendingBlockedState ? 'i-lucide-user-round-x' : 'i-lucide-user-round-check'" class="size-7" />
        </div>
        <div>
          <h2 class="text-xl font-bold text-highlighted">{{ pendingBlockedState ? 'Block this account?' : 'Restore this account?' }}</h2>
          <p class="mt-2 text-sm leading-6 text-muted">{{ pendingBlockedState ? 'The user will be prevented from signing in.' : 'The user will be allowed to sign in again.' }}</p>
        </div>
        <UFormField label="Reason for this account-status change" required help="The reason is stored in the administrator audit trail.">
          <UTextarea
            v-model="statusReason"
            :rows="3"
            class="w-full"
            :placeholder="pendingBlockedState ? 'Example: Account reported as compromised' : 'Example: Access restored after identity verification'"
          />
        </UFormField>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <UButton label="Cancel" color="neutral" variant="outline" block :disabled="saving" @click="() => { statusOpen = false; }" />
          <UButton :label="pendingBlockedState ? 'Block Account' : 'Restore Account'" :color="pendingBlockedState ? 'error' : 'success'" block :loading="saving" @click="confirmStatusChange" />
        </div>
      </div>
    </template>
  </UModal>
  </template>
</template>
