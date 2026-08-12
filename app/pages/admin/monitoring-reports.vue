<script setup lang="ts">
import type {
  AdminMonitoringReport,
  AdminMonitoringReportType,
} from "~/composables/useAdminMonitoring";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Monitoring Reports",
});

const monitoringApi = useAdminMonitoring();
const usersApi = useAdminUsers();
const auth = useAuth();
const toast = useToast();

const reportType = ref<AdminMonitoringReportType>("login-history");
const profileType = ref("All");
const selectedUserId = ref(0);
const accountSearch = ref("");
const limit = ref(1000);
const loading = ref(false);
const loadingUsers = ref(false);
const report = ref<AdminMonitoringReport | null>(null);

const today = new Date();
const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
const dateFrom = ref(thirtyDaysAgo.toISOString().slice(0, 10));
const dateTo = ref(today.toISOString().slice(0, 10));

const reportItems = [
  { label: "User Login History", value: "login-history" },
  { label: "Failed and Denied Access", value: "failed-access" },
  { label: "Active Session Register", value: "active-session-register" },
  { label: "User Device Register", value: "device-register" },
  { label: "Session Revocation Report", value: "session-revocations" },
  { label: "New Device Register", value: "new-device-register" },
];
const profileItems = ["All", "Student", "Faculty", "Librarian", "Administrator"];
const limitItems = [
  { label: "Up to 500 records", value: 500 },
  { label: "Up to 1,000 records", value: 1000 },
  { label: "Up to 2,500 records", value: 2500 },
  { label: "Up to 5,000 records", value: 5000 },
];
const userItems = ref<Array<{ label: string; value: number }>>([
  { label: "All accounts", value: 0 },
]);

const selectedReportDescription = computed(() => {
  if (reportType.value === "login-history") {
    return "Successful portal sign-ins, sign-outs, and blocked-device access attempts.";
  }
  if (reportType.value === "failed-access") {
    return "Failed or denied activities that may require administrative review.";
  }
  if (reportType.value === "active-session-register") {
    return "Current Strapi authentication sessions and active portal-monitoring sessions.";
  }
  if (reportType.value === "device-register") {
    return "Privacy-safe user device records observed during the reporting period.";
  }
  if (reportType.value === "session-revocations") {
    return "Portal sessions that were revoked, blocked, or invalidated.";
  }
  return "Devices first observed during the selected reporting period.";
});

function formatDate(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDate(value);
  }
  return String(value);
}

function csvValue(value: unknown) {
  const text = displayValue(value).replace(/\r?\n/g, " ");
  return `"${text.replace(/"/g, '""')}"`;
}

function safeFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadUsers() {
  loadingUsers.value = true;
  try {
    const response = await usersApi.list({
      search: accountSearch.value.trim() || undefined,
      page: 1,
      pageSize: 100,
    });
    const previousSelection = userItems.value.find(
      item => item.value === selectedUserId.value && item.value !== 0,
    );
    const options = response.data.map(user => ({
      label: `${user.username} · ${user.role?.name || "No role"}`,
      value: user.id,
    }));
    if (
      previousSelection &&
      !options.some(item => item.value === previousSelection.value)
    ) {
      options.unshift(previousSelection);
    }
    userItems.value = [
      { label: "All accounts", value: 0 },
      ...options,
    ];
  } catch (error) {
    console.warn("Unable to load monitoring report account filters.", error);
  } finally {
    loadingUsers.value = false;
  }
}

async function generate() {
  loading.value = true;
  report.value = null;
  try {
    report.value = await monitoringApi.report(reportType.value, {
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      profileType: profileType.value,
      userId: selectedUserId.value || undefined,
      limit: limit.value,
    });
    toast.add({
      title: "Monitoring report generated",
      description: `${report.value.returned} record${report.value.returned === 1 ? "" : "s"} are ready for review.`,
      color: "success",
      icon: "i-lucide-file-check-2",
    });
  } catch (error) {
    toast.add({
      title: "Unable to generate monitoring report",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

function downloadCsv() {
  if (!report.value || !import.meta.client) return;

  const selectedAccount = userItems.value.find(item => item.value === selectedUserId.value)?.label || "All accounts";
  const lines = [
    [report.value.title],
    ["Generated", formatDate(report.value.generatedAt)],
    ["Reporting period", `${dateFrom.value} to ${dateTo.value}`],
    ["Account type", profileType.value],
    ["Account", selectedAccount],
    ["Matching records", report.value.total],
    [],
    report.value.columns.map(column => column.label),
    ...report.value.rows.map(row =>
      report.value!.columns.map(column => row[column.key] ?? null),
    ),
  ];
  const csv = `\uFEFF${lines.map(line => line.map(csvValue).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `SNCBT-${safeFilename(report.value.title)}-${dateFrom.value}-to-${dateTo.value}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

watch([reportType, profileType, selectedUserId, dateFrom, dateTo, limit], () => {
  report.value = null;
});

let accountSearchTimer: ReturnType<typeof setTimeout> | undefined;
watch(accountSearch, () => {
  clearTimeout(accountSearchTimer);
  accountSearchTimer = setTimeout(loadUsers, 300);
});

onMounted(loadUsers);
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <AdminPageHeader
      eyebrow="Security and Monitoring"
      title="Monitoring Reports"
      description="Generate privacy-conscious activity, session, and device registers for administrative review."
      icon="i-lucide-file-chart-column"
    >
      <template #actions>
        <UButton
          label="Generate Report"
          icon="i-lucide-play"
          :loading="loading"
          @click="generate"
        />
      </template>
    </AdminPageHeader>

    <UAlert
      color="primary"
      variant="soft"
      icon="i-lucide-shield-check"
      title="Restricted administrative information"
      description="Monitoring reports use masked network addresses and exclude passwords, authentication tokens, session secrets, hardware identifiers, and unrelated personal activity. Every report generation is recorded in the Audit Log."
    />

    <div class="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Report Configuration</h2>
            <p class="mt-1 text-xs text-muted">Select the report and reporting boundaries.</p>
          </div>
        </template>

        <div class="space-y-4">
          <UFormField label="Report type" required>
            <USelect v-model="reportType" :items="reportItems" class="w-full" />
          </UFormField>

          <UAlert
            color="neutral"
            variant="soft"
            icon="i-lucide-info"
            :description="selectedReportDescription"
          />

          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <UFormField label="Date from" required>
              <UInput v-model="dateFrom" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Date to" required>
              <UInput v-model="dateTo" type="date" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="Account type">
            <USelect v-model="profileType" :items="profileItems" class="w-full" />
          </UFormField>

          <UFormField label="Specific account">
            <div class="space-y-2">
              <UInput
                v-model="accountSearch"
                icon="i-lucide-search"
                placeholder="Search username or email"
                autocomplete="off"
                class="w-full"
              />
              <USelect
                v-model="selectedUserId"
                :items="userItems"
                :loading="loadingUsers"
                class="w-full"
              />
            </div>
          </UFormField>

          <UFormField label="Maximum returned records">
            <USelect v-model="limit" :items="limitItems" class="w-full" />
          </UFormField>
        </div>

        <template #footer>
          <UButton
            label="Generate Report"
            icon="i-lucide-file-search"
            block
            :loading="loading"
            @click="generate"
          />
        </template>
      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="font-semibold text-highlighted">
                {{ report?.title || "Report Preview" }}
              </h2>
              <p class="mt-1 text-xs text-muted">
                <template v-if="report">
                  {{ report.returned }} of {{ report.total }} matching record{{ report.total === 1 ? "" : "s" }}
                </template>
                <template v-else>
                  Generate a report to display its records.
                </template>
              </p>
            </div>
            <UButton
              v-if="report"
              label="Download CSV"
              icon="i-lucide-download"
              color="neutral"
              variant="outline"
              @click="downloadCsv"
            />
          </div>
        </template>

        <div v-if="loading" class="space-y-3 p-6">
          <USkeleton v-for="index in 8" :key="index" class="h-14 w-full" />
        </div>
        <div v-else-if="!report" class="px-6 py-20 text-center">
          <UIcon name="i-lucide-file-chart-column" class="mx-auto size-12 text-dimmed" />
          <h3 class="mt-3 font-semibold text-highlighted">No report generated</h3>
          <p class="mx-auto mt-1 max-w-md text-sm text-muted">
            Choose a report type and reporting period, then select Generate Report.
          </p>
        </div>
        <div v-else-if="!report.rows.length" class="px-6 py-20 text-center">
          <UIcon name="i-lucide-file-x-2" class="mx-auto size-12 text-dimmed" />
          <h3 class="mt-3 font-semibold text-highlighted">No matching records</h3>
          <p class="mt-1 text-sm text-muted">The selected report filters returned no data.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-default text-left text-sm">
            <thead class="bg-elevated/60">
              <tr>
                <th
                  v-for="column in report.columns"
                  :key="column.key"
                  class="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  {{ column.label }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="(row, rowIndex) in report.rows" :key="rowIndex" class="align-top">
                <td
                  v-for="column in report.columns"
                  :key="column.key"
                  class="max-w-md px-4 py-3 text-default"
                >
                  <span class="line-clamp-3">{{ displayValue(row[column.key]) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <template v-if="report" #footer>
          <div class="space-y-2">
            <UAlert
              v-if="report.truncated"
              color="warning"
              variant="soft"
              icon="i-lucide-triangle-alert"
              title="Report output limited"
              :description="`The report contains ${report.total} matching records, but only ${report.returned} were returned. Narrow the date range or increase the record limit.`"
            />
            <p class="text-xs text-muted">
              Generated {{ formatDate(report.generatedAt) }}. Network addresses are masked in ordinary monitoring reports.
            </p>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>
