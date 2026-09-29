<script setup lang="ts">
definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Dashboard",
});

const dashboard = useAdminDashboard();
const toast = useToast();

const accountAttention = computed(() =>
  dashboard.metrics.value.blockedUsers + dashboard.metrics.value.unconfirmedUsers,
);
const libraryAttention = computed(() =>
  dashboard.metrics.value.overdueTransactions + dashboard.metrics.value.pendingReservations,
);

const metricCards = computed(() => [
  {
    label: "Accounts",
    value: dashboard.metrics.value.totalUsers,
    description: `${dashboard.metrics.value.activeUsers} active application accounts`,
    icon: "i-lucide-users",
    tone: "primary" as const,
    to: "/admin/users",
  },
  {
    label: "Access Review",
    value: accountAttention.value,
    description: `${dashboard.metrics.value.blockedUsers} blocked · ${dashboard.metrics.value.unconfirmedUsers} unconfirmed`,
    icon: "i-lucide-user-round-search",
    tone: accountAttention.value ? "warning" as const : "success" as const,
    to: "/admin/accounts-review",
  },
  {
    label: "Library Attention",
    value: libraryAttention.value,
    description: `${dashboard.metrics.value.overdueTransactions} overdue · ${dashboard.metrics.value.pendingReservations} pending reservations`,
    icon: "i-lucide-triangle-alert",
    tone: libraryAttention.value ? "warning" as const : "success" as const,
    to: "/admin/operations",
  },
  {
    label: "Active Librarians",
    value: dashboard.metrics.value.activeLibrarians,
    description: `${dashboard.metrics.value.totalLibrarians} total Library staff profiles`,
    icon: "i-lucide-user-round-cog",
    tone: "success" as const,
    to: "/admin/librarians",
  },
]);

const attentionItems = computed(() => [
  {
    label: "Blocked accounts",
    value: dashboard.metrics.value.blockedUsers,
    description: "Accounts currently prevented from signing in.",
    to: "/admin/users?status=blocked",
    icon: "i-lucide-user-round-x",
    tone: dashboard.metrics.value.blockedUsers ? "error" : "neutral",
  },
  {
    label: "Unconfirmed accounts",
    value: dashboard.metrics.value.unconfirmedUsers,
    description: "Accounts that still require confirmation or review.",
    to: "/admin/users?status=unconfirmed",
    icon: "i-lucide-user-round-check",
    tone: dashboard.metrics.value.unconfirmedUsers ? "warning" : "neutral",
  },
  {
    label: "Overdue borrowings",
    value: dashboard.metrics.value.overdueTransactions,
    description: "Circulation records requiring Library follow-up.",
    to: "/admin/operations",
    icon: "i-lucide-clock-alert",
    tone: dashboard.metrics.value.overdueTransactions ? "warning" : "neutral",
  },
  {
    label: "Pending reservations",
    value: dashboard.metrics.value.pendingReservations,
    description: "Reservation requests waiting for Library processing.",
    to: "/admin/operations",
    icon: "i-lucide-calendar-clock",
    tone: dashboard.metrics.value.pendingReservations ? "warning" : "neutral",
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
  <div class="sncbt-page-shell sncbt-staff-page space-y-6" :aria-busy="dashboard.loading.value">
    <p class="sr-only" aria-live="polite">
      {{ dashboard.loading.value ? 'Refreshing Administrator dashboard.' : 'Administrator dashboard ready.' }}
    </p>

    <AdminPageHeader
      eyebrow="Administration"
      title="Dashboard"
      description="Focus on access issues, Library exceptions, and the administrative actions that need attention."
      icon="i-lucide-layout-dashboard"
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

    <section aria-labelledby="admin-priority-summary-heading" class="space-y-3">
      <AdminSectionHeader
        title="Priority Summary"
        description="High-value indicators for account governance and Library exceptions."
        icon="i-lucide-gauge"
        heading-id="admin-priority-summary-heading"
      >
        <template #actions>
          <p v-if="dashboard.data.value.generatedAt" class="text-xs text-muted">
            Updated {{ formatDateTime(dashboard.data.value.generatedAt) }}
          </p>
        </template>
      </AdminSectionHeader>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          v-for="item in metricCards"
          :key="item.label"
          v-bind="item"
          :loading="dashboard.loading.value && !dashboard.data.value.generatedAt"
        />
      </div>
    </section>

    <section aria-labelledby="admin-quick-actions-heading" class="space-y-3">
      <AdminSectionHeader
        title="Quick Actions"
        description="Open the most frequently used administrative workflows without searching through the sidebar."
        icon="i-lucide-zap"
        heading-id="admin-quick-actions-heading"
      />
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminQuickAction label="Manage Users" description="Create, review, edit, block, or restore application accounts." icon="i-lucide-users" tone="primary" to="/admin/users" />
        <AdminQuickAction label="Review Accounts" description="Resolve account and profile-linking issues that need attention." icon="i-lucide-list-checks" tone="warning" to="/admin/accounts-review" />
        <AdminQuickAction label="Manage Data" description="Maintain catalog, reference, people, and operational records." icon="i-lucide-database-zap" tone="info" to="/admin/data-management" />
        <AdminQuickAction label="Open Archive" description="Restore archived records or review permanent-deletion impact." icon="i-lucide-archive" tone="warning" to="/admin/archive" />
        <AdminQuickAction label="Library Settings" description="Update borrowing, membership, reservation, and fine rules." icon="i-lucide-settings-2" tone="neutral" to="/admin/settings" />
      </div>
    </section>

    <div class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <AdminSectionHeader
            title="Needs Attention"
            description="Items that may require administrative or Library follow-up."
            icon="i-lucide-circle-alert"
          />
        </template>

        <div class="divide-y divide-default">
          <NuxtLink
            v-for="item in attentionItems"
            :key="item.label"
            :to="item.to"
            class="group flex items-center gap-3 px-5 py-4 outline-none transition hover:bg-elevated/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-6"
          >
            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset"
              :class="item.tone === 'error' ? 'bg-error/10 text-error ring-error/15' : item.tone === 'warning' ? 'bg-warning/10 text-warning ring-warning/15' : 'bg-elevated text-muted ring-default'"
              aria-hidden="true"
            >
              <UIcon :name="item.icon" class="size-4" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-3">
                <p class="text-sm font-semibold text-highlighted">{{ item.label }}</p>
                <span class="text-lg font-bold tabular-nums text-highlighted">{{ item.value }}</span>
              </div>
              <p class="mt-0.5 text-xs leading-5 text-muted">{{ item.description }}</p>
            </div>
            <UIcon name="i-lucide-chevron-right" class="size-4 shrink-0 text-dimmed transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true" />
          </NuxtLink>
        </div>
      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <AdminSectionHeader
            title="System Status"
            description="Core services used by the Library System."
            icon="i-lucide-server-cog"
          >
            <template #actions>
              <UButton label="System & Maintenance" size="sm" color="neutral" variant="ghost" trailing-icon="i-lucide-arrow-right" to="/admin/system-health" />
            </template>
          </AdminSectionHeader>
        </template>

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
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <AdminSectionHeader
          title="Recent Administrative Activity"
          description="Latest account, configuration, and system-governance changes."
          icon="i-lucide-history"
        >
          <template #actions>
            <UButton
              label="View Audit Trail"
              to="/admin/audit-logs"
              color="neutral"
              variant="ghost"
              trailing-icon="i-lucide-arrow-right"
              size="sm"
            />
          </template>
        </AdminSectionHeader>
      </template>

      <div v-if="dashboard.loading.value && !dashboard.recentActivity.value.length" class="space-y-4 p-5 sm:p-6" aria-label="Loading recent activity">
        <USkeleton v-for="index in 4" :key="index" class="h-14 w-full" />
      </div>

      <div v-else-if="dashboard.recentActivity.value.length" class="divide-y divide-default">
        <article
          v-for="activity in dashboard.recentActivity.value"
          :key="activity.documentId || activity.id"
          class="flex items-start gap-3 px-5 py-4 sm:px-6"
        >
          <div
            class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg"
            :class="activity.outcome === 'Success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'"
            aria-hidden="true"
          >
            <UIcon
              :name="activity.outcome === 'Success' ? 'i-lucide-circle-check' : 'i-lucide-circle-x'"
              class="size-4"
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-semibold text-highlighted">{{ activity.action }}</p>
              <time class="text-xs text-muted" :datetime="activity.createdAt">{{ formatDateTime(activity.createdAt) }}</time>
            </div>
            <p class="mt-1 text-sm leading-5 text-muted">{{ activity.description }}</p>
            <p class="mt-1 text-xs text-dimmed">Performed by {{ activity.actor }}</p>
          </div>
        </article>
      </div>

      <AdminEmptyState
        v-else
        title="No administrative activity recorded yet"
        description="Recent administrative changes will appear here automatically."
        icon="i-lucide-scroll-text"
        compact
      />
    </UCard>
  </div>
</template>
