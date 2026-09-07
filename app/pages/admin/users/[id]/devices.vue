<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type {
  AdminDeviceRecord,
  AdminUserMonitoringSummary,
} from "~/composables/useAdminMonitoring";
import type { AdminUserRecord } from "~/composables/useAdminUsers";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Account Devices",
});

const route = useRoute();
const monitoringApi = useAdminMonitoring();
const usersApi = useAdminUsers();
const auth = useAuth();
const toast = useToast();

const userId = computed(() => Number.parseInt(String(route.params.id), 10));
const account = ref<AdminUserRecord | null>(null);
const summary = ref<AdminUserMonitoringSummary | null>(null);
const records = ref<AdminDeviceRecord[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const trust = ref("All");
const blocked = ref("All");
const selected = ref<AdminDeviceRecord | null>(null);
const detailOpen = ref(false);
const actionOpen = ref(false);
const action = ref<"trust" | "untrust" | "block" | "unblock" | "revoke-sessions">("trust");
const reason = ref("");
const acting = ref(false);

const trustItems = ["All", "Trusted", "Untrusted"];
const blockedItems = ["All", "Allowed", "Blocked"];
const columns: TableColumn<AdminDeviceRecord>[] = [
  { id: "device", header: "Device" },
  { id: "trust", header: "Access State" },
  { id: "seen", header: "First and Last Seen" },
  { id: "sessions", header: "Portal Sessions" },
  { id: "actions", header: "" },
];

const actionLabel = computed(() => {
  if (action.value === "trust") return "Mark Device as Trusted";
  if (action.value === "untrust") return "Remove Trusted Status";
  if (action.value === "block") return "Block Device";
  if (action.value === "unblock") return "Unblock Device";
  return "Revoke Device Sessions";
});

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
    const response = await monitoringApi.devices({
      userId: userId.value,
      page: page.value,
      pageSize,
      trust: trust.value,
      blocked: blocked.value,
    });
    records.value = response.data;
    total.value = response.meta.total;
  } catch (error) {
    toast.add({
      title: "Unable to load user devices",
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

function view(record: AdminDeviceRecord) {
  selected.value = record;
  detailOpen.value = true;
}

function begin(
  record: AdminDeviceRecord,
  nextAction: "trust" | "untrust" | "block" | "unblock" | "revoke-sessions",
) {
  selected.value = record;
  action.value = nextAction;
  reason.value = "";
  actionOpen.value = true;
}

async function confirm() {
  if (!selected.value || reason.value.trim().length < 5 || acting.value) return;
  acting.value = true;
  try {
    const response = await monitoringApi.deviceAction(
      selected.value,
      action.value,
      reason.value.trim(),
    );
    const description = action.value === "block"
      ? "The selected device can no longer use this account."
      : action.value === "revoke-sessions"
        ? `${response.data.authenticationRevocationScope} were revoked for safety.`
        : `${selected.value.displayName} was updated successfully.`;
    toast.add({
      title: actionLabel.value,
      description,
      color: "success",
      icon: "i-lucide-circle-check",
    });
    actionOpen.value = false;
    detailOpen.value = false;
    await refresh();
  } catch (error) {
    toast.add({
      title: "Unable to update device",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    acting.value = false;
  }
}

watch([trust, blocked], () => {
  page.value = 1;
  void load();
});
watch(page, () => void load());
onMounted(refresh);
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
    <AdminPageHeader
      eyebrow="User Monitoring"
      :title="account ? `Devices for ${account.username}` : 'Account Devices'"
      description="Review and control the privacy-safe devices recognized for this account."
      icon="i-lucide-monitor-smartphone"
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

    <AdminUserMonitoringNav :user-id="userId" active="devices" />

    <UAlert
      color="primary"
      variant="soft"
      icon="i-lucide-fingerprint"
      title="Privacy-safe device records"
      description="The Library System uses a random application identifier and does not collect MAC addresses, hardware serial numbers, IMEI numbers, continuous location, or personal files."
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        label="Known Devices"
        :value="summary?.knownDevices ?? 0"
        description="Recognized devices belonging to this account."
        icon="i-lucide-monitor-smartphone"
        tone="primary"
        :loading="!summary"
      />
      <AdminMetricCard
        label="Trusted Devices"
        :value="summary?.trustedDevices ?? 0"
        description="Devices explicitly trusted by the user or Administrator."
        icon="i-lucide-shield-check"
        tone="success"
        :loading="!summary"
      />
      <AdminMetricCard
        label="Blocked Devices"
        :value="summary?.blockedDevices ?? 0"
        description="Devices denied from protected portal access."
        icon="i-lucide-ban"
        :tone="summary?.blockedDevices ? 'error' : 'neutral'"
        :loading="!summary"
      />
      <AdminMetricCard
        label="Last Device Activity"
        :value="formatDate(summary?.lastSeenAt)"
        description="Most recent device observation for this account."
        icon="i-lucide-clock-3"
        tone="neutral"
        :loading="!summary"
      />
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="font-semibold text-highlighted">Device Register</h2>
            <p class="mt-1 text-xs text-muted">
              {{ total }} matching device{{ total === 1 ? "" : "s" }}
            </p>
          </div>
          <div class="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[28rem]">
            <USelect v-model="trust" :items="trustItems" />
            <USelect v-model="blocked" :items="blockedItems" />
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-3 p-6">
        <USkeleton v-for="index in 7" :key="index" class="h-16 w-full" />
      </div>
      <div v-else-if="!records.length" class="px-6 py-16 text-center">
        <UIcon name="i-lucide-monitor-off" class="mx-auto size-11 text-dimmed" />
        <h3 class="mt-3 font-semibold text-highlighted">No matching devices</h3>
        <p class="mt-1 text-sm text-muted">A device appears after this account opens a supported portal.</p>
      </div>
      <UTable v-else :data="records" :columns="columns">
        <template #device-cell="{ row }">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-elevated">
              <UIcon
                :name="row.original.deviceType === 'Mobile Phone' ? 'i-lucide-smartphone' : 'i-lucide-monitor'"
                class="size-5"
              />
            </div>
            <div>
              <p class="font-semibold text-highlighted">{{ row.original.displayName }}</p>
              <p class="text-xs text-muted">{{ row.original.deviceType }} · {{ row.original.applicationMode }}</p>
            </div>
          </div>
        </template>
        <template #trust-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              :label="row.original.blocked ? 'Blocked' : 'Allowed'"
              :color="row.original.blocked ? 'error' : 'success'"
              variant="soft"
            />
            <UBadge
              :label="row.original.trusted ? 'Trusted' : 'Untrusted'"
              :color="row.original.trusted ? 'primary' : 'neutral'"
              variant="soft"
            />
          </div>
        </template>
        <template #seen-cell="{ row }">
          <p class="text-sm text-default">{{ formatDate(row.original.lastSeenAt) }}</p>
          <p class="text-xs text-muted">First: {{ formatDate(row.original.firstSeenAt) }}</p>
        </template>
        <template #sessions-cell="{ row }">
          <UBadge
            :label="`${row.original.activeSessionCount} active`"
            :color="row.original.activeSessionCount ? 'success' : 'neutral'"
            variant="soft"
          />
        </template>
        <template #actions-cell="{ row }">
          <UButton
            icon="i-lucide-eye"
            color="neutral"
            variant="ghost"
            square
            aria-label="View device"
            @click="view(row.original)"
          />
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
            <h2 class="text-xl font-bold text-highlighted">{{ selected.displayName }}</h2>
            <p class="mt-1 text-sm text-muted">{{ account?.username }} · {{ selected.profileType }}</p>
          </div>
          <UBadge
            :label="selected.blocked ? 'Blocked' : 'Allowed'"
            :color="selected.blocked ? 'error' : 'success'"
            variant="soft"
          />
        </div>
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt class="text-xs font-semibold uppercase text-muted">Device Type</dt><dd class="mt-1 text-highlighted">{{ selected.deviceType }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Application</dt><dd class="mt-1 text-highlighted">{{ selected.applicationMode }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Browser</dt><dd class="mt-1 text-highlighted">{{ selected.browser }} {{ selected.browserVersion || "" }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Operating System</dt><dd class="mt-1 text-highlighted">{{ selected.operatingSystem }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">First Seen</dt><dd class="mt-1 text-highlighted">{{ formatDate(selected.firstSeenAt) }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Last Seen</dt><dd class="mt-1 text-highlighted">{{ formatDate(selected.lastSeenAt) }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Masked Network</dt><dd class="mt-1 font-mono text-xs text-highlighted">{{ selected.maskedIpAddress || "Not recorded" }}</dd></div>
          <div><dt class="text-xs font-semibold uppercase text-muted">Portal Sessions</dt><dd class="mt-1 text-highlighted">{{ selected.activeSessionCount }} active</dd></div>
        </dl>
        <div class="flex flex-wrap justify-end gap-2">
          <UButton label="Close" color="neutral" variant="outline" @click="() => { detailOpen = false; }" />
          <UButton
            :label="selected.trusted ? 'Remove Trust' : 'Mark Trusted'"
            :icon="selected.trusted ? 'i-lucide-shield-off' : 'i-lucide-shield-check'"
            color="primary"
            variant="soft"
            @click="begin(selected, selected.trusted ? 'untrust' : 'trust')"
          />
          <UButton
            label="Revoke Sessions"
            icon="i-lucide-log-out"
            color="warning"
            variant="soft"
            @click="begin(selected, 'revoke-sessions')"
          />
          <UButton
            :label="selected.blocked ? 'Unblock Device' : 'Block Device'"
            :icon="selected.blocked ? 'i-lucide-shield-check' : 'i-lucide-ban'"
            :color="selected.blocked ? 'success' : 'error'"
            @click="begin(selected, selected.blocked ? 'unblock' : 'block')"
          />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="actionOpen" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <div class="space-y-5 bg-default p-6">
        <div>
          <h2 class="text-xl font-bold text-highlighted">{{ actionLabel }}</h2>
          <p class="mt-2 text-sm text-muted">
            Apply this security action to {{ selected?.displayName }} used by {{ account?.username }}.
          </p>
        </div>
        <UFormField label="Administrative reason" required>
          <UTextarea
            v-model="reason"
            :rows="4"
            placeholder="Explain why this device action is required"
          />
        </UFormField>
        <UAlert
          v-if="action === 'block'"
          color="error"
          variant="soft"
          icon="i-lucide-shield-ban"
          title="Device access will be denied"
          description="This device will no longer be allowed to use the account. Other devices for the same account remain available."
        />
        <UAlert
          v-else-if="action === 'revoke-sessions'"
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Authentication sessions"
          description="For safety, this action may sign the account out from other active sessions as well."
        />
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="() => { actionOpen = false; }" />
          <UButton
            :label="actionLabel"
            :color="action === 'block' ? 'error' : 'primary'"
            :loading="acting"
            :disabled="reason.trim().length < 5"
            @click="confirm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
