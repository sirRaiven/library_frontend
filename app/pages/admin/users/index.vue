<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type {
  AdminRoleSummary,
  AdminUserRecord,
} from "~/composables/useAdminUsers";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Users",
});

const usersApi = useAdminUsers();
const rolesApi = useAdminRoles();
const referenceData = useReferenceData();
const auth = useAuth();
const toast = useToast();

const records = ref<AdminUserRecord[]>([]);
const roles = ref<AdminRoleSummary[]>([]);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const search = ref("");
const roleFilter = ref("all");
const statusFilter = ref<"all" | "active" | "blocked" | "unconfirmed">(
  (useRoute().query.status as any) || "all",
);
const profileFilter = ref<
  "all" | "linked" | "missing" | "mismatch" | "not-required" | "unsupported-role"
>((useRoute().query.profile as any) || "all");
const selectedUser = ref<AdminUserRecord | null>(null);
const editOpen = ref(false);
const createOpen = ref(false);
const statusOpen = ref(false);
const pendingBlockedState = ref(false);
const statusReason = ref("");

const createForm = reactive({
  username: "",
  email: "",
  password: "",
  roleId: 0,
  confirmed: true,
  includeFacultyDetails: false,
  facultyDetails: {
    employeeNo: "",
    barcode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    departmentCode: "",
    designation: "",
    contactNo: "",
    employmentTypeCode: "",
  },
});

const editForm = reactive({
  username: "",
  email: "",
  roleId: 0,
});

const columns: TableColumn<AdminUserRecord>[] = [
  { id: "account", header: "Account" },
  { id: "role", header: "Role" },
  { id: "status", header: "Account Status" },
  { id: "profile", header: "Library Record" },
  { id: "created", header: "Created" },
  { id: "actions", header: "" },
];

const roleOptions = computed(() => [
  { label: "All roles", value: "all" },
  ...roles.value.map(role => ({
    label: role.name,
    value: role.type,
  })),
]);

const createRoleOptions = computed(() =>
  roles.value
    .filter(role => role.type !== "public")
    .filter(role =>
      auth.isSuperAdministrator.value ||
      !["administrator", "system-administrator", "super-administrator", "admin"].includes(role.type) ||
      role.id === selectedUser.value?.role?.id,
    )
    .map(role => ({ label: role.name, value: role.id })),
);

const selectedCreateRole = computed(() =>
  roles.value.find(role => Number(role.id) === Number(createForm.roleId)) ?? null,
);

const creatingFacultyAccount = computed(() => {
  const role = selectedCreateRole.value;
  return String(role?.type || role?.name || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-") === "faculty";
});

const facultyDepartmentOptions = computed(() =>
  referenceData.facultyDepartments.value
    .filter((item) => item.active !== false)
    .map((item) => ({ label: item.name, value: item.code })),
);

const facultyEmploymentOptions = computed(() =>
  referenceData.facultyEmploymentTypes.value
    .filter((item) => item.active !== false)
    .map((item) => ({ label: item.name, value: item.code })),
);

const statusOptions = [
  { label: "All account statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Blocked", value: "blocked" },
  { label: "Unconfirmed", value: "unconfirmed" },
];

const profileOptions = [
  { label: "All Library record states", value: "all" },
  { label: "Record linked", value: "linked" },
  { label: "Required record missing", value: "missing" },
  { label: "Record mismatch", value: "mismatch" },
  { label: "Record not required", value: "not-required" },
  { label: "Role not managed", value: "unsupported-role" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function accountStatus(record: AdminUserRecord) {
  if (record.blocked) return "Blocked";
  if (!record.confirmed) return "Unconfirmed";
  return "Active";
}

function resetCreateForm() {
  Object.assign(createForm, {
    username: "",
    email: "",
    password: "",
    roleId: createRoleOptions.value[0]?.value ?? 0,
    confirmed: true,
    includeFacultyDetails: false,
  });
  Object.assign(createForm.facultyDetails, {
    employeeNo: "",
    barcode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    departmentCode: facultyDepartmentOptions.value[0]?.value ?? "",
    designation: "",
    contactNo: "",
    employmentTypeCode: facultyEmploymentOptions.value[0]?.value ?? "",
  });
}

async function loadRoles() {
  roles.value = await rolesApi.list();
  if (!createForm.roleId) {
    createForm.roleId = createRoleOptions.value[0]?.value ?? 0;
  }
}

async function loadUsers() {
  loading.value = true;

  try {
    const response = await usersApi.list({
      search: search.value,
      role: roleFilter.value,
      status: statusFilter.value,
      profileStatus: profileFilter.value,
      page: page.value,
      pageSize,
    });
    records.value = response.data;
    total.value = response.meta.total;
  } catch (error) {
    toast.add({
      title: "Unable to load users",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  selectedUser.value = null;
  resetCreateForm();
  createOpen.value = true;
}

function openEdit(record: AdminUserRecord) {
  selectedUser.value = record;
  Object.assign(editForm, {
    username: record.username,
    email: record.email,
    roleId: record.role?.id ?? 0,
  });
  editOpen.value = true;
}

function openStatus(record: AdminUserRecord, blocked: boolean) {
  selectedUser.value = record;
  pendingBlockedState.value = blocked;
  statusReason.value = "";
  statusOpen.value = true;
}

async function createAccount() {
  if (saving.value) return;

  if (
    createForm.username.trim().length < 3 ||
    !createForm.email.includes("@") ||
    createForm.password.length < 12 ||
    !createForm.roleId
  ) {
    toast.add({
      title: "Complete the required account information",
      description: "Use a valid email, a username of at least 3 characters, and a temporary password of at least 12 characters.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  if (creatingFacultyAccount.value && createForm.includeFacultyDetails) {
    const details = createForm.facultyDetails;
    if (
      details.employeeNo.trim().length < 2 ||
      details.firstName.trim().length < 1 ||
      details.lastName.trim().length < 1 ||
      !details.departmentCode ||
      !details.employmentTypeCode
    ) {
      toast.add({
        title: "Complete the Faculty details",
        description: "Employee number, first name, last name, department, and employment type are required when Faculty details are included.",
        color: "warning",
        icon: "i-lucide-triangle-alert",
      });
      return;
    }
  }

  saving.value = true;
  try {
    const created = await usersApi.create({
      username: createForm.username.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      roleId: createForm.roleId,
      confirmed: createForm.confirmed,
      ...(creatingFacultyAccount.value && createForm.includeFacultyDetails
        ? { facultyDetails: { ...createForm.facultyDetails } }
        : {}),
    });
    createOpen.value = false;
    await loadUsers();
    toast.add({
      title: "User account created",
      description: creatingFacultyAccount.value
        ? createForm.includeFacultyDetails
          ? "The Faculty account and Library details are ready to use."
          : "The Faculty account is ready. Basic Library details were prepared automatically and can be completed later."
        : created.profileGovernance?.required
          ? "The account was created. Connect it to the correct institutional profile next."
          : "The new account was created with the selected role.",
      color: "success",
      icon: "i-lucide-user-check",
    });
    await navigateTo(`/admin/users/${created.id}`);
  } catch (error) {
    toast.add({
      title: "Unable to create account",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}

async function saveAccount() {
  if (!selectedUser.value || saving.value) return;
  saving.value = true;

  try {
    await usersApi.update(selectedUser.value.id, {
      username: editForm.username,
      email: editForm.email,
    });

    if (editForm.roleId && editForm.roleId !== selectedUser.value.role?.id) {
      await usersApi.assignRole(selectedUser.value.id, editForm.roleId);
    }

    editOpen.value = false;
    await loadUsers();
    toast.add({
      title: "Account updated",
      description: "The account information and assigned role were saved.",
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

async function confirmStatusChange() {
  if (!selectedUser.value || saving.value) return;
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
    await usersApi.changeStatus(selectedUser.value.id, {
      blocked: pendingBlockedState.value,
      reason: statusReason.value.trim(),
    });
    statusOpen.value = false;
    await loadUsers();
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

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => createForm.roleId,
  () => {
    if (!creatingFacultyAccount.value) {
      createForm.includeFacultyDetails = false;
    }
  },
);

watch([roleFilter, statusFilter, profileFilter], () => {
  page.value = 1;
  loadUsers();
});
watch(page, loadUsers);
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadUsers();
  }, 350);
});

onMounted(async () => {
  try {
    await referenceData.loadOperational();
    createForm.facultyDetails.departmentCode ||= facultyDepartmentOptions.value[0]?.value ?? "";
    createForm.facultyDetails.employmentTypeCode ||= facultyEmploymentOptions.value[0]?.value ?? "";
  } catch (error) {
    toast.add({
      title: "Unable to load Faculty choices",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
  await loadRoles();
  await loadUsers();
});
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
    <AdminPageHeader
      eyebrow="Accounts and Access"
      title="Users"
      description="Create accounts, assign application roles, confirm access, and block compromised or inactive accounts. Passwords and refresh tokens are never displayed in this panel."
      icon="i-lucide-users"
    >
      <template #actions>
        <UButton
          label="Add User"
          icon="i-lucide-user-plus"
          @click="openCreate"
        />
      </template>
    </AdminPageHeader>

    <UAlert
      color="primary"
      variant="soft"
      icon="i-lucide-shield-check"
      title="Account security"
      description="Administrator actions are access-controlled and recorded in the Audit Trail. Regular administrators cannot assign administrator roles or modify other administrator accounts."
    />

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="font-semibold text-highlighted">Users</h2>
            <p class="mt-1 text-xs text-muted">{{ total }} account{{ total === 1 ? '' : 's' }} found</p>
          </div>
          <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 xl:w-[64rem]">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search username or email"
              autocomplete="off"
            />
            <USelect v-model="roleFilter" :items="roleOptions" />
            <USelect v-model="statusFilter" :items="statusOptions" />
            <USelect v-model="profileFilter" :items="profileOptions" />
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-3 p-5 sm:p-6">
        <USkeleton v-for="index in 6" :key="index" class="h-16 w-full" />
      </div>

      <div v-else-if="!records.length" class="px-6 py-16 text-center">
        <UIcon name="i-lucide-users" class="mx-auto size-11 text-dimmed" />
        <h3 class="mt-3 font-semibold text-highlighted">No matching users</h3>
        <p class="mt-1 text-sm text-muted">Adjust the search or account-status filters.</p>
      </div>

      <UTable v-else :data="records" :columns="columns">
        <template #account-cell="{ row }">
          <div class="flex items-center gap-3">
            <UAvatar :text="row.original.username.slice(0, 2).toUpperCase()" size="sm" />
            <div class="min-w-0">
              <p class="truncate font-semibold text-highlighted">{{ row.original.username }}</p>
              <p class="truncate text-xs text-muted">{{ row.original.email }}</p>
            </div>
          </div>
        </template>
        <template #role-cell="{ row }">
          <UBadge
            :label="row.original.role?.name || 'No role assigned'"
            :color="row.original.role ? 'primary' : 'warning'"
            variant="soft"
          />
        </template>
        <template #status-cell="{ row }">
          <AdminStatusBadge :label="accountStatus(row.original)" />
        </template>
        <template #profile-cell="{ row }">
          <div class="space-y-1">
            <AdminProfileStatusBadge
              :status="row.original.profileGovernance?.status ?? 'Unavailable'"
            />
            <p
              v-if="row.original.profileGovernance?.profile"
              class="max-w-48 truncate text-xs text-muted"
            >
              {{ row.original.profileGovernance?.profile?.fullName || 'Profile details unavailable' }}
            </p>
          </div>
        </template>
        <template #created-cell="{ row }">
          <p class="text-sm text-default">{{ formatDate(row.original.createdAt) }}</p>
          <p class="text-xs text-muted">{{ row.original.provider || 'local' }} provider</p>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UTooltip text="Open account details">
              <UButton
                icon="i-lucide-external-link"
                color="primary"
                variant="ghost"
                square
                :to="`/admin/users/${row.original.id}`"
              />
            </UTooltip>
            <UTooltip text="Edit account and role">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                square
                @click="openEdit(row.original)"
              />
            </UTooltip>
            <UTooltip :text="row.original.blocked ? 'Restore account' : 'Block account'">
              <UButton
                :icon="row.original.blocked ? 'i-lucide-user-round-check' : 'i-lucide-user-round-x'"
                :color="row.original.blocked ? 'success' : 'error'"
                variant="ghost"
                square
                @click="openStatus(row.original, !row.original.blocked)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">Showing up to {{ pageSize }} records per page</p>
          <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" />
        </div>
      </template>
    </UCard>
  </div>

  <UModal v-model:open="createOpen" :ui="{ content: 'sm:max-w-3xl' }">
    <template #content>
      <form class="space-y-5 bg-default p-6" @submit.prevent="createAccount">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Create User Account</h2>
          <p class="mt-1 text-sm text-muted">Create a secured application account and assign its initial role. Faculty accounts can be used immediately; additional Faculty Library details are optional.</p>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Username" required>
            <UInput v-model="createForm.username" autocomplete="off" class="w-full" />
          </UFormField>
          <UFormField label="Email Address" required>
            <UInput v-model="createForm.email" type="email" autocomplete="off" class="w-full" />
          </UFormField>
          <UFormField label="Temporary Password" required class="sm:col-span-2" help="Use at least 12 characters and share it through a secure channel.">
            <UInput v-model="createForm.password" type="password" autocomplete="new-password" class="w-full" />
          </UFormField>
          <UFormField label="Application Role" required class="sm:col-span-2">
            <USelect v-model="createForm.roleId" :items="createRoleOptions" class="w-full" />
          </UFormField>
          <UCheckbox v-model="createForm.confirmed" label="Mark account as confirmed" class="sm:col-span-2" />

          <div
            v-if="creatingFacultyAccount"
            class="sm:col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-briefcase-business" class="size-5 text-primary" />
                  <h3 class="font-semibold text-highlighted">Faculty Library details</h3>
                  <UBadge label="Optional" color="neutral" variant="soft" size="sm" />
                </div>
                <p class="mt-2 max-w-2xl text-xs leading-5 text-muted">
                  The Faculty account does not require a separate registration. If you skip these fields, the system prepares a basic internal Faculty Library record automatically so the portal works immediately.
                </p>
              </div>
              <USwitch
                v-model="createForm.includeFacultyDetails"
                label="Add details now"
                class="shrink-0"
              />
            </div>

            <div v-if="createForm.includeFacultyDetails" class="mt-5 grid gap-4 sm:grid-cols-2">
              <UFormField label="Employee Number" required>
                <UInput v-model="createForm.facultyDetails.employeeNo" autocomplete="off" class="w-full" placeholder="Example: FAC-2026-001" />
              </UFormField>
              <UFormField label="Faculty ID Barcode" help="Optional. The employee number is used when left blank.">
                <UInput v-model="createForm.facultyDetails.barcode" autocomplete="off" class="w-full" />
              </UFormField>
              <UFormField label="First Name" required>
                <UInput v-model="createForm.facultyDetails.firstName" class="w-full" />
              </UFormField>
              <UFormField label="Last Name" required>
                <UInput v-model="createForm.facultyDetails.lastName" class="w-full" />
              </UFormField>
              <UFormField label="Department" required>
                <USelect v-model="createForm.facultyDetails.departmentCode" :items="facultyDepartmentOptions" class="w-full" />
              </UFormField>
              <UFormField label="Designation">
                <UInput v-model="createForm.facultyDetails.designation" class="w-full" placeholder="Example: Instructor" />
              </UFormField>
              <UFormField label="Employment Type" required>
                <USelect v-model="createForm.facultyDetails.employmentTypeCode" :items="facultyEmploymentOptions" class="w-full" />
              </UFormField>
              <UFormField label="Contact Number">
                <UInput v-model="createForm.facultyDetails.contactNo" class="w-full" />
              </UFormField>
            </div>
          </div>
        </div>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" :disabled="saving" @click="createOpen = false" />
          <UButton type="submit" label="Create Account" icon="i-lucide-user-plus" :loading="saving" />
        </div>
      </form>
    </template>
  </UModal>

  <UModal v-model:open="editOpen" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <form class="space-y-5 bg-default p-6" @submit.prevent="saveAccount">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Edit User Account</h2>
          <p class="mt-1 text-sm text-muted">Update the account identity and application role.</p>
        </div>
        <UFormField label="Username" required>
          <UInput v-model="editForm.username" class="w-full" />
        </UFormField>
        <UFormField label="Email Address" required>
          <UInput v-model="editForm.email" type="email" class="w-full" />
        </UFormField>
        <UFormField label="Application Role" required>
          <USelect v-model="editForm.roleId" :items="createRoleOptions" class="w-full" />
        </UFormField>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" :disabled="saving" @click="editOpen = false" />
          <UButton type="submit" label="Save Changes" icon="i-lucide-save" :loading="saving" />
        </div>
      </form>
    </template>
  </UModal>

  <UModal v-model:open="statusOpen" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <div class="space-y-5 bg-default p-6">
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl" :class="pendingBlockedState ? 'bg-error/10 text-error' : 'bg-success/10 text-success'">
          <UIcon :name="pendingBlockedState ? 'i-lucide-user-round-x' : 'i-lucide-user-round-check'" class="size-7" />
        </div>
        <div class="text-center">
          <h2 class="text-xl font-bold text-highlighted">
            {{ pendingBlockedState ? 'Block this account?' : 'Restore this account?' }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ pendingBlockedState
              ? `${selectedUser?.username} will be prevented from signing in until an administrator restores the account.`
              : `${selectedUser?.username} will be allowed to sign in again.` }}
          </p>
        </div>
        <UFormField label="Reason for this account-status change" required help="The reason is stored in the administrator audit trail.">
          <UTextarea
            v-model="statusReason"
            :rows="3"
            class="w-full"
            :placeholder="pendingBlockedState ? 'Example: Account reported as compromised' : 'Example: Identity and access have been verified'"
          />
        </UFormField>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <UButton label="Cancel" color="neutral" variant="outline" block :disabled="saving" @click="statusOpen = false" />
          <UButton
            :label="pendingBlockedState ? 'Block Account' : 'Restore Account'"
            :color="pendingBlockedState ? 'error' : 'success'"
            block
            :loading="saving"
            @click="confirmStatusChange"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
