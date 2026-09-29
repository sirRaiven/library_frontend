<script setup lang="ts">
import LibrarianPageHeader from "~/components/librarian/LibrarianPageHeader.vue";
import AppStatusBadge from "~/components/shared/AppStatusBadge.vue";
import { yearGradeLabel } from "~/constants/studentPrograms";
import type {
  LibrarianStudentRecordActivity,
  LibrarianStudentRecordProfile,
  LibrarianStudentRecordSummary,
  StudentRecordCategory,
} from "~/composables/useLibrarianStudentRecord";
import { appLogger } from "~/utils/app-logger";

definePageMeta({ layout: "librarian", title: "Student Record" });

const route = useRoute();
const recordApi = useLibrarianStudentRecord();
const toast = useToast();

const identifier = computed(() => String(route.params.identifier ?? "").trim());
const loading = ref(false);
const errorMessage = ref("");
const student = ref<LibrarianStudentRecordProfile | null>(null);
const summary = ref<LibrarianStudentRecordSummary | null>(null);
const activities = ref<LibrarianStudentRecordActivity[]>([]);
const page = ref(1);
const pageSize = 12;
const pagination = reactive({ page: 1, pageSize, pageCount: 1, total: 0 });
const historySummary = reactive({
  total: 0,
  borrowing: 0,
  return: 0,
  reservation: 0,
  fine: 0,
  visit: 0,
});

const filters = reactive({
  search: "",
  category: "all" as StudentRecordCategory,
  dateFrom: "",
  dateTo: "",
  sort: "newest" as "newest" | "oldest",
});

const categoryItems = [
  { label: "All activity", value: "all" },
  { label: "Borrowings", value: "borrowing" },
  { label: "Returns", value: "return" },
  { label: "Reservations", value: "reservation" },
  { label: "Fines", value: "fine" },
  { label: "Library time-ins", value: "visit" },
];

const sortItems = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
];

const activityAnnouncement = computed(() => {
  if (loading.value) return "Loading Student Record.";
  if (errorMessage.value) return errorMessage.value;
  if (!student.value) return "";

  const total = pagination.total;
  return `${total} ${total === 1 ? "activity record" : "activity records"} shown for ${student.value.fullName}.`;
});

const activityMeta = computed(() => [
  { label: "Borrowings", value: historySummary.borrowing, icon: "i-lucide-book-up" },
  { label: "Returns", value: historySummary.return, icon: "i-lucide-book-down" },
  { label: "Reservations", value: historySummary.reservation, icon: "i-lucide-calendar-check-2" },
  { label: "Fines", value: historySummary.fine, icon: "i-lucide-receipt-text" },
  { label: "Time-ins", value: historySummary.visit, icon: "i-lucide-log-in" },
]);

function statusTone(status?: string | null) {
  const value = String(status ?? "").toLowerCase();
  if (["active", "borrowed", "returned", "completed", "recorded", "paid", "released"].includes(value)) {
    return "success" as const;
  }
  if (["overdue", "suspended", "ready for pickup", "pending", "approved"].includes(value)) {
    return "warning" as const;
  }
  if (["lost", "cancelled", "expired", "inactive", "dropped"].includes(value)) {
    return "error" as const;
  }
  return "neutral" as const;
}

function categoryIcon(category: StudentRecordCategory) {
  if (category === "borrowing") return "i-lucide-book-up";
  if (category === "return") return "i-lucide-book-down";
  if (category === "reservation") return "i-lucide-calendar-check-2";
  if (category === "fine") return "i-lucide-receipt-text";
  if (category === "visit") return "i-lucide-log-in";
  return "i-lucide-history";
}

function categoryLabel(category: StudentRecordCategory) {
  if (category === "borrowing") return "Borrowing";
  if (category === "return") return "Return";
  if (category === "reservation") return "Reservation";
  if (category === "fine") return "Fine";
  if (category === "visit") return "Library time-in";
  return "Activity";
}

function formatDateTime(value?: string | null) {
  if (!value) return "No record yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

function membershipTermLabel(profile: LibrarianStudentRecordProfile) {
  const membership = profile.membership;
  if (!membership) return "—";

  const termName = membership.academicTerm?.name?.trim();
  if (termName) return termName;

  const semester = membership.semester?.trim();
  const academicYear = membership.academicYear?.trim();
  return [semester, academicYear].filter(Boolean).join(" · ") || "—";
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);
}

async function loadRecord() {
  if (!identifier.value || loading.value) return;
  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await recordApi.load(identifier.value, {
      search: filters.search,
      category: filters.category,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      sort: filters.sort,
      page: page.value,
      pageSize,
    });

    student.value = response.data.student;
    summary.value = response.data.summary;
    activities.value = response.data.activities;
    Object.assign(pagination, response.meta.pagination);
    Object.assign(historySummary, response.meta.summary);
  } catch (error) {
    appLogger.warn("Unable to load Librarian Student Record.", error);
    errorMessage.value = "The Student Record could not be loaded. Check the student profile or try again.";
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    toast.add({
      title: "Check the activity dates",
      description: "The start date must be earlier than or equal to the end date.",
      color: "warning",
      icon: "i-lucide-calendar-alert",
    });
    return;
  }

  page.value = 1;
  void loadRecord();
}

function resetFilters() {
  filters.search = "";
  filters.category = "all";
  filters.dateFrom = "";
  filters.dateTo = "";
  filters.sort = "newest";
  page.value = 1;
  void loadRecord();
}

watch(page, () => {
  void loadRecord();
});

onMounted(() => {
  void loadRecord();
});
</script>

<template>
  <UContainer
    class="sncbt-page-shell sncbt-staff-page sncbt-specialist-page"
    :aria-busy="loading"
  >
    <div class="sncbt-staff-content mx-auto max-w-[1500px] space-y-6">
      <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {{ activityAnnouncement }}
      </p>
      <LibrarianPageHeader
        eyebrow="Library Users"
        title="Student Record"
        description="Review one student's Library activity, borrowing and reservation history, and recorded time-ins in one place."
        icon="i-lucide-notebook-tabs"
      >
        <template #actions>
          <UButton
            to="/librarian/students"
            label="Back to Students"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="outline"
            aria-label="Back to Student Directory"
          />
        </template>
      </LibrarianPageHeader>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Student Record unavailable"
        :description="errorMessage"
      >
        <template #actions>
          <UButton label="Try Again" color="error" variant="soft" @click="loadRecord" />
        </template>
      </UAlert>

      <template v-if="loading && !student">
        <div role="status" aria-live="polite">
          <span class="sr-only">Loading Student Record.</span>
        </div>
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]" aria-hidden="true">
          <USkeleton class="h-48 w-full rounded-2xl" />
          <USkeleton class="h-48 w-full rounded-2xl" />
        </div>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
          <USkeleton v-for="index in 4" :key="index" class="h-28 w-full rounded-2xl" />
        </div>
      </template>

      <template v-else-if="student && summary">
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,.8fr)]">
          <UCard class="sncbt-themed-card" aria-labelledby="student-record-profile-heading">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start">
              <UAvatar
                :src="student.photoUrl ?? undefined"
                :alt="student.fullName"
                size="3xl"
                class="shrink-0"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 id="student-record-profile-heading" class="truncate text-xl font-bold text-highlighted sm:text-2xl">
                    {{ student.fullName }}
                  </h2>
                  <AppStatusBadge :label="student.status" :tone="statusTone(student.status)" />
                </div>
                <p class="mt-1 text-sm font-medium text-muted">
                  {{ student.studentNo }} · {{ student.course }}
                </p>
                <dl class="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-dimmed">Level</dt>
                    <dd class="mt-1 text-highlighted">
                      {{ student.educationalLevel }} · {{ yearGradeLabel(student.educationalLevel, student.yearLevel) }}
                      <span v-if="student.section"> · {{ student.section }}</span>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-dimmed">Library Card</dt>
                    <dd class="mt-1 font-mono text-highlighted">{{ student.libraryCardNo || "Not assigned" }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-dimmed">Barcode</dt>
                    <dd class="mt-1 font-mono text-highlighted">{{ student.barcode || "—" }}</dd>
                  </div>
                  <div>
                    <dt class="text-xs font-semibold uppercase tracking-wide text-dimmed">Contact</dt>
                    <dd class="mt-1 truncate text-highlighted">{{ student.email || student.contactNo || "No contact information" }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </UCard>

          <UCard
            class="sncbt-themed-card"
            aria-labelledby="student-membership-heading"
            aria-describedby="student-membership-description"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 id="student-membership-heading" class="text-sm font-semibold text-highlighted">Current Membership</h2>
                <p id="student-membership-description" class="mt-1 text-xs text-muted">
                  Term-based Library access. This is separate from the permanent Library card status.
                </p>
              </div>
              <AppStatusBadge
                :label="student.membership?.status || 'No Membership Record'"
                :tone="statusTone(student.membership?.status || 'Expired')"
              />
            </div>

            <UAlert
              v-if="!student.membership"
              class="mt-4"
              color="warning"
              variant="soft"
              icon="i-lucide-circle-alert"
              title="No term membership is linked"
              :description="student.libraryCardStatus === 'Released'
                ? 'The Library card is released, but no semester membership record is linked to this student. Card release and term membership are tracked separately.'
                : 'No semester membership record is linked to this student.'"
            />

            <dl class="mt-5 space-y-3 text-sm">
              <div class="flex items-start justify-between gap-4">
                <dt class="text-muted">Membership No.</dt>
                <dd class="text-right font-medium text-highlighted">{{ student.membership?.membershipNo || "—" }}</dd>
              </div>
              <div class="flex items-start justify-between gap-4">
                <dt class="text-muted">Academic term</dt>
                <dd class="text-right font-medium text-highlighted">{{ membershipTermLabel(student) }}</dd>
              </div>
              <div class="flex items-start justify-between gap-4">
                <dt class="text-muted">Valid until</dt>
                <dd class="text-right font-medium text-highlighted">{{ formatDate(student.membership?.expiryDate) }}</dd>
              </div>
              <div class="flex items-start justify-between gap-4">
                <dt class="text-muted">Library card status</dt>
                <dd class="text-right">
                  <AppStatusBadge
                    :label="student.libraryCardStatus || 'Not assigned'"
                    :tone="statusTone(student.libraryCardStatus)"
                  />
                </dd>
              </div>
            </dl>
          </UCard>
        </div>

        <section aria-labelledby="student-record-summary-heading">
          <h2 id="student-record-summary-heading" class="sr-only">Student Record summary</h2>
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard class="sncbt-metric-card" aria-label="Borrowing summary">
            <div class="flex items-center gap-4">
              <div class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon name="i-lucide-book-up" class="size-5" aria-hidden="true" />
              </div>
              <div>
                <p class="text-2xl font-bold text-highlighted">{{ summary.totalBorrowings }}</p>
                <p class="text-sm text-muted">Total borrowings</p>
                <p class="mt-1 text-xs text-dimmed">{{ summary.activeBorrowings }} currently active</p>
              </div>
            </div>
          </UCard>

          <UCard class="sncbt-metric-card" aria-label="Reservation summary">
            <div class="flex items-center gap-4">
              <div class="flex size-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <UIcon name="i-lucide-calendar-check-2" class="size-5" aria-hidden="true" />
              </div>
              <div>
                <p class="text-2xl font-bold text-highlighted">{{ summary.totalReservations }}</p>
                <p class="text-sm text-muted">Reservations</p>
                <p class="mt-1 text-xs text-dimmed">{{ summary.activeReservations }} active requests</p>
              </div>
            </div>
          </UCard>

          <UCard class="sncbt-metric-card" aria-label="Library time-in summary" aria-describedby="time-in-definition">
            <div class="flex items-center gap-4">
              <div class="flex size-11 items-center justify-center rounded-xl bg-success/10 text-success">
                <UIcon name="i-lucide-log-in" class="size-5" aria-hidden="true" />
              </div>
              <div>
                <p class="text-2xl font-bold text-highlighted">{{ summary.totalTimeIns }}</p>
                <p class="text-sm text-muted">Total time-ins</p>
                <p class="mt-1 text-xs text-dimmed">Recorded Library entries</p>
              </div>
            </div>
          </UCard>

          <UCard class="sncbt-metric-card" aria-label="Most recent Library time-in">
            <div class="flex items-center gap-4">
              <div class="flex size-11 items-center justify-center rounded-xl bg-info/10 text-info">
                <UIcon name="i-lucide-clock-3" class="size-5" aria-hidden="true" />
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-highlighted">{{ formatDateTime(summary.lastTimeIn) }}</p>
                <p class="text-sm text-muted">Last time-in</p>
                <p class="mt-1 text-xs text-dimmed">Most recent Library entry</p>
              </div>
            </div>
          </UCard>
          </div>
          <p id="time-in-definition" class="mt-2 text-xs text-muted">
            Time-ins count recorded Library entries. Visit duration is not calculated because current visit records do not include time-out.
          </p>
        </section>

        <UCard class="sncbt-themed-card" aria-labelledby="student-activity-heading">
          <div class="flex flex-col gap-4 border-b border-default/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="student-activity-heading" class="text-lg font-bold text-highlighted">Student Activity</h2>
              <p class="mt-1 text-sm text-muted">
                Borrowing, returns, reservations, fines, and Library time-ins are shown from their existing system records.
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UBadge v-for="item in activityMeta" :key="item.label" color="neutral" variant="soft">
                <UIcon :name="item.icon" class="mr-1 size-3.5" aria-hidden="true" />
                {{ item.label }}: {{ item.value }}
              </UBadge>
            </div>
          </div>

          <form
            class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.2fr)_minmax(11rem,.7fr)_minmax(10rem,.6fr)_minmax(10rem,.6fr)_minmax(10rem,.6fr)_auto]"
            aria-label="Filter Student activity"
            @submit.prevent="applyFilters"
          >
            <UFormField label="Search activity" name="activity-search">
              <UInput
                v-model="filters.search"
                icon="i-lucide-search"
                placeholder="Reference, book, or status"
                autocomplete="off"
              />
            </UFormField>
            <UFormField label="Activity type" name="activity-type">
              <USelect v-model="filters.category" :items="categoryItems" value-key="value" label-key="label" />
            </UFormField>
            <UFormField label="From date" name="activity-date-from">
              <UInput v-model="filters.dateFrom" type="date" />
            </UFormField>
            <UFormField label="To date" name="activity-date-to">
              <UInput v-model="filters.dateTo" type="date" />
            </UFormField>
            <UFormField label="Sort order" name="activity-sort">
              <USelect v-model="filters.sort" :items="sortItems" value-key="value" label-key="label" />
            </UFormField>
            <div class="flex items-end gap-2">
              <UButton type="submit" label="Apply filters" icon="i-lucide-filter" :loading="loading" />
              <UButton
                type="button"
                label="Reset"
                color="neutral"
                variant="outline"
                icon="i-lucide-rotate-ccw"
                @click="resetFilters"
              />
            </div>
          </form>

          <div v-if="loading" class="mt-6 space-y-3" role="status" aria-live="polite">
            <span class="sr-only">Loading Student activity.</span>
            <USkeleton v-for="index in 5" :key="index" class="h-24 w-full rounded-xl" />
          </div>

          <div v-else-if="activities.length === 0" class="py-14 text-center" role="status" aria-live="polite">
            <UIcon name="i-lucide-history" class="mx-auto size-10 text-dimmed" aria-hidden="true" />
            <h3 class="mt-3 font-semibold text-highlighted">No matching activity</h3>
            <p class="mt-1 text-sm text-muted">Try another activity type or date range.</p>
          </div>

          <ol v-else class="mt-6 space-y-3" aria-label="Student Library activity timeline" aria-describedby="activity-results-summary">
            <li v-for="activity in activities" :key="activity.id" class="rounded-xl border border-default/70 bg-elevated/30 p-4">
              <article :aria-labelledby="`activity-title-${activity.id}`">
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UIcon :name="categoryIcon(activity.category)" class="size-5" aria-hidden="true" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <p :id="`activity-title-${activity.id}`" class="font-semibold text-highlighted">{{ activity.title }}</p>
                        <UBadge color="neutral" variant="soft" size="sm">{{ categoryLabel(activity.category) }}</UBadge>
                        <AppStatusBadge :label="activity.status" :tone="statusTone(activity.status)" />
                      </div>
                      <p class="mt-1 text-sm text-muted">{{ activity.description }}</p>
                    </div>
                    <time class="shrink-0 text-xs font-medium text-muted" :datetime="activity.occurredAt">
                      {{ formatDateTime(activity.occurredAt) }}
                    </time>
                  </div>

                  <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-dimmed">
                    <span v-if="activity.reference">Reference: {{ activity.reference }}</span>
                    <span v-if="activity.book?.controlNumber">Copy: {{ activity.book.controlNumber }}</span>
                    <span v-if="activity.amount !== null">Amount: {{ formatMoney(activity.amount) }}</span>
                    <span v-if="activity.actor">Recorded by {{ activity.actor }}</span>
                  </div>
                </div>
              </div>
              </article>
            </li>
          </ol>

          <template #footer>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p id="activity-results-summary" class="text-sm text-muted">
                Showing {{ activities.length }} of {{ pagination.total }} matching activities
              </p>
              <UPagination
                v-if="pagination.total > pageSize"
                v-model:page="page"
                :total="pagination.total"
                :items-per-page="pageSize"
                aria-label="Student activity pages"
              />
            </div>
          </template>
        </UCard>
      </template>
    </div>
  </UContainer>
</template>
