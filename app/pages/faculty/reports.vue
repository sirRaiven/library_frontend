<script setup lang="ts">
import AppFilterBar from "~/components/shared/AppFilterBar.vue";
definePageMeta({
  layout: "faculty",
  middleware: ["faculty"],
  title: "Book Status Reports",
});

const route = useRoute();
const router = useRouter();
const portal = useFacultyPortal();
const toast = useToast();

type ReportSort = "newest" | "oldest";

const allowedStatuses = [
  "All",
  "open",
  "closed",
  "Submitted",
  "Acknowledged",
  "Replacement Verified",
  "Resolved",
  "Cancelled",
] as const;
const allowedUsage = [
  "All",
  "In Use - Good",
  "In Use - Needs Attention",
  "Lost - Will Replace",
  "Replacement Submitted",
  "Ready for Library Return",
] as const;

function queryChoice<T extends string>(name: string, allowed: readonly T[], fallback: T): T {
  const value = route.query[name];
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function queryText(name: string, maxLength = 120): string {
  const value = route.query[name];
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

const status = ref(queryChoice("status", allowedStatuses, "All"));
const usageStatus = ref(queryChoice("usage", allowedUsage, "All"));
const search = ref(queryText("search"));
const sort = ref<ReportSort>(queryChoice("sort", ["newest", "oldest"] as const, "newest"));
const page = ref(Math.max(1, Number(route.query.page) || 1));
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const statusItems = [
  { label: "All Reports", value: "All" },
  { label: "Open Review", value: "open" },
  { label: "Closed Reports", value: "closed" },
  { label: "Submitted", value: "Submitted" },
  { label: "Acknowledged", value: "Acknowledged" },
  { label: "Replacement Verified", value: "Replacement Verified" },
  { label: "Resolved", value: "Resolved" },
  { label: "Cancelled", value: "Cancelled" },
];
const usageItems = allowedUsage.map(value => ({
  label: value === "All" ? "All Book Updates" : value,
  value,
}));
const sortItems = [
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function statusColor(value: string) {
  if (value === "Resolved" || value === "Replacement Verified") return "success" as const;
  if (value === "Cancelled") return "neutral" as const;
  if (value === "Submitted") return "warning" as const;
  return "primary" as const;
}

function usageColor(value: string) {
  if (value === "Lost - Will Replace") return "error" as const;
  if (value === "Replacement Submitted" || value === "In Use - Needs Attention") return "warning" as const;
  if (value === "In Use - Good") return "success" as const;
  return "primary" as const;
}

function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (status.value !== "All") query.status = status.value;
  if (usageStatus.value !== "All") query.usage = usageStatus.value;
  if (search.value.trim()) query.search = search.value.trim();
  if (sort.value !== "newest") query.sort = sort.value;
  if (page.value > 1) query.page = String(page.value);
  void router.replace({ query });
}

const resultsAnnouncement = computed(() => {
  const total = portal.pagination.value.total;
  return `${total} Faculty book status report${total === 1 ? "" : "s"} shown.`;
});

async function load() {
  try {
    await portal.loadReports({
      status: status.value,
      usageStatus: usageStatus.value,
      search: search.value,
      sort: sort.value,
      page: page.value,
    });
  } catch (error) {
    toast.add({
      title: "Book reports unavailable",
      description: portal.error.value || "Please refresh the page.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

watch([status, usageStatus, sort], () => {
  page.value = 1;
  syncRouteQuery();
  void load();
});
watch(page, () => {
  syncRouteQuery();
  void load();
});
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    syncRouteQuery();
    void load();
  }, 350);
});

onMounted(load);
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="sncbt-page-shell sncbt-member-page space-y-6">
    <FacultyPageHeader
      eyebrow="Library Services"
      title="Book Status Reports"
      description="Review the condition updates you submitted and the Library's current review status."
      icon="i-lucide-clipboard-check"
    >
      <template #actions>
        <UButton label="Update Borrowed Book" icon="i-lucide-clipboard-pen" to="/faculty/borrowings" color="neutral" variant="outline" class="hidden lg:inline-flex" />
      </template>
    </FacultyPageHeader>

    <AppFilterBar
      title="Filter reports"
      :active-count="(search.trim() ? 1 : 0) + (status !== 'All' ? 1 : 0) + (usageStatus !== 'All' ? 1 : 0) + (sort !== 'newest' ? 1 : 0)"
    >
      <template #search>
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search report, book, author, or copy number"
          class="w-full"
          aria-label="Search Faculty book status reports"
        />
      </template>
      <template #filters>
        <USelect v-model="status" :items="statusItems" value-key="value" label-key="label" class="w-full md:w-56" aria-label="Report status" />
        <USelect v-model="usageStatus" :items="usageItems" value-key="value" label-key="label" class="w-full md:w-64" aria-label="Book usage status" />
        <USelect v-model="sort" :items="sortItems" value-key="value" label-key="label" class="w-full md:w-44" aria-label="Sort Faculty reports" />
      </template>
      <template #actions>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          aria-label="Refresh book status reports"
          :loading="portal.loading.value"
          @click="load"
        />
      </template>
    </AppFilterBar>

    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ resultsAnnouncement }}</p>

    <div v-if="portal.loading.value && !portal.reports.value.length" class="space-y-4">
      <USkeleton v-for="item in 3" :key="item" class="h-48 rounded-2xl" />
    </div>

    <section v-else-if="portal.reports.value.length" class="space-y-4">
      <UCard
        v-for="report in portal.reports.value"
        :key="report.documentId"
        :ui="{ root: 'ring-1 ring-default', body: 'p-5 sm:p-6' }"
      >
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :label="report.usageStatus" :color="usageColor(report.usageStatus)" variant="soft" />
              <UBadge :label="report.reportStatus" :color="statusColor(report.reportStatus)" variant="outline" />
              <span class="text-xs font-mono text-muted">{{ report.reportNo }}</span>
            </div>
            <NuxtLink
              v-if="report.book?.documentId"
              :to="`/faculty/books/${report.book.documentId}`"
              class="mt-3 block text-lg font-semibold text-highlighted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              :aria-label="`View book details for ${report.book?.title || 'borrowed book'}`"
            >{{ report.book?.title || 'Borrowed book' }}</NuxtLink>
            <h2 v-else class="mt-3 text-lg font-semibold text-highlighted">{{ report.book?.title || 'Borrowed book' }}</h2>
            <p class="mt-1 text-sm text-muted">{{ report.book?.author || 'Author unavailable' }}</p>

            <dl class="mt-4 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
              <div><dt class="text-muted">Borrow record</dt><dd class="mt-1 font-medium text-highlighted">{{ report.borrowing?.borrowNo || 'Not available' }}</dd></div>
              <div><dt class="text-muted">Physical copy</dt><dd class="mt-1 font-medium text-highlighted">{{ report.copy?.controlNumber || report.copy?.accessionNumber || 'Not available' }}</dd></div>
              <div><dt class="text-muted">Submitted</dt><dd class="mt-1 font-medium text-highlighted">{{ formatDate(report.reportedAt) }}</dd></div>
              <div><dt class="text-muted">Processed by</dt><dd class="mt-1 font-medium text-highlighted">{{ report.processedBy || 'Awaiting Library review' }}</dd></div>
            </dl>
          </div>

          <div class="w-full rounded-2xl border border-default bg-elevated/40 p-4 lg:max-w-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Your note</p>
            <p class="mt-2 text-sm leading-6 text-highlighted">{{ report.facultyNotes || 'No additional note was provided.' }}</p>
            <template v-if="report.librarianNotes">
              <div class="my-4 border-t border-default" />
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">Librarian response</p>
              <p class="mt-2 text-sm leading-6 text-highlighted">{{ report.librarianNotes }}</p>
            </template>
          </div>
        </div>
      </UCard>
    </section>

    <UCard v-else :ui="{ root: 'ring-1 ring-default', body: 'p-12 text-center' }">
      <UIcon name="i-lucide-clipboard" class="mx-auto size-12 text-dimmed" />
      <h2 class="mt-4 text-lg font-semibold text-highlighted">No book status reports found</h2>
      <p class="mt-2 text-sm text-muted">Reports appear after you update the condition or replacement status of a borrowed book.</p>
      <UButton label="Review Borrowed Books" to="/faculty/borrowings" class="mt-5" />
    </UCard>

    <div v-if="portal.pagination.value.pageCount > 1" class="flex justify-center">
      <UPagination v-model:page="page" :total="portal.pagination.value.total" :items-per-page="portal.pagination.value.pageSize" aria-label="Faculty report pages" />
    </div>
  </div>
</template>
