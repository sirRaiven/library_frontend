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
const currentPhilippineYear = Number(getPhilippineDateKey().slice(0, 4));
const calendarYear = ref(String(currentPhilippineYear));
const calendarYearItems = Array.from({ length: 4 }, (_, index) => String(currentPhilippineYear - 1 + index));
const holidaySyncing = ref(false);
const loading = ref(false);
const calendarLoading = ref(false);
const calendarSearch = ref("");
const calendarSource = ref("All entries");
const calendarClassification = ref("All types");
const calendarDateView = ref("All dates");
const calendarStatus = ref("Active");
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
const paymentOrChecking = ref(false);
const paymentOrAvailable = ref<boolean | null>(null);
const paymentOrMessage = ref("");
const waiverReason = ref("");
const saving = ref(false);
const cancelCalendarOpen = ref(false);
const calendarToCancel = ref<FineCalendarEntry | null>(null);
const cancelCalendarReason = ref("");
const removeCalendarOpen = ref(false);
const calendarToRemove = ref<FineCalendarEntry | null>(null);
const removeCalendarReason = ref("");

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
  { id: "event", header: "Holiday / No-Fine Period" },
  { id: "dates", header: "Dates" },
  { id: "resume", header: "Fine Handling" },
  { id: "status", header: "Status" },
  { id: "actions", header: "Actions" },
];

const statusItems = ["All", "Unpaid", "Paid", "Waived", "Cancelled"];
const typeItems = ["All", "Overdue Book", "Damaged Book", "Lost Book", "Library Card Replacement", "Other"];
const calendarSourceItems = ["All entries", "Official holidays", "School-added dates"];
const calendarClassificationItems = [
  "All types",
  "Regular Holiday",
  "Special Non-Working Day",
  "Special Working Day",
  "School Event",
  "Class Suspension",
  "Natural Disaster",
  "Emergency Closure",
  "Other",
];
const calendarDateViewItems = ["All dates", "Upcoming & current", "Upcoming", "Currently active", "Past"];
const calendarStatusItems = ["All statuses", "Active", "Cancelled", "Removed"];
const calendarTypes: FineCalendarInput["type"][] = [
  "School Event",
  "Class Suspension",
  "Natural Disaster",
  "Emergency Closure",
  "Other",
];

const todayKey = ref(getPhilippineDateKey());

const automaticHolidayCount = computed(() => calendar.value.filter((entry) => entry.automatic && entry.status === "Active").length);
const regularHolidayCount = computed(() => calendar.value.filter((entry) => entry.type === "Regular Holiday" && entry.status === "Active").length);
const specialNonWorkingCount = computed(() => calendar.value.filter((entry) => entry.type === "Special Non-Working Day" && entry.status === "Active").length);
const specialWorkingCount = computed(() => calendar.value.filter((entry) => entry.type === "Special Working Day" && entry.status === "Active").length);
const schoolAddedCount = computed(() => calendar.value.filter((entry) => !entry.automatic && entry.status === "Active").length);
const upcomingNoFineCount = computed(() => calendar.value.filter((entry) => entry.status === "Active" && entry.affectsFines && entry.endDate >= todayKey.value).length);

const sortedCalendar = computed(() => [...calendar.value].sort(compareCalendarEntries));

const filteredCalendar = computed(() => {
  const query = calendarSearch.value.trim().toLowerCase();

  return sortedCalendar.value.filter((entry) => {
    if (calendarSource.value === "Official holidays" && !entry.automatic) return false;
    if (calendarSource.value === "School-added dates" && entry.automatic) return false;
    if (calendarClassification.value !== "All types" && entry.type !== calendarClassification.value) return false;
    if (calendarStatus.value !== "All statuses" && entry.status !== calendarStatus.value) return false;

    const timing = calendarTiming(entry);
    if (calendarDateView.value === "Upcoming & current" && !["Upcoming", "Current"].includes(timing)) return false;
    if (calendarDateView.value === "Upcoming" && timing !== "Upcoming") return false;
    if (calendarDateView.value === "Currently active" && timing !== "Current") return false;
    if (calendarDateView.value === "Past" && timing !== "Past") return false;

    if (!query) return true;
    return [entry.title, entry.type, entry.reason, entry.exceptionNo]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });
});

const nextNoFineDay = computed(() => sortedCalendar.value.find((entry) => entry.status === "Active" && entry.affectsFines && entry.endDate >= todayKey.value) ?? null);

const hasCalendarFilters = computed(() =>
  Boolean(calendarSearch.value.trim())
  || calendarSource.value !== "All entries"
  || calendarClassification.value !== "All types"
  || calendarDateView.value !== "All dates"
  || calendarStatus.value !== "Active",
);

function getPhilippineDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function dateNumber(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year || 0, (month || 1) - 1, day || 1) / 86_400_000;
}

function calendarTiming(entry: FineCalendarEntry) {
  if (entry.startDate <= todayKey.value && entry.endDate >= todayKey.value) return "Current";
  if (entry.startDate > todayKey.value) return "Upcoming";
  return "Past";
}

function compareCalendarEntries(a: FineCalendarEntry, b: FineCalendarEntry) {
  const rank = (entry: FineCalendarEntry) => {
    if (entry.status === "Cancelled") return 3;
    if (entry.status === "Removed") return 4;
    const timing = calendarTiming(entry);
    if (timing === "Current") return 0;
    if (timing === "Upcoming") return 1;
    return 2;
  };

  const rankDifference = rank(a) - rank(b);
  if (rankDifference !== 0) return rankDifference;

  const timing = calendarTiming(a);
  if (timing === "Past" || a.status === "Cancelled" || a.status === "Removed") {
    return dateNumber(b.endDate) - dateNumber(a.endDate);
  }

  return dateNumber(a.startDate) - dateNumber(b.startDate);
}

function calendarDateHint(entry: FineCalendarEntry) {
  const timing = calendarTiming(entry);
  if (timing === "Current") return "Happening today";

  if (timing === "Upcoming") {
    const days = dateNumber(entry.startDate) - dateNumber(todayKey.value);
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
  }

  const days = dateNumber(todayKey.value) - dateNumber(entry.endDate);
  if (days === 1) return "Ended yesterday";
  return `Ended ${days} days ago`;
}

function clearCalendarFilters() {
  calendarSearch.value = "";
  calendarSource.value = "All entries";
  calendarClassification.value = "All types";
  calendarDateView.value = "All dates";
  calendarStatus.value = "Active";
}

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
  if (value === "Removed") return "neutral";
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
        title: "Unable to refresh holidays",
        description: result?.cachedOnly
          ? `The existing holiday dates for ${year} were kept. Please try again later.`
          : `No holiday dates were added for ${year}. Please try again later.`,
        color: result?.cachedOnly ? "warning" : "error",
        icon: "i-lucide-circle-alert",
      });
      await loadCalendar();
      return;
    }

    const counts = result.classificationCounts;
    const countDetails = counts
      ? `${counts.regularHolidays} regular, ${counts.specialNonWorkingDays} special non-working, and ${counts.specialWorkingDays} special working day(s).`
      : `${result.total ?? 0} official holiday date(s).`;

    toast.add({
      title: result.repairedIncompleteCalendar
        ? "Holiday calendar repaired"
        : "Holiday calendar refreshed",
      description: `${countDetails} The official ${year} calendar is ready.${result.removed ? ` ${result.removed} outdated date(s) were removed.` : ""}`,
      color: "success",
      icon: "i-lucide-calendar-check",
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

function resetPaymentOrValidation() {
  paymentOrAvailable.value = null;
  paymentOrMessage.value = "";
}

function openPayment(record: LibraryFineRecord) {
  selectedFine.value = record;
  payment.orNumber = "";
  payment.paymentDate = new Date().toISOString().slice(0, 10);
  payment.notes = "";
  resetPaymentOrValidation();
  paymentOpen.value = true;
}

async function checkPaymentOrNumber() {
  const candidate = payment.orNumber.trim();
  if (!candidate) {
    resetPaymentOrValidation();
    return null;
  }

  paymentOrChecking.value = true;
  try {
    const result = await finesApi.checkOrNumber(candidate);
    payment.orNumber = result.orNumber;
    paymentOrAvailable.value = result.available;
    paymentOrMessage.value = result.available
      ? "OR number is available and has not been recorded yet."
      : `This OR number is already recorded${result.existingFineNo ? ` under ${result.existingFineNo}` : ""}. Use the actual cashier receipt for this payment.`;
    return result;
  } catch (error) {
    paymentOrAvailable.value = null;
    paymentOrMessage.value = auth.getErrorMessage(error);
    return null;
  } finally {
    paymentOrChecking.value = false;
  }
}

async function verifyPayment() {
  if (!selectedFine.value || !payment.orNumber.trim() || paymentOrAvailable.value === false) return;
  saving.value = true;
  try {
    let orNumber = payment.orNumber.trim();
    if (paymentOrAvailable.value !== true) {
      const availability = await checkPaymentOrNumber();
      if (!availability?.available) return;
      orNumber = availability.orNumber;
    }

    await finesApi.verifyPayment(selectedFine.value.documentId, {
      orNumber,
      paymentDate: payment.paymentDate,
      notes: payment.notes.trim() || undefined,
    });
    paymentOpen.value = false;
    toast.add({ title: "Payment verified", description: `Official Receipt ${orNumber} was recorded and the fine is now marked Paid.`, color: "success", icon: "i-lucide-badge-check" });
    await loadFines();
  } catch (error) {
    paymentOrAvailable.value = false;
    paymentOrMessage.value = auth.getErrorMessage(error);
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

function openCancelCalendar(record: FineCalendarEntry) {
  if (record.automatic) return;
  calendarToCancel.value = record;
  cancelCalendarReason.value = record.reason || "Schedule changed";
  cancelCalendarOpen.value = true;
}

async function confirmCancelCalendar() {
  if (!calendarToCancel.value || !cancelCalendarReason.value.trim()) return;
  saving.value = true;
  try {
    await finesApi.cancelCalendar(calendarToCancel.value.documentId, cancelCalendarReason.value.trim());
    cancelCalendarOpen.value = false;
    toast.add({ title: "No-fine period cancelled", color: "success", icon: "i-lucide-circle-check" });
    await loadCalendar();
  } catch (error) {
    toast.add({ title: "Unable to cancel period", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    saving.value = false;
  }
}

function openRemoveCalendar(record: FineCalendarEntry) {
  calendarToRemove.value = record;
  removeCalendarReason.value = record.automatic
    ? "Not applicable to the library calendar"
    : "No longer needed";
  removeCalendarOpen.value = true;
}

async function confirmRemoveCalendar() {
  if (!calendarToRemove.value || !removeCalendarReason.value.trim()) return;
  saving.value = true;
  try {
    await finesApi.removeCalendar(calendarToRemove.value.documentId, removeCalendarReason.value.trim());
    removeCalendarOpen.value = false;
    toast.add({
      title: "Calendar entry removed",
      description: "The entry will no longer affect fine calculations. It can be restored from the Removed filter.",
      color: "success",
      icon: "i-lucide-trash-2",
    });
    await loadCalendar();
  } catch (error) {
    toast.add({ title: "Unable to remove entry", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    saving.value = false;
  }
}

async function restoreCalendar(record: FineCalendarEntry) {
  saving.value = true;
  try {
    await finesApi.restoreCalendar(record.documentId);
    toast.add({ title: "Calendar entry restored", color: "success", icon: "i-lucide-rotate-ccw" });
    await loadCalendar();
  } catch (error) {
    toast.add({ title: "Unable to restore entry", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    saving.value = false;
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
          <div
            class="flex size-11 items-center justify-center rounded-2xl"
            :class="activeView === 'calendar' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'"
          >
            <UIcon :name="activeView === 'calendar' ? 'i-lucide-calendar-off' : 'i-lucide-receipt-text'" class="size-6" />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
              {{ activeView === 'calendar' ? 'No-Fine Days' : 'Fines and Cashier Payments' }}
            </h1>
            <p class="mt-1 max-w-3xl text-sm text-muted">
              {{ activeView === 'calendar'
                ? 'View official Philippine holidays and school-approved no-fine dates. Special working days are shown for reference.'
                : 'Review fines, verify cashier Official Receipts, and process Library Card replacement charges.' }}
            </p>
          </div>
        </div>
        <div class="inline-flex w-full rounded-xl border border-default bg-elevated p-1 sm:w-auto">
          <UButton class="flex-1 sm:flex-none" label="Fines & Payments" icon="i-lucide-philippine-peso" :variant="activeView === 'payments' ? 'solid' : 'ghost'" :color="activeView === 'payments' ? 'primary' : 'neutral'" @click="activeView = 'payments'" />
          <UButton class="flex-1 sm:flex-none" label="No-Fine Days" icon="i-lucide-calendar-off" :variant="activeView === 'calendar' ? 'solid' : 'ghost'" :color="activeView === 'calendar' ? 'primary' : 'neutral'" @click="activeView = 'calendar'" />
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
          icon="i-lucide-calendar-heart"
          title="How the holiday calendar works"
          description="Regular holidays, special non-working days, and approved school dates pause overdue-fine counting. Special working days are displayed for reference, but fines continue normally."
        />

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UCard>
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm text-muted">Next No-Fine Day</p>
                <p class="mt-2 text-xl font-bold text-highlighted">
                  {{ nextNoFineDay ? dateLabel(nextNoFineDay.startDate) : 'None scheduled' }}
                </p>
                <p v-if="nextNoFineDay" class="mt-1 truncate text-sm text-muted">{{ nextNoFineDay.title }}</p>
              </div>
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon name="i-lucide-calendar-clock" class="size-5" />
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm text-muted">Upcoming or Ongoing</p>
                <p class="mt-2 text-3xl font-bold text-highlighted">{{ upcomingNoFineCount }}</p>
                <p class="mt-1 text-xs text-muted">Active dates from today onward</p>
              </div>
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success">
                <UIcon name="i-lucide-calendar-check-2" class="size-5" />
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm text-muted">Official Holiday Dates</p>
                <p class="mt-2 text-3xl font-bold text-highlighted">{{ automaticHolidayCount }}</p>
                <p class="mt-1 text-xs text-muted">
                  {{ regularHolidayCount }} regular · {{ specialNonWorkingCount }} special non-working · {{ specialWorkingCount }} special working
                </p>
              </div>
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <UIcon name="i-lucide-flag" class="size-5" />
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm text-muted">School-Added Dates</p>
                <p class="mt-2 text-3xl font-bold text-highlighted">{{ schoolAddedCount }}</p>
                <p class="mt-1 text-xs text-muted">Events, suspensions, and closures</p>
              </div>
              <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
                <UIcon name="i-lucide-school" class="size-5" />
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">Holiday and No-Fine Calendar</h2>
                <p class="mt-1 text-sm text-muted">Official 2026 holidays follow Proclamation No. 1006 and the separate Eid proclamations. Nearest dates appear first.</p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <USelect v-model="calendarYear" :items="calendarYearItems" class="w-32" aria-label="Calendar year" />
                <UButton
                  label="Refresh Holidays"
                  icon="i-lucide-refresh-cw"
                  color="neutral"
                  variant="outline"
                  :loading="holidaySyncing"
                  @click="syncPhilippineHolidays"
                />
                <UButton label="Add No-Fine Day" icon="i-lucide-plus" color="success" @click="openCalendar()" />
              </div>
            </div>
          </template>

          <div class="mb-5 rounded-2xl border border-default bg-elevated/50 p-4">
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_13rem_14rem_14rem_12rem]">
              <UInput
                v-model="calendarSearch"
                icon="i-lucide-search"
                placeholder="Search holiday or school event"
              />
              <USelect v-model="calendarSource" :items="calendarSourceItems" aria-label="Entry source" />
              <USelect v-model="calendarClassification" :items="calendarClassificationItems" aria-label="Holiday or event type" />
              <USelect v-model="calendarDateView" :items="calendarDateViewItems" aria-label="Date filter" />
              <USelect v-model="calendarStatus" :items="calendarStatusItems" aria-label="Status filter" />
            </div>
            <div class="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p class="text-muted">Showing {{ filteredCalendar.length }} of {{ calendar.length }} scheduled date(s)</p>
              <UButton
                v-if="hasCalendarFilters"
                label="Clear Filters"
                icon="i-lucide-filter-x"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="clearCalendarFilters"
              />
            </div>
          </div>

          <div v-if="calendarLoading" class="space-y-3">
            <USkeleton v-for="i in 5" :key="i" class="h-16 w-full" />
          </div>

          <div v-else-if="filteredCalendar.length === 0" class="py-14 text-center">
            <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-elevated text-dimmed">
              <UIcon name="i-lucide-calendar-search" class="size-7" />
            </div>
            <h3 class="mt-4 font-semibold text-highlighted">No matching holiday or no-fine dates</h3>
            <p class="mx-auto mt-1 max-w-md text-sm text-muted">
              {{ calendar.length ? 'Try changing or clearing the filters.' : `Refresh the ${calendarYear} holidays or add a school-specific date.` }}
            </p>
            <UButton
              v-if="calendar.length && hasCalendarFilters"
              label="Clear Filters"
              icon="i-lucide-filter-x"
              class="mt-4"
              color="neutral"
              variant="outline"
              @click="clearCalendarFilters"
            />
          </div>

          <UTable v-else :data="filteredCalendar" :columns="calendarColumns">
            <template #event-cell="{ row }">
              <div class="min-w-56">
                <p class="font-semibold text-highlighted">{{ row.original.title }}</p>
                <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <UBadge :color="row.original.automatic ? 'primary' : 'neutral'" variant="soft">
                    {{ row.original.automatic ? 'Official Holiday' : 'School-Added' }}
                  </UBadge>
                  <UBadge
                    :color="row.original.type === 'Special Working Day' ? 'warning' : 'neutral'"
                    variant="subtle"
                  >
                    {{ row.original.type }}
                  </UBadge>
                </div>
                <p
                  v-if="row.original.reason && (!row.original.automatic || row.original.status === 'Removed')"
                  class="mt-2 max-w-lg text-xs text-muted"
                >
                  {{ row.original.reason }}
                </p>
              </div>
            </template>

            <template #dates-cell="{ row }">
              <p class="font-medium text-highlighted">{{ dateLabel(row.original.startDate) }}</p>
              <p v-if="row.original.endDate !== row.original.startDate" class="text-xs text-muted">
                to {{ dateLabel(row.original.endDate) }}
              </p>
              <p
                class="mt-1 text-xs font-medium"
                :class="calendarTiming(row.original) === 'Current' ? 'text-success' : 'text-muted'"
              >
                {{ calendarDateHint(row.original) }}
              </p>
            </template>

            <template #resume-cell="{ row }">
              <template v-if="row.original.status !== 'Active'">
                <p class="font-medium text-muted">Not applied</p>
                <p class="mt-1 text-xs text-muted">This entry does not affect fines</p>
              </template>
              <template v-else-if="!row.original.affectsFines">
                <p class="font-medium text-warning">Fines continue</p>
                <p class="mt-1 text-xs text-muted">Official special working day</p>
              </template>
              <template v-else>
                <p class="font-medium text-highlighted">{{ dateLabel(row.original.resumeDate) }}</p>
                <p class="mt-1 text-xs text-muted">Fine counting resumes</p>
              </template>
            </template>

            <template #status-cell="{ row }">
              <UBadge :color="statusColor(row.original.status)" variant="soft">{{ row.original.status }}</UBadge>
            </template>

            <template #actions-cell="{ row }">
              <div class="flex flex-wrap gap-2">
                <UButton
                  v-if="row.original.status === 'Removed'"
                  label="Restore"
                  icon="i-lucide-rotate-ccw"
                  size="sm"
                  color="success"
                  variant="outline"
                  :loading="saving"
                  @click="restoreCalendar(row.original)"
                />
                <template v-else>
                  <UButton
                    v-if="!row.original.automatic"
                    label="Edit"
                    icon="i-lucide-pencil"
                    size="sm"
                    color="neutral"
                    variant="outline"
                    @click="openCalendar(row.original)"
                  />
                  <UButton
                    v-if="!row.original.automatic && row.original.status === 'Active'"
                    label="Cancel"
                    icon="i-lucide-x"
                    size="sm"
                    color="warning"
                    variant="ghost"
                    @click="openCancelCalendar(row.original)"
                  />
                  <UButton
                    label="Remove"
                    icon="i-lucide-trash-2"
                    size="sm"
                    color="error"
                    variant="ghost"
                    @click="openRemoveCalendar(row.original)"
                  />
                </template>
              </div>
            </template>
          </UTable>
        </UCard>
      </template>
    </div>

    <UModal v-model:open="paymentOpen" :ui="{ content: 'sm:max-w-lg' }"><template #content><div class="space-y-5 bg-default p-6"><div><h2 class="text-xl font-bold">Verify Cashier Payment</h2><p class="mt-1 text-sm text-muted">Record the Official Receipt before marking {{ selectedFine?.fineNo }} as Paid.</p></div><UAlert color="warning" variant="soft" icon="i-lucide-receipt-text" :title="selectedFine ? money(selectedFine.amount) : ''" description="Compare the OR with the Student or Faculty record before confirming." /><UFormField label="Official Receipt (OR) Number" required><UInput v-model="payment.orNumber" maxlength="120" autocomplete="off" spellcheck="false" placeholder="Enter unique cashier OR number" @update:model-value="resetPaymentOrValidation" @blur="checkPaymentOrNumber" /><p v-if="paymentOrChecking" class="mt-1 text-xs text-muted">Checking OR number…</p><p v-else-if="paymentOrMessage" class="mt-1 text-xs" :class="paymentOrAvailable === false ? 'text-error' : paymentOrAvailable === true ? 'text-success' : 'text-muted'">{{ paymentOrMessage }}</p></UFormField><UFormField label="Payment Date" required><UInput v-model="payment.paymentDate" type="date" /></UFormField><UFormField label="Verification Notes" hint="Optional"><UTextarea v-model="payment.notes" :rows="3" /></UFormField><div class="flex justify-end gap-2"><UButton label="Cancel" color="neutral" variant="ghost" @click="paymentOpen = false" /><UButton label="Verify Payment" icon="i-lucide-badge-check" color="success" :loading="saving || paymentOrChecking" :disabled="!payment.orNumber.trim() || paymentOrAvailable === false" @click="verifyPayment" /></div></div></template></UModal>

    <UModal v-model:open="waiverOpen" :ui="{ content: 'sm:max-w-lg' }"><template #content><div class="space-y-5 bg-default p-6"><div><h2 class="text-xl font-bold">Waive Fine</h2><p class="mt-1 text-sm text-muted">A reason is required and will be included in the audit trail.</p></div><UFormField label="Waiver Reason" required><UTextarea v-model="waiverReason" :rows="4" /></UFormField><div class="flex justify-end gap-2"><UButton label="Cancel" color="neutral" variant="ghost" @click="waiverOpen = false" /><UButton label="Confirm Waiver" icon="i-lucide-scale" color="warning" :loading="saving" :disabled="!waiverReason.trim()" @click="waiveFine" /></div></div></template></UModal>

    <UModal v-model:open="calendarOpen" :ui="{ content: 'sm:max-w-xl' }"><template #content><div class="space-y-5 bg-default p-6"><div><h2 class="text-xl font-bold">{{ editingCalendar ? 'Update No-Fine Period' : 'Add No-Fine Period' }}</h2><p class="mt-1 text-sm text-muted">Use this for school events, class suspensions, disasters, or emergency closures. Official Philippine holidays are added automatically.</p></div><div class="grid gap-4 sm:grid-cols-2"><UFormField label="Title" required class="sm:col-span-2"><UInput v-model="calendarForm.title" placeholder="Example: Typhoon class suspension" /></UFormField><UFormField label="Type" required><USelect v-model="calendarForm.type" :items="calendarTypes" /></UFormField><UFormField label="Start Date" required><UInput v-model="calendarForm.startDate" type="date" /></UFormField><UFormField label="End Date" required><UInput v-model="calendarForm.endDate" type="date" /></UFormField><UFormField label="Resume Fine Counting" hint="Optional — the no-fine period ends on the previous date"><UInput v-model="calendarForm.resumeDate" type="date" /></UFormField><UFormField label="Reason or Details" hint="Optional" class="sm:col-span-2"><UTextarea v-model="calendarForm.reason" :rows="3" /></UFormField></div><div class="flex justify-end gap-2"><UButton label="Cancel" color="neutral" variant="ghost" @click="calendarOpen = false" /><UButton label="Save Period" icon="i-lucide-save" color="success" :loading="saving" :disabled="!calendarForm.title.trim() || !calendarForm.startDate || !calendarForm.endDate" @click="saveCalendar" /></div></div></template></UModal>

    <UModal v-model:open="cancelCalendarOpen" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <div class="space-y-5 bg-default p-6">
          <div>
            <h2 class="text-xl font-bold text-highlighted">Cancel No-Fine Period</h2>
            <p class="mt-1 text-sm text-muted">This will keep the record for reference but stop it from affecting fine calculations.</p>
          </div>
          <UAlert
            v-if="calendarToCancel"
            color="warning"
            variant="soft"
            icon="i-lucide-calendar-x"
            :title="calendarToCancel.title"
            :description="`${dateLabel(calendarToCancel.startDate)} to ${dateLabel(calendarToCancel.endDate)}`"
          />
          <UFormField label="Reason for Cancellation" required>
            <UTextarea v-model="cancelCalendarReason" :rows="4" placeholder="Explain why this date is being cancelled" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="Keep Period" color="neutral" variant="ghost" @click="cancelCalendarOpen = false" />
            <UButton
              label="Cancel Period"
              icon="i-lucide-calendar-x"
              color="error"
              :loading="saving"
              :disabled="!cancelCalendarReason.trim()"
              @click="confirmCancelCalendar"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="removeCalendarOpen" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <div class="space-y-5 bg-default p-6">
          <div>
            <h2 class="text-xl font-bold text-highlighted">Remove Calendar Entry</h2>
            <p class="mt-1 text-sm text-muted">Removed entries are hidden from the active calendar and do not affect fine calculations.</p>
          </div>
          <UAlert
            v-if="calendarToRemove"
            color="error"
            variant="soft"
            icon="i-lucide-trash-2"
            :title="calendarToRemove.title"
            :description="calendarToRemove.automatic
              ? 'This official holiday will remain removed after future holiday refreshes unless it is restored.'
              : `${dateLabel(calendarToRemove.startDate)} to ${dateLabel(calendarToRemove.endDate)}`"
          />
          <UFormField label="Reason for Removal" required>
            <UTextarea v-model="removeCalendarReason" :rows="4" placeholder="Explain why this entry should be removed" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton label="Keep Entry" color="neutral" variant="ghost" @click="removeCalendarOpen = false" />
            <UButton
              label="Remove Entry"
              icon="i-lucide-trash-2"
              color="error"
              :loading="saving"
              :disabled="!removeCalendarReason.trim()"
              @click="confirmRemoveCalendar"
            />
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
