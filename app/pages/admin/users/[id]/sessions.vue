<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type {
  AdminSessionRecord,
  AdminUserMonitoringSummary,
} from "~/composables/useAdminMonitoring";
import type { AdminUserRecord } from "~/composables/useAdminUsers";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Account Sessions",
});

const route = useRoute();
const monitoringApi = useAdminMonitoring();
const usersApi = useAdminUsers();
const auth = useAuth();
const toast = useToast();

const userId = computed(() => Number.parseInt(String(route.params.id), 10));
const account = ref<AdminUserRecord | null>(null);
const summary = ref<AdminUserMonitoringSummary | null>(null);
const records = ref<AdminSessionRecord[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const source = ref("All");
const status = ref("All");
const selected = ref<AdminSessionRecord | null>(null);
const detailOpen = ref(false);
const revokeOpen = ref(false);
const reason = ref("");
const revoking = ref(false);

const sourceItems = ["All", "Authentication Session", "Portal Monitoring"];
const statusItems = [
  "All",
  "Active",
  "Logged Out",
  "Expired",
  "Revoked",
  "Invalidated",
  "Blocked",
  "Suspicious",
];
const columns: TableColumn<AdminSessionRecord>[] = [
  { id: "device", header: "Device" },
  { accessorKey: "source", header: "Session Source" },
  { accessorKey: "status", header: "Status" },
  { id: "login", header: "Login Time" },
  { id: "lastActivity", header: "Last Activity" },
  { id: "actions", header: "" },
];

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function statusColor(value: string) {
  if (value === "Active") return "success" as const;
  if (["Blocked", "Suspicious"].includes(value)) return "error" as const;
  if (["Expired", "Revoked", "Invalidated"].includes(value)) return "warning" as const;
  return "neutral" as const;
}

async function loadAccountContext() {
  if (!Number.isInteger(userId.value) || userId.value <= 0) {
    throw createError({ statusCode: 404, statusMessage: "User account not found" });
  }
  try {
    const [user, monitoringSummary] = await Promise.all([
      usersApi.get(userId.value),
      monitoringApi.userSummary(userId.value),
    ]);
    account.value = user;
    summary.value = monitoringSummary;
  } catch (error) {
    toast.add({
      title: "Unable to load user monitoring",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function load() {
  loading.value = true;
  try {
    const response = await monitoringApi.sessions({
      userId: userId.value,
      page: page.value,
      pageSize,
      source: source.value,
      status: status.value,
    });
    records.value = response.data;
    total.value = response.meta.total;
  } catch (error) {
    toast.add({
      title: "Unable to load user sessions",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

async function refresh() {
  await Promise.all([loadAccountContext(), load()]);
}

function view(record: AdminSessionRecord) {
  selected.value = record;
  detailOpen.value = true;
}

function beginRevoke(record: AdminSessionRecord) {
  selected.value = record;
  reason.value = "";
  revokeOpen.value = true;
}

async function confirmRevoke() {
  if (!selected.value || reason.value.trim().length < 5 || revoking.value) return;
  revoking.value = true;
  try {
    await monitoringApi.revokeSession(selected.value, reason.value.trim());
    toast.add({
      title: "Session revoked",
      description: `${account.value?.username || "The user"} must sign in again for the revoked session.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
    revokeOpen.value = false;
    detailOpen.value = false;
    await refresh();
  } catch (error) {
    toast.add({
      title: "Unable to revoke session",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    revoking.value = false;
  }
}

watch([source, status], () => {
  page.value = 1;
  void load();
});
watch(page, () => void load());
onMounted(refresh);
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <AdminPageHeader
      eyebrow="User Monitoring"
      :title="account ? `Sessions for ${account.username}` : 'Account Sessions'"
      description="Review authentication and privacy-safe portal sessions for this account."
      icon="i-lucide-monitor-dot"
    >
      <template #actions>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="loading"
          @click="refresh"
        />
      </template>
    </AdminPageHeader>

    <AdminUserMonitoringNav :user-id="userId" active="sessions" />

    <UAlert
      color="info"
      variant="soft"
      icon="i-lucide-info"
      title="Two session sources"
      description="Authentication Sessions control actual refresh-token sign-ins. Portal Monitoring Sessions record portal presence without storing authentication tokens."
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        label="Authentication Sessions"
        :value="summary?.activeAuthenticationSessions ?? 0"
        description="Current Strapi refresh-token sign-ins."
        icon="i-lucide-key-round"
        tone="success"
        :loading="!summary"
      />
      <AdminMetricCard
        label="Portal Sessions"
        :value="summary?.activeTrackedSessions ?? 0"
        description="Active privacy-safe portal monitoring sessions."
        icon="i-lucide-monitor-dot"
        tone="primary"
        :loading="!summary"
      />
      <AdminMetricCard
        label="Known Devices"
        :value="summary?.knownDevices ?? 0"
        description="Recognized devices belonging to this account."
        icon="i-lucide-monitor-smartphone"
        tone="neutral"
        :loading="!summary"
        :to="`/admin/users/${userId}/devices`"
      />
      <AdminMetricCard
        label="Blocked Devices"
        :value="summary?.blockedDevices ?? 0"
        description="Devices denied from protected portal access."
        icon="i-lucide-ban"
        :tone="summary?.blockedDevices ? 'error' : 'neutral'"
        :loading="!summary"
        :to="`/admin/users/${userId}/devices`"
      />
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="font-semibold text-highlighted">Session Register</h2>
            <p class="mt-1 text-xs text-muted">
              {{ total }} matching session{{ total === 1 ? "" : "s" }}
            </p>
          </div>
          <div class="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[32rem]">
            <USelect v-model="source" :items="sourceItems" />
            <USelect v-model="status" :items="statusItems" />
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-3 p-6">
        <USkeleton v-for="index in 7" :key="index" class="h-16 w-full" />
      </div>
      <div v-else-if="!records.length" class="px-6 py-16 text-center">
        <UIcon name="i-lucide-monitor-off" class="mx-auto size-11 text-dimmed" />
        <h3 class="mt-3 font-semibold text-highlighted">No matching sessions</h3>
        <p class="mt-1 text-sm text-muted">This account has no session matching the selected filters.</p>
      </div>
      <UTable v-else :data="records" :columns="columns">
        <template #device-cell="{ row }">
          <p class="font-semibold text-highlighted">{{ row.original.deviceName }}</p>
          <p class="text-xs text-muted">
            {{ row.original.browser }} · {{ row.original.operatingSystem }}
          </p>
        </template>
        <template #source-cell="{ row }">
          <UBadge :label="row.original.source" color="neutral" variant="soft" />
        </template>
        <template #status-cell="{ row }">
          <UBadge
            :label="row.original.status"
            :color="statusColor(row.original.status)"
            variant="soft"
          />
        </template>
        <template #login-cell="{ row }">
          <time class="text-sm text-default">{{ formatDate(row.original.loginAt) }}</time>
        </template>
        <template #lastActivity-cell="{ row }">
          <time class="text-sm text-default">{{ formatDate(row.original.lastActivityAt) }}</time>
        </template>
        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              icon="i-lucide-eye"
              color="neutral"
              variant="ghost"
              square
              aria-label="View session"
              @click="view(row.original)"
            />
            <UButton
              v-if="row.original.status === 'Active'"
              icon="i-lucide-log-out"
              color="error"
              variant="ghost"
              square
              aria-label="Revoke session"
              @click="beginRevoke(row.original)"
            />
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex justify-end">
          <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" />
        </div>
      </template>
    </UCard>
  </div>

  <UModal v-model:open="detailOpen" :ui="{ content: 'sm:max-w-2xl' }">
    <template #content>
      <div v-if="selected" class="space-y-5 bg-default p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-highlighted">{{ selected.deviceName }}</h2>
            <p class="mt-1 text-sm text-muted">{{ selected.source }}</p>
          </div>
          <UBadge
            :label="selected.status"
            :color="statusColor(selected.status)"
            variant="soft"
          />
        </div>
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt class="text-xs font-semibold uppercase text-muted">Login Time</dt><dd class="mt-1 text-highlighted">{{ formatDate(selected.loginAt) }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Last Activity</dt><dd class="mt-1 text-highlighted">{{ formatDate(selected.lastActivityAt) }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Browser</dt><dd class="mt-1 text-highlighted">{{ selected.browser }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Operating System</dt><dd class="mt-1 text-highlighted">{{ selected.operatingSystem }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Masked Network</dt><dd class="mt-1 font-mono text-xs text-highlighted">{{ selected.maskedIpAddress || "Not recorded" }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Session Reference</dt><dd class="mt-1 font-mono text-xs text-highlighted">{{ selected.sessionReference }}</dd></div>
          <div v-if="selected.logoutReason" class="sm:col-span-2"><dt class="text-xs font-semibold uppercase text-muted">Logout or Revocation Reason</dt><dd class="mt-1 text-highlighted">{{ selected.logoutReason }}</dd></div>
        </dl>
        <div class="flex justify-end gap-2">
          <UButton label="Close" color="neutral" variant="outline" @click="detailOpen = false" />
          <UButton
            v-if="selected.status === 'Active'"
            label="Revoke Session"
            icon="i-lucide-log-out"
            color="error"
            @click="beginRevoke(selected)"
          />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="revokeOpen" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <div class="space-y-5 bg-default p-6">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Revoke Session</h2>
          <p class="mt-2 text-sm text-muted">
            End the selected {{ selected?.source.toLowerCase() }} for {{ account?.username }}.
          </p>
        </div>
        <UFormField label="Administrative reason" required>
          <UTextarea
            v-model="reason"
            :rows="4"
            placeholder="Explain why this session must be revoked"
          />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="revokeOpen = false" />
          <UButton
            label="Revoke Session"
            icon="i-lucide-log-out"
            color="error"
            :loading="revoking"
            :disabled="reason.trim().length < 5"
            @click="confirmRevoke"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
