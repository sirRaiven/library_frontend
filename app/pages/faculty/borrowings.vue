<script setup lang="ts">
import type { FacultyBorrowing, FacultyUsageStatus } from "~/composables/useFacultyPortal";

definePageMeta({
  layout: "faculty",
  middleware: ["faculty"],
  title: "Borrowed Books",
});

const route = useRoute();
const router = useRouter();
const portal = useFacultyPortal();
const toast = useToast();

const view = ref<"current" | "history" | "all">("current");
const search = ref("");
const sort = ref("newest");
const page = ref(1);
const reportOpen = ref(false);
const selected = ref<FacultyBorrowing | null>(null);
const submitting = ref(false);
const reportForm = reactive<{ usageStatus: FacultyUsageStatus; notes: string }>({
  usageStatus: "In Use - Good",
  notes: "",
});
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const viewItems = [
  { label: "Current Department Books", value: "current" },
  { label: "Return History", value: "history" },
  { label: "All Borrowing Records", value: "all" },
];
const sortItems = [
  { label: "Newest Borrowed", value: "newest" },
  { label: "Oldest Borrowed", value: "oldest" },
  { label: "Review Date Soonest", value: "due-soon" },
];
const usageItems: Array<{
  label: string;
  value: FacultyUsageStatus;
  description: string;
}> = [
  {
    label: "In Use - Good",
    value: "In Use - Good",
    description: "The book is present in the department and remains usable.",
  },
  {
    label: "In Use - Needs Attention",
    value: "In Use - Needs Attention",
    description: "The book is present but worn, damaged, or needs Library review.",
  },
  {
    label: "Lost - Will Replace",
    value: "Lost - Will Replace",
    description: "The book cannot be located and a new replacement copy will be provided.",
  },
  {
    label: "Replacement Submitted",
    value: "Replacement Submitted",
    description: "A new replacement copy has been delivered or is ready for Library verification.",
  },
  {
    label: "Ready for Library Return",
    value: "Ready for Library Return",
    description: "The book is ready to be brought to the Library counter for formal return processing.",
  },
];

const availableUsageItems = computed(() => {
  if (selected.value?.status === "Lost") {
    return usageItems.filter(item => item.value === "Replacement Submitted");
  }
  return usageItems.filter(item => item.value !== "Replacement Submitted");
});

const selectedUsageItem = computed(() =>
  availableUsageItems.value.find(item => item.value === reportForm.usageStatus),
);

const requiresNotes = computed(() =>
  [
    "In Use - Needs Attention",
    "Lost - Will Replace",
    "Replacement Submitted",
  ].includes(reportForm.usageStatus),
);

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeZone: "Asia/Manila",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00+08:00`));
}

function loanStatusColor(status: string) {
  if (status === "Lost") return "error" as const;
  if (status === "Overdue") return "warning" as const;
  if (status === "Returned" || status === "Replaced") return "success" as const;
  return "primary" as const;
}

function reportStatusColor(status: string) {
  if (status === "Resolved" || status === "Replacement Verified") return "success" as const;
  if (status === "Cancelled") return "neutral" as const;
  if (status === "Submitted") return "warning" as const;
  return "primary" as const;
}

function dueText(record: FacultyBorrowing) {
  if (record.status === "Lost") return "Replacement required";
  if (record.status === "Replaced") return "Replacement completed";
  if (record.status === "Returned") return "Returned to the Library";
  if (record.daysRemaining === null) return "Review date unavailable";
  if (record.daysRemaining < 0) {
    const days = Math.abs(record.daysRemaining);
    return `${days} day${days === 1 ? "" : "s"} past review date`;
  }
  if (record.daysRemaining === 0) return "Review date is today";
  return `${record.daysRemaining} day${record.daysRemaining === 1 ? "" : "s"} remaining`;
}

function beginReport(record: FacultyBorrowing) {
  selected.value = record;
  reportForm.usageStatus =
    record.status === "Lost" ? "Replacement Submitted" : "In Use - Good";
  reportForm.notes = "";
  reportOpen.value = true;
}

async function load() {
  try {
    await portal.loadBorrowings({
      view: view.value,
      search: search.value,
      sort: sort.value,
      page: page.value,
    });

    const requested = String(route.query.report ?? "");
    if (requested && !reportOpen.value) {
      const record = portal.borrowings.value.find(item => item.documentId === requested);
      if (record) beginReport(record);
    }
  } catch (error) {
    toast.add({
      title: "Borrowed books unavailable",
      description: portal.error.value || "Please refresh the page.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function submitReport() {
  if (!selected.value || submitting.value) return;
  if (requiresNotes.value && reportForm.notes.trim().length < 5) {
    toast.add({
      title: "Add a short explanation",
      description: "Describe the concern, loss, or replacement details before submitting.",
      color: "warning",
      icon: "i-lucide-message-square-warning",
    });
    return;
  }

  submitting.value = true;
  try {
    await portal.submitBookStatus(selected.value.documentId, {
      usageStatus: reportForm.usageStatus,
      notes: reportForm.notes.trim() || undefined,
    });
    toast.add({
      title: "Book status sent to the Library",
      description:
        reportForm.usageStatus === "Lost - Will Replace"
          ? "The book is now recorded as lost and awaiting a replacement copy. No monetary fine was created."
          : "The Librarian can now review your update.",
      color: "success",
      icon: "i-lucide-circle-check",
    });
    reportOpen.value = false;
    selected.value = null;
    await router.replace({ query: { ...route.query, report: undefined } });
    await load();
  } catch (error) {
    toast.add({
      title: "Status update not submitted",
      description: portal.error.value || useAuth().getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    submitting.value = false;
  }
}

watch([view, sort], () => {
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
watch(reportOpen, (open) => {
  if (!open && route.query.report) {
    void router.replace({ query: { ...route.query, report: undefined } });
  }
});

onMounted(load);
onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<template>
  <div class="sncbt-page-shell space-y-6">
    <FacultyPageHeader
      eyebrow="Library Services"
      title="Borrowed Books"
      description="Review books assigned to you, update their condition, and report lost or replacement items to the Library."
      icon="i-lucide-library-big"
    >
      <template #actions>
        <UButton label="Book Status Reports" icon="i-lucide-clipboard-check" to="/faculty/reports" color="neutral" variant="outline" />
      </template>
    </FacultyPageHeader>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5' }">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Current Books</p>
        <p class="mt-2 text-3xl font-bold text-highlighted">{{ portal.summary.value.currentCount }}</p>
        <p class="mt-2 text-xs text-muted">Issued to your Faculty account</p>
      </UCard>
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5' }">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Review Due Soon</p>
        <p class="mt-2 text-3xl font-bold text-highlighted">{{ portal.summary.value.reviewDueSoon }}</p>
        <p class="mt-2 text-xs text-muted">Within the next 30 days</p>
      </UCard>
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5' }">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">For Replacement</p>
        <p class="mt-2 text-3xl font-bold text-highlighted">{{ portal.summary.value.lostCount }}</p>
        <p class="mt-2 text-xs text-muted">Lost books requiring a new copy</p>
      </UCard>
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-5' }">
        <p class="text-xs font-semibold uppercase tracking-wide text-muted">Completed</p>
        <p class="mt-2 text-3xl font-bold text-highlighted">{{ portal.summary.value.completedCount }}</p>
        <p class="mt-2 text-xs text-muted">Returned or replacement-completed records</p>
      </UCard>
    </section>

    <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-4 sm:p-5' }">
      <div class="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search title, author, borrow number, or copy number" class="w-full" />
        <USelect v-model="view" :items="viewItems" value-key="value" label-key="label" class="w-full" />
        <USelect v-model="sort" :items="sortItems" value-key="value" label-key="label" class="w-full" />
        <UButton icon="i-lucide-refresh-cw" label="Refresh" color="neutral" variant="outline" :loading="portal.loading.value" @click="load" />
      </div>
    </UCard>

    <div v-if="portal.loading.value && !portal.borrowings.value.length" class="space-y-4">
      <USkeleton v-for="item in 3" :key="item" class="h-44 rounded-2xl" />
    </div>

    <section v-else-if="portal.borrowings.value.length" class="space-y-4">
      <UCard
        v-for="record in portal.borrowings.value"
        :key="record.documentId"
        :ui="{ root: 'overflow-hidden ring-1 ring-default', body: 'p-0' }"
      >
        <div class="grid md:grid-cols-[8rem_1fr_auto]">
          <div class="flex min-h-36 items-center justify-center border-b border-default bg-elevated/50 p-4 md:border-b-0 md:border-e">
            <div class="flex h-32 w-24 items-center justify-center overflow-hidden rounded-xl border border-default bg-default">
              <img v-if="record.book.cover?.url" :src="record.book.cover.url" :alt="record.book.cover.alternativeText || record.book.title" class="size-full object-cover" loading="lazy">
              <UIcon v-else name="i-lucide-book-open" class="size-8 text-dimmed" />
            </div>
          </div>

          <div class="min-w-0 p-5">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :label="record.status" :color="loanStatusColor(record.status)" variant="soft" />
              <UBadge v-if="record.latestReport" :label="record.latestReport.reportStatus" :color="reportStatusColor(record.latestReport.reportStatus)" variant="outline" />
            </div>
            <h2 class="mt-3 text-lg font-semibold text-highlighted">{{ record.book.title }}</h2>
            <p class="mt-1 text-sm text-muted">{{ record.book.author }}</p>

            <dl class="mt-4 grid gap-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
              <div><dt class="text-muted">Borrow record</dt><dd class="mt-1 font-medium text-highlighted">{{ record.borrowNo || 'Not available' }}</dd></div>
              <div><dt class="text-muted">Physical copy</dt><dd class="mt-1 font-medium text-highlighted">{{ record.copy.controlNumber || record.copy.accessionNumber || 'Not available' }}</dd></div>
              <div><dt class="text-muted">Borrowed</dt><dd class="mt-1 font-medium text-highlighted">{{ formatDate(record.borrowDate) }}</dd></div>
              <div><dt class="text-muted">Review / return date</dt><dd class="mt-1 font-medium text-highlighted">{{ formatDate(record.dueDate) }}</dd></div>
            </dl>

            <div class="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded-full border border-default bg-elevated px-3 py-1.5 text-muted">{{ dueText(record) }}</span>
              <span v-if="record.latestReport" class="rounded-full border border-default bg-elevated px-3 py-1.5 text-muted">Latest: {{ record.latestReport.usageStatus }}</span>
            </div>
          </div>

          <div class="flex items-center border-t border-default p-5 md:border-s md:border-t-0">
            <UButton
              v-if="['Borrowed', 'Overdue', 'Lost'].includes(record.status)"
              label="Update Book Status"
              icon="i-lucide-clipboard-pen"
              class="w-full md:w-auto"
              @click="beginReport(record)"
            />
            <UBadge v-else label="Completed" color="success" variant="soft" />
          </div>
        </div>
      </UCard>
    </section>

    <UCard v-else :ui="{ root: 'ring-1 ring-default', body: 'p-12 text-center' }">
      <UIcon name="i-lucide-library" class="mx-auto size-12 text-dimmed" />
      <h2 class="mt-4 text-lg font-semibold text-highlighted">No borrowing records found</h2>
      <p class="mt-2 text-sm text-muted">Borrowed Faculty books will appear after checkout at the Library counter.</p>
    </UCard>

    <div v-if="portal.pagination.value.pageCount > 1" class="flex justify-center">
      <UPagination v-model:page="page" :total="portal.pagination.value.total" :items-per-page="portal.pagination.value.pageSize" />
    </div>

    <UAlert
      title="No monetary fines for Faculty loans"
      description="Books that are late, lost, or damaged do not generate a Faculty fine. Lost books remain the responsibility of the department and must be replaced with a new acceptable copy."
      icon="i-lucide-shield-check"
      color="success"
      variant="soft"
    />

    <UModal v-model:open="reportOpen" :dismissible="!submitting" :ui="{ content: 'sm:max-w-2xl' }">
      <template #content>
        <div class="bg-default">
          <div class="border-b border-default p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <UBadge label="Faculty book update" icon="i-lucide-clipboard-pen" color="primary" variant="soft" />
                <h2 class="mt-3 text-xl font-bold text-highlighted">Update Book Status</h2>
                <p v-if="selected" class="mt-1 text-sm text-muted">{{ selected.book.title }} · {{ selected.copy.controlNumber || selected.copy.accessionNumber }}</p>
              </div>
              <UButton icon="i-lucide-x" color="neutral" variant="ghost" square :disabled="submitting" @click="reportOpen = false" />
            </div>
          </div>

          <div class="space-y-5 p-6">
            <UFormField label="Current book status" required>
              <USelectMenu v-model="reportForm.usageStatus" :items="availableUsageItems" value-key="value" label-key="label" class="w-full">
                <template #item="{ item }">
                  <div class="min-w-0 py-1">
                    <p class="font-medium text-highlighted">{{ item.label }}</p>
                    <p class="mt-0.5 text-xs text-muted">{{ item.description }}</p>
                  </div>
                </template>
              </USelectMenu>
            </UFormField>

            <div class="rounded-2xl border border-default bg-elevated/40 p-4">
              <p class="text-sm font-medium text-highlighted">{{ selectedUsageItem?.label }}</p>
              <p class="mt-1 text-xs leading-5 text-muted">{{ selectedUsageItem?.description }}</p>
            </div>

            <UFormField :label="requiresNotes ? 'Explanation / replacement details' : 'Optional note'" :required="requiresNotes" :hint="requiresNotes ? 'At least 5 characters' : 'You may add a short condition note'">
              <UTextarea v-model="reportForm.notes" :rows="4" class="w-full" placeholder="Example: The book was lost during department transfer. A new copy has been ordered and will be submitted next week." />
            </UFormField>

            <UAlert
              v-if="reportForm.usageStatus === 'Lost - Will Replace'"
              title="This will mark the physical copy as Lost"
              description="The borrowing record stays open for replacement tracking. No Faculty fine will be created."
              icon="i-lucide-triangle-alert"
              color="warning"
              variant="soft"
            />
            <UAlert
              v-else-if="reportForm.usageStatus === 'Ready for Library Return'"
              title="Counter confirmation is still required"
              description="This status informs the Librarian that the book is ready. The formal return is completed only after the physical barcode is scanned at the Library counter."
              icon="i-lucide-info"
              color="primary"
              variant="soft"
            />
          </div>

          <div class="flex flex-col-reverse gap-2 border-t border-default p-6 sm:flex-row sm:justify-end">
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="submitting" @click="reportOpen = false" />
            <UButton label="Send Status to Library" icon="i-lucide-send" :loading="submitting" @click="submitReport" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
