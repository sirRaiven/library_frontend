<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { AdminMonitoringSummary, AdminSessionRecord } from "~/composables/useAdminMonitoring";

definePageMeta({ layout: "admin", middleware: ["admin"], title: "Sessions" });
const api = useAdminMonitoring();
const auth = useAuth();
const toast = useToast();
const records = ref<AdminSessionRecord[]>([]);
const summary = ref<AdminMonitoringSummary | null>(null);
const loading = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const search = ref("");
const source = ref("Authentication Session");
const status = ref("All");
const profileType = ref("All");
const selected = ref<AdminSessionRecord | null>(null);
const detailOpen = ref(false);
const revokeOpen = ref(false);
const reason = ref("");
const revoking = ref(false);
const sourceItems = ["Authentication Session", "Portal Monitoring", "All"];
const statusItems = ["All", "Active", "Logged Out", "Expired", "Revoked", "Invalidated", "Blocked", "Suspicious"];
const profileItems = ["All", "Student", "Faculty", "Librarian", "Administrator"];
const columns: TableColumn<AdminSessionRecord>[] = [
  { id: "account", header: "Account" }, { id: "device", header: "Device" },
  { accessorKey: "source", header: "Session Source" }, { accessorKey: "status", header: "Status" },
  { id: "lastActivity", header: "Last Activity" }, { id: "actions", header: "" },
];

function formatDate(value: string | null) { if (!value) return "Not recorded"; return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)); }
function statusColor(value: string) { if (value === "Active") return "success" as const; if (["Blocked", "Suspicious"].includes(value)) return "error" as const; if (["Expired", "Revoked", "Invalidated"].includes(value)) return "warning" as const; return "neutral" as const; }
async function loadSummary() { try { summary.value = await api.summary(); } catch (error) { console.warn(error); } }
async function load() {
  loading.value = true;
  try {
    const response = await api.sessions({ page: page.value, pageSize, search: search.value, source: source.value, status: status.value, profileType: profileType.value });
    records.value = response.data; total.value = response.meta.total;
  } catch (error) { toast.add({ title: "Unable to load sessions", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" }); }
  finally { loading.value = false; }
}
function view(record: AdminSessionRecord) { selected.value = record; detailOpen.value = true; }
function beginRevoke(record: AdminSessionRecord) { selected.value = record; reason.value = ""; revokeOpen.value = true; }
async function confirmRevoke() {
  if (!selected.value || reason.value.trim().length < 5) return;
  revoking.value = true;
  try {
    await api.revokeSession(selected.value, reason.value.trim());
    toast.add({ title: "Session revoked", description: `${selected.value.account.username} must sign in again for the revoked session.`, color: "success", icon: "i-lucide-circle-check" });
    revokeOpen.value = false; detailOpen.value = false; await load(); await loadSummary();
  } catch (error) { toast.add({ title: "Unable to revoke session", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" }); }
  finally { revoking.value = false; }
}
let timer: ReturnType<typeof setTimeout> | undefined;
watch([source, status, profileType], () => { page.value = 1; load(); }); watch(page, load);
watch(search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; load(); }, 350); });
onMounted(() => { load(); loadSummary(); });
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
    <AdminPageHeader eyebrow="System & Monitoring" title="Sessions" description="Review active sign-in sessions and privacy-safe portal sessions for Student, Faculty, Librarian, and Administrator accounts." icon="i-lucide-monitor-dot"><template #actions><div class="flex flex-wrap gap-2"><UButton label="Reports" icon="i-lucide-file-chart-column" color="neutral" variant="outline" to="/admin/reports?view=monitoring" /><UButton label="Refresh" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" @click="load(); loadSummary()" /></div></template></AdminPageHeader>
    <UAlert color="info" variant="soft" icon="i-lucide-info" title="Two session sources" description="Authentication Sessions control actual sign-in refresh tokens. Portal Monitoring Sessions record portal presence and activity. They are displayed separately because they do not store or expose authentication tokens." />
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard label="Authentication Sessions" :value="summary?.activeAuthenticationSessions ?? 0" description="Current sign-in sessions." icon="i-lucide-key-round" tone="success" :loading="!summary" />
      <AdminMetricCard label="Portal Sessions" :value="summary?.activeTrackedSessions ?? 0" description="Recently active monitored portals." icon="i-lucide-monitor-dot" tone="primary" :loading="!summary" />
      <AdminMetricCard label="Suspicious Sessions" :value="summary?.suspiciousTrackedSessions ?? 0" description="Sessions marked for security review." icon="i-lucide-shield-alert" tone="error" :loading="!summary" />
      <AdminMetricCard label="Blocked Devices" :value="summary?.blockedDevices ?? 0" description="Devices denied portal monitoring access." icon="i-lucide-ban" tone="warning" :loading="!summary" to="/admin/devices" />
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header><div class="space-y-3"><div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 class="font-semibold text-highlighted">Session Register</h2><p class="mt-1 text-xs text-muted">{{ total }} matching session{{ total === 1 ? '' : 's' }}</p></div><UInput v-model="search" icon="i-lucide-search" placeholder="Search user or email" class="w-full lg:max-w-sm" /></div><div class="grid gap-2 sm:grid-cols-3"><USelect v-model="source" :items="sourceItems" /><USelect v-model="status" :items="statusItems" /><USelect v-model="profileType" :items="profileItems" /></div></div></template>
      <div v-if="loading" class="space-y-3 p-6"><USkeleton v-for="i in 7" :key="i" class="h-16 w-full" /></div>
      <div v-else-if="!records.length" class="px-6 py-16 text-center"><UIcon name="i-lucide-monitor-off" class="mx-auto size-11 text-dimmed" /><h3 class="mt-3 font-semibold text-highlighted">No matching sessions</h3><p class="mt-1 text-sm text-muted">Change the source or filters.</p></div>
      <UTable v-else :data="records" :columns="columns">
        <template #account-cell="{ row }"><UButton :label="row.original.account.username" :to="`/admin/users/${row.original.account.id}/sessions`" color="neutral" variant="link" class="h-auto p-0 font-semibold" /><p class="text-xs text-muted">{{ row.original.profileType }} · {{ row.original.account.email || 'No email' }}</p></template>
        <template #device-cell="{ row }"><p class="font-medium text-highlighted">{{ row.original.deviceName }}</p><p class="text-xs text-muted">{{ row.original.browser }} · {{ row.original.operatingSystem }}</p></template>
        <template #source-cell="{ row }"><UBadge :label="row.original.source" color="neutral" variant="soft" /></template>
        <template #status-cell="{ row }"><UBadge :label="row.original.status" :color="statusColor(row.original.status)" variant="soft" /></template>
        <template #lastActivity-cell="{ row }"><p class="text-sm text-default">{{ formatDate(row.original.lastActivityAt) }}</p><p class="text-xs text-muted">Started {{ formatDate(row.original.loginAt) }}</p></template>
        <template #actions-cell="{ row }"><div class="flex justify-end gap-1"><UButton icon="i-lucide-eye" color="neutral" variant="ghost" square aria-label="View session" @click="view(row.original)" /><UButton v-if="row.original.status === 'Active'" icon="i-lucide-log-out" color="error" variant="ghost" square aria-label="Revoke session" @click="beginRevoke(row.original)" /></div></template>
      </UTable>
      <template #footer><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p class="text-sm text-muted">Authentication-session listing may take longer when many accounts exist.</p><UPagination v-model:page="page" :total="total" :items-per-page="pageSize" /></div></template>
    </UCard>
  </div>

  <UModal v-model:open="detailOpen" :ui="{ content: 'sm:max-w-xl' }"><template #content><div v-if="selected" class="space-y-5 bg-default p-6"><div class="flex items-start justify-between"><div><h2 class="text-xl font-bold text-highlighted">Session Details</h2><p class="mt-1 text-sm text-muted">{{ selected.account.username }}</p></div><UBadge :label="selected.status" :color="statusColor(selected.status)" variant="soft" /></div><dl class="grid gap-4 text-sm sm:grid-cols-2"><div><dt class="text-xs font-semibold uppercase text-muted">Source</dt><dd class="mt-1 text-highlighted">{{ selected.source }}</dd></div><div><dt class="text-xs font-semibold uppercase text-muted">Reference</dt><dd class="mt-1 font-mono text-xs text-highlighted">{{ selected.sessionReference }}</dd></div><div><dt class="text-xs font-semibold uppercase text-muted">Device</dt><dd class="mt-1 text-highlighted">{{ selected.deviceName }}</dd></div><div><dt class="text-xs font-semibold uppercase text-muted">Application</dt><dd class="mt-1 text-highlighted">{{ selected.applicationMode }}</dd></div><div><dt class="text-xs font-semibold uppercase text-muted">Login</dt><dd class="mt-1 text-highlighted">{{ formatDate(selected.loginAt) }}</dd></div><div><dt class="text-xs font-semibold uppercase text-muted">Last Activity</dt><dd class="mt-1 text-highlighted">{{ formatDate(selected.lastActivityAt) }}</dd></div><div class="sm:col-span-2"><dt class="text-xs font-semibold uppercase text-muted">Network</dt><dd class="mt-1 font-mono text-xs text-highlighted">{{ selected.maskedIpAddress || 'Not exposed by this session source' }}</dd></div></dl><div class="flex justify-end gap-2"><UButton label="Close" color="neutral" variant="outline" @click="detailOpen = false" /><UButton v-if="selected.status === 'Active'" label="Revoke Session" icon="i-lucide-log-out" color="error" @click="detailOpen = false; beginRevoke(selected)" /></div></div></template></UModal>
  <UModal v-model:open="revokeOpen" :ui="{ content: 'sm:max-w-lg' }"><template #content><div class="space-y-5 bg-default p-6"><div><h2 class="text-xl font-bold text-highlighted">Revoke Session</h2><p class="mt-2 text-sm text-muted">Revoke the selected {{ selected?.source.toLowerCase() }} for {{ selected?.account.username }}.</p></div><UFormField label="Administrative reason" required><UTextarea v-model="reason" :rows="4" placeholder="Explain why this session must be revoked" /></UFormField><UAlert v-if="selected?.source === 'Portal Monitoring'" color="warning" variant="soft" icon="i-lucide-triangle-alert" title="Monitoring session only" description="Ending a portal activity session does not necessarily sign the user out of every device." /><div class="flex justify-end gap-2"><UButton label="Cancel" color="neutral" variant="outline" @click="revokeOpen = false" /><UButton label="Confirm Revocation" color="error" icon="i-lucide-log-out" :disabled="reason.trim().length < 5" :loading="revoking" @click="confirmRevoke" /></div></div></template></UModal>
</template>
