<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { AdminLibrarianRecord } from "~/composables/useAdminLibrarians";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Librarians",
});

const api = useAdminLibrarians();
const auth = useAuth();
const toast = useToast();

const records = ref<AdminLibrarianRecord[]>([]);
const loading = ref(false);
const saving = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const search = ref("");
const status = ref("All");
const selected = ref<AdminLibrarianRecord | null>(null);
const statusOpen = ref(false);

const columns: TableColumn<AdminLibrarianRecord>[] = [
  { id: "librarian", header: "Librarian" },
  { id: "position", header: "Position" },
  { id: "account", header: "Sign-In Account" },
  { accessorKey: "status", header: "Profile Status" },
  { id: "actions", header: "" },
];

const statusItems = ["All", "Active", "Inactive"];

async function load() {
  loading.value = true;
  try {
    const response = await api.list({
      search: search.value,
      status: status.value,
      page: page.value,
      pageSize,
    });
    records.value = response.data;
    total.value = response.meta.total;
  } catch (error) {
    toast.add({
      title: "Unable to load librarians",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

function openStatus(record: AdminLibrarianRecord) {
  selected.value = record;
  statusOpen.value = true;
}

async function toggleStatus() {
  if (!selected.value || saving.value) return;
  saving.value = true;

  const nextStatus = selected.value.status === "Active" ? "Inactive" : "Active";

  try {
    await api.update(selected.value.documentId, { status: nextStatus });
    statusOpen.value = false;
    await load();
    toast.add({
      title: nextStatus === "Active" ? "Librarian restored" : "Librarian deactivated",
      description:
        nextStatus === "Active"
          ? "The Librarian profile and linked account are active."
          : "The profile is inactive and the linked account is blocked.",
      color: nextStatus === "Active" ? "success" : "warning",
      icon: nextStatus === "Active" ? "i-lucide-user-check" : "i-lucide-user-x",
    });
  } catch (error) {
    toast.add({
      title: "Unable to change Librarian status",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(status, () => {
  page.value = 1;
  load();
});
watch(page, load);
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    load();
  }, 350);
});

onMounted(load);
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
    <AdminPageHeader
      eyebrow="Accounts and Access"
      title="Librarians"
      description="Manage Library staff profiles together with their secured sign-in accounts. Deactivating a Librarian also blocks the linked application account."
      icon="i-lucide-user-round-cog"
    >
      <template #actions>
        <UButton
          label="Add Librarian"
          icon="i-lucide-user-plus"
          to="/admin/librarians/create"
        />
      </template>
    </AdminPageHeader>

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-link"
      title="Profile and account linking"
      description="New Librarians are created with a dedicated Users & Permissions account linked to their staff profile. Older profiles without a link are clearly marked for migration."
    />

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="font-semibold text-highlighted">Library Staff Directory</h2>
            <p class="mt-1 text-xs text-muted">{{ total }} Librarian profile{{ total === 1 ? '' : 's' }}</p>
          </div>
          <div class="grid gap-2 sm:grid-cols-[minmax(0,22rem)_10rem]">
            <UInput v-model="search" icon="i-lucide-search" placeholder="Search employee number, name, or email" />
            <USelect v-model="status" :items="statusItems" />
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-3 p-5 sm:p-6">
        <USkeleton v-for="index in 5" :key="index" class="h-16 w-full" />
      </div>

      <div v-else-if="!records.length" class="px-6 py-16 text-center">
        <UIcon name="i-lucide-user-round-search" class="mx-auto size-11 text-dimmed" />
        <h3 class="mt-3 font-semibold text-highlighted">No matching Librarian profiles</h3>
        <p class="mt-1 text-sm text-muted">Adjust the search or profile-status filter.</p>
      </div>

      <UTable v-else :data="records" :columns="columns">
        <template #librarian-cell="{ row }">
          <div class="flex items-center gap-3">
            <UAvatar :text="`${row.original.firstName?.[0] || ''}${row.original.lastName?.[0] || ''}`" size="sm" />
            <div class="min-w-0">
              <p class="truncate font-semibold text-highlighted">{{ row.original.fullName }}</p>
              <p class="truncate text-xs text-muted">{{ row.original.employeeNo }} · {{ row.original.email }}</p>
            </div>
          </div>
        </template>
        <template #position-cell="{ row }">
          <p class="text-sm font-medium text-default">{{ row.original.position }}</p>
          <p class="text-xs text-muted">Added {{ formatDate(row.original.createdAt) }}</p>
        </template>
        <template #account-cell="{ row }">
          <div v-if="row.original.account">
            <p class="text-sm font-medium text-highlighted">{{ row.original.account.username }}</p>
            <div class="mt-1 flex flex-wrap gap-1">
              <AdminStatusBadge :label="row.original.account.blocked ? 'Blocked' : row.original.account.confirmed ? 'Active' : 'Unconfirmed'" />
              <UBadge :label="row.original.account.role?.name || 'No role'" color="primary" variant="subtle" size="sm" />
            </div>
          </div>
          <UBadge v-else label="Account not linked" color="warning" variant="soft" icon="i-lucide-unlink" />
        </template>
        <template #status-cell="{ row }">
          <AdminStatusBadge :label="row.original.status" />
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              :label="row.original.status === 'Active' ? 'Deactivate' : 'Activate'"
              :icon="row.original.status === 'Active' ? 'i-lucide-user-x' : 'i-lucide-user-check'"
              :color="row.original.status === 'Active' ? 'error' : 'success'"
              variant="ghost"
              size="sm"
              @click="openStatus(row.original)"
            />
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">Showing up to {{ pageSize }} staff records per page</p>
          <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" />
        </div>
      </template>
    </UCard>
  </div>

  <UModal v-model:open="statusOpen" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <div class="space-y-5 bg-default p-6">
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl" :class="selected?.status === 'Active' ? 'bg-error/10 text-error' : 'bg-success/10 text-success'">
          <UIcon :name="selected?.status === 'Active' ? 'i-lucide-user-x' : 'i-lucide-user-check'" class="size-7" />
        </div>
        <div class="text-center">
          <h2 class="text-xl font-bold text-highlighted">
            {{ selected?.status === 'Active' ? 'Deactivate Librarian?' : 'Activate Librarian?' }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ selected?.status === 'Active'
              ? `${selected?.fullName}'s linked account will be blocked from signing in.`
              : `${selected?.fullName}'s linked account will be restored.` }}
          </p>
        </div>
        <div class="flex flex-col-reverse gap-2 sm:flex-row">
          <UButton label="Cancel" color="neutral" variant="outline" block :disabled="saving" @click="() => { statusOpen = false; }" />
          <UButton
            :label="selected?.status === 'Active' ? 'Deactivate' : 'Activate'"
            :color="selected?.status === 'Active' ? 'error' : 'success'"
            block
            :loading="saving"
            @click="toggleStatus"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
