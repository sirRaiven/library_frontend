<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { AdminAuditLogRecord } from "~/composables/useAdminAuditLogs";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Audit Logs",
});

const api = useAdminAuditLogs();
const auth = useAuth();
const toast = useToast();
const records = ref<AdminAuditLogRecord[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const search = ref("");
const outcome = ref("All");
const detail = ref<AdminAuditLogRecord | null>(null);
const detailOpen = ref(false);

const columns: TableColumn<AdminAuditLogRecord>[] = [
  { id: "activity", header: "Administrative Activity" },
  { id: "actor", header: "Performed By" },
  { id: "target", header: "Affected Record" },
  { accessorKey: "outcome", header: "Result" },
  { id: "created", header: "Date and Time" },
  { id: "actions", header: "" },
];

const outcomeItems = ["All", "Success", "Failure"];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

async function load() {
  loading.value = true;
  try {
    const response = await api.list({
      search: search.value,
      outcome: outcome.value,
      page: page.value,
      pageSize,
    });
    records.value = response.data;
    total.value = response.meta.total;
  } catch (error) {
    toast.add({
      title: "Unable to load audit logs",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

function openDetail(record: AdminAuditLogRecord) {
  detail.value = record;
  detailOpen.value = true;
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(outcome, () => {
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
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <AdminPageHeader
      eyebrow="Security and Monitoring"
      title="Administrative Audit Logs"
      description="Review successful and failed administrator actions. Audit records are append-only in normal operation and should never contain passwords or authentication tokens."
      icon="i-lucide-scroll-text"
    />

    <UAlert
      color="primary"
      variant="soft"
      icon="i-lucide-fingerprint"
      title="Accountability record"
      description="Each protected write records the administrator, action, affected record, result, request path, IP address, and time. Keep direct Audit Log create, update, and delete permissions disabled in Strapi."
    />

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="font-semibold text-highlighted">Security-Relevant Activity</h2>
            <p class="mt-1 text-xs text-muted">{{ total }} audit record{{ total === 1 ? '' : 's' }}</p>
          </div>
          <div class="grid gap-2 sm:grid-cols-[minmax(0,22rem)_10rem]">
            <UInput v-model="search" icon="i-lucide-search" placeholder="Search action, actor, or record" />
            <USelect v-model="outcome" :items="outcomeItems" />
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-3 p-5 sm:p-6">
        <USkeleton v-for="index in 6" :key="index" class="h-16 w-full" />
      </div>

      <div v-else-if="!records.length" class="px-6 py-16 text-center">
        <UIcon name="i-lucide-scroll-text" class="mx-auto size-11 text-dimmed" />
        <h3 class="mt-3 font-semibold text-highlighted">No matching audit records</h3>
        <p class="mt-1 text-sm text-muted">Adjust the search or result filter.</p>
      </div>

      <UTable v-else :data="records" :columns="columns">
        <template #activity-cell="{ row }">
          <p class="font-semibold text-highlighted">{{ row.original.action }}</p>
          <p class="mt-1 max-w-xl truncate text-xs text-muted">{{ row.original.description }}</p>
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
          <time class="text-sm text-default">{{ formatDateTime(row.original.createdAt) }}</time>
        </template>
        <template #actions-cell="{ row }">
          <UButton icon="i-lucide-eye" color="neutral" variant="ghost" square aria-label="View audit record" @click="openDetail(row.original)" />
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

  <UModal v-model:open="detailOpen" :ui="{ content: 'sm:max-w-2xl' }">
    <template #content>
      <div v-if="detail" class="space-y-5 bg-default p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-highlighted">{{ detail.action }}</h2>
            <p class="mt-1 text-sm text-muted">{{ formatDateTime(detail.createdAt) }}</p>
          </div>
          <AdminStatusBadge :label="detail.outcome" />
        </div>
        <p class="rounded-xl border border-default bg-elevated/40 p-4 text-sm leading-6 text-default">{{ detail.description }}</p>
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Performed By</dt><dd class="mt-1 text-highlighted">{{ detail.actor }} · {{ detail.actorRole || 'Unknown role' }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Affected Record</dt><dd class="mt-1 text-highlighted">{{ detail.targetLabel || detail.targetType || 'System' }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Request</dt><dd class="mt-1 font-mono text-xs text-highlighted">{{ detail.requestMethod || '—' }} {{ detail.requestPath || '—' }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">IP Address</dt><dd class="mt-1 font-mono text-xs text-highlighted">{{ detail.ipAddress || 'Not recorded' }}</dd></div>
        </dl>
        <div class="flex justify-end"><UButton label="Close" color="neutral" variant="outline" @click="detailOpen = false" /></div>
      </div>
    </template>
  </UModal>
</template>
