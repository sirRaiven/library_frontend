<script setup lang="ts">
import AppFilterBar from "~/components/shared/AppFilterBar.vue";
definePageMeta({
  layout: "faculty",
  middleware: ["faculty"],
  title: "Book Status Reports",
});

const portal = useFacultyPortal();
const toast = useToast();

const status = ref("All");
const usageStatus = ref("All");
const page = ref(1);

const statusItems = ["All", "Submitted", "Acknowledged", "Replacement Verified", "Resolved", "Cancelled"];
const usageItems = ["All", "In Use - Good", "In Use - Needs Attention", "Lost - Will Replace", "Replacement Submitted", "Ready for Library Return"];

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

async function load() {
  try {
    await portal.loadReports({
      status: status.value,
      usageStatus: usageStatus.value,
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

watch([status, usageStatus], () => {
  page.value = 1;
  void load();
});
watch(page, load);
onMounted(load);
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
      :active-count="(status !== 'All' ? 1 : 0) + (usageStatus !== 'All' ? 1 : 0)"
    >
      <template #filters>
        <USelect v-model="status" :items="statusItems" class="w-full md:w-56" aria-label="Report status" />
        <USelect v-model="usageStatus" :items="usageItems" class="w-full md:w-64" aria-label="Book usage status" />
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
            <h2 class="mt-3 text-lg font-semibold text-highlighted">{{ report.book?.title || 'Borrowed book' }}</h2>
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
      <UPagination v-model:page="page" :total="portal.pagination.value.total" :items-per-page="portal.pagination.value.pageSize" />
    </div>
  </div>
</template>
