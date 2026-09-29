<script setup lang="ts">
import AppRecordCard from "~/components/shared/AppRecordCard.vue";
import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";
import type { TableColumn } from "@nuxt/ui";
import type {
  AdminAuditCategory,
  AdminAuditIntegrity,
  AdminAuditLogRecord,
  AdminAuditSeverity,
  AdminAuditSummary,
} from "~/composables/useAdminAuditLogs";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Audit Trail",
});

const api = useAdminAuditLogs();
const auth = useAuth();
const toast = useToast();
const records = ref<AdminAuditLogRecord[]>([]);
const summary = ref<AdminAuditSummary | null>(null);
const integrity = ref<AdminAuditIntegrity | null>(null);
const loading = ref(false);
const checkingIntegrity = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const search = ref("");
const outcome = ref("All");
const category = ref("All");
const severity = ref("All");
const dateFrom = ref("");
const dateTo = ref("");
const detail = ref<AdminAuditLogRecord | null>(null);
const detailOpen = ref(false);

const columns: TableColumn<AdminAuditLogRecord>[] = [
  { id: "event", header: "Audit Event" },
  { id: "classification", header: "Classification" },
  { id: "actor", header: "Performed By" },
  { id: "target", header: "Affected Record" },
  { accessorKey: "outcome", header: "Result" },
  { id: "created", header: "Date and Time" },
  { id: "actions", header: "" },
];

const outcomeItems = ["All", "Success", "Failure", "Denied"];
const categoryItems = [
  "All",
  "Administrative",
  "Security",
  "Configuration",
  "Transaction",
  "Privacy",
  "System",
];
const severityItems = ["All", "Info", "Notice", "Warning", "Critical"];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function categoryColor(value: AdminAuditCategory) {
  const colors = {
    Administrative: "primary",
    Security: "warning",
    Configuration: "info",
    Transaction: "success",
    Privacy: "neutral",
    System: "neutral",
  } as const;
  return colors[value] ?? "neutral";
}

function severityColor(value: AdminAuditSeverity) {
  const colors = {
    Info: "neutral",
    Notice: "info",
    Warning: "warning",
    Critical: "error",
  } as const;
  return colors[value] ?? "neutral";
}

function filters() {
  return {
    search: search.value,
    outcome: outcome.value,
    category: category.value,
    severity: severity.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
  };
}

async function load() {
  loading.value = true;
  try {
    const [response, summaryResponse] = await Promise.all([
      api.list({ ...filters(), page: page.value, pageSize }),
      api.summary(filters()),
    ]);
    records.value = response.data;
    total.value = response.meta.total;
    summary.value = summaryResponse;
  } catch (error) {
    toast.add({
      title: "Unable to load the audit trail",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

async function verifyIntegrity() {
  checkingIntegrity.value = true;
  try {
    integrity.value = await api.integrity();
    toast.add({
      title:
        integrity.value.status === "Valid"
          ? "Audit chain is valid"
          : "Audit integrity requires attention",
      description:
        integrity.value.status === "Valid"
          ? `${integrity.value.checkedCount} sealed audit records were verified.`
          : `${integrity.value.issues.length} integrity issue(s) were detected.`,
      color: integrity.value.status === "Valid" ? "success" : "error",
      icon:
        integrity.value.status === "Valid"
          ? "i-lucide-shield-check"
          : "i-lucide-shield-alert",
    });
    await load();
  } catch (error) {
    toast.add({
      title: "Unable to verify audit integrity",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    checkingIntegrity.value = false;
  }
}

function openDetail(record: AdminAuditLogRecord) {
  detail.value = record;
  detailOpen.value = true;
}

function resetFilters() {
  search.value = "";
  outcome.value = "All";
  category.value = "All";
  severity.value = "All";
  dateFrom.value = "";
  dateTo.value = "";
  page.value = 1;
}

function formatJson(value: unknown) {
  if (!value || (typeof value === "object" && !Object.keys(value as object).length)) {
    return "No structured values recorded.";
  }
  return JSON.stringify(value, null, 2);
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch([outcome, category, severity, dateFrom, dateTo], () => {
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
  <div class="sncbt-page-shell sncbt-staff-page space-y-6">
    <AdminPageHeader
      title="Audit Trail"
      description="Review administrative, security, configuration, privacy, system, and Library transaction records."
      icon="i-lucide-scroll-text"
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <AdminMetricCard
        label="Matching Events"
        :value="summary?.total ?? total"
        description="Current audit filters"
        icon="i-lucide-scroll-text"
        tone="primary"
        :loading="loading"
      />
      <AdminMetricCard
        label="Transactions"
        :value="summary?.categories?.Transaction ?? 0"
        description="Borrow, return, reservation, fine and membership events"
        icon="i-lucide-arrow-left-right"
        tone="success"
        :loading="loading"
      />
      <AdminMetricCard
        label="Security Events"
        :value="summary?.categories?.Security ?? 0"
        description="Account, session, device and audit-access events"
        icon="i-lucide-shield"
        tone="warning"
        :loading="loading"
      />
      <AdminMetricCard
        label="Failed / Denied"
        :value="(summary?.outcomes?.failure ?? 0) + (summary?.outcomes?.denied ?? 0)"
        description="Events that require review"
        icon="i-lucide-triangle-alert"
        tone="error"
        :loading="loading"
      />
      <AdminMetricCard
        label="Protected Records"
        :value="summary?.integrity?.sealed ?? 0"
        description="Integrity-protected audit records"
        icon="i-lucide-shield-check"
        tone="info"
        :loading="loading"
      />
    </div>

    <UCard>
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="flex items-center gap-2">
            <UIcon
              :name="integrity?.status === 'Attention Required' ? 'i-lucide-shield-alert' : 'i-lucide-shield-check'"
              class="size-5"
              :class="integrity?.status === 'Attention Required' ? 'text-error' : 'text-success'"
            />
            <h2 class="font-semibold text-highlighted">Audit Integrity</h2>
          </div>
          <p class="mt-1 text-sm text-muted">
            {{
              integrity
                ? `${integrity.status} · ${integrity.checkedCount} protected record(s) checked`
                : 'Run an integrity check to verify protected audit records.'
            }}
          </p>
        </div>
        <UButton
          label="Verify Integrity"
          icon="i-lucide-shield-check"
          :loading="checkingIntegrity"
          @click="verifyIntegrity"
        />
      </div>
      <UAlert
        v-if="integrity?.issues?.length"
        class="mt-4"
        color="error"
        variant="soft"
        icon="i-lucide-shield-alert"
        title="Integrity issue detected"
        :description="`${integrity.issues.length} issue(s) were found. Preserve the database and investigate before changing or deleting any audit data.`"
      />
    </UCard>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="space-y-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="font-semibold text-highlighted">Audit Records</h2>
              <p class="mt-1 text-xs text-muted">{{ total }} audit record{{ total === 1 ? '' : 's' }}</p>
            </div>
            <UButton
              label="Clear Filters"
              icon="i-lucide-filter-x"
              color="neutral"
              variant="outline"
              @click="resetFilters"
            />
          </div>

          <div class="grid gap-2 md:grid-cols-2 xl:grid-cols-6">
            <UInput
              v-model="search"
              class="xl:col-span-2"
              icon="i-lucide-search"
              placeholder="Search event, actor, request, or record"
              aria-label="Search Audit Trail records"
            />
            <USelect v-model="category" :items="categoryItems" aria-label="Filter Audit Trail by category" />
            <USelect v-model="severity" :items="severityItems" aria-label="Filter Audit Trail by severity" />
            <USelect v-model="outcome" :items="outcomeItems" aria-label="Filter Audit Trail by outcome" />
            <div class="grid grid-cols-2 gap-2 xl:col-span-1">
              <UInput v-model="dateFrom" type="date" aria-label="Audit start date" />
              <UInput v-model="dateTo" type="date" aria-label="Audit end date" />
            </div>
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-3 p-5 sm:p-6">
        <USkeleton v-for="index in 6" :key="index" class="h-16 w-full" />
      </div>

      <AdminEmptyState
        v-else-if="!records.length"
        title="No matching audit records"
        description="Adjust the search, classification, result, severity, or date filters."
        icon="i-lucide-scroll-text"
      />

      <AppResponsiveDataView v-else mobile-label="Audit records" desktop-label="Audit records table">
        <template #mobile>
          <div class="sncbt-mobile-record-list p-3">
            <AppRecordCard
              v-for="record in records"
              :key="record.id"
              :title="record.action"
              :subtitle="record.description"
            >
              <template #status>
                <AdminStatusBadge :label="record.outcome" />
              </template>
              <template #meta>
                <span>{{ record.category }} · {{ record.severity }}</span>
                <span>{{ record.actor }} · {{ record.actorRole || 'Role unavailable' }}</span>
                <time>{{ formatDateTime(record.occurredAt || record.createdAt) }}</time>
              </template>
              <template #actions>
                <UButton icon="i-lucide-eye" color="neutral" variant="ghost" square aria-label="View audit record" @click="openDetail(record)" />
              </template>
            </AppRecordCard>
          </div>
        </template>
        <template #desktop>
          <UTable :data="records" :columns="columns">
                  <template #event-cell="{ row }">
                    <p class="font-semibold text-highlighted">{{ row.original.action }}</p>
                    <p class="mt-1 max-w-xl truncate text-xs text-muted">{{ row.original.description }}</p>
                    <p v-if="row.original.eventId" class="mt-1 max-w-52 truncate font-mono text-[10px] text-dimmed">
                      {{ row.original.eventId }}
                    </p>
                  </template>
                  <template #classification-cell="{ row }">
                    <div class="flex flex-wrap gap-1.5">
                      <UBadge :label="row.original.category" :color="categoryColor(row.original.category)" variant="soft" size="sm" />
                      <UBadge :label="row.original.severity" :color="severityColor(row.original.severity)" variant="subtle" size="sm" />
                    </div>
                    <p class="mt-1 text-xs text-muted">{{ row.original.module }}</p>
                  </template>
                  <template #actor-cell="{ row }">
                    <p class="text-sm font-medium text-highlighted">{{ row.original.actor }}</p>
                    <p class="text-xs text-muted">{{ row.original.actorRole || 'Role unavailable' }}</p>
                  </template>
                  <template #target-cell="{ row }">
                    <p class="text-sm text-default">{{ row.original.targetLabel || row.original.targetType || 'System' }}</p>
                    <p v-if="row.original.targetId" class="max-w-48 truncate font-mono text-[11px] text-muted">{{ row.original.targetId }}</p>
                  </template>
                  <template #outcome-cell="{ row }">
                    <AdminStatusBadge :label="row.original.outcome" />
                  </template>
                  <template #created-cell="{ row }">
                    <time class="text-sm text-default">{{ formatDateTime(row.original.occurredAt || row.original.createdAt) }}</time>
                    <p class="mt-1 text-[11px]" :class="row.original.sealed ? 'text-success' : 'text-muted'">
                      {{ row.original.sealed ? 'Sealed' : 'Legacy unsealed' }}
                    </p>
                  </template>
                  <template #actions-cell="{ row }">
                    <UButton icon="i-lucide-eye" color="neutral" variant="ghost" square aria-label="View audit record" @click="openDetail(row.original)" />
                  </template>
                </UTable>
        </template>
      </AppResponsiveDataView>

      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">Showing up to {{ pageSize }} records per page</p>
          <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" />
        </div>
      </template>
    </UCard>
  </div>

  <UModal v-model:open="detailOpen" :ui="{ content: 'sm:max-w-4xl' }">
    <template #content>
      <div v-if="detail" class="max-h-[85vh] space-y-5 overflow-y-auto bg-default p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl font-bold text-highlighted">{{ detail.action }}</h2>
              <UBadge :label="detail.category" :color="categoryColor(detail.category)" variant="soft" />
              <UBadge :label="detail.severity" :color="severityColor(detail.severity)" variant="soft" />
            </div>
            <p class="mt-1 text-sm text-muted">{{ formatDateTime(detail.occurredAt || detail.createdAt) }}</p>
          </div>
          <AdminStatusBadge :label="detail.outcome" />
        </div>

        <p class="rounded-xl border border-default bg-elevated/40 p-4 text-sm leading-6 text-default">{{ detail.description }}</p>
        <UAlert
          v-if="detail.reason"
          color="warning"
          variant="soft"
          icon="i-lucide-message-square-warning"
          title="Recorded reason"
          :description="detail.reason"
        />

        <dl class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Performed By</dt><dd class="mt-1 text-highlighted">{{ detail.actor }} · {{ detail.actorRole || 'Unknown role' }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Affected Record</dt><dd class="mt-1 text-highlighted">{{ detail.targetLabel || detail.targetType || 'System' }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Area</dt><dd class="mt-1 text-highlighted">{{ detail.module }}</dd></div>
        </dl>

        <div class="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 class="mb-2 text-sm font-semibold text-highlighted">Before</h3>
            <pre class="max-h-64 overflow-auto rounded-xl border border-default bg-elevated/40 p-4 text-xs text-default">{{ formatJson(detail.before) }}</pre>
          </div>
          <div>
            <h3 class="mb-2 text-sm font-semibold text-highlighted">After</h3>
            <pre class="max-h-64 overflow-auto rounded-xl border border-default bg-elevated/40 p-4 text-xs text-default">{{ formatJson(detail.after) }}</pre>
          </div>
        </div>

        <details class="rounded-xl border border-default bg-elevated/20 p-4">
          <summary class="cursor-pointer select-none text-sm font-semibold text-highlighted">
            Advanced technical details
          </summary>
          <div class="mt-4 space-y-4">
            <dl class="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
              <div><dt class="font-semibold uppercase tracking-wide text-muted">Request</dt><dd class="mt-1 break-all font-mono text-default">{{ detail.requestMethod || '—' }} {{ detail.requestPath || '—' }}</dd></div>
              <div><dt class="font-semibold uppercase tracking-wide text-muted">Request ID</dt><dd class="mt-1 break-all font-mono text-default">{{ detail.requestId || 'Not recorded' }}</dd></div>
              <div><dt class="font-semibold uppercase tracking-wide text-muted">Network Address</dt><dd class="mt-1 font-mono text-default">{{ detail.ipAddress || 'Not recorded' }}</dd></div>
              <div><dt class="font-semibold uppercase tracking-wide text-muted">Event ID</dt><dd class="mt-1 break-all font-mono text-default">{{ detail.eventId || 'Legacy record' }}</dd></div>
              <div><dt class="font-semibold uppercase tracking-wide text-muted">Integrity Version</dt><dd class="mt-1 font-mono text-default">{{ detail.integrityVersion ?? '—' }}</dd></div>
            </dl>
            <div>
              <h3 class="mb-2 text-sm font-semibold text-highlighted">Metadata</h3>
              <pre class="max-h-64 overflow-auto rounded-xl border border-default bg-elevated/40 p-4 text-xs text-default">{{ formatJson(detail.metadata) }}</pre>
            </div>
            <div class="rounded-xl border border-default p-4">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-semibold text-highlighted">Integrity seal</h3>
                <UBadge :label="detail.sealed ? 'Sealed' : 'Legacy unsealed'" :color="detail.sealed ? 'success' : 'neutral'" variant="soft" />
              </div>
              <dl class="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div><dt class="font-semibold uppercase tracking-wide text-muted">Previous Hash</dt><dd class="mt-1 break-all font-mono text-default">{{ detail.previousHash || 'Chain start / legacy' }}</dd></div>
                <div><dt class="font-semibold uppercase tracking-wide text-muted">Record Hash</dt><dd class="mt-1 break-all font-mono text-default">{{ detail.recordHash || 'Not sealed' }}</dd></div>
              </dl>
            </div>
          </div>
        </details>

        <div class="flex justify-end"><UButton label="Close" color="neutral" variant="outline" @click="() => { detailOpen = false; }" /></div>
      </div>
    </template>
  </UModal>
</template>
