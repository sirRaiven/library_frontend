<script setup lang="ts">
import AppDialogFrame from "~/components/shared/AppDialogFrame.vue";
import AppFilterBar from "~/components/shared/AppFilterBar.vue";
import AppRecordCard from "~/components/shared/AppRecordCard.vue";
import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";
import AppStatusBadge from "~/components/shared/AppStatusBadge.vue";
import type {
  AdminDataCatalog,
  AdminDataEditableField,
  AdminDeletionImpact,
  AdminManagedDataDomain,
  AdminManagedRecord,
  AdminProtectedDataDomain,
} from "~/composables/useAdminDataManagement";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Data Management",
});

type RecordScope = "active" | "archived";
type MainView = "managed" | "protected";

const auth = useAuth();
const api = useAdminDataManagement();
const toast = useToast();

const catalog = ref<AdminDataCatalog | null>(null);
const catalogLoading = ref(true);
const recordsLoading = ref(false);
const actionLoading = ref(false);
const impactLoading = ref(false);
const loadError = ref("");

const mainView = ref<MainView>("managed");
const scope = ref<RecordScope>("active");
const selectedDomainKey = ref("");
const search = ref("");
const page = ref(1);
const pageSize = 25;
const records = ref<AdminManagedRecord[]>([]);
const pagination = reactive({ page: 1, pageSize, pageCount: 1, total: 0 });

const viewOpen = ref(false);
const createOpen = ref(false);
const editOpen = ref(false);
const archiveOpen = ref(false);
const restoreOpen = ref(false);
const deleteOpen = ref(false);
const selectedRecord = ref<AdminManagedRecord | null>(null);
const createForm = reactive<Record<string, any>>({});
const createRelationOptions = reactive<Record<string, Array<{ label: string; value: string }>>>({});
const editForm = reactive<Record<string, any>>({});
const createReason = ref("");
const editReason = ref("");
const archiveReason = ref("");
const restoreReason = ref("");
const deleteReason = ref("");
const deleteConfirmation = ref("");
const deleteImpact = ref<AdminDeletionImpact | null>(null);

const managedDomains = computed(() => catalog.value?.managed ?? []);
const protectedDomains = computed(() => catalog.value?.protected ?? []);
const selectedDomain = computed<AdminManagedDataDomain | null>(() =>
  managedDomains.value.find((domain) => domain.key === selectedDomainKey.value) ?? null,
);

const totalManagedRecords = computed(() =>
  managedDomains.value.reduce((sum, domain) => sum + domain.counts.total, 0),
);
const totalArchivedRecords = computed(() =>
  managedDomains.value.reduce((sum, domain) => sum + domain.counts.archived, 0),
);
const protectedRecordCount = computed(() =>
  protectedDomains.value.reduce((sum, domain) => sum + (domain.count ?? 0), 0),
);
const canPermanentlyDelete = computed(() =>
  Boolean(catalog.value?.permissions.canPermanentlyDelete),
);

const scopeItems = computed(() => [
  {
    label: "Active Records",
    value: "active" as const,
    icon: "i-lucide-database",
    count: selectedDomain.value?.counts.active ?? 0,
  },
  {
    label: "Archived Records",
    value: "archived" as const,
    icon: "i-lucide-archive",
    count: selectedDomain.value?.counts.archived ?? 0,
  },
]);

function statusTone(status: string) {
  const value = status.trim().toLowerCase();
  if (["active", "available", "current"].includes(value)) return "success" as const;
  if (["archived", "removed", "inactive"].includes(value)) return "neutral" as const;
  if (["warning", "damaged", "lost", "cancelled"].includes(value)) return "warning" as const;
  if (["critical", "blocked"].includes(value)) return "error" as const;
  return "info" as const;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function routeForRecord(domain: AdminManagedDataDomain, record: AdminManagedRecord) {
  const template = domain.editor.routeTemplate;
  if (!template) return null;
  return template.replace("{documentId}", encodeURIComponent(record.documentId));
}

async function loadCatalog() {
  catalogLoading.value = true;
  loadError.value = "";
  try {
    catalog.value = await api.catalog();
    if (!selectedDomainKey.value) {
      selectedDomainKey.value = catalog.value.managed[0]?.key ?? "";
    }
  } catch (error) {
    loadError.value = auth.getErrorMessage(error);
  } finally {
    catalogLoading.value = false;
  }
}

async function loadRecords() {
  if (!selectedDomainKey.value || mainView.value !== "managed") {
    records.value = [];
    return;
  }

  recordsLoading.value = true;
  loadError.value = "";
  try {
    const response = await api.list(selectedDomainKey.value, {
      scope: scope.value,
      search: search.value,
      page: page.value,
      pageSize,
    });
    records.value = response.data;
    Object.assign(pagination, response.meta);
  } catch (error) {
    loadError.value = auth.getErrorMessage(error);
  } finally {
    recordsLoading.value = false;
  }
}

async function refreshAll() {
  await loadCatalog();
  await loadRecords();
}

function selectDomain(key: string) {
  selectedDomainKey.value = key;
  mainView.value = "managed";
  page.value = 1;
  search.value = "";
}

function openView(record: AdminManagedRecord) {
  selectedRecord.value = record;
  viewOpen.value = true;
}

async function openCreate() {
  const domain = selectedDomain.value;
  if (!domain?.canCreate) return;
  selectedRecord.value = null;
  for (const key of Object.keys(createForm)) delete createForm[key];
  for (const key of Object.keys(createRelationOptions)) delete createRelationOptions[key];
  for (const field of domain.createFields) {
    createForm[field.key] = field.kind === "boolean" ? false : "";
    if (field.kind === "relation" && field.relationDomain) {
      try {
        createRelationOptions[field.key] = await api.lookup(field.relationDomain);
      } catch (error) {
        toast.add({ title: `Unable to load ${field.label.toLowerCase()} choices`, description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
        return;
      }
    }
  }
  createReason.value = "";
  createOpen.value = true;
}

async function saveCreate() {
  const domain = selectedDomain.value;
  if (!domain?.canCreate || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await api.create(domain.key, { ...createForm }, createReason.value.trim());
    createOpen.value = false;
    await refreshAll();
    toast.add({
      title: `${domain.singularLabel} created`,
      description: "The new record is available in the active list.",
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    toast.add({
      title: `Unable to create ${domain.singularLabel.toLowerCase()}`,
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    actionLoading.value = false;
  }
}

function openEdit(record: AdminManagedRecord) {
  const domain = selectedDomain.value;
  if (!domain || !record.canEdit) return;

  if (domain.editor.mode === "route") {
    const route = routeForRecord(domain, record);
    if (route) void navigateTo(route);
    return;
  }

  selectedRecord.value = record;
  for (const key of Object.keys(editForm)) delete editForm[key];
  for (const field of domain.editableFields) {
    let value = record.editValues[field.key] ?? "";
    if (field.kind === "datetime" && typeof value === "string" && value) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        value = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
          .toISOString()
          .slice(0, 16);
      }
    }
    editForm[field.key] = field.kind === "boolean" ? Boolean(value) : value;
  }
  editReason.value = "";
  editOpen.value = true;
}

function openArchive(record: AdminManagedRecord) {
  selectedRecord.value = record;
  archiveReason.value = "";
  archiveOpen.value = true;
}

function openRestore(record: AdminManagedRecord) {
  selectedRecord.value = record;
  restoreReason.value = "";
  restoreOpen.value = true;
}

async function openDelete(record: AdminManagedRecord) {
  selectedRecord.value = record;
  deleteReason.value = "";
  deleteConfirmation.value = "";
  deleteImpact.value = null;
  deleteOpen.value = true;
  impactLoading.value = true;
  try {
    deleteImpact.value = await api.deletionImpact(selectedDomainKey.value, record.documentId);
  } catch (error) {
    toast.add({
      title: "Unable to check record dependencies",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    impactLoading.value = false;
  }
}

async function saveEdit() {
  const record = selectedRecord.value;
  if (!record || !selectedDomain.value || actionLoading.value) return;

  actionLoading.value = true;
  try {
    await api.update(selectedDomainKey.value, record.documentId, { ...editForm }, editReason.value.trim());
    editOpen.value = false;
    await refreshAll();
    toast.add({
      title: "Record updated",
      description: `${record.title} was saved successfully.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    toast.add({
      title: "Unable to update record",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    actionLoading.value = false;
  }
}

async function confirmArchive() {
  const record = selectedRecord.value;
  if (!record || actionLoading.value || archiveReason.value.trim().length < 8) return;

  actionLoading.value = true;
  try {
    await api.archive(selectedDomainKey.value, record.documentId, archiveReason.value.trim());
    archiveOpen.value = false;
    await refreshAll();
    toast.add({
      title: "Record archived",
      description: `${record.title} moved to Archived Records and can be restored.`,
      color: "success",
      icon: "i-lucide-archive",
    });
  } catch (error) {
    toast.add({
      title: "Unable to archive record",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    actionLoading.value = false;
  }
}

async function confirmRestore() {
  const record = selectedRecord.value;
  if (!record || actionLoading.value || restoreReason.value.trim().length < 8) return;

  actionLoading.value = true;
  try {
    await api.restore(selectedDomainKey.value, record.documentId, restoreReason.value.trim());
    restoreOpen.value = false;
    await refreshAll();
    toast.add({
      title: "Record restored",
      description: `${record.title} is active again.`,
      color: "success",
      icon: "i-lucide-archive-restore",
    });
  } catch (error) {
    toast.add({
      title: "Unable to restore record",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    actionLoading.value = false;
  }
}

const deleteReady = computed(() =>
  Boolean(
    canPermanentlyDelete.value &&
    deleteImpact.value?.allowed &&
    deleteReason.value.trim().length >= 8 &&
    deleteConfirmation.value.trim() === deleteImpact.value?.confirmationPhrase,
  ),
);

async function confirmPermanentDelete() {
  const record = selectedRecord.value;
  const impact = deleteImpact.value;
  if (!record || !impact || !deleteReady.value || actionLoading.value) return;

  actionLoading.value = true;
  try {
    await api.deletePermanently(selectedDomainKey.value, record.documentId, {
      reason: deleteReason.value.trim(),
      confirmation: deleteConfirmation.value.trim(),
    });
    deleteOpen.value = false;
    await refreshAll();
    toast.add({
      title: "Record permanently deleted",
      description: `${record.title} has been removed permanently. The action remains recorded in the Audit Trail.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    toast.add({
      title: "Permanent deletion was blocked",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-shield-alert",
    });
    try {
      deleteImpact.value = await api.deletionImpact(selectedDomainKey.value, record.documentId);
    } catch {
      // Preserve the original error toast if impact refresh also fails.
    }
  } finally {
    actionLoading.value = false;
  }
}

function recordActionItems(record: AdminManagedRecord) {
  const domain = selectedDomain.value;
  if (!domain) return [];

  if (scope.value === "active") {
    return [
      {
        label: "View Record",
        icon: "i-lucide-eye",
        onSelect: () => openView(record),
      },
      {
        label: domain.editor.label,
        icon: "i-lucide-pencil",
        disabled: !record.canEdit,
        onSelect: () => openEdit(record),
      },
      {
        label: "Archive Record",
        icon: "i-lucide-archive",
        onSelect: () => openArchive(record),
      },
    ];
  }

  return [
    {
      label: "View Record",
      icon: "i-lucide-eye",
      onSelect: () => openView(record),
    },
    {
      label: "Restore Record",
      icon: "i-lucide-archive-restore",
      onSelect: () => openRestore(record),
    },
    {
      label: "Open Archive",
      icon: "i-lucide-archive",
      onSelect: () => void navigateTo("/admin/archive"),
    },
  ];
}

function inputType(field: AdminDataEditableField) {
  if (field.kind === "integer") return "number";
  if (field.kind === "date") return "date";
  if (field.kind === "datetime") return "datetime-local";
  return "text";
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(selectedDomainKey, () => {
  page.value = 1;
  void loadRecords();
});
watch(scope, () => {
  page.value = 1;
  void loadRecords();
});
watch(page, () => void loadRecords());
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    void loadRecords();
  }, 350);
});

onMounted(async () => {
  await loadCatalog();
  await loadRecords();
});
</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page space-y-6">
    <AdminPageHeader
      eyebrow="Library Administration"
      title="Data Management"
      description="Govern catalog, identity, circulation, finance, notification, and security records from one archive-first workspace. Specialized editing still opens the established workflow so existing business rules are not bypassed."
      icon="i-lucide-database-zap"
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="selectedDomain?.canCreate && mainView === 'managed' && scope === 'active'"
            :label="`Add ${selectedDomain.singularLabel}`"
            icon="i-lucide-plus"
            @click="openCreate"
          />
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="catalogLoading || recordsLoading"
          @click="refreshAll"
        />
        </div>
      </template>
    </AdminPageHeader>

    <UAlert
      v-if="loadError"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Data Management could not be loaded"
      :description="loadError"
      :actions="[{ label: 'Try again', onClick: refreshAll }]"
    />

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-shield-check"
      title="Archive before permanent deletion"
      description="Use this workspace for active records. Archived records can be restored or permanently deleted from the dedicated Archive page, where dependency impact is reviewed before deletion."
    />

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Data-management summary">
      <AdminMetricCard
        label="Managed Records"
        :value="totalManagedRecords"
        icon="i-lucide-database"
        tone="primary"
        description="Records covered by Admin archive and retention governance"
        :loading="catalogLoading"
      />
      <AdminMetricCard
        label="Archived Records"
        :value="totalArchivedRecords"
        icon="i-lucide-archive"
        tone="warning"
        description="Recoverable records awaiting restore or retention review"
        :loading="catalogLoading"
      />
      <AdminMetricCard
        label="Protected System Records"
        :value="protectedRecordCount"
        icon="i-lucide-shield-lock"
        tone="info"
        description="Immutable or singleton records intentionally excluded from permanent deletion"
        :loading="catalogLoading"
      />
      <AdminMetricCard
        label="Permanent Delete"
        :value="'Archive only'"
        icon="i-lucide-trash-2"
        tone="warning"
        description="Permanent deletion is available only from Archive"
        :loading="catalogLoading"
      />
    </section>

    <div class="inline-flex rounded-xl border border-default bg-default p-1 shadow-sm" role="tablist" aria-label="Data management views">
      <UButton
        label="Managed Records"
        icon="i-lucide-database"
        role="tab"
        :aria-selected="mainView === 'managed'"
        :color="mainView === 'managed' ? 'primary' : 'neutral'"
        :variant="mainView === 'managed' ? 'soft' : 'ghost'"
        @click="() => { mainView = 'managed'; }"
      />
      <UButton
        label="Protected System Records"
        icon="i-lucide-shield-lock"
        role="tab"
        :aria-selected="mainView === 'protected'"
        :color="mainView === 'protected' ? 'primary' : 'neutral'"
        :variant="mainView === 'protected' ? 'soft' : 'ghost'"
        @click="() => { mainView = 'protected'; }"
      />
    </div>

    <template v-if="mainView === 'managed'">
      <section class="space-y-3" aria-labelledby="managed-categories-heading">
        <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="managed-categories-heading" class="text-base font-semibold text-highlighted">Manage a data category</h2>
            <p class="mt-1 text-sm text-muted">Choose a category. Archive/restore/delete governance is centralized here. When a record already has a dedicated editor, the Edit action opens that workflow instead of duplicating or bypassing its business rules.</p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="domain in managedDomains"
            :key="domain.key"
            type="button"
            class="sncbt-surface sncbt-card-interactive relative overflow-hidden rounded-xl border p-4 text-left transition"
            :class="selectedDomainKey === domain.key ? 'border-primary/50 ring-2 ring-primary/15' : 'border-default hover:border-primary/25'"
            :aria-pressed="selectedDomainKey === domain.key"
            @click="selectDomain(domain.key)"
          >
            <div class="flex items-start gap-3">
              <div class="sncbt-icon-tile flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <UIcon :name="domain.icon" class="size-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-semibold text-highlighted">{{ domain.label }}</p>
                    <p class="mt-1 line-clamp-2 text-xs leading-5 text-muted">{{ domain.description }}</p>
                  </div>
                  <UIcon
                    v-if="selectedDomainKey === domain.key"
                    name="i-lucide-circle-check"
                    class="size-5 shrink-0 text-primary"
                  />
                </div>
                <div class="mt-3 flex flex-wrap gap-2 text-xs">
                  <span class="rounded-md bg-success/10 px-2 py-1 font-medium text-success">{{ domain.counts.active }} active</span>
                  <span class="rounded-md bg-warning/10 px-2 py-1 font-medium text-warning">{{ domain.counts.archived }} archived</span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </section>

      <UCard v-if="selectedDomain" class="overflow-hidden">
        <template #header>
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex min-w-0 items-start gap-3">
              <div class="sncbt-icon-tile flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                <UIcon :name="selectedDomain.icon" class="size-5" />
              </div>
              <div class="min-w-0">
                <h2 class="text-lg font-semibold text-highlighted">{{ selectedDomain.label }}</h2>
                <p class="mt-1 max-w-3xl text-sm leading-6 text-muted">{{ selectedDomain.description }}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="item in scopeItems"
                :key="item.value"
                :label="`${item.label} (${item.count})`"
                :icon="item.icon"
                :color="scope === item.value ? 'primary' : 'neutral'"
                :variant="scope === item.value ? 'soft' : 'outline'"
                :aria-pressed="scope === item.value"
                @click="() => { scope = item.value; }"
              />
            </div>
          </div>
        </template>

        <AppFilterBar>
          <template #search>
            <UInput
              v-model="search"
              icon="i-lucide-search"
              :placeholder="`Search ${selectedDomain.label.toLowerCase()}...`"
              class="w-full"
              :aria-label="`Search ${selectedDomain.label}`"
            />
          </template>
          <template #actions>
            <UButton
              label="Refresh"
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="outline"
              :loading="recordsLoading"
              @click="loadRecords"
            />
          </template>
        </AppFilterBar>

        <div v-if="recordsLoading" class="mt-5 space-y-3">
          <USkeleton v-for="item in 6" :key="item" class="h-20 w-full rounded-xl" />
        </div>

        <div v-else-if="records.length === 0" class="mt-5 rounded-xl border border-dashed border-default bg-elevated/20">
          <AdminEmptyState
            :title="scope === 'archived' ? 'No archived records' : 'No matching active records'"
            :description="search ? 'Change the search text or clear it to see more records.' : scope === 'archived' ? 'Archived records for this category will appear here.' : 'There are currently no records in this category.'"
            :icon="scope === 'archived' ? 'i-lucide-archive' : 'i-lucide-database'"
            compact
          />
        </div>

        <AppResponsiveDataView
          v-else
          class="mt-5"
          :mobile-label="`${selectedDomain.label} records`"
          :desktop-label="`${selectedDomain.label} table`"
        >
          <template #mobile>
            <div class="sncbt-mobile-record-list">
              <AppRecordCard
                v-for="record in records"
                :key="record.documentId"
                :title="record.title"
                :subtitle="record.subtitle"
              >
                <template #status>
                  <AppStatusBadge :label="record.status" :tone="statusTone(record.status)" />
                </template>
                <template #meta>
                  <span v-for="item in record.meta" :key="item">{{ item }}</span>
                  <span>Updated {{ formatDate(record.updatedAt) }}</span>
                </template>
                <template #actions>
                  <UDropdownMenu :items="recordActionItems(record)" :content="{ align: 'end' }">
                    <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" square :aria-label="`Actions for ${record.title}`" />
                  </UDropdownMenu>
                </template>
              </AppRecordCard>
            </div>
          </template>

          <template #desktop>
            <div class="overflow-x-auto rounded-xl border border-default">
              <table class="w-full text-left text-sm">
                <thead class="bg-elevated/60 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th class="px-4 py-3">Record</th>
                    <th class="px-4 py-3">Details</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3">Updated</th>
                    <th class="w-16 px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-default">
                  <tr v-for="record in records" :key="record.documentId" class="bg-default/70 hover:bg-elevated/30">
                    <td class="px-4 py-3">
                      <p class="font-semibold text-highlighted">{{ record.title }}</p>
                      <p class="mt-0.5 text-xs text-muted">{{ record.subtitle }}</p>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex max-w-xl flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                        <span v-for="item in record.meta" :key="item">{{ item }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3">
                      <AppStatusBadge :label="record.status" :tone="statusTone(record.status)" />
                    </td>
                    <td class="px-4 py-3 text-sm text-muted">{{ formatDate(record.updatedAt) }}</td>
                    <td class="px-4 py-3 text-right">
                      <UDropdownMenu :items="recordActionItems(record)" :content="{ align: 'end' }">
                        <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" square :aria-label="`Actions for ${record.title}`" />
                      </UDropdownMenu>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </AppResponsiveDataView>

        <template #footer>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-muted">{{ pagination.total }} record{{ pagination.total === 1 ? '' : 's' }}</p>
            <UPagination
              v-if="pagination.pageCount > 1"
              v-model:page="page"
              :total="pagination.total"
              :items-per-page="pagination.pageSize"
              :sibling-count="1"
              show-edges
            />
          </div>
        </template>
      </UCard>
    </template>

    <template v-else>
      <section class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-highlighted">Protected system records</h2>
          <p class="mt-1 max-w-3xl text-sm leading-6 text-muted">
            Only immutable audit evidence and critical singleton configuration remain excluded from permanent deletion. Their dedicated managers are retained to protect system integrity.
          </p>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <UCard v-for="domain in protectedDomains" :key="domain.key" class="h-full">
            <div class="flex h-full flex-col gap-4">
              <div class="flex items-start gap-3">
                <div class="sncbt-icon-tile flex size-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info ring-1 ring-info/15">
                  <UIcon :name="domain.icon" class="size-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="font-semibold text-highlighted">{{ domain.label }}</h3>
                    <UBadge :label="domain.count === null ? 'Protected' : String(domain.count)" color="neutral" variant="soft" />
                  </div>
                  <p class="mt-2 text-sm leading-6 text-muted">{{ domain.reason }}</p>
                </div>
              </div>
              <div class="mt-auto border-t border-default/70 pt-3">
                <UButton
                  v-if="domain.href"
                  :to="domain.href"
                  label="Open Existing Manager"
                  icon="i-lucide-arrow-up-right"
                  color="neutral"
                  variant="outline"
                  size="sm"
                />
                <div v-else class="inline-flex items-center gap-2 text-xs font-medium text-muted">
                  <UIcon name="i-lucide-lock-keyhole" class="size-4" />
                  Managed outside the Administrator portal
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </section>
    </template>

    <UModal v-model:open="viewOpen" :ui="{ content: 'sm:max-w-2xl' }">
      <template #content>
        <AppDialogFrame
          v-if="selectedRecord && selectedDomain"
          :title="selectedRecord.title"
          :description="selectedRecord.subtitle"
          icon="i-lucide-eye"
          tone="primary"
        >
          <dl class="grid gap-4 sm:grid-cols-2">
            <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Status</dt><dd class="mt-1"><AppStatusBadge :label="selectedRecord.status" :tone="statusTone(selectedRecord.status)" /></dd></div>
            <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Document ID</dt><dd class="mt-1 break-all font-mono text-xs text-highlighted">{{ selectedRecord.documentId }}</dd></div>
            <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Updated</dt><dd class="mt-1 text-sm text-highlighted">{{ formatDate(selectedRecord.updatedAt) }}</dd></div>
            <div v-for="item in selectedRecord.meta" :key="item" class="sm:col-span-2"><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Detail</dt><dd class="mt-1 text-sm text-highlighted">{{ item }}</dd></div>
            <div v-for="field in selectedDomain.editableFields" :key="field.key"><dt class="text-xs font-semibold uppercase tracking-wide text-muted">{{ field.label }}</dt><dd class="mt-1 whitespace-pre-wrap text-sm text-highlighted">{{ selectedRecord.editValues[field.key] ?? 'Not recorded' }}</dd></div>
          </dl>
          <template #actions><UButton label="Close" color="neutral" variant="outline" @click="() => { viewOpen = false; }" /></template>
        </AppDialogFrame>
      </template>
    </UModal>

    <UModal v-model:open="createOpen" :ui="{ content: 'sm:max-w-2xl' }">
      <template #content>
        <AppDialogFrame
          v-if="selectedDomain"
          :title="`Add ${selectedDomain.singularLabel}`"
          description="Create a new administrator-managed record. Required fields are validated before saving."
          icon="i-lucide-plus"
          tone="primary"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField v-for="field in selectedDomain.createFields" :key="field.key" :label="field.label" :required="field.required" :description="field.help" :class="field.kind === 'textarea' ? 'sm:col-span-2' : ''">
              <UTextarea v-if="field.kind === 'textarea'" v-model="createForm[field.key]" :rows="4" :maxlength="field.maxLength" class="w-full" />
              <USelect v-else-if="field.kind === 'relation'" v-model="createForm[field.key]" :items="createRelationOptions[field.key] ?? []" value-key="value" label-key="label" class="w-full" />
              <USelect v-else-if="field.kind === 'select'" v-model="createForm[field.key]" :items="field.options ?? []" class="w-full" />
              <div v-else-if="field.kind === 'boolean'" class="flex min-h-10 items-center gap-3"><USwitch v-model="createForm[field.key]" :aria-label="field.label" /><span class="text-sm text-muted">{{ createForm[field.key] ? 'Yes' : 'No' }}</span></div>
              <UInput v-else v-model="createForm[field.key]" :type="inputType(field)" :min="field.min" :max="field.max" :maxlength="field.maxLength" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Creation note" description="Optional context recorded in the Audit Trail."><UTextarea v-model="createReason" :rows="3" class="w-full" /></UFormField>
          <template #actions><UButton label="Cancel" color="neutral" variant="outline" :disabled="actionLoading" @click="() => { createOpen = false; }" /><UButton :label="`Create ${selectedDomain.singularLabel}`" icon="i-lucide-plus" :loading="actionLoading" @click="saveCreate" /></template>
        </AppDialogFrame>
      </template>
    </UModal>

    <UModal v-model:open="editOpen" :ui="{ content: 'sm:max-w-2xl' }">
      <template #content>
        <AppDialogFrame
          v-if="selectedRecord && selectedDomain"
          :title="`Edit ${selectedDomain.singularLabel}`"
          :description="selectedRecord.title"
          icon="i-lucide-pencil"
          tone="primary"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField
              v-for="field in selectedDomain.editableFields"
              :key="field.key"
              :label="field.label"
              :required="field.required"
              :description="field.help"
              :class="field.kind === 'textarea' ? 'sm:col-span-2' : ''"
            >
              <UTextarea
                v-if="field.kind === 'textarea'"
                v-model="editForm[field.key]"
                :rows="4"
                :maxlength="field.maxLength"
                class="w-full"
              />
              <USelect
                v-else-if="field.kind === 'select'"
                v-model="editForm[field.key]"
                :items="field.options ?? []"
                class="w-full"
              />
              <div v-else-if="field.kind === 'boolean'" class="flex min-h-10 items-center gap-3">
                <USwitch
                  v-model="editForm[field.key]"
                  :aria-label="field.label"
                />
                <span class="text-sm text-muted">{{ editForm[field.key] ? 'Yes' : 'No' }}</span>
              </div>
              <UInput
                v-else
                v-model="editForm[field.key]"
                :type="inputType(field)"
                :min="field.min"
                :max="field.max"
                :maxlength="field.maxLength"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Change note" description="Optional context recorded in the Audit Trail.">
            <UTextarea v-model="editReason" :rows="3" placeholder="Why is this record being updated?" class="w-full" />
          </UFormField>

          <template #actions>
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="actionLoading" @click="() => { editOpen = false; }" />
            <UButton label="Save Changes" icon="i-lucide-save" :loading="actionLoading" @click="saveEdit" />
          </template>
        </AppDialogFrame>
      </template>
    </UModal>

    <UModal v-model:open="archiveOpen" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <AppDialogFrame
          v-if="selectedRecord"
          title="Archive this record?"
          :description="`${selectedRecord.title} will move to Archived Records. This action is reversible.`"
          icon="i-lucide-archive"
          tone="warning"
        >
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-info"
            title="The record is not deleted"
            description="Archive removes the record from normal active use while keeping it available for restoration and dependency review."
          />
          <UFormField label="Archive reason" required description="At least 8 characters. This is recorded in the Audit Trail.">
            <UTextarea v-model="archiveReason" :rows="4" placeholder="Explain why this record should be archived" class="w-full" />
          </UFormField>
          <template #actions>
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="actionLoading" @click="() => { archiveOpen = false; }" />
            <UButton label="Archive Record" icon="i-lucide-archive" color="warning" :loading="actionLoading" :disabled="archiveReason.trim().length < 8" @click="confirmArchive" />
          </template>
        </AppDialogFrame>
      </template>
    </UModal>

    <UModal v-model:open="restoreOpen" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <AppDialogFrame
          v-if="selectedRecord"
          title="Restore this record?"
          :description="`${selectedRecord.title} will return to active use using its saved pre-archive state when available.`"
          icon="i-lucide-archive-restore"
          tone="success"
        >
          <UFormField label="Restore reason" required description="At least 8 characters. This is recorded in the Audit Trail.">
            <UTextarea v-model="restoreReason" :rows="4" placeholder="Explain why this record should be restored" class="w-full" />
          </UFormField>
          <template #actions>
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="actionLoading" @click="() => { restoreOpen = false; }" />
            <UButton label="Restore Record" icon="i-lucide-archive-restore" color="success" :loading="actionLoading" :disabled="restoreReason.trim().length < 8" @click="confirmRestore" />
          </template>
        </AppDialogFrame>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" :dismissible="!actionLoading" :ui="{ content: 'sm:max-w-2xl' }">
      <template #content>
        <AppDialogFrame
          v-if="selectedRecord"
          title="Permanently delete archived record?"
          :description="`This will permanently remove ${selectedRecord.title}. This action cannot be undone.`"
          icon="i-lucide-trash-2"
          tone="error"
        >
          <div v-if="impactLoading" class="space-y-3">
            <USkeleton class="h-24 w-full rounded-xl" />
            <USkeleton class="h-20 w-full rounded-xl" />
          </div>

          <template v-else-if="deleteImpact">
            <UAlert
              v-if="!canPermanentlyDelete"
              color="warning"
              variant="soft"
              icon="i-lucide-shield-lock"
              title="Permanent deletion unavailable"
              description="Your current Administrator session does not have permanent-delete permission."
            />

            <UAlert
              v-if="deleteImpact.blockers.length"
              color="error"
              variant="soft"
              icon="i-lucide-shield-alert"
              title="Permanent deletion is blocked"
              description="Resolve the dependencies below before this record can be permanently deleted."
            />

            <div v-if="deleteImpact.blockers.length" class="space-y-2">
              <div
                v-for="blocker in deleteImpact.blockers"
                :key="blocker.key"
                class="rounded-xl border border-error/20 bg-error/5 p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-highlighted">{{ blocker.label }}</p>
                    <p class="mt-1 text-xs leading-5 text-muted">{{ blocker.message }}</p>
                  </div>
                  <UBadge :label="String(blocker.count)" color="error" variant="soft" />
                </div>
              </div>
            </div>

            <UAlert
              v-else
              color="warning"
              variant="soft"
              icon="i-lucide-triangle-alert"
              title="No dependencies currently block deletion"
              description="The backend will repeat this dependency check immediately before deletion. The Audit Trail keeps a record of the destructive action, but the deleted business record itself cannot be recovered."
            />

            <UFormField label="Permanent deletion reason" required description="At least 8 characters.">
              <UTextarea v-model="deleteReason" :rows="4" placeholder="Explain why permanent removal is necessary" class="w-full" />
            </UFormField>

            <UFormField label="Type the confirmation phrase" required>
              <div class="space-y-2">
                <div class="rounded-lg border border-default bg-elevated px-3 py-2 font-mono text-xs text-highlighted">
                  {{ deleteImpact.confirmationPhrase }}
                </div>
                <UInput v-model="deleteConfirmation" autocomplete="off" class="w-full" placeholder="Type the phrase exactly" />
              </div>
            </UFormField>
          </template>

          <template #actions>
            <UButton label="Keep Archived" color="neutral" variant="outline" :disabled="actionLoading" @click="() => { deleteOpen = false; }" />
            <UButton
              label="Delete Permanently"
              icon="i-lucide-trash-2"
              color="error"
              :loading="actionLoading"
              :disabled="!deleteReady"
              @click="confirmPermanentDelete"
            />
          </template>
        </AppDialogFrame>
      </template>
    </UModal>
  </div>
</template>
