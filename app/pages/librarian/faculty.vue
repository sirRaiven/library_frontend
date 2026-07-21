<script setup lang="ts">
import type { FormError, FormSubmitEvent, TableColumn } from "@nuxt/ui";
import type {
  FacultyMember,
  FacultyRegistrationInput,
  FacultyStatus,
} from "~/composables/useLibraryMembers";

definePageMeta({ layout: "librarian", title: "Faculty" });

const members = useLibraryMembers();
const auth = useAuth();
const toast = useToast();

const faculty = ref<FacultyMember[]>([]);
const selected = ref<FacultyMember | null>(null);
const search = ref("");
const statusFilter = ref("All");
const page = ref(1);
const pageSize = 10;
const loading = ref(false);
const submitting = ref(false);
const registrationOpen = ref(false);
const editOpen = ref(false);

const pagination = reactive({ page: 1, pageSize, pageCount: 1, total: 0 });
const summary = reactive({
  totalFaculty: 0,
  activeFaculty: 0,
  inactiveFaculty: 0,
  retiredFaculty: 0,
});

const form = reactive<FacultyRegistrationInput>({
  employeeNo: "",
  barcode: "",
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  department: "",
  designation: "",
  email: "",
  contactNo: "",
});

const editForm = reactive({
  barcode: "",
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  department: "",
  designation: "",
  email: "",
  contactNo: "",
  status: "Active" as FacultyStatus,
});

const statusItems = ["All", "Active", "Inactive", "Retired"];
const columns: TableColumn<FacultyMember>[] = [
  { id: "faculty", header: "Faculty" },
  { id: "barcode", header: "Faculty ID Barcode" },
  { id: "contact", header: "Contact" },
  { accessorKey: "status", header: "Status" },
  { id: "actions", header: "" },
];

const cards = computed(() => [
  { label: "Registered Faculty", value: summary.totalFaculty, icon: "i-lucide-users" },
  { label: "Active", value: summary.activeFaculty, icon: "i-lucide-user-check" },
  { label: "Inactive", value: summary.inactiveFaculty, icon: "i-lucide-user-minus" },
  { label: "Retired", value: summary.retiredFaculty, icon: "i-lucide-archive" },
]);

function validate(state: FacultyRegistrationInput): FormError[] {
  const errors: FormError[] = [];
  if (!state.employeeNo.trim()) errors.push({ name: "employeeNo", message: "Employee number is required." });
  if (!state.barcode.trim()) errors.push({ name: "barcode", message: "Scan or enter the faculty ID barcode." });
  if (!state.firstName.trim()) errors.push({ name: "firstName", message: "First name is required." });
  if (!state.lastName.trim()) errors.push({ name: "lastName", message: "Last name is required." });
  if (!state.department.trim()) errors.push({ name: "department", message: "Department is required." });
  return errors;
}

async function loadFaculty() {
  loading.value = true;
  try {
    const response = await members.listFaculty({
      search: search.value.trim(),
      status: statusFilter.value,
      page: page.value,
      pageSize,
    });
    faculty.value = response.data;
    Object.assign(pagination, response.meta.pagination);
    Object.assign(summary, response.meta.summary);
  } catch (error) {
    toast.add({ title: "Unable to load faculty", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    employeeNo: "",
    barcode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    department: "",
    designation: "",
    email: "",
    contactNo: "",
  });
}

async function registerFaculty(_event: FormSubmitEvent<FacultyRegistrationInput>) {
  submitting.value = true;
  try {
    const response = await members.registerFaculty(form);
    registrationOpen.value = false;
    toast.add({
      title: "Faculty registered",
      description: `${response.data.fullName} can now use the existing faculty ID barcode for library services.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
    resetForm();
    await loadFaculty();
  } catch (error) {
    toast.add({ title: "Registration failed", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    submitting.value = false;
  }
}

function openEdit(record: FacultyMember) {
  selected.value = record;
  Object.assign(editForm, {
    barcode: record.barcode,
    firstName: record.firstName,
    middleName: record.middleName,
    lastName: record.lastName,
    suffix: record.suffix,
    department: record.department,
    designation: record.designation,
    email: record.email,
    contactNo: record.contactNo,
    status: record.status,
  });
  editOpen.value = true;
}

async function saveFaculty() {
  if (!selected.value) return;
  submitting.value = true;
  try {
    await members.updateFaculty(selected.value.documentId, editForm);
    editOpen.value = false;
    toast.add({ title: "Faculty updated", description: "The faculty profile was saved.", color: "success", icon: "i-lucide-save" });
    await loadFaculty();
  } catch (error) {
    toast.add({ title: "Update failed", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    submitting.value = false;
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    void loadFaculty();
  }, 350);
});
watch(statusFilter, () => {
  page.value = 1;
  void loadFaculty();
});
watch(page, () => void loadFaculty());
onMounted(() => void loadFaculty());
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-[1500px] space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-briefcase-business" class="size-6" />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">Faculty Directory</h1>
            <p class="mt-1 max-w-3xl text-sm text-muted">Faculty use the barcode already printed on their faculty ID. No separate library card or semester membership is required.</p>
          </div>
        </div>
        <UButton label="Register Faculty" icon="i-lucide-user-plus" color="success" @click="registrationOpen = true" />
      </div>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-badge-check"
        title="Faculty ID is the library credential"
        description="Scan the existing faculty ID barcode during registration. The same barcode is used for borrowing, returning, and reservations."
      />

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UCard v-for="card in cards" :key="card.label">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-muted">{{ card.label }}</p>
              <p class="mt-2 text-3xl font-bold text-highlighted">{{ card.value }}</p>
            </div>
            <div class="flex size-11 items-center justify-center rounded-xl bg-elevated text-primary">
              <UIcon :name="card.icon" class="size-5" />
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="font-semibold text-highlighted">Faculty Records</h2>
              <p class="mt-1 text-sm text-muted">Search by name, employee number, barcode, or department.</p>
            </div>
            <div class="flex flex-col gap-2 sm:flex-row">
              <UInput v-model="search" icon="i-lucide-search" placeholder="Search faculty" class="w-full sm:w-64" />
              <USelect v-model="statusFilter" :items="statusItems" class="w-full sm:w-40" />
            </div>
          </div>
        </template>

        <div v-if="loading" class="space-y-3">
          <USkeleton v-for="index in 6" :key="index" class="h-16 w-full" />
        </div>

        <div v-else-if="faculty.length === 0" class="py-16 text-center">
          <UIcon name="i-lucide-users" class="mx-auto size-10 text-dimmed" />
          <h3 class="mt-3 font-semibold text-highlighted">No faculty records found</h3>
        </div>

        <UTable v-else :data="faculty" :columns="columns">
          <template #faculty-cell="{ row }">
            <div class="flex items-center gap-3">
              <UAvatar :src="row.original.photoUrl ?? undefined" :alt="row.original.fullName" size="md" />
              <div class="min-w-0">
                <p class="truncate font-semibold text-highlighted">{{ row.original.fullName }}</p>
                <p class="truncate text-xs text-muted">{{ row.original.employeeNo }} • {{ row.original.department }}</p>
              </div>
            </div>
          </template>
          <template #barcode-cell="{ row }">
            <div class="inline-flex items-center gap-2 rounded-lg bg-elevated px-3 py-2">
              <UIcon name="i-lucide-scan-barcode" class="size-4 text-primary" />
              <span class="font-mono text-sm font-semibold text-highlighted">{{ row.original.barcode }}</span>
            </div>
          </template>
          <template #contact-cell="{ row }">
            <p class="text-sm text-highlighted">{{ row.original.email || "—" }}</p>
            <p class="text-xs text-muted">{{ row.original.contactNo || "No contact number" }}</p>
          </template>
          <template #status-cell="{ row }">
            <UBadge :color="row.original.status === 'Active' ? 'success' : 'neutral'" variant="soft">{{ row.original.status }}</UBadge>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end">
              <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" square aria-label="Edit faculty" @click="openEdit(row.original)" />
            </div>
          </template>
        </UTable>

        <template #footer>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-muted">Showing {{ faculty.length }} of {{ pagination.total }} faculty members</p>
            <UPagination v-model:page="page" :total="pagination.total" :items-per-page="pageSize" />
          </div>
        </template>
      </UCard>
    </div>

    <UModal v-model:open="registrationOpen" :dismissible="!submitting" :ui="{ content: 'sm:max-w-3xl max-h-[90dvh] overflow-y-auto' }">
      <template #content>
        <div class="bg-default p-6 sm:p-8">
          <h2 class="text-xl font-bold text-highlighted">Register Faculty</h2>
          <p class="mt-1 text-sm text-muted">Scan the existing faculty ID barcode. The system will not generate a second library card.</p>
          <UForm :state="form" :validate="validate" class="mt-6 space-y-5" @submit="registerFaculty">
            <div class="grid gap-4 md:grid-cols-2">
              <UFormField name="employeeNo" label="Employee Number" required><UInput v-model="form.employeeNo" class="w-full" /></UFormField>
              <UFormField name="barcode" label="Faculty ID Barcode" required description="Scan the barcode printed on the faculty ID."><UInput v-model="form.barcode" icon="i-lucide-scan-barcode" autofocus class="w-full" /></UFormField>
              <UFormField name="firstName" label="First Name" required><UInput v-model="form.firstName" class="w-full" /></UFormField>
              <UFormField name="middleName" label="Middle Name"><UInput v-model="form.middleName" class="w-full" /></UFormField>
              <UFormField name="lastName" label="Last Name" required><UInput v-model="form.lastName" class="w-full" /></UFormField>
              <UFormField name="suffix" label="Suffix"><UInput v-model="form.suffix" class="w-full" /></UFormField>
              <UFormField name="department" label="Department" required><UInput v-model="form.department" class="w-full" /></UFormField>
              <UFormField name="designation" label="Designation"><UInput v-model="form.designation" class="w-full" /></UFormField>
              <UFormField name="email" label="Email"><UInput v-model="form.email" type="email" class="w-full" /></UFormField>
              <UFormField name="contactNo" label="Contact Number"><UInput v-model="form.contactNo" class="w-full" /></UFormField>
            </div>
            <div class="flex justify-end gap-3">
              <UButton label="Cancel" color="neutral" variant="outline" @click="registrationOpen = false" />
              <UButton type="submit" label="Register Faculty" icon="i-lucide-user-plus" color="success" :loading="submitting" />
            </div>
          </UForm>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="editOpen" :ui="{ content: 'sm:max-w-2xl max-h-[90dvh] overflow-y-auto' }">
      <template #content>
        <div class="bg-default p-6 sm:p-8">
          <h2 class="text-xl font-bold text-highlighted">Edit Faculty Profile</h2>
          <div class="mt-6 grid gap-4 md:grid-cols-2">
            <UFormField label="Faculty ID Barcode"><UInput v-model="editForm.barcode" icon="i-lucide-scan-barcode" class="w-full" /></UFormField>
            <UFormField label="Status"><USelect v-model="editForm.status" :items="statusItems.slice(1)" class="w-full" /></UFormField>
            <UFormField label="First Name"><UInput v-model="editForm.firstName" class="w-full" /></UFormField>
            <UFormField label="Middle Name"><UInput v-model="editForm.middleName" class="w-full" /></UFormField>
            <UFormField label="Last Name"><UInput v-model="editForm.lastName" class="w-full" /></UFormField>
            <UFormField label="Suffix"><UInput v-model="editForm.suffix" class="w-full" /></UFormField>
            <UFormField label="Department"><UInput v-model="editForm.department" class="w-full" /></UFormField>
            <UFormField label="Designation"><UInput v-model="editForm.designation" class="w-full" /></UFormField>
            <UFormField label="Email"><UInput v-model="editForm.email" type="email" class="w-full" /></UFormField>
            <UFormField label="Contact Number"><UInput v-model="editForm.contactNo" class="w-full" /></UFormField>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <UButton label="Cancel" color="neutral" variant="outline" @click="editOpen = false" />
            <UButton label="Save Changes" icon="i-lucide-save" color="success" :loading="submitting" @click="saveFaculty" />
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
