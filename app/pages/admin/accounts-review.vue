<script setup lang="ts">
import AppRecordCard from "~/components/shared/AppRecordCard.vue";
import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";
import AppStatusBadge from "~/components/shared/AppStatusBadge.vue";
import type { TableColumn } from "@nuxt/ui";
import type {
  AdminLinkedProfile,
  AdminManagedProfileType,
  AdminUserRecord,
} from "~/composables/useAdminUsers";
import type { AdminAccountsReviewSummary } from "~/composables/useAdminAccountGovernance";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Account Review",
});

const governanceApi = useAdminAccountGovernance();
const auth = useAuth();
const toast = useToast();

const section = ref<"accounts" | "profiles">("accounts");
const accountRecords = ref<AdminUserRecord[]>([]);
const profileRecords = ref<AdminLinkedProfile[]>([]);
const summary = ref<AdminAccountsReviewSummary>({
  accountsMissingProfile: 0,
  roleOrProfileMismatch: 0,
  studentProfilesWithoutAccount: 0,
  facultyProfilesWithoutAccount: 0,
  librarianProfilesWithoutAccount: 0,
});
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const search = ref("");
const profileType = ref<"All" | AdminManagedProfileType>("All");
const createOpen = ref(false);
const selectedProfile = ref<AdminLinkedProfile | null>(null);

const createForm = reactive({
  username: "",
  email: "",
  password: "",
  confirmed: true,
});

const accountColumns: TableColumn<AdminUserRecord>[] = [
  { id: "account", header: "Account" },
  { id: "role", header: "Expected Profile" },
  { id: "issue", header: "Review Concern" },
  { id: "linked", header: "Current Connection" },
  { id: "actions", header: "" },
];

const profileColumns: TableColumn<AdminLinkedProfile>[] = [
  { id: "profile", header: "Institutional Profile" },
  { id: "type", header: "Profile Type" },
  { id: "status", header: "Record Status" },
  { id: "email", header: "Email Address" },
  { id: "actions", header: "" },
];

const typeOptions = [
  { label: "All profile types", value: "All" },
  { label: "Students", value: "Student" },
  { label: "Faculty", value: "Faculty" },
  { label: "Librarians", value: "Librarian" },
];

function profileTypeIcon(type: AdminManagedProfileType): string {
  if (type === "Student") return "i-lucide-graduation-cap";
  if (type === "Faculty") return "i-lucide-briefcase-business";
  return "i-lucide-library";
}


function generateUsername(profile: AdminLinkedProfile) {
  const emailName = profile.email?.split("@")[0] || "";
  const base = emailName || profile.code;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 80);
}

async function loadReview() {
  loading.value = true;

  try {
    if (section.value === "accounts") {
      const response = await governanceApi.review<AdminUserRecord>({
        section: "accounts",
        search: search.value,
        profileType: profileType.value,
        page: page.value,
        pageSize,
      });
      accountRecords.value = response.data;
      profileRecords.value = [];
      summary.value = response.summary;
      total.value = response.meta.total;
    } else {
      const response = await governanceApi.review<AdminLinkedProfile>({
        section: "profiles",
        search: search.value,
        profileType: profileType.value,
        page: page.value,
        pageSize,
      });
      profileRecords.value = response.data;
      accountRecords.value = [];
      summary.value = response.summary;
      total.value = response.meta.total;
    }
  } catch (error) {
    toast.add({
      title: "Unable to load account review",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

function openCreateAccount(profile: AdminLinkedProfile) {
  selectedProfile.value = profile;
  Object.assign(createForm, {
    username: generateUsername(profile),
    email: profile.email || "",
    password: "",
    confirmed: true,
  });
  createOpen.value = true;
}

async function createLinkedAccount() {
  if (
    !selectedProfile.value ||
    createForm.username.trim().length < 3 ||
    !createForm.email.includes("@") ||
    createForm.password.length < 12 ||
    saving.value
  ) {
    toast.add({
      title: "Complete the account information",
      description: "Use a valid email, a username of at least 3 characters, and a temporary password of at least 12 characters.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  saving.value = true;
  try {
    const account = await governanceApi.createProfileAccount({
      profileType: selectedProfile.value.type,
      profileDocumentId: selectedProfile.value.documentId,
      username: createForm.username.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      confirmed: createForm.confirmed,
    });

    createOpen.value = false;
    toast.add({
      title: "Linked account created",
      description: `${selectedProfile.value.fullName} now has a ${selectedProfile.value.type} Portal account.`,
      color: "success",
      icon: "i-lucide-user-check",
    });
    await navigateTo(`/admin/users/${account.id}`);
  } catch (error) {
    toast.add({
      title: "Unable to create linked account",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}

watch(section, () => {
  page.value = 1;
  loadReview();
});
watch(profileType, () => {
  page.value = 1;
  loadReview();
});
watch(page, loadReview);

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadReview();
  }, 350);
});

onMounted(loadReview);
</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page space-y-6">
    <AdminPageHeader
      eyebrow="People & Access"
      title="Account Review"
      description="Find login accounts that need identity-record review and institutional records that do not yet have portal access. Faculty accounts do not require a pre-existing profile; their basic Library record can be prepared automatically."
      icon="i-lucide-list-checks"
    >
      <template #actions>
        <UButton
          label="Users"
          icon="i-lucide-users"
          color="neutral"
          variant="outline"
          to="/admin/users"
        />
        <UButton
          label="Refresh Review"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="loadReview"
        />
      </template>
    </AdminPageHeader>

    <UAlert
      color="primary"
      variant="soft"
      icon="i-lucide-shield-check"
      title="Profile links control role-specific Library data"
      description="Student and Librarian accounts require their matching institutional record. Faculty accounts may optionally use an existing Faculty record; otherwise the system prepares a basic internal Library record automatically. Administrator accounts must not be connected to member profiles."
    />

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
      <AdminMetricCard
        label="Accounts Missing Profiles"
        :value="summary.accountsMissingProfile"
        description="Student or Librarian accounts without their required institutional record."
        icon="i-lucide-link-2-off"
        tone="warning"
        to="/admin/accounts-review"
      />
      <AdminMetricCard
        label="Profile or Role Mismatches"
        :value="summary.roleOrProfileMismatch"
        description="Accounts linked to an incompatible or multiple profile."
        icon="i-lucide-triangle-alert"
        tone="error"
      />
      <AdminMetricCard
        label="Students Without Accounts"
        :value="summary.studentProfilesWithoutAccount"
        description="Registered Student profiles without portal access."
        icon="i-lucide-graduation-cap"
        tone="primary"
      />
      <AdminMetricCard
        label="Faculty Without Accounts"
        :value="summary.facultyProfilesWithoutAccount"
        icon="i-lucide-briefcase-business"
        description="Existing Faculty Library records without portal access."
        tone="info"
      />
      <AdminMetricCard
        label="Librarians Without Accounts"
        :value="summary.librarianProfilesWithoutAccount"
        description="Librarian profiles without an application account."
        icon="i-lucide-library"
        tone="info"
      />
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="space-y-4">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="font-semibold text-highlighted">Account and Profile Review</h2>
              <p class="mt-1 text-xs text-muted">{{ total }} record{{ total === 1 ? '' : 's' }} in the selected view</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-2 lg:w-[38rem]">
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Search account, name, number, or email"
                autocomplete="off"
                aria-label="Search account and profile review records"
              />
              <USelect v-model="profileType" :items="typeOptions" aria-label="Filter review records by profile type" />
            </div>
          </div>

          <div class="inline-flex w-full rounded-xl bg-elevated p-1 sm:w-auto">
            <UButton
              label="Accounts With Connection Problems"
              icon="i-lucide-user-round-search"
              :color="section === 'accounts' ? 'primary' : 'neutral'"
              :variant="section === 'accounts' ? 'solid' : 'ghost'"
              class="flex-1 sm:flex-none"
              @click="() => { section = 'accounts'; }"
            />
            <UButton
              label="Profiles Without Accounts"
              icon="i-lucide-id-card"
              :color="section === 'profiles' ? 'primary' : 'neutral'"
              :variant="section === 'profiles' ? 'solid' : 'ghost'"
              class="flex-1 sm:flex-none"
              @click="() => { section = 'profiles'; }"
            />
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-3 p-5 sm:p-6">
        <USkeleton v-for="index in 6" :key="index" class="h-16 w-full" />
      </div>

      <template v-else-if="section === 'accounts'">
        <AdminEmptyState
          v-if="!accountRecords.length"
          title="No account connection problems found"
          description="The selected accounts have the correct institutional profile connection."
          icon="i-lucide-circle-check-big"
        />

        <AppResponsiveDataView v-else mobile-label="Accounts needing review" desktop-label="Accounts needing review table">
        <template #mobile>
          <div class="sncbt-mobile-record-list p-3">
            <AppRecordCard v-for="record in accountRecords" :key="record.id" :title="record.username" :subtitle="record.email" :to="`/admin/users/${record.id}`">
              <template #status><AdminProfileStatusBadge :status="record.profileGovernance?.status ?? 'Unavailable'" /></template>
              <template #meta><span>{{ record.role?.name || 'No role' }}</span><span>{{ record.profileGovernance?.profile?.fullName || 'No profile connected' }}</span><span>{{ record.profileGovernance?.issues?.[0] || 'Review account connection' }}</span></template>
            </AppRecordCard>
          </div>
        </template>
        <template #desktop>
          <UTable :data="accountRecords" :columns="accountColumns">
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
                      <p class="font-medium text-default">{{ row.original.role?.name || 'No role' }}</p>
                      <p class="text-xs text-muted">Expected: {{ row.original.profileGovernance?.expectedType || 'Not managed' }}</p>
                    </template>
                    <template #issue-cell="{ row }">
                      <AdminProfileStatusBadge :status="row.original.profileGovernance?.status ?? 'Unavailable'" />
                      <p class="mt-1 max-w-md text-xs leading-5 text-muted">{{ row.original.profileGovernance?.issues?.[0] || 'Profile governance details are unavailable.' }}</p>
                    </template>
                    <template #linked-cell="{ row }">
                      <div v-if="row.original.profileGovernance?.profile">
                        <p class="font-medium text-default">{{ row.original.profileGovernance?.profile?.fullName || 'Unnamed profile' }}</p>
                        <p class="text-xs text-muted">{{ row.original.profileGovernance?.profile?.type || 'Profile' }} · {{ row.original.profileGovernance?.profile?.code || 'No code' }}</p>
                      </div>
                      <span v-else class="text-sm text-muted">No profile connected</span>
                    </template>
                    <template #actions-cell="{ row }">
                      <div class="flex justify-end">
                        <UButton
                          label="Review Account"
                          icon="i-lucide-arrow-right"
                          color="primary"
                          variant="soft"
                          :to="`/admin/users/${row.original.id}`"
                        />
                      </div>
                    </template>
                  </UTable>
        </template>
      </AppResponsiveDataView>
      </template>

      <template v-else>
        <AdminEmptyState
          v-if="!profileRecords.length"
          title="No unassigned institutional records found"
          description="The selected existing records already have portal accounts. Faculty accounts do not require a pre-existing record."
          icon="i-lucide-circle-check-big"
        />

        <AppResponsiveDataView v-else mobile-label="Profiles without portal accounts" desktop-label="Profiles without portal accounts table">
        <template #mobile>
          <div class="sncbt-mobile-record-list p-3">
            <AppRecordCard v-for="record in profileRecords" :key="`${record.type}-${record.documentId || record.code}`" :title="record.fullName" :subtitle="record.code">
              <template #status><AppStatusBadge :label="record.status || 'Unknown'" :tone="record.status === 'Active' ? 'success' : 'neutral'" /></template>
              <template #meta><span>{{ record.type }}</span><span>{{ record.email || 'No email recorded' }}</span></template>
              <template #actions><UButton icon="i-lucide-user-plus" color="primary" variant="ghost" square aria-label="Create portal account" @click="openCreateAccount(record)" /></template>
            </AppRecordCard>
          </div>
        </template>
        <template #desktop>
          <UTable :data="profileRecords" :columns="profileColumns">
                    <template #profile-cell="{ row }">
                      <div class="flex items-center gap-3">
                        <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <UIcon :name="profileTypeIcon(row.original.type)" class="size-4" />
                        </div>
                        <div class="min-w-0">
                          <p class="truncate font-semibold text-highlighted">{{ row.original.fullName }}</p>
                          <p class="truncate text-xs text-muted">{{ row.original.code }}</p>
                        </div>
                      </div>
                    </template>
                    <template #type-cell="{ row }">
                      <UBadge :label="row.original.type" color="primary" variant="soft" />
                    </template>
                    <template #status-cell="{ row }">
                      <AdminStatusBadge :label="row.original.status || 'Unknown'" />
                    </template>
                    <template #email-cell="{ row }">
                      <p class="max-w-56 truncate text-sm text-default">{{ row.original.email || 'No email recorded' }}</p>
                    </template>
                    <template #actions-cell="{ row }">
                      <div class="flex justify-end">
                        <UButton
                          label="Create Portal Account"
                          icon="i-lucide-user-plus"
                          color="primary"
                          variant="soft"
                          @click="openCreateAccount(row.original)"
                        />
                      </div>
                    </template>
                  </UTable>
        </template>
      </AppResponsiveDataView>
      </template>

      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">Showing up to {{ pageSize }} records per page</p>
          <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" />
        </div>
      </template>
    </UCard>
  </div>

  <UModal v-model:open="createOpen" :ui="{ content: 'sm:max-w-xl' }">
    <template #content>
      <form class="space-y-5 bg-default p-6" @submit.prevent="createLinkedAccount">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Create {{ selectedProfile?.type }} Portal Account</h2>
          <p class="mt-1 text-sm text-muted">The new account will be linked directly to {{ selectedProfile?.fullName }}.</p>
        </div>

        <div v-if="selectedProfile" class="rounded-xl border border-default bg-elevated/50 p-4">
          <p class="font-semibold text-highlighted">{{ selectedProfile.fullName }}</p>
          <p class="mt-1 text-sm text-muted">{{ selectedProfile.code }} · {{ selectedProfile.type }}</p>
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
          <UCheckbox v-model="createForm.confirmed" label="Mark account as confirmed" class="sm:col-span-2" />
        </div>

        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-key-round"
          title="Temporary password handling"
          description="The temporary password is used only when the account is created and is not displayed again afterward."
        />

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" :disabled="saving" @click="() => { createOpen = false; }" />
          <UButton type="submit" label="Create and Connect Account" icon="i-lucide-user-check" :loading="saving" />
        </div>
      </form>
    </template>
  </UModal>
</template>
