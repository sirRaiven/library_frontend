<script setup lang="ts">
import AppRecordCard from "~/components/shared/AppRecordCard.vue";
import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";
import AppStatusBadge from "~/components/shared/AppStatusBadge.vue";
import type { TableColumn } from "@nuxt/ui";
import type {
  AdminActivityRecord,
  AdminUserMonitoringSummary,
} from "~/composables/useAdminMonitoring";
import type { AdminUserRecord } from "~/composables/useAdminUsers";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Account Activity",
});

const route = useRoute();
const monitoringApi = useAdminMonitoring();
const usersApi = useAdminUsers();
const auth = useAuth();
const toast = useToast();

const userId = computed(() => Number.parseInt(String(route.params.id), 10));
const account = ref<AdminUserRecord | null>(null);
const summary = ref<AdminUserMonitoringSummary | null>(null);
const records = ref<AdminActivityRecord[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 25;
const total = ref(0);
const search = ref("");
const category = ref("All");
const outcome = ref("All");
const dateFrom = ref("");
const dateTo = ref("");
const selected = ref<AdminActivityRecord | null>(null);
const detailOpen = ref(false);

const categoryItems = [
  "All",
  "Authentication",
  "Account",
  "Navigation",
  "Collection",
  "Circulation",
  "Reservation",
  "Notification",
  "Security",
  "System",
];
const outcomeItems = ["All", "Success", "Failure", "Denied"];
const columns: TableColumn<AdminActivityRecord>[] = [
  { id: "activity", header: "Activity" },
  { accessorKey: "category", header: "Category" },
  { accessorKey: "outcome", header: "Result" },
  { id: "occurred", header: "Date and Time" },
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

function outcomeColor(value: string) {
  if (value === "Success") return "success" as const;
  if (value === "Failure") return "error" as const;
  if (value === "Denied") return "warning" as const;
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
    const response = await monitoringApi.activity({
      userId: userId.value,
      page: page.value,
      pageSize,
      search: search.value,
      category: category.value,
      outcome: outcome.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
    });
    records.value = response.data;
    total.value = response.meta.total;
  } catch (error) {
    toast.add({
      title: "Unable to load user activity",
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

function openDetail(record: AdminActivityRecord) {
  selected.value = record;
  detailOpen.value = true;
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch([category, outcome, dateFrom, dateTo], () => {
  page.value = 1;
  void load();
});
watch(page, () => void load());
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    void load();
  }, 350);
});

onMounted(refresh);
</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page space-y-6">
    <AdminPageHeader
      eyebrow="User Monitoring"
      :title="account ? `Activity for ${account.username}` : 'Account Activity'"
      description="Review meaningful activity recorded for this account without collecting intrusive device or personal information."
      icon="i-lucide-activity"
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

    <AdminUserMonitoringNav :user-id="userId" active="activity" />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        label="Activity in 30 Days"
        :value="summary?.activityThirtyDays ?? 0"
        description="Meaningful system events recorded for this account."
        icon="i-lucide-activity"
        tone="primary"
        :loading="!summary"
      />
      <AdminMetricCard
        label="Failed or Denied"
        :value="summary?.failedOrDeniedThirtyDays ?? 0"
        description="Events that may require administrative review."
        icon="i-lucide-triangle-alert"
        :tone="summary?.failedOrDeniedThirtyDays ? 'warning' : 'neutral'"
        :loading="!summary"
      />
      <AdminMetricCard
        label="Last Successful Login"
        :value="formatDate(summary?.lastSuccessfulLoginAt)"
        description="Most recent recorded portal sign-in."
        icon="i-lucide-log-in"
        tone="success"
        :loading="!summary"
      />
      <AdminMetricCard
        label="Last Device Activity"
        :value="formatDate(summary?.lastSeenAt)"
        description="Most recent privacy-safe device observation."
        icon="i-lucide-monitor-smartphone"
        tone="neutral"
        :loading="!summary"
      />
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <div class="space-y-3">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="font-semibold text-highlighted">Account Activity Timeline</h2>
              <p class="mt-1 text-xs text-muted">
                {{ total }} matching record{{ total === 1 ? "" : "s" }}
              </p>
            </div>
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search event, description, or route"
              class="w-full lg:max-w-sm"
            />
          </div>
          <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <USelect v-model="category" :items="categoryItems" />
            <USelect v-model="outcome" :items="outcomeItems" />
            <UInput v-model="dateFrom" type="date" aria-label="Date from" />
            <UInput v-model="dateTo" type="date" aria-label="Date to" />
          </div>
        </div>
      </template>

      <div v-if="loading" class="space-y-3 p-6">
        <USkeleton v-for="index in 7" :key="index" class="h-16 w-full" />
      </div>
      <div v-else-if="!records.length" class="px-6 py-16 text-center">
        <UIcon name="i-lucide-activity" class="mx-auto size-11 text-dimmed" />
        <h3 class="mt-3 font-semibold text-highlighted">No matching activity</h3>
        <p class="mt-1 text-sm text-muted">Adjust the filters or wait for new account activity.</p>
      </div>
      <AppResponsiveDataView v-else mobile-label="Account activity" desktop-label="Account activity table">
        <template #mobile>
          <div class="sncbt-mobile-record-list p-3">
            <AppRecordCard v-for="record in records" :key="record.id" :title="record.description" :subtitle="record.eventCode">
              <template #status><AppStatusBadge :label="record.outcome" :tone="record.outcome === 'Success' ? 'success' : record.outcome === 'Denied' || record.outcome === 'Failed' ? 'error' : 'neutral'" /></template>
              <template #meta><span>{{ record.category }}</span><span v-if="record.route">{{ record.route }}</span><time>{{ formatDate(record.occurredAt) }}</time></template>
              <template #actions><UButton icon="i-lucide-eye" color="neutral" variant="ghost" square aria-label="View activity" @click="openDetail(record)" /></template>
            </AppRecordCard>
          </div>
        </template>
        <template #desktop>
          <UTable :data="records" :columns="columns">
                  <template #activity-cell="{ row }">
                    <p class="font-semibold text-highlighted">{{ row.original.description }}</p>
                    <p class="mt-1 max-w-xl truncate font-mono text-[11px] text-muted">
                      {{ row.original.eventCode }}
                      <span v-if="row.original.route"> · {{ row.original.route }}</span>
                    </p>
                  </template>
                  <template #category-cell="{ row }">
                    <UBadge :label="row.original.category" color="neutral" variant="soft" />
                  </template>
                  <template #outcome-cell="{ row }">
                    <UBadge
                      :label="row.original.outcome"
                      :color="outcomeColor(row.original.outcome)"
                      variant="soft"
                    />
                  </template>
                  <template #occurred-cell="{ row }">
                    <time class="text-sm text-default">{{ formatDate(row.original.occurredAt) }}</time>
                  </template>
                  <template #actions-cell="{ row }">
                    <UButton
                      icon="i-lucide-eye"
                      color="neutral"
                      variant="ghost"
                      square
                      aria-label="View activity"
                      @click="openDetail(row.original)"
                    />
                  </template>
                </UTable>
        </template>
      </AppResponsiveDataView>

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
            <h2 class="text-xl font-bold text-highlighted">{{ selected.description }}</h2>
            <p class="mt-1 text-sm text-muted">{{ formatDate(selected.occurredAt) }}</p>
          </div>
          <UBadge
            :label="selected.outcome"
            :color="outcomeColor(selected.outcome)"
            variant="soft"
          />
        </div>
        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Category</dt>
            <dd class="mt-1 text-highlighted">{{ selected.category }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Event Code</dt>
            <dd class="mt-1 font-mono text-xs text-highlighted">{{ selected.eventCode }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Masked Network</dt>
            <dd class="mt-1 font-mono text-xs text-highlighted">
              {{ selected.maskedIpAddress || "Not recorded" }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Request Method</dt>
            <dd class="mt-1 text-highlighted">{{ selected.requestMethod || "Not recorded" }}</dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Route</dt>
            <dd class="mt-1 break-all font-mono text-xs text-highlighted">
              {{ selected.route || "Not recorded" }}
            </dd>
          </div>
        </dl>
        <div class="flex justify-end">
          <UButton label="Close" color="neutral" variant="outline" @click="() => { detailOpen = false; }" />
        </div>
      </div>
    </template>
  </UModal>
</template>
