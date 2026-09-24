<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Dashboard",
});

const dashboard = useAdminDashboard();
const toast = useToast();

const metricCards = computed(() => [
  {
    label: "Users",
    value: dashboard.metrics.value.totalUsers,
    description: `${dashboard.metrics.value.activeUsers} active accounts`,
    icon: "i-lucide-users",
    tone: "primary" as const,
    to: "/admin/users",
  },
  {
    label: "Librarians",
    value: dashboard.metrics.value.totalLibrarians,
    description: `${dashboard.metrics.value.activeLibrarians} active Librarians`,
    icon: "i-lucide-user-round-cog",
    tone: "success" as const,
    to: "/admin/librarians",
  },
  {
    label: "Blocked Accounts",
    value: dashboard.metrics.value.blockedUsers,
    description: "Accounts currently prevented from signing in",
    icon: "i-lucide-user-round-x",
    tone: dashboard.metrics.value.blockedUsers ? "error" as const : "neutral" as const,
    to: "/admin/users?status=blocked",
  },
  {
    label: "Unconfirmed Accounts",
    value: dashboard.metrics.value.unconfirmedUsers,
    description: "Accounts that still require confirmation",
    icon: "i-lucide-user-round-check",
    tone: dashboard.metrics.value.unconfirmedUsers ? "warning" as const : "neutral" as const,
    to: "/admin/users?status=unconfirmed",
  },
  {
    label: "Registered Students",
    value: dashboard.metrics.value.totalStudents,
    description: "Student records in the Library system",
    icon: "i-lucide-graduation-cap",
    tone: "info" as const,
  },
  {
    label: "Registered Faculty",
    value: dashboard.metrics.value.totalFaculty,
    description: "Faculty records in the Library system",
    icon: "i-lucide-briefcase-business",
    tone: "info" as const,
  },
  {
    label: "Book Copies",
    value: dashboard.metrics.value.totalCopies,
    description: `${dashboard.metrics.value.totalBooks} unique book titles`,
    icon: "i-lucide-library",
    tone: "success" as const,
  },
  {
    label: "Items Requiring Attention",
    value:
      dashboard.metrics.value.overdueTransactions +
      dashboard.metrics.value.pendingReservations,
    description: `${dashboard.metrics.value.overdueTransactions} overdue · ${dashboard.metrics.value.pendingReservations} pending reservations`,
    icon: "i-lucide-triangle-alert",
    tone:
      dashboard.metrics.value.overdueTransactions ||
      dashboard.metrics.value.pendingReservations
        ? "warning" as const
        : "neutral" as const,
  },
]);

const systemChecks = computed(() => [
  { label: "Application Service", value: dashboard.system.value.api },
  { label: "Database", value: dashboard.system.value.database },
  { label: "Authentication", value: dashboard.system.value.authentication },
  { label: "System Time Zone", value: dashboard.system.value.timezone },
]);

function formatDateTime(value: string) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

async function refresh() {
  try {
    await dashboard.refresh();
  } catch (error) {
    toast.add({
      title: "Unable to load dashboard",
      description: useAuth().getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

onMounted(refresh);
</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page space-y-6">
    <AdminPageHeader
      eyebrow="Administration"
      title="Dashboard"
      description="Review key Library activity, accounts, and system status at a glance."
      icon="i-lucide-shield-check"
    >
      <template #actions>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="dashboard.loading.value"
          @click="refresh"
        />
        <UButton
          label="Add Librarian"
          icon="i-lucide-user-plus"
          to="/admin/librarians/create"
        />
      </template>
    </AdminPageHeader>

    <UAlert
      v-if="dashboard.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Administration data could not be loaded"
      :description="dashboard.error.value"
    />

    <section aria-labelledby="account-overview-heading">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h2 id="account-overview-heading" class="text-base font-semibold text-highlighted">
            System Summary
          </h2>
          <p class="mt-1 text-xs text-muted">
            Current figures from the Library system.
          </p>
        </div>
        <p v-if="dashboard.data.value.generatedAt" class="hidden text-xs text-muted sm:block">
          Updated {{ formatDateTime(dashboard.data.value.generatedAt) }}
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          v-for="item in metricCards"
          :key="item.label"
          v-bind="item"
          :loading="dashboard.loading.value && !dashboard.data.value.generatedAt"
        />
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="border-b border-default p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
              <UIcon name="i-lucide-server-cog" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">System Status</h2>
              <p class="text-xs text-muted">Core services used by the Library System.</p>
            </div>
          </div>
        </div>

        <div class="divide-y divide-default">
          <div
            v-for="check in systemChecks"
            :key="check.label"
            class="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
          >
            <span class="text-sm font-medium text-default">{{ check.label }}</span>
            <AdminStatusBadge :label="check.value" />
          </div>
        </div>

      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <div class="flex items-center justify-between border-b border-default p-5 sm:p-6">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-history" class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-highlighted">Recent Admin Activity</h2>
              <p class="text-xs text-muted">Latest account, configuration, and system changes.</p>
            </div>
          </div>
          <UButton
            label="View All"
            to="/admin/audit-logs"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-arrow-right"
            size="sm"
          />
        </div>

        <div v-if="dashboard.loading.value && !dashboard.recentActivity.value.length" class="space-y-4 p-5 sm:p-6">
          <USkeleton v-for="index in 4" :key="index" class="h-14 w-full" />
        </div>

        <div v-else-if="dashboard.recentActivity.value.length" class="divide-y divide-default">
          <div
            v-for="activity in dashboard.recentActivity.value"
            :key="activity.documentId || activity.id"
            class="flex items-start gap-3 px-5 py-4 sm:px-6"
          >
            <div
              class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
              :class="activity.outcome === 'Success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
            >
              <UIcon
                :name="activity.outcome === 'Success' ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
                class="size-4"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-semibold text-highlighted">{{ activity.action }}</p>
                <time class="text-xs text-muted">{{ formatDateTime(activity.createdAt) }}</time>
              </div>
              <p class="mt-1 text-sm leading-5 text-muted">{{ activity.description }}</p>
              <p class="mt-1 text-xs text-dimmed">Performed by {{ activity.actor }}</p>
            </div>
          </div>
        </div>

        <div v-else class="p-8 text-center">
          <UIcon name="i-lucide-scroll-text" class="mx-auto size-10 text-dimmed" />
          <p class="mt-3 text-sm font-medium text-highlighted">No administrative activity recorded yet</p>
          <p class="mt-1 text-xs text-muted">Recent administrative changes will appear here automatically.</p>
        </div>
      </UCard>
    </div>
  </div>
</template>
