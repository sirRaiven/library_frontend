<script setup lang="ts">
import type { MembershipListItem, StudentMember } from "~/composables/useLibraryMembers";
import type { TableColumn } from "@nuxt/ui";
import StudentLibraryCard from "~/components/librarian/StudentLibraryCard.vue";

definePageMeta({ layout: "librarian", title: "Library Cards" });

const route = useRoute();
const members = useLibraryMembers();
const auth = useAuth();
const toast = useToast();

const barcode = ref("");
const scannedStudent = ref<StudentMember | null>(null);
const canRenew = ref(false);
const lookupReason = ref<string | null>(null);
const lookupLoading = ref(false);
const renewing = ref(false);

const memberships = ref<MembershipListItem[]>([]);
const search = ref("");
const statusFilter = ref("All");
const semesterFilter = ref("All");
const academicYearFilter = ref("");
const page = ref(1);
const pageSize = 10;
const loading = ref(false);

const pagination = reactive({ page: 1, pageSize, pageCount: 1, total: 0 });
const summary = reactive({ totalMemberships: 0, active: 0, expired: 0, suspended: 0 });

function currentAcademicYear() {
  const date = new Date();
  const year = date.getFullYear();
  return date.getMonth() + 1 >= 6
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
}

function currentSemester() {
  const month = new Date().getMonth() + 1;
  if (month >= 6) return "First Semester";
  if (month <= 4) return "Second Semester";
  return "Summer";
}

function defaultExpiry() {
  const date = new Date();
  date.setMonth(date.getMonth() + 5);
  return date.toISOString().slice(0, 10);
}

const renewal = reactive({
  academicYear: currentAcademicYear(),
  semester: currentSemester(),
  issuedDate: new Date().toISOString().slice(0, 10),
  expiryDate: defaultExpiry(),
  enrollmentVerified: false,
  enrollmentReference: "",
  remarks: "",
});

const statusItems = ["All", "Active", "Expired", "Suspended", "Cancelled"];
const semesterItems = ["All", "First Semester", "Second Semester", "Summer"];
const renewalSemesters = semesterItems.slice(1);

const columns: TableColumn<MembershipListItem>[] = [
  { id: "student", header: "Student" },
  { id: "term", header: "Academic Term" },
  { id: "validity", header: "Validity" },
  { accessorKey: "status", header: "Status" },
  { id: "verified", header: "Verified By" },
];

const cards = computed(() => [
  { label: "Membership Records", value: summary.totalMemberships, icon: "i-lucide-id-card" },
  { label: "Active", value: summary.active, icon: "i-lucide-badge-check" },
  { label: "Expired", value: summary.expired, icon: "i-lucide-clock-alert" },
  { label: "Suspended", value: summary.suspended, icon: "i-lucide-shield-alert" },
]);

function statusColor(value?: string | null) {
  if (value === "Active") return "success";
  if (value === "Suspended") return "warning";
  return "error";
}

async function lookupCard() {
  if (!barcode.value.trim()) return;
  lookupLoading.value = true;
  try {
    const response = await members.lookupStudentCard(barcode.value);
    scannedStudent.value = response.data.student;
    canRenew.value = response.data.canRenew;
    lookupReason.value = response.data.reason;
  } catch (error) {
    scannedStudent.value = null;
    canRenew.value = false;
    toast.add({ title: "Card not found", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    lookupLoading.value = false;
  }
}

async function renewMembership() {
  if (!scannedStudent.value) return;
  if (!renewal.enrollmentVerified) {
    toast.add({
      title: "Enrollment verification required",
      description: "Confirm that the student submitted a current enrollment document.",
      color: "warning",
      icon: "i-lucide-file-check-2",
    });
    return;
  }

  renewing.value = true;
  try {
    const response = await members.renewMembership({
      barcode: scannedStudent.value.barcode,
      ...renewal,
    });
    scannedStudent.value = response.data.student;
    toast.add({
      title: "Membership renewed",
      description: `${response.data.student.fullName} is active for ${response.data.membership.semester}, ${response.data.membership.academicYear}.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
    renewal.enrollmentVerified = false;
    renewal.enrollmentReference = "";
    renewal.remarks = "";
    await loadMemberships();
  } catch (error) {
    toast.add({ title: "Renewal failed", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    renewing.value = false;
  }
}

function clearScanner() {
  barcode.value = "";
  scannedStudent.value = null;
  canRenew.value = false;
  lookupReason.value = null;
}

async function loadMemberships() {
  loading.value = true;
  try {
    const response = await members.listMemberships({
      search: search.value.trim(),
      status: statusFilter.value,
      semester: semesterFilter.value,
      academicYear: academicYearFilter.value.trim(),
      page: page.value,
      pageSize,
    });
    memberships.value = response.data;
    Object.assign(pagination, response.meta.pagination);
    Object.assign(summary, response.meta.summary);
  } catch (error) {
    toast.add({ title: "Unable to load memberships", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    loading.value = false;
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    void loadMemberships();
  }, 350);
});
watch([statusFilter, semesterFilter], () => {
  page.value = 1;
  void loadMemberships();
});
watch(page, () => void loadMemberships());

onMounted(async () => {
  await loadMemberships();
  if (typeof route.query.barcode === "string") {
    barcode.value = route.query.barcode;
    await lookupCard();
  }
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-[1500px] space-y-6">
      <div class="flex items-start gap-3">
        <div class="flex size-11 items-center justify-center rounded-2xl bg-success/10 text-success">
          <UIcon name="i-lucide-id-card" class="size-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">Student Membership Renewal</h1>
          <p class="mt-1 max-w-3xl text-sm text-muted">Scan the permanent library-card barcode, verify the new-semester enrollment copy, and renew without re-entering the student profile.</p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UCard v-for="card in cards" :key="card.label">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">{{ card.label }}</p>
              <p class="mt-2 text-3xl font-bold text-highlighted">{{ card.value }}</p>
            </div>
            <div class="flex size-11 items-center justify-center rounded-xl bg-elevated text-success">
              <UIcon :name="card.icon" class="size-5" />
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
                <UIcon name="i-lucide-scan-barcode" class="size-5" />
              </div>
              <div>
                <h2 class="font-semibold text-highlighted">Scan Library Card</h2>
                <p class="text-sm text-muted">Barcode scanners can submit by pressing Enter.</p>
              </div>
            </div>
          </template>

          <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="lookupCard">
            <UInput v-model="barcode" icon="i-lucide-scan-barcode" placeholder="Scan barcode, card number, or student number" autocomplete="off" size="xl" autofocus class="flex-1" />
            <UButton type="submit" label="Find Student" icon="i-lucide-search" color="success" size="xl" :loading="lookupLoading" />
          </form>

          <div v-if="scannedStudent" class="mt-6 grid gap-6 lg:grid-cols-2">
            <StudentLibraryCard :student="scannedStudent" :membership="scannedStudent.membership" :show-actions="false" />

            <div class="space-y-4">
              <div class="rounded-2xl border border-default bg-elevated/50 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-semibold text-highlighted">{{ scannedStudent.fullName }}</p>
                    <p class="mt-1 text-sm text-muted">{{ scannedStudent.studentNo }} • {{ scannedStudent.course }}</p>
                  </div>
                  <UBadge :color="statusColor(scannedStudent.membership?.status)" variant="soft">{{ scannedStudent.membership?.status ?? "Expired" }}</UBadge>
                </div>
              </div>

              <UAlert v-if="!canRenew" color="error" variant="soft" icon="i-lucide-circle-alert" title="Renewal unavailable" :description="lookupReason ?? 'This student cannot be renewed.'" />

              <div class="grid gap-4 sm:grid-cols-2">
                <UFormField label="Academic Year" required><UInput v-model="renewal.academicYear" class="w-full" /></UFormField>
                <UFormField label="Semester" required><USelect v-model="renewal.semester" :items="renewalSemesters" class="w-full" /></UFormField>
                <UFormField label="Issued Date" required><UInput v-model="renewal.issuedDate" type="date" class="w-full" /></UFormField>
                <UFormField label="Valid Until" required><UInput v-model="renewal.expiryDate" type="date" class="w-full" /></UFormField>
                <UFormField label="Enrollment Reference" class="sm:col-span-2"><UInput v-model="renewal.enrollmentReference" class="w-full" /></UFormField>
                <UFormField label="Remarks" class="sm:col-span-2"><UTextarea v-model="renewal.remarks" :rows="2" class="w-full" /></UFormField>
              </div>

              <div class="rounded-xl border border-default bg-default p-4">
                <UCheckbox v-model="renewal.enrollmentVerified" label="The student submitted a copy of enrollment for the selected semester." />
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <UButton label="Scan Another" icon="i-lucide-scan-line" color="neutral" variant="outline" block @click="clearScanner" />
                <UButton label="Renew Membership" icon="i-lucide-rotate-cw" color="success" block :disabled="!canRenew || !renewal.enrollmentVerified" :loading="renewing" @click="renewMembership" />
              </div>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold text-highlighted">Renewal Checklist</h2></template>
          <div class="space-y-4">
            <div v-for="(step, index) in [
              'Receive the student library card.',
              'Verify the new-semester enrollment copy.',
              'Scan the permanent barcode.',
              'Confirm the academic term and validity date.',
              'Complete renewal and return the card.'
            ]" :key="step" class="flex gap-3">
              <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/10 text-xs font-bold text-success">{{ index + 1 }}</div>
              <p class="text-sm leading-relaxed text-muted">{{ step }}</p>
            </div>
          </div>
          <template #footer>
            <UAlert color="info" variant="soft" icon="i-lucide-info" title="Faculty are excluded" description="Faculty use the barcode on their faculty ID and do not require semester membership renewal." />
          </template>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="font-semibold text-highlighted">Membership History</h2>
              <p class="mt-1 text-sm text-muted">One record is retained for every student and academic term.</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-4">
              <UInput v-model="search" icon="i-lucide-search" placeholder="Search" />
              <UInput v-model="academicYearFilter" placeholder="2026-2027" />
              <USelect v-model="semesterFilter" :items="semesterItems" />
              <USelect v-model="statusFilter" :items="statusItems" />
            </div>
          </div>
        </template>

        <div v-if="loading" class="space-y-3">
          <USkeleton v-for="index in 5" :key="index" class="h-16 w-full" />
        </div>
        <div v-else-if="memberships.length === 0" class="py-16 text-center">
          <UIcon name="i-lucide-id-card" class="mx-auto size-10 text-dimmed" />
          <h3 class="mt-3 font-semibold text-highlighted">No membership records found</h3>
        </div>

        <UTable v-else :data="memberships" :columns="columns">
          <template #student-cell="{ row }">
            <p class="font-semibold text-highlighted">{{ row.original.student.fullName }}</p>
            <p class="text-xs text-muted">{{ row.original.student.studentNo }} • {{ row.original.membershipNo }}</p>
          </template>
          <template #term-cell="{ row }">
            <p class="font-medium text-highlighted">{{ row.original.semester }}</p>
            <p class="text-xs text-muted">{{ row.original.academicYear }} • {{ row.original.renewalType }}</p>
          </template>
          <template #validity-cell="{ row }">
            <p class="text-sm">{{ row.original.issuedDate }}</p>
            <p class="text-xs text-muted">to {{ row.original.expiryDate }}</p>
          </template>
          <template #status-cell="{ row }">
            <UBadge :color="statusColor(row.original.status)" variant="soft">{{ row.original.status }}</UBadge>
          </template>
          <template #verified-cell="{ row }">
            <p class="text-sm text-highlighted">{{ row.original.verifiedBy ?? "Librarian" }}</p>
            <p class="text-xs text-muted">{{ row.original.enrollmentVerified ? "Enrollment verified" : "Not verified" }}</p>
          </template>
        </UTable>

        <template #footer>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-muted">{{ pagination.total }} membership records</p>
            <UPagination v-model:page="page" :total="pagination.total" :items-per-page="pageSize" />
          </div>
        </template>
      </UCard>
    </div>
  </UContainer>
</template>
