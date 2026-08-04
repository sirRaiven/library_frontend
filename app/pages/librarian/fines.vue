<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import type { FineCalendarEntry, FineCalendarInput, LibraryFineRecord } from "~/composables/useLibraryFines";

definePageMeta({ layout: "librarian", title: "Fines and Payments" });

const finesApi = useLibraryFines();
const librarySettings = useLibrarySettings();
const auth = useAuth();
const toast = useToast();

const activeView = ref<"payments" | "calendar">("payments");
const records = ref<LibraryFineRecord[]>([]);
const calendar = ref<FineCalendarEntry[]>([]);
const calendarYear = ref(String(new Date().getFullYear()));
const calendarYearItems = Array.from({ length: 4 }, (_, index) => String(new Date().getFullYear() - 1 + index));
const holidaySyncing = ref(false);
const loading = ref(false);
const calendarLoading = ref(false);
const search = ref("");
const status = ref("Unpaid");
const type = ref("All");
const page = ref(1);
const pageSize = 20;
const pagination = reactive({ page: 1, pageSize, pageCount: 1, total: 0 });
const summary = reactive({ unpaid: 0, paid: 0, cardReplacements: 0, outstandingAmount: 0 });

const paymentOpen = ref(false);
const waiverOpen = ref(false);
const selectedFine = ref<LibraryFineRecord | null>(null);
const payment = reactive({ orNumber: "", paymentDate: new Date().toISOString().slice(0, 10), notes: "" });
const waiverReason = ref("");
const saving = ref(false);

const calendarOpen = ref(false);
const editingCalendar = ref<FineCalendarEntry | null>(null);
const calendarForm = reactive({
  title: "",
  type: "School Event" as FineCalendarInput["type"],
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  resumeDate: "",
  reason: "",
});

const fineColumns: TableColumn<LibraryFineRecord>[] = [
  { id: "fine", header: "Fine / Reference" },
  { id: "member", header: "Library Member" },
  { id: "amount", header: "Amount" },
  { id: "payment", header: "Payment" },
  { id: "actions", header: "Actions" },
];

const calendarColumns: TableColumn<FineCalendarEntry>[] = [
  { id: "event", header: "No-Fine Period" },
  { id: "dates", header: "Dates" },
  { id: "resume", header: "Fine Counting Resumes" },
  { id: "status", header: "Status" },
  { id: "actions", header: "Actions" },
];

const statusItems = ["All", "Unpaid", "Paid", "Waived", "Cancelled"];
const typeItems = ["All", "Overdue Book", "Damaged Book", "Lost Book", "Library Card Replacement", "Other"];
const calendarTypes: FineCalendarInput["type"][] = [
  "School Event",
  "Class Suspension",
  "Natural Disaster",
  "Emergency Closure",
  "Other",
];

const automaticHolidays = computed(() => calendar.value.filter((entry) => entry.automatic));
const manualNoFinePeriods = computed(() => calendar.value.filter((entry) => !entry.automatic));
const latestHolidaySync = computed(() => {
  const values = automaticHolidays.value
    .map((entry) => entry.syncedAt)
    .filter((value): value is string => Boolean(value));
  return values.sort().at(-1) ?? null;
});

function money(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value || 0);
}

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(date);
}

function statusColor(value: string) {
  if (value === "Paid" || value === "Active") return "success";
  if (value === "Unpaid") return "warning";
  if (value === "Waived") return "info";
  return "error";
}

function shiftDate(value: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function loadFines() {
  loading.value = true;
  try {
    const response = await finesApi.list({
      search: search.value.trim(),
      status: status.value,
      type: type.value,
      page: page.value,
      pageSize,
    });
    records.value = response.data;
    Object.assign(pagination, response.meta.pagination);
    Object.assign(summary, response.meta.summary);
  } catch (error) {
    toast.add({ title: "Unable to load fines", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    loading.value = false;
  }
}

async function loadCalendar() {
  calendarLoading.value = true;
  try {
    calendar.value = await finesApi.listCalendar({ year: calendarYear.value });
  } catch (error) {
    toast.add({ title: "Unable to load no-fine days", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    calendarLoading.value = false;
  }
}

async function syncPhilippineHolidays() {
  holidaySyncing.value = true;
  try {
    const year = Number(calendarYear.value);
    const response = await finesApi.syncPhilippineHolidays([year]);
    const result = response.data.results.find((item) => item.year === year);

    if (!result?.syncSucceeded) {
      toast.add({
        title: result?.cachedOnly ? "Online holiday sources unavailable" : "Holiday synchronization failed",
        description: result?.cachedOnly
          ? `No hardcoded dates were loaded. The system kept ${result.cachedCount ?? 0} previously synchronized holiday(s) for ${year}. ${result.warning ?? ""}`.trim()
          : (result?.warning || `No dynamic Philippine regular-holiday data was available for ${year}.`),
        color: result?.cachedOnly ? "warning" : "error",
        icon: result?.cachedOnly ? "i-lucide-database" : "i-lucide-cloud-alert",
      });
      await loadCalendar();
      return;
    }

    const changeSummary = [
      `${result.total ?? 0} regular holiday(s) synchronized`,
      result.created ? `${result.created} added` : "",
      result.updated ? `${result.updated} updated` : "",
      result.removed ? `${result.removed} obsolete record(s) removed` : "",
    ].filter(Boolean).join(" • ");

    toast.add({
      title: "Philippine holidays synchronized",
      description: `${changeSummary} from ${result.provider || "local open-source holiday data"}.${result.warning ? ` Provider note: ${result.warning}` : ""}`,
      color: result.warning ? "warning" : "success",
      icon: "i-lucide-cloud-download",
    });
    await loadCalendar();
  } catch (error) {
    toast.add({
      title: "Holiday synchronization failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-cloud-alert",
    });
  } finally {
    holidaySyncing.value = false;
  }
}

function openPayment(record: LibraryFineRecord) {
  selectedFine.value = record;
  payment.orNumber = "";
  payment.paymentDate = new Date().toISOString().slice(0, 10);
  payment.notes = "";
  paymentOpen.value = true;
}

async function verifyPayment() {
  if (!selectedFine.value || !payment.orNumber.trim()) return;
  saving.value = true;
  try {
    await finesApi.verifyPayment(selectedFine.value.documentId, {
      orNumber: payment.orNumber.trim(),
      paymentDate: payment.paymentDate,
      notes: payment.notes.trim() || undefined,
    });
    paymentOpen.value = false;
    toast.add({ title: "Payment verified", description: "The cashier Official Receipt was recorded and the fine is now marked Paid.", color: "success", icon: "i-lucide-badge-check" });
    await loadFines();
  } catch (error) {
    toast.add({ title: "Payment verification failed", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    saving.value = false;
  }
}

function openWaiver(record: LibraryFineRecord) {
  selectedFine.value = record;
  waiverReason.value = "";
  waiverOpen.value = true;
}

async function waiveFine() {
  if (!selectedFine.value || !waiverReason.value.trim()) return;
  saving.value = true;
  try {
    await finesApi.waive(selectedFine.value.documentId, waiverReason.value.trim());
    waiverOpen.value = false;
    toast.add({ title: "Fine waived", description: "The waiver and its reason were recorded.", color: "success", icon: "i-lucide-circle-check" });
    await loadFines();
  } catch (error) {
    toast.add({ title: "Unable to waive fine", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    saving.value = false;
  }
}

function resetCalendarForm() {
  editingCalendar.value = null;
  const today = new Date().toISOString().slice(0, 10);
  Object.assign(calendarForm, { title: "", type: "School Event", startDate: today, endDate: today, resumeDate: "", reason: "" });
}

function openCalendar(record?: FineCalendarEntry) {
  if (record?.automatic) return;
  resetCalendarForm();
  if (record) {
    editingCalendar.value = record;
    Object.assign(calendarForm, {
      title: record.title,
      type: record.type,
      startDate: record.startDate,
      endDate: record.endDate,
      resumeDate: record.resumeDate,
      reason: record.reason,
    });
  }
  calendarOpen.value = true;
}

async function saveCalendar() {
  if (!calendarForm.title.trim() || !calendarForm.startDate || !calendarForm.endDate) return;
  saving.value = true;
  try {
    const input = {
      title: calendarForm.title.trim(),
      type: calendarForm.type,
      startDate: calendarForm.startDate,
      endDate: calendarForm.endDate,
      resumeDate: calendarForm.resumeDate || undefined,
      reason: calendarForm.reason.trim(),
    };
    if (editingCalendar.value) {
      await finesApi.updateCalendar(editingCalendar.value.documentId, input);
    } else {
      await finesApi.createCalendar(input);
    }
    calendarOpen.value = false;
    toast.add({ title: editingCalendar.value ? "No-fine period updated" : "No-fine period added", description: "Overdue-fine counting will skip the configured dates.", color: "success", icon: "i-lucide-calendar-check" });
    await loadCalendar();
  } catch (error) {
    toast.add({ title: "Unable to save no-fine period", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    saving.value = false;
  }
}

async function cancelCalendar(record: FineCalendarEntry) {
  if (record.automatic) return;
  const reason = window.prompt("Reason for cancelling this no-fine period:", record.reason || "Schedule changed");
  if (!reason) return;
  try {
    await finesApi.cancelCalendar(record.documentId, reason);
    toast.add({ title: "No-fine period cancelled", color: "success", icon: "i-lucide-circle-check" });
    await loadCalendar();
  } catch (error) {
    toast.add({ title: "Unable to cancel period", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; void loadFines(); }, 350);
});
watch([status, type], () => { page.value = 1; void loadFines(); });
watch(page, () => void loadFines());
watch(() => calendarForm.resumeDate, (value) => {
  if (value) calendarForm.endDate = shiftDate(value, -1);
});
watch(activeView, (value) => { if (value === "calendar") void loadCalendar(); });
watch(calendarYear, () => { if (activeView.value === "calendar") void loadCalendar(); });

onMounted(() => { void Promise.all([loadFines(), loadCalendar(), librarySettings.load(true)]); });
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-[1500px] space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex size-11 items-center justify-center rounded-2xl bg-warning/10 text-warning"><UIcon name="i-lucide-receipt-text" class="size-6" /></div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">Fines and Cashier Payments</h1>
            <p class="mt-1 max-w-3xl text-sm text-muted">Review automatic school-day fines, verify cashier Official Receipts, process Library Card replacement charges, and manage dates when fine counting is suspended.</p>
          </div>
        </div>
        <div class="inline-flex rounded-xl border border-default bg-elevated p-1">
          <UButton label="Fines & Payments" icon="i-lucide-philippine-peso" :variant="activeView === 'payments' ? 'solid' : 'ghost'" :color="activeView === 'payments' ? 'primary' : 'neutral'" @click="activeView = 'payments'" />
          <UButton label="No-Fine Days" icon="i-lucide-calendar-off" :variant="activeView === 'calendar' ? 'solid' : 'ghost'" :color="activeView === 'calendar' ? 'primary' : 'neutral'" @click="activeView = 'calendar'" />
        </div>
      </div>

      <template v-if="activeView === 'payments'">
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-info"
          title="Cashier payment verification"
          :description="`Current policy: ${money(librarySettings.settings.value.fines.overdueFinePerDay || 10)} per chargeable school day and ${money(librarySettings.settings.value.membership.libraryCardReplacementFee || 50)} for a Library Card replacement. Students and Faculty pay at the Cashier; the Librarian records the Official Receipt before a fine is marked Paid.`"
        />

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard><p class="text-sm text-muted">Unpaid Fines</p><p class="mt-2 text-3xl font-bold text-warning">{{ summary.unpaid }}</p></UCard>
          <UCard><p class="text-sm text-muted">Outstanding Amount</p><p class="mt-2 text-3xl font-bold text-error">{{ money(summary.outstandingAmount) }}</p></UCard>
          <UCard><p class="text-sm text-muted">Paid and Verified</p><p class="mt-2 text-3xl font-bold text-success">{{ summary.paid }}</p></UCard>
          <UCard><p class="text-sm text-muted">Card Replacements</p><p class="mt-2 text-3xl font-bold text-highlighted">{{ summary.cardReplacements }}</p></UCard>
        </div>

        <UCard>
          <template #header>
            <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_16rem_auto]">
              <UInput v-model="search" icon="i-lucide-search" placeholder="Search fine, Student, OR, book, or reference" />
              <USelect v-model="status" :items="statusItems" />
              <USelect v-model="type" :items="typeItems" />
              <UButton label="Refresh" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading" @click="loadFines" />
            </div>
          </template>

          <div v-if="loading" class="space-y-3"><USkeleton v-for="i in 5" :key="i" class="h-16 w-full" /></div>
          <div v-else-if="records.length === 0" class="py-16 text-center"><UIcon name="i-lucide-receipt" class="mx-auto size-10 text-dimmed" /><h3 class="mt-3 font-semibold">No fine records found</h3></div>
          <UTable v-else :data="records" :columns="fineColumns">
            <template #fine-cell="{ row }">
              <p class="font-semibold text-highlighted">{{ row.original.fineNo }}</p>
              <p class="text-xs text-muted">{{ row.original.type }} • {{ row.original.referenceNo || 'No reference' }}</p>
              <p v-if="row.original.bookTitle" class="mt-1 text-xs text-muted">{{ row.original.bookTitle }}</p>
            </template>
            <template #member-cell="{ row }">
              <p class="font-medium text-highlighted">{{ row.original.member.fullName }}</p>
              <p class="text-xs text-muted">{{ row.original.member.type }} • {{ row.original.member.identifier }}</p>
            </template>
            <template #amount-cell="{ row }">
              <p class="font-bold text-highlighted">{{ money(row.original.amount) }}</p>
              <p v-if="row.original.chargeableDays" class="text-xs text-muted">{{ row.original.chargeableDays }} school day(s) × {{ money(row.original.ratePerDay) }}</p>
            </template>
            <template #payment-cell="{ row }">
              <UBadge :color="statusColor(row.original.status)" variant="soft">{{ row.original.status }}</UBadge>
              <p v-if="row.original.orNumber" class="mt-1 text-xs text-muted">OR {{ row.original.orNumber }} • {{ dateLabel(row.original.paymentDate) }}</p>
              <p v-else class="mt-1 text-xs text-muted">Assessed {{ dateLabel(row.original.assessedAt) }}</p>
            </template>
            <template #actions-cell="{ row }">
              <div class="flex flex-wrap gap-2">
                <UButton v-if="row.original.status === 'Unpaid'" label="Verify OR" icon="i-lucide-badge-check" size="sm" color="success" @click="openPayment(row.original)" />
                <UButton v-if="row.original.status === 'Unpaid'" label="Waive" icon="i-lucide-scale" size="sm" color="neutral" variant="outline" @click="openWaiver(row.original)" />
              </div>
            </template>
          </UTable>
          <template #footer><div class="flex items-center justify-between"><p class="text-sm text-muted">{{ pagination.total }} records</p><UPagination v-model:page="page" :total="pagination.total" :items-per-page="pageSize" /></div></template>
        </UCard>
      </template>

      <template v-else>
        <UAlert
          color="info"
          variant="soft"
          icon="i-lucide-cloud-sun"
          title="Philippine regular holidays are generated locally"
          description="The system uses the open-source date-holidays library for the selected year and may verify available dates through Nager.Holidays. Internet outages do not stop local holiday generation. Saturdays and Sundays remain excluded; manual entries are only for school events, suspensions, disasters, and emergency closures."
        />

        <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <UCard>
            <template #header>
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 class="font-semibold text-highlighted">Automatic Philippine Regular Holidays</h2>
                  <p class="text-sm text-muted">Read-only dates generated from an installed open-source Philippine holiday calendar, then stored locally for fine calculation.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <USelect v-model="calendarYear" :items="calendarYearItems" class="w-32" />
                  <UButton label="Sync Holidays" icon="i-lucide-cloud-download" color="primary" :loading="holidaySyncing" @click="syncPhilippineHolidays" />
                </div>
              </div>
            </template>

            <div v-if="calendarLoading" class="space-y-3"><USkeleton v-for="i in 4" :key="i" class="h-16 w-full" /></div>
            <div v-else-if="automaticHolidays.length === 0" class="py-12 text-center">
              <UIcon name="i-lucide-calendar-search" class="mx-auto size-10 text-dimmed" />
              <h3 class="mt-3 font-semibold">No synchronized regular holidays for {{ calendarYear }}</h3>
              <p class="mt-1 text-sm text-muted">Select Sync Holidays to generate the selected year from the installed open-source holiday data. An internet connection is optional.</p>
            </div>
            <UTable v-else :data="automaticHolidays" :columns="calendarColumns">
              <template #event-cell="{ row }">
                <p class="font-semibold text-highlighted">{{ row.original.title }}</p>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <UBadge color="primary" variant="soft">Automatic</UBadge>
                  <span class="text-xs text-muted">{{ row.original.sourceName || 'Local open-source holiday data' }}</span>
                </div>
                <ULink
                  v-if="row.original.sourceReference"
                  :to="row.original.sourceReference"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View holiday data source
                  <UIcon name="i-lucide-external-link" class="size-3" />
                </ULink>
              </template>
              <template #dates-cell="{ row }"><p>{{ dateLabel(row.original.startDate) }}</p><p class="text-xs text-muted">Regular Holiday</p></template>
              <template #resume-cell="{ row }"><p class="font-medium text-highlighted">{{ dateLabel(row.original.resumeDate) }}</p></template>
              <template #status-cell="{ row }"><UBadge :color="statusColor(row.original.status)" variant="soft">{{ row.original.status }}</UBadge></template>
              <template #actions-cell><span class="text-xs text-muted">Managed automatically</span></template>
            </UTable>
          </UCard>

          <UCard>
            <p class="text-sm text-muted">Selected Year</p>
            <p class="mt-1 text-3xl font-bold text-highlighted">{{ calendarYear }}</p>
            <div class="mt-5 space-y-3 text-sm">
              <div class="flex items-center justify-between"><span class="text-muted">Regular holidays</span><span class="font-semibold">{{ automaticHolidays.length }}</span></div>
              <div class="flex items-center justify-between"><span class="text-muted">School exceptions</span><span class="font-semibold">{{ manualNoFinePeriods.length }}</span></div>
              <div class="border-t border-default pt-3">
                <p class="text-xs text-muted">Last synchronized</p>
                <p class="mt-1 font-medium text-highlighted">{{ dateLabel(latestHolidaySync) }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="font-semibold text-highlighted">School Events and Class Suspensions</h2>
                <p class="text-sm text-muted">Add only institution-specific dates when fine counting must stop.</p>
              </div>
              <UButton label="Add No-Fine Period" icon="i-lucide-plus" color="success" @click="openCalendar()" />
            </div>
          </template>
          <div v-if="calendarLoading" class="space-y-3"><USkeleton v-for="i in 3" :key="i" class="h-16 w-full" /></div>
          <div v-else-if="manualNoFinePeriods.length === 0" class="py-12 text-center"><UIcon name="i-lucide-school" class="mx-auto size-10 text-dimmed" /><h3 class="mt-3 font-semibold">No school-specific no-fine period</h3></div>
          <UTable v-else :data="manualNoFinePeriods" :columns="calendarColumns">
            <template #event-cell="{ row }"><p class="font-semibold text-highlighted">{{ row.original.title }}</p><p class="text-xs text-muted">{{ row.original.type }} • {{ row.original.exceptionNo }}</p><p v-if="row.original.reason" class="mt-1 text-xs text-muted">{{ row.original.reason }}</p></template>
            <template #dates-cell="{ row }"><p>{{ dateLabel(row.original.startDate) }}</p><p class="text-xs text-muted">to {{ dateLabel(row.original.endDate) }}</p></template>
            <template #resume-cell="{ row }"><p class="font-medium text-highlighted">{{ dateLabel(row.original.resumeDate) }}</p></template>
            <template #status-cell="{ row }"><UBadge :color="statusColor(row.original.status)" variant="soft">{{ row.original.status }}</UBadge></template>
            <template #actions-cell="{ row }"><div class="flex gap-2"><UButton label="Edit" icon="i-lucide-pencil" size="sm" color="neutral" variant="outline" @click="openCalendar(row.original)" /><UButton v-if="row.original.status === 'Active'" label="Cancel" icon="i-lucide-x" size="sm" color="error" variant="ghost" @click="cancelCalendar(row.original)" /></div></template>
          </UTable>
        </UCard>
      </template>
    </div>

    <UModal v-model:open="paymentOpen" :ui="{ content: 'sm:max-w-lg' }"><template #content><div class="space-y-5 bg-default p-6"><div><h2 class="text-xl font-bold">Verify Cashier Payment</h2><p class="mt-1 text-sm text-muted">Record the Official Receipt before marking {{ selectedFine?.fineNo }} as Paid.</p></div><UAlert color="warning" variant="soft" icon="i-lucide-receipt-text" :title="selectedFine ? money(selectedFine.amount) : ''" description="Compare the OR with the Student or Faculty record before confirming." /><UFormField label="Official Receipt (OR) Number" required><UInput v-model="payment.orNumber" placeholder="Enter cashier OR number" /></UFormField><UFormField label="Payment Date" required><UInput v-model="payment.paymentDate" type="date" /></UFormField><UFormField label="Verification Notes" hint="Optional"><UTextarea v-model="payment.notes" :rows="3" /></UFormField><div class="flex justify-end gap-2"><UButton label="Cancel" color="neutral" variant="ghost" @click="paymentOpen = false" /><UButton label="Verify Payment" icon="i-lucide-badge-check" color="success" :loading="saving" :disabled="!payment.orNumber.trim()" @click="verifyPayment" /></div></div></template></UModal>

    <UModal v-model:open="waiverOpen" :ui="{ content: 'sm:max-w-lg' }"><template #content><div class="space-y-5 bg-default p-6"><div><h2 class="text-xl font-bold">Waive Fine</h2><p class="mt-1 text-sm text-muted">A reason is required and will be included in the audit trail.</p></div><UFormField label="Waiver Reason" required><UTextarea v-model="waiverReason" :rows="4" /></UFormField><div class="flex justify-end gap-2"><UButton label="Cancel" color="neutral" variant="ghost" @click="waiverOpen = false" /><UButton label="Confirm Waiver" icon="i-lucide-scale" color="warning" :loading="saving" :disabled="!waiverReason.trim()" @click="waiveFine" /></div></div></template></UModal>

    <UModal v-model:open="calendarOpen" :ui="{ content: 'sm:max-w-xl' }"><template #content><div class="space-y-5 bg-default p-6"><div><h2 class="text-xl font-bold">{{ editingCalendar ? 'Update No-Fine Period' : 'Add No-Fine Period' }}</h2><p class="mt-1 text-sm text-muted">Use this only for school events, class suspensions, disasters, or emergency closures. National regular holidays are synchronized automatically.</p></div><div class="grid gap-4 sm:grid-cols-2"><UFormField label="Title" required class="sm:col-span-2"><UInput v-model="calendarForm.title" placeholder="Example: Typhoon class suspension" /></UFormField><UFormField label="Type" required><USelect v-model="calendarForm.type" :items="calendarTypes" /></UFormField><UFormField label="Start Date" required><UInput v-model="calendarForm.startDate" type="date" /></UFormField><UFormField label="End Date" required><UInput v-model="calendarForm.endDate" type="date" /></UFormField><UFormField label="Resume Fine Counting" hint="Optional — the no-fine period ends on the previous date"><UInput v-model="calendarForm.resumeDate" type="date" /></UFormField><UFormField label="Reason or Details" hint="Optional" class="sm:col-span-2"><UTextarea v-model="calendarForm.reason" :rows="3" /></UFormField></div><div class="flex justify-end gap-2"><UButton label="Cancel" color="neutral" variant="ghost" @click="calendarOpen = false" /><UButton label="Save Period" icon="i-lucide-save" color="success" :loading="saving" :disabled="!calendarForm.title.trim() || !calendarForm.startDate || !calendarForm.endDate" @click="saveCalendar" /></div></div></template></UModal>
  </UContainer>
</template>
