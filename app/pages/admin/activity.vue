<script setup lang="ts">
import AppFilterBar from "~/components/shared/AppFilterBar.vue";
import AppRecordCard from "~/components/shared/AppRecordCard.vue";
import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";
import AppStatusBadge from "~/components/shared/AppStatusBadge.vue";
import type { TableColumn } from "@nuxt/ui";
import type { AdminActivityRecord, AdminMonitoringSummary } from "~/composables/useAdminMonitoring";

definePageMeta({ layout: "admin", middleware: ["admin"], title: "Activity Log" });

const api = useAdminMonitoring();
const auth = useAuth();
const toast = useToast();
const records = ref<AdminActivityRecord[]>([]);
const summary = ref<AdminMonitoringSummary | null>(null);
const loading = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const search = ref("");
const category = ref("All");
const outcome = ref("All");
const profileType = ref("All");
const dateFrom = ref("");
const dateTo = ref("");
const selected = ref<AdminActivityRecord | null>(null);
const detailOpen = ref(false);

const categoryItems = ["All", "Authentication", "Account", "Navigation", "Collection", "Circulation", "Reservation", "Notification", "Security", "System"];
const outcomeItems = ["All", "Success", "Failure", "Denied"];
const profileItems = ["All", "Student", "Faculty", "Librarian", "Administrator"];
const columns: TableColumn<AdminActivityRecord>[] = [
  { id: "activity", header: "Activity" },
  { id: "user", header: "User" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "outcome", header: "Result" },
  { id: "occurred", header: "Date and Time" },
  { id: "actions", header: "" },
];

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value));
}

function outcomeColor(value: string) {
  if (value === "Success") return "success" as const;
  if (value === "Failure") return "error" as const;
  if (value === "Denied") return "warning" as const;
  return "neutral" as const;
}

async function loadSummary() {
  try { summary.value = await api.summary(); }
  catch (error) { console.warn("Unable to load monitoring summary.", error); }
}

async function load() {
  loading.value = true;
  try {
    const response = await api.activity({
      page: page.value, pageSize, search: search.value, category: category.value,
      outcome: outcome.value, profileType: profileType.value, dateFrom: dateFrom.value, dateTo: dateTo.value,
    });
    records.value = response.data;
    total.value = response.meta.total;
  } catch (error) {
    toast.add({ title: "Unable to load user activity", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally { loading.value = false; }
}

function openDetail(record: AdminActivityRecord) { selected.value = record; detailOpen.value = true; }
let timer: ReturnType<typeof setTimeout> | undefined;
watch([category, outcome, profileType, dateFrom, dateTo], () => { page.value = 1; load(); });
watch(page, load);
watch(search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; load(); }, 350); });
onMounted(() => { load(); loadSummary(); });
</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page space-y-6">
    <AdminPageHeader
      eyebrow="System & Monitoring"
      title="Activity Log"
      description="Review meaningful authentication, navigation, account, and Library activities recorded for Student, Faculty, Librarian, and Administrator accounts."
      icon="i-lucide-activity"
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <UButton label="Reports" icon="i-lucide-file-chart-column" color="neutral" variant="outline" to="/admin/reports?view=monitoring" />
          <UButton label="Refresh" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" @click="load(); loadSummary()" />
        </div>
      </template>
    </AdminPageHeader>

    <UAlert color="primary" variant="soft" icon="i-lucide-shield-check" title="Privacy-conscious monitoring" description="The system records meaningful Library activity, not keystrokes, screenshots, webcam images, microphone recordings, personal files, or browsing outside the Library System." />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard label="Activities Today" :value="summary?.activityToday ?? 0" description="Recorded meaningful events since midnight." icon="i-lucide-activity" tone="primary" :loading="!summary" />
      <AdminMetricCard label="Failed or Denied" :value="summary?.failedOrDeniedToday ?? 0" description="Events requiring review today." icon="i-lucide-triangle-alert" tone="warning" :loading="!summary" />
      <AdminMetricCard label="Active Sign-ins" :value="summary?.activeAuthenticationSessions ?? 0" description="Current sign-in sessions." icon="i-lucide-log-in" tone="success" :loading="!summary" to="/admin/sessions" />
      <AdminMetricCard label="Known Devices" :value="summary?.knownDevices ?? 0" description="Privacy-safe portal device records." icon="i-lucide-monitor-smartphone" tone="neutral" :loading="!summary" to="/admin/devices" />
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <AppFilterBar :title="`Activity Register · ${total} record${total === 1 ? '' : 's'}`">
          <template #search>
            <UInput v-model="search" icon="i-lucide-search" placeholder="Search activity, user, or route" class="w-full" />
          </template>
          <template #filters>
            <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <USelect v-model="category" :items="categoryItems" />
              <USelect v-model="outcome" :items="outcomeItems" />
              <USelect v-model="profileType" :items="profileItems" />
              <UInput v-model="dateFrom" type="date" aria-label="Date from" />
              <UInput v-model="dateTo" type="date" aria-label="Date to" />
            </div>
          </template>
        </AppFilterBar>
      </template>

      <div v-if="loading" class="space-y-3 p-6"><USkeleton v-for="i in 7" :key="i" class="h-16 w-full" /></div>
      <div v-else-if="!records.length" class="px-6 py-16 text-center"><UIcon name="i-lucide-activity" class="mx-auto size-11 text-dimmed" /><h3 class="mt-3 font-semibold text-highlighted">No matching activity</h3><p class="mt-1 text-sm text-muted">Adjust the filters or wait for new portal activity.</p></div>
      <AppResponsiveDataView v-else mobile-label="Activity records" desktop-label="Activity records table">
        <template #mobile>
          <div class="sncbt-mobile-record-list p-3">
            <AppRecordCard
              v-for="record in records"
              :key="record.id || `${record.eventCode}-${record.occurredAt}`"
              :title="record.description"
              :subtitle="`${record.account.username} · ${record.profileType}`"
            >
              <template #status>
                <AppStatusBadge :label="record.outcome" :tone="record.outcome === 'Success' ? 'success' : record.outcome === 'Denied' || record.outcome === 'Failed' ? 'error' : 'neutral'" />
              </template>
              <template #meta>
                <span>{{ record.category }}</span>
                <span>{{ record.eventCode }}</span>
                <time>{{ formatDate(record.occurredAt) }}</time>
              </template>
              <template #actions>
                <UButton icon="i-lucide-eye" color="neutral" variant="ghost" square aria-label="View activity" @click="openDetail(record)" />
              </template>
            </AppRecordCard>
          </div>
        </template>
        <template #desktop>
          <UTable :data="records" :columns="columns">
                  <template #activity-cell="{ row }"><p class="font-semibold text-highlighted">{{ row.original.description }}</p><p class="mt-1 max-w-xl truncate font-mono text-[11px] text-muted">{{ row.original.eventCode }}<span v-if="row.original.route"> · {{ row.original.route }}</span></p></template>
                  <template #user-cell="{ row }"><UButton :label="row.original.account.username" :to="`/admin/users/${row.original.account.id}/activity`" color="neutral" variant="link" class="h-auto p-0 font-medium" /><p class="text-xs text-muted">{{ row.original.profileType }} · {{ row.original.account.role || 'Role unavailable' }}</p></template>
                  <template #category-cell="{ row }"><UBadge :label="row.original.category" color="neutral" variant="soft" /></template>
                  <template #outcome-cell="{ row }"><UBadge :label="row.original.outcome" :color="outcomeColor(row.original.outcome)" variant="soft" /></template>
                  <template #occurred-cell="{ row }"><time class="text-sm text-default">{{ formatDate(row.original.occurredAt) }}</time></template>
                  <template #actions-cell="{ row }"><UButton icon="i-lucide-eye" color="neutral" variant="ghost" square aria-label="View activity" @click="openDetail(row.original)" /></template>
                </UTable>
        </template>
      </AppResponsiveDataView>
      <template #footer><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p class="text-sm text-muted">Showing up to {{ pageSize }} records per page</p><UPagination v-model:page="page" :total="total" :items-per-page="pageSize" /></div></template>
    </UCard>
  </div>

  <UModal v-model:open="detailOpen" :ui="{ content: 'sm:max-w-2xl' }">
    <template #content><div v-if="selected" class="space-y-5 bg-default p-6"><div class="flex items-start justify-between gap-4"><div><h2 class="text-xl font-bold text-highlighted">{{ selected.description }}</h2><p class="mt-1 text-sm text-muted">{{ formatDate(selected.occurredAt) }}</p></div><UBadge :label="selected.outcome" :color="outcomeColor(selected.outcome)" variant="soft" /></div><dl class="grid gap-4 text-sm sm:grid-cols-2"><div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">User</dt><dd class="mt-1 text-highlighted">{{ selected.account.username }} · {{ selected.profileType }}</dd></div><div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Category</dt><dd class="mt-1 text-highlighted">{{ selected.category }}</dd></div><div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Event Code</dt><dd class="mt-1 font-mono text-xs text-highlighted">{{ selected.eventCode }}</dd></div><div><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Network</dt><dd class="mt-1 font-mono text-xs text-highlighted">{{ selected.maskedIpAddress || 'Not recorded' }}</dd></div><div class="sm:col-span-2"><dt class="text-xs font-semibold uppercase tracking-wide text-muted">Route</dt><dd class="mt-1 break-all font-mono text-xs text-highlighted">{{ selected.requestMethod || '—' }} {{ selected.route || 'Not recorded' }}</dd></div></dl><div class="flex justify-end"><UButton label="Close" color="neutral" variant="outline" @click="() => { detailOpen = false; }" /></div></div></template>
  </UModal>
</template>
