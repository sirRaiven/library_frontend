<script setup lang="ts">
import type { FacultyBookReport, FacultyReportStatus } from "~/composables/useFacultyPortal";

definePageMeta({
  layout: "librarian",
  title: "Faculty Book Reports",
});

const auth = useAuth();
const config = useRuntimeConfig();
const toast = useToast();

const records = ref<FacultyBookReport[]>([]);
const loading = ref(false);
const reviewing = ref(false);
const search = ref("");
const status = ref("All");
const usageStatus = ref("All");
const page = ref(1);
const pagination = reactive({ page: 1, pageSize: 20, pageCount: 1, total: 0 });
const summary = reactive({ total: 0, submitted: 0, lost: 0, replacementSubmitted: 0, resolved: 0 });
const selected = ref<FacultyBookReport | null>(null);
const reviewOpen = ref(false);
const reviewForm = reactive<{ reportStatus: FacultyReportStatus; notes: string }>({
  reportStatus: "Acknowledged",
  notes: "",
});
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const statusItems = ["All", "Submitted", "Acknowledged", "Replacement Verified", "Resolved", "Cancelled"];
const usageItems = ["All", "In Use - Good", "In Use - Needs Attention", "Lost - Will Replace", "Replacement Submitted", "Ready for Library Return"];
const reviewItems = [
  { label: "Acknowledged", value: "Acknowledged" as FacultyReportStatus },
  { label: "Replacement Verified", value: "Replacement Verified" as FacultyReportStatus },
  { label: "Resolved", value: "Resolved" as FacultyReportStatus },
  { label: "Cancelled", value: "Cancelled" as FacultyReportStatus },
];

const availableReviewItems = computed(() => {
  if (!selected.value) return reviewItems;
  if (selected.value.usageStatus === "Replacement Submitted") return reviewItems;
  if (selected.value.usageStatus === "Lost - Will Replace") {
    return reviewItems.filter(item => ["Acknowledged", "Cancelled"].includes(item.value));
  }
  return reviewItems.filter(item => item.value !== "Replacement Verified");
});

function absoluteUrl(value?: string | null) {
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const base = String(config.public.strapiUrl).replace(/\/$/, "");
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

function normalize(record: FacultyBookReport): FacultyBookReport {
  return {
    ...record,
    book: record.book
      ? {
          ...record.book,
          cover: record.book.cover
            ? {
                ...record.book.cover,
                url: absoluteUrl(record.book.cover.url) ?? record.book.cover.url,
              }
            : null,
        }
      : null,
  };
}

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
  if (loading.value) return;
  loading.value = true;
  try {
    const response = await auth.authFetch<{
      data: FacultyBookReport[];
      meta: {
        pagination: typeof pagination;
        summary: typeof summary;
      };
    }>("/api/faculty-book-reports/managed", {
      query: {
        search: search.value.trim() || undefined,
        status: status.value !== "All" ? status.value : undefined,
        usageStatus: usageStatus.value !== "All" ? usageStatus.value : undefined,
        page: page.value,
        pageSize: pagination.pageSize,
      },
    });
    records.value = response.data.map(normalize);
    Object.assign(pagination, response.meta.pagination);
    Object.assign(summary, response.meta.summary);
  } catch (error) {
    toast.add({
      title: "Faculty book reports unavailable",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

function beginReview(record: FacultyBookReport) {
  selected.value = record;
  reviewForm.reportStatus =
    record.usageStatus === "Replacement Submitted"
      ? record.reportStatus === "Replacement Verified"
        ? "Resolved"
        : "Replacement Verified"
      : record.usageStatus === "Lost - Will Replace"
        ? record.reportStatus === "Submitted"
          ? "Acknowledged"
          : "Cancelled"
        : record.reportStatus === "Submitted"
          ? "Acknowledged"
          : "Resolved";
  reviewForm.notes = record.librarianNotes ?? "";
  reviewOpen.value = true;
}

async function saveReview() {
  if (!selected.value || reviewing.value) return;
  if (
    ["Resolved", "Cancelled"].includes(reviewForm.reportStatus) &&
    reviewForm.notes.trim().length < 5
  ) {
    toast.add({
      title: "Add a closing note",
      description: "Explain how the report was completed or why it was cancelled.",
      color: "warning",
      icon: "i-lucide-message-square-warning",
    });
    return;
  }

  reviewing.value = true;
  try {
    await auth.authFetch(
      `/api/faculty-book-reports/${encodeURIComponent(selected.value.documentId)}/review`,
      {
        method: "PATCH",
        body: {
          reportStatus: reviewForm.reportStatus,
          notes: reviewForm.notes.trim() || undefined,
        },
      },
    );
    toast.add({
      title: "Faculty report updated",
      description: `The report was marked ${reviewForm.reportStatus}.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
    reviewOpen.value = false;
    selected.value = null;
    await load();
  } catch (error) {
    toast.add({
      title: "Report not updated",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    reviewing.value = false;
  }
}

watch([status, usageStatus], () => {
  page.value = 1;
  void load();
});
watch(page, load);
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    void load();
  }, 350);
});

onMounted(load);
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
    <LibrarianPageHeader
      eyebrow="Faculty Accountability"
      title="Faculty Book Reports"
      description="Review Faculty book condition updates, lost-book reports, and replacement submissions."
      icon="i-lucide-clipboard-check"
    >
      <template #actions>
        <UButton label="Faculty Directory" icon="i-lucide-briefcase-business" to="/librarian/faculty" color="neutral" variant="outline" />
      </template>
    </LibrarianPageHeader>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5' }"><p class="text-xs font-semibold uppercase tracking-wide text-muted">All Reports</p><p class="mt-2 text-3xl font-bold text-highlighted">{{ summary.total }}</p></UCard>
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5' }"><p class="text-xs font-semibold uppercase tracking-wide text-muted">Awaiting Review</p><p class="mt-2 text-3xl font-bold text-highlighted">{{ summary.submitted }}</p></UCard>
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5' }"><p class="text-xs font-semibold uppercase tracking-wide text-muted">Lost Books</p><p class="mt-2 text-3xl font-bold text-highlighted">{{ summary.lost }}</p></UCard>
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5' }"><p class="text-xs font-semibold uppercase tracking-wide text-muted">Replacement Submitted</p><p class="mt-2 text-3xl font-bold text-highlighted">{{ summary.replacementSubmitted }}</p></UCard>
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5' }"><p class="text-xs font-semibold uppercase tracking-wide text-muted">Resolved</p><p class="mt-2 text-3xl font-bold text-highlighted">{{ summary.resolved }}</p></UCard>
    </section>

    <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-4 sm:p-5' }">
      <div class="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search report, Faculty, book, or copy number" class="w-full" />
        <USelect v-model="status" :items="statusItems" class="w-full" />
        <USelect v-model="usageStatus" :items="usageItems" class="w-full" />
        <UButton label="Refresh" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" @click="load" />
      </div>
    </UCard>

    <div v-if="loading && !records.length" class="space-y-4">
      <USkeleton v-for="item in 3" :key="item" class="h-48 rounded-2xl" />
    </div>

    <section v-else-if="records.length" class="space-y-4">
      <UCard v-for="record in records" :key="record.documentId" :ui="{ root: 'ring-1 ring-default', body: 'p-5 sm:p-6' }">
        <div class="grid gap-5 xl:grid-cols-[1fr_18rem_auto] xl:items-start">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :label="record.usageStatus" :color="usageColor(record.usageStatus)" variant="soft" />
              <UBadge :label="record.reportStatus" :color="statusColor(record.reportStatus)" variant="outline" />
              <span class="font-mono text-xs text-muted">{{ record.reportNo }}</span>
            </div>
            <h2 class="mt-3 text-lg font-semibold text-highlighted">{{ record.book?.title || 'Borrowed book' }}</h2>
            <p class="mt-1 text-sm text-muted">{{ record.book?.author || 'Author unavailable' }}</p>
            <dl class="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
              <div><dt class="text-muted">Faculty</dt><dd class="mt-1 font-medium text-highlighted">{{ record.faculty?.fullName || 'Unknown' }}</dd></div>
              <div><dt class="text-muted">Department</dt><dd class="mt-1 font-medium text-highlighted">{{ record.faculty?.department || 'Not recorded' }}</dd></div>
              <div><dt class="text-muted">Physical copy</dt><dd class="mt-1 font-medium text-highlighted">{{ record.copy?.controlNumber || record.copy?.accessionNumber || 'Not available' }}</dd></div>
              <div><dt class="text-muted">Submitted</dt><dd class="mt-1 font-medium text-highlighted">{{ formatDate(record.reportedAt) }}</dd></div>
            </dl>
          </div>

          <div class="rounded-2xl border border-default bg-elevated/40 p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Faculty note</p>
            <p class="mt-2 text-sm leading-6 text-highlighted">{{ record.facultyNotes || 'No additional note.' }}</p>
            <template v-if="record.librarianNotes">
              <div class="my-3 border-t border-default" />
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">Librarian note</p>
              <p class="mt-2 text-sm leading-6 text-highlighted">{{ record.librarianNotes }}</p>
            </template>
          </div>

          <div class="flex xl:justify-end">
            <UButton label="Review Report" icon="i-lucide-clipboard-pen" class="w-full xl:w-auto" @click="beginReview(record)" />
          </div>
        </div>
      </UCard>
    </section>

    <UCard v-else :ui="{ root: 'ring-1 ring-default', body: 'p-12 text-center' }">
      <UIcon name="i-lucide-clipboard-check" class="mx-auto size-12 text-dimmed" />
      <h2 class="mt-4 text-lg font-semibold text-highlighted">No matching Faculty reports</h2>
      <p class="mt-2 text-sm text-muted">Reports will appear when a Faculty member updates the condition or replacement status of a borrowed book.</p>
    </UCard>

    <div v-if="pagination.pageCount > 1" class="flex justify-center">
      <UPagination v-model:page="page" :total="pagination.total" :items-per-page="pagination.pageSize" />
    </div>

    <UModal v-model:open="reviewOpen" :dismissible="!reviewing" :ui="{ content: 'sm:max-w-2xl' }">
      <template #content>
        <div v-if="selected" class="bg-default">
          <div class="border-b border-default p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <UBadge :label="selected.usageStatus" :color="usageColor(selected.usageStatus)" variant="soft" />
                <h2 class="mt-3 text-xl font-bold text-highlighted">Review {{ selected.reportNo }}</h2>
                <p class="mt-1 text-sm text-muted">{{ selected.faculty?.fullName }} · {{ selected.book?.title }}</p>
              </div>
              <UButton icon="i-lucide-x" color="neutral" variant="ghost" square :disabled="reviewing" @click="reviewOpen = false" />
            </div>
          </div>

          <div class="space-y-5 p-6">
            <div class="rounded-2xl border border-default bg-elevated/40 p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-muted">Faculty explanation</p>
              <p class="mt-2 text-sm leading-6 text-highlighted">{{ selected.facultyNotes || 'No explanation was provided.' }}</p>
            </div>

            <UFormField label="Review status" required>
              <USelect v-model="reviewForm.reportStatus" :items="availableReviewItems" value-key="value" label-key="label" class="w-full" />
            </UFormField>
            <UFormField label="Librarian note" :required="['Resolved', 'Cancelled'].includes(reviewForm.reportStatus)" hint="Explain the verification, replacement, or next action">
              <UTextarea v-model="reviewForm.notes" :rows="4" class="w-full" placeholder="Example: Replacement copy received, inspected, and registered as a new physical copy." />
            </UFormField>

            <UAlert
              v-if="reviewForm.reportStatus === 'Replacement Verified'"
              title="Replacement inspected and accepted"
              description="After saving this verification, register the accepted replacement through Book Copies. Keep the old physical copy marked Lost for historical accuracy."
              icon="i-lucide-package-check"
              color="success"
              variant="soft"
              :actions="[{ label: 'Open Book Copies', to: '/librarian/books/copies', color: 'neutral', variant: 'outline' }]"
            />
            <UAlert
              v-else-if="reviewForm.reportStatus === 'Resolved' && selected.usageStatus === 'Replacement Submitted'"
              title="This closes the Faculty replacement responsibility"
              description="Use Resolved only after the new physical copy has been accepted and registered. The borrowing record will become Replaced, while the original copy remains Lost."
              icon="i-lucide-circle-check-big"
              color="primary"
              variant="soft"
            />
          </div>

          <div class="flex flex-col-reverse gap-2 border-t border-default p-6 sm:flex-row sm:justify-end">
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="reviewing" @click="reviewOpen = false" />
            <UButton label="Save Review" icon="i-lucide-save" :loading="reviewing" @click="saveReview" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
