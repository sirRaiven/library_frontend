<script setup lang="ts">
import AppResponsiveDataView from "~/components/shared/AppResponsiveDataView.vue";
import type { PortalHistoryEntry } from "~/composables/usePortalHistory";
import { libraryReportDate } from "~/utils/librarian-export-choices";

const props = defineProps<{
  category: "borrowing" | "return";
  active: boolean;
}>();

const isReturn = props.category === "return";
const title = isReturn ? "Return Records" : "Borrowing Records";
const pageSize = 10;
const today = isReturn ? libraryReportDate() : "";
const filters = reactive({ search: "", dateFrom: today, dateTo: today });
const applied = ref({ ...filters });
const { records, loading, error, pagination, load } = usePortalHistory("librarian");

const invalidRange = computed(() => Boolean(
  filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo,
));

const dateTime = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Manila",
});
const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });
const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function formatDate(value: string | null | undefined, formatter: Intl.DateTimeFormat) {
  const parsed = value ? new Date(value) : null;
  return parsed && Number.isFinite(parsed.getTime()) ? formatter.format(parsed) : "—";
}

function statusColor(status: string) {
  if (["Borrowed", "Good"].includes(status)) return "success";
  if (status === "Damaged") return "warning";
  if (["Overdue", "Lost"].includes(status)) return "error";
  return "neutral";
}

function copyReference(record: PortalHistoryEntry) {
  const relatedBorrow = record.borrowingReference !== record.reference ? record.borrowingReference : null;
  return [record.book?.controlNumber, record.reference, relatedBorrow].filter(Boolean).join(" · ");
}

async function loadPage(page: number) {
  if (loading.value || !props.active) return;
  try {
    await load({ ...applied.value, category: props.category, page, pageSize });
  } catch {
    // The history composable exposes the error for the inline retry.
  }
}

function applyFilters() {
  if (invalidRange.value || loading.value) return;
  applied.value = { ...filters };
  void loadPage(1);
}

function clearDates() {
  filters.dateFrom = "";
  filters.dateTo = "";
  applyFilters();
}

onMounted(() => void loadPage(1));
watch(() => props.active, (active) => {
  if (active) void loadPage(pagination.value.page);
});
</script>

<template>
  <UCard :aria-busy="loading" :ui="{ header: 'p-4 sm:p-5', body: 'p-4 sm:p-5', footer: 'p-4 sm:p-5' }">
    <template #header>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-semibold text-highlighted">{{ title }}</h2>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :disabled="loading"
          @click="loadPage(pagination.page)"
        />
      </div>
      <form class="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(12rem,1fr)_minmax(9rem,auto)_minmax(9rem,auto)_auto]" @submit.prevent="applyFilters">
        <label class="min-w-0 space-y-1 sm:col-span-2 xl:col-span-1">
          <span class="block text-sm font-medium">Search records</span>
          <UInput v-model="filters.search" type="search" icon="i-lucide-search" placeholder="Book, member, or reference" class="w-full" />
        </label>
        <label class="min-w-0 space-y-1">
          <span class="block text-sm font-medium">From date</span>
          <UInput v-model="filters.dateFrom" type="date" :max="filters.dateTo || undefined" class="w-full" />
        </label>
        <label class="min-w-0 space-y-1">
          <span class="block text-sm font-medium">To date</span>
          <UInput v-model="filters.dateTo" type="date" :min="filters.dateFrom || undefined" class="w-full" />
        </label>
        <div class="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-1">
          <UButton type="submit" label="Apply filters" :disabled="invalidRange || loading" />
          <UButton
            v-if="filters.dateFrom || filters.dateTo || applied.dateFrom || applied.dateTo"
            type="button"
            label="All dates"
            color="neutral"
            variant="outline"
            :disabled="loading"
            @click="clearDates"
          />
        </div>
        <p v-if="invalidRange" class="text-sm text-error sm:col-span-2 xl:col-span-4" role="alert">
          Choose an end date on or after the start date.
        </p>
      </form>
    </template>

    <div v-if="loading" class="space-y-2" role="status">
      <span class="sr-only">Loading records</span>
      <USkeleton v-for="index in 5" :key="index" class="h-12 w-full" />
    </div>
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Records could not be loaded"
      :description="error"
      :actions="[{ label: 'Try again', onClick: () => loadPage(pagination.page) }]"
    />
    <p v-else-if="!records.length" class="py-6 text-center text-sm text-muted" role="status">
      No records match these filters.
    </p>

    <AppResponsiveDataView v-else :mobile-label="title" :desktop-label="`${title} table`">
      <template #mobile>
        <ul class="divide-y divide-default">
          <li v-for="record in records" :key="record.id" class="min-w-0 space-y-1.5 py-3 text-sm first:pt-0 last:pb-0">
            <div class="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <p class="min-w-0 font-medium break-words text-highlighted">{{ record.book?.title || "Book" }}</p>
              <UBadge :color="statusColor(record.status)" variant="soft">{{ record.status }}</UBadge>
            </div>
            <p class="break-words">{{ record.member?.name || "Library member" }}<span v-if="record.member?.identifier" class="text-muted"> · {{ record.member.identifier }}</span></p>
            <p v-if="copyReference(record)" class="break-words text-xs text-muted">{{ copyReference(record) }}</p>
            <p class="flex flex-wrap justify-between gap-x-2 text-xs text-muted">
              <time :datetime="record.occurredAt">{{ formatDate(record.occurredAt, dateTime) }}</time>
              <span v-if="isReturn && record.amount">Fine {{ pesos.format(record.amount) }}</span>
              <span v-if="!isReturn && record.dueDate">Due {{ formatDate(record.dueDate, date) }}</span>
            </p>
          </li>
        </ul>
      </template>
      <template #desktop>
        <table class="w-full table-fixed text-left text-sm">
          <caption class="sr-only">{{ title }}</caption>
          <thead class="text-xs text-muted">
            <tr class="border-b border-default">
              <th scope="col" class="w-1/3 pb-2 pr-3 font-semibold">Book / Reference</th>
              <th scope="col" class="pb-2 pr-3 font-semibold">Member</th>
              <th scope="col" class="w-1/5 pb-2 pr-3 font-semibold">{{ isReturn ? 'Returned' : 'Borrowed' }}</th>
              <th scope="col" class="w-1/5 pb-2 font-semibold">{{ isReturn ? 'Condition' : 'Status' }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-for="record in records" :key="record.id">
              <td class="py-2.5 pr-3 align-top">
                <p class="font-medium break-words text-highlighted">{{ record.book?.title || "Book" }}</p>
                <p class="break-words text-xs text-muted">{{ copyReference(record) }}</p>
              </td>
              <td class="py-2.5 pr-3 align-top">
                <p class="break-words">{{ record.member?.name || "Library member" }}</p>
                <p class="break-words text-xs text-muted">{{ [record.member?.type, record.member?.identifier].filter(Boolean).join(" · ") }}</p>
              </td>
              <td class="py-2.5 pr-3 align-top">
                <time :datetime="record.occurredAt">{{ formatDate(record.occurredAt, dateTime) }}</time>
              </td>
              <td class="space-y-1 py-2.5 align-top">
                <UBadge :color="statusColor(record.status)" variant="soft">{{ record.status }}</UBadge>
                <p v-if="isReturn && record.amount" class="text-xs text-muted">Fine {{ pesos.format(record.amount) }}</p>
                <p v-if="!isReturn && record.dueDate" class="text-xs text-muted">Due {{ formatDate(record.dueDate, date) }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </AppResponsiveDataView>

    <template v-if="pagination.total || loading" #footer>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-muted" aria-live="polite">
          {{ loading ? 'Loading records…' : `${pagination.total} ${pagination.total === 1 ? 'record' : 'records'}` }}
        </p>
        <UPagination
          v-if="pagination.total > pageSize"
          :page="pagination.page"
          :total="pagination.total"
          :items-per-page="pageSize"
          :sibling-count="0"
          :disabled="loading"
          :aria-label="`${title} pages`"
          @update:page="loadPage"
        />
      </div>
    </template>
  </UCard>
</template>
