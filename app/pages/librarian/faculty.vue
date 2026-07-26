
<script setup lang="ts">
import type {
  FormError,
  FormSubmitEvent,
  TableColumn,
} from "@nuxt/ui";
import type {
  FacultyCredentialCheck,
  FacultyEmploymentType,
  FacultyMember,
  FacultyRegistrationInput,
  FacultySex,
  FacultyStatus,
  FacultyUpdateInput,
} from "~/composables/useLibraryMembers";

definePageMeta({
  layout: "librarian",
  title: "Faculty",
});

interface FacultyFormState {
  employeeNo: string;
  barcode: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  sex: FacultySex | null;
  departmentChoice: string;
  otherDepartment: string;
  designation: string;
  employmentType:
    FacultyEmploymentType;
  email: string;
  contactNo: string;
  address: string;
}

interface FacultyEditState
  extends FacultyFormState {
  status: FacultyStatus;
}

const members =
  useLibraryMembers();
const auth = useAuth();
const toast = useToast();

const faculty =
  ref<FacultyMember[]>([]);
const selected =
  ref<FacultyMember | null>(
    null,
  );
const search = ref("");
const statusFilter =
  ref<
    "All" | FacultyStatus
  >("All");
const page = ref(1);
const pageSize = 10;

const loading = ref(false);
const submitting = ref(false);
const credentialChecking =
  ref(false);
const editCredentialChecking =
  ref(false);

const registrationOpen =
  ref(false);
const editOpen = ref(false);
const profileOpen = ref(false);

const credentialCheck =
  ref<FacultyCredentialCheck | null>(
    null,
  );
const editCredentialCheck =
  ref<FacultyCredentialCheck | null>(
    null,
  );

const pagination = reactive({
  page: 1,
  pageSize,
  pageCount: 1,
  total: 0,
});

const summary = reactive({
  totalFaculty: 0,
  activeFaculty: 0,
  inactiveFaculty: 0,
  retiredFaculty: 0,
  activeLoans: 0,
  facultyWithActiveLoans: 0,
});

const departmentItems = [
  "College Department",
  "Senior High School Department",
  "Diploma Department",
  "Basic Education Department",
  "Administration",
  "Registrar's Office",
  "Library",
  "Guidance Office",
  "Finance Office",
  "Information Technology Office",
  "Other",
];

const employmentTypeItems:
  FacultyEmploymentType[] = [
    "Full-Time",
    "Part-Time",
    "Guest Lecturer",
    "Administrative Personnel",
    "Other",
  ];

const sexItems:
  FacultySex[] = [
    "Male",
    "Female",
    "Prefer not to say",
  ];

const statusItems:
  Array<
    "All" | FacultyStatus
  > = [
    "All",
    "Active",
    "Inactive",
    "Retired",
  ];

const form =
  reactive<FacultyFormState>({
    employeeNo: "",
    barcode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    sex: null,
    departmentChoice: "",
    otherDepartment: "",
    designation: "",
    employmentType:
      "Full-Time",
    email: "",
    contactNo: "",
    address: "",
  });

const editForm =
  reactive<FacultyEditState>({
    employeeNo: "",
    barcode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    sex: null,
    departmentChoice: "",
    otherDepartment: "",
    designation: "",
    employmentType:
      "Full-Time",
    email: "",
    contactNo: "",
    address: "",
    status: "Active",
  });

const columns:
  TableColumn<FacultyMember>[] = [
    {
      id: "faculty",
      header: "Faculty",
    },
    {
      id: "employment",
      header: "Employment",
    },
    {
      id: "barcode",
      header:
        "Faculty ID Barcode",
    },
    {
      id: "loans",
      header: "Active Loans",
    },
    {
      accessorKey: "status",
      header: "Status",
    },
    {
      id: "actions",
      header: "",
    },
  ];

const cards = computed(
  () => [
    {
      label:
        "Registered Faculty",
      value:
        summary.totalFaculty,
      icon:
        "i-lucide-users",
      description:
        "All Faculty records",
    },
    {
      label: "Active",
      value:
        summary.activeFaculty,
      icon:
        "i-lucide-user-check",
      description:
        "Eligible to borrow",
    },
    {
      label: "Inactive",
      value:
        summary.inactiveFaculty,
      icon:
        "i-lucide-user-minus",
      description:
        "Borrowing disabled",
    },
    {
      label: "Retired",
      value:
        summary.retiredFaculty,
      icon:
        "i-lucide-archive",
      description:
        "Historical profiles",
    },
    {
      label: "Active Loans",
      value:
        summary.activeLoans,
      icon:
        "i-lucide-book-open-check",
      description:
        `${summary.facultyWithActiveLoans} Faculty borrower${
          summary.facultyWithActiveLoans ===
          1
            ? ""
            : "s"
        }`,
    },
  ],
);

const selectedStatusWarning =
  computed(() => {
    if (
      !selected.value ||
      editForm.status ===
        "Active" ||
      selected.value
        .activeLoanCount === 0
    ) {
      return "";
    }

    return `${selected.value.fullName} still has ${selected.value.activeLoanCount} active loan${
      selected.value
        .activeLoanCount === 1
        ? ""
        : "s"
    }. The status can be changed, but new borrowing will be blocked until the profile is Active again. Existing books can still be returned.`;
  });

const registrationCredentialState =
  computed(() => {
    if (!credentialCheck.value) {
      return null;
    }

    if (
      credentialCheck.value
        .canProceed
    ) {
      return {
        color:
          "success" as const,
        icon:
          "i-lucide-badge-check",
        title:
          "Faculty credential is available",
        description:
          "The employee number and Faculty ID barcode are not assigned to another record.",
      };
    }

    const conflicts = [
      !credentialCheck.value
        .employeeNo.available
        ? "employee number"
        : "",
      !credentialCheck.value
        .barcode.available
        ? "Faculty ID barcode"
        : "",
    ]
      .filter(Boolean)
      .join(" and ");

    return {
      color: "error" as const,
      icon:
        "i-lucide-badge-x",
      title:
        "Credential already registered",
      description:
        `The ${conflicts} already belongs to an existing Faculty record.`,
    };
  });

function emptyToUndefined(
  value: string,
) {
  const normalized =
    value.trim();

  return normalized ||
    undefined;
}

function selectedDepartment(
  state:
    | FacultyFormState
    | FacultyEditState,
): string {
  if (
    state.departmentChoice ===
    "Other"
  ) {
    return state.otherDepartment
      .trim();
  }

  return state.departmentChoice
    .trim();
}

function registrationPayload():
  FacultyRegistrationInput {
  return {
    employeeNo:
      form.employeeNo,
    barcode: form.barcode,
    firstName:
      form.firstName,
    middleName:
      emptyToUndefined(
        form.middleName,
      ),
    lastName:
      form.lastName,
    suffix:
      emptyToUndefined(
        form.suffix,
      ),
    sex:
      form.sex ??
      undefined,
    department:
      selectedDepartment(form),
    designation:
      emptyToUndefined(
        form.designation,
      ),
    employmentType:
      form.employmentType,
    email:
      emptyToUndefined(
        form.email,
      ),
    contactNo:
      emptyToUndefined(
        form.contactNo,
      ),
    address:
      emptyToUndefined(
        form.address,
      ),
  };
}

function editPayload():
  FacultyUpdateInput {
  return {
    employeeNo:
      editForm.employeeNo,
    barcode:
      editForm.barcode,
    firstName:
      editForm.firstName,
    middleName:
      emptyToUndefined(
        editForm.middleName,
      ),
    lastName:
      editForm.lastName,
    suffix:
      emptyToUndefined(
        editForm.suffix,
      ),
    sex:
      editForm.sex ??
      undefined,
    department:
      selectedDepartment(
        editForm,
      ),
    designation:
      emptyToUndefined(
        editForm.designation,
      ),
    employmentType:
      editForm.employmentType,
    email:
      emptyToUndefined(
        editForm.email,
      ),
    contactNo:
      emptyToUndefined(
        editForm.contactNo,
      ),
    address:
      emptyToUndefined(
        editForm.address,
      ),
    status:
      editForm.status,
  };
}

function validateCommon(
  state:
    | FacultyFormState
    | FacultyEditState,
): FormError[] {
  const errors: FormError[] =
    [];

  if (!state.barcode.trim()) {
    errors.push({
      name: "barcode",
      message:
        "Scan or enter the Faculty ID barcode.",
    });
  }

  if (!state.employeeNo.trim()) {
    errors.push({
      name: "employeeNo",
      message:
        "Employee number is required.",
    });
  }

  if (!state.firstName.trim()) {
    errors.push({
      name: "firstName",
      message:
        "First name is required.",
    });
  }

  if (!state.lastName.trim()) {
    errors.push({
      name: "lastName",
      message:
        "Last name is required.",
    });
  }

  if (
    !state.departmentChoice
  ) {
    errors.push({
      name:
        "departmentChoice",
      message:
        "Select a department or office.",
    });
  }

  if (
    state.departmentChoice ===
      "Other" &&
    !state.otherDepartment.trim()
  ) {
    errors.push({
      name:
        "otherDepartment",
      message:
        "Enter the department or office name.",
    });
  }

  if (
    state.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      state.email.trim(),
    )
  ) {
    errors.push({
      name: "email",
      message:
        "Enter a valid email address.",
    });
  }

  return errors;
}

function validateRegistration(
  state: FacultyFormState,
) {
  return validateCommon(
    state,
  );
}

function validateEdit(
  state: FacultyEditState,
) {
  return validateCommon(
    state,
  );
}

async function loadFaculty() {
  loading.value = true;

  try {
    const response =
      await members.listFaculty({
        search:
          search.value.trim(),
        status:
          statusFilter.value,
        page: page.value,
        pageSize,
      });

    faculty.value =
      response.data;

    Object.assign(
      pagination,
      response.meta
        .pagination,
    );

    Object.assign(
      summary,
      response.meta.summary,
    );
  } catch (error) {
    toast.add({
      title:
        "Unable to load Faculty records",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
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
    sex: null,
    departmentChoice: "",
    otherDepartment: "",
    designation: "",
    employmentType:
      "Full-Time",
    email: "",
    contactNo: "",
    address: "",
  });

  credentialCheck.value =
    null;
}

async function verifyCredential() {
  if (
    !form.employeeNo.trim() ||
    !form.barcode.trim()
  ) {
    toast.add({
      title:
        "Credential information required",
      description:
        "Enter the employee number and scan the Faculty ID barcode before checking availability.",
      color: "warning",
      icon:
        "i-lucide-scan-barcode",
    });
    return false;
  }

  credentialChecking.value =
    true;

  try {
    credentialCheck.value =
      await members
        .checkFacultyCredential({
          employeeNo:
            form.employeeNo,
          barcode:
            form.barcode,
        });

    return credentialCheck
      .value.canProceed;
  } catch (error) {
    toast.add({
      title:
        "Credential could not be checked",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });

    return false;
  } finally {
    credentialChecking.value =
      false;
  }
}

async function verifyEditCredential() {
  if (
    !selected.value ||
    !editForm.employeeNo.trim() ||
    !editForm.barcode.trim()
  ) {
    return false;
  }

  editCredentialChecking.value =
    true;

  try {
    editCredentialCheck.value =
      await members
        .checkFacultyCredential({
          employeeNo:
            editForm.employeeNo,
          barcode:
            editForm.barcode,
          excludeDocumentId:
            selected.value
              .documentId,
        });

    return editCredentialCheck
      .value.canProceed;
  } catch (error) {
    toast.add({
      title:
        "Credential could not be checked",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });

    return false;
  } finally {
    editCredentialChecking
      .value = false;
  }
}

async function registerFaculty(
  _event:
    FormSubmitEvent<FacultyFormState>,
) {
  const credentialAvailable =
    await verifyCredential();

  if (!credentialAvailable) {
    return;
  }

  submitting.value = true;

  try {
    const response =
      await members
        .registerFaculty(
          registrationPayload(),
        );

    registrationOpen.value =
      false;

    toast.add({
      title:
        "Faculty registered",
      description:
        `${response.data.fullName} can now use the existing Faculty ID barcode for Library services.`,
      color: "success",
      icon:
        "i-lucide-circle-check",
    });

    resetForm();
    await loadFaculty();
  } catch (error) {
    toast.add({
      title:
        "Registration failed",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    submitting.value = false;
  }
}

function departmentState(
  department: string,
) {
  if (
    departmentItems.includes(
      department,
    ) &&
    department !== "Other"
  ) {
    return {
      departmentChoice:
        department,
      otherDepartment: "",
    };
  }

  return {
    departmentChoice:
      "Other",
    otherDepartment:
      department,
  };
}

function openProfile(
  record: FacultyMember,
) {
  selected.value = record;
  profileOpen.value = true;
}

function openEdit(
  record: FacultyMember,
) {
  selected.value = record;

  const department =
    departmentState(
      record.department,
    );

  Object.assign(
    editForm,
    {
      employeeNo:
        record.employeeNo,
      barcode:
        record.barcode,
      firstName:
        record.firstName,
      middleName:
        record.middleName,
      lastName:
        record.lastName,
      suffix:
        record.suffix,
      sex:
        record.sex ?? null,
      ...department,
      designation:
        record.designation,
      employmentType:
        record.employmentType ??
        "Full-Time",
      email:
        record.email,
      contactNo:
        record.contactNo,
      address:
        record.address,
      status:
        record.status,
    },
  );

  editCredentialCheck.value =
    null;
  profileOpen.value = false;
  editOpen.value = true;
}

async function saveFaculty(
  _event:
    FormSubmitEvent<FacultyEditState>,
) {
  if (!selected.value) {
    return;
  }

  const credentialAvailable =
    await verifyEditCredential();

  if (!credentialAvailable) {
    toast.add({
      title:
        "Credential conflict",
      description:
        "The employee number or Faculty ID barcode is assigned to another Faculty record.",
      color: "error",
      icon:
        "i-lucide-badge-x",
    });
    return;
  }

  submitting.value = true;

  try {
    const response =
      await members
        .updateFaculty(
          selected.value
            .documentId,
          editPayload(),
        );

    editOpen.value = false;

    toast.add({
      title:
        "Faculty profile updated",
      description:
        response.meta.warning ||
        "The Faculty profile and credential information were saved.",
      color:
        response.meta.warning
          ? "warning"
          : "success",
      icon:
        response.meta.warning
          ? "i-lucide-triangle-alert"
          : "i-lucide-save",
    });

    await loadFaculty();
  } catch (error) {
    toast.add({
      title:
        "Update failed",
      description:
        auth.getErrorMessage(
          error,
        ),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    submitting.value = false;
  }
}

async function copyBarcode(
  record: FacultyMember,
) {
  try {
    await navigator.clipboard
      .writeText(
        record.barcode,
      );

    toast.add({
      title:
        "Barcode copied",
      description:
        `${record.barcode} was copied to the clipboard.`,
      color: "success",
      icon:
        "i-lucide-copy-check",
    });
  } catch {
    toast.add({
      title:
        "Unable to copy barcode",
      description:
        "Select and copy the barcode manually.",
      color: "warning",
      icon:
        "i-lucide-copy",
    });
  }
}

async function openBorrow(
  record: FacultyMember,
) {
  await navigateTo({
    path:
      "/librarian/borrow",
    query: {
      barcode:
        record.barcode,
    },
  });
}

async function openReturn(
  record: FacultyMember,
) {
  await navigateTo({
    path:
      "/librarian/return",
    query: {
      barcode:
        record.barcode,
    },
  });
}

function statusColor(
  status: FacultyStatus,
) {
  if (status === "Active") {
    return "success";
  }

  if (
    status === "Inactive"
  ) {
    return "warning";
  }

  return "neutral";
}

function rowActions(
  record: FacultyMember,
) {
  return [
    [
      {
        label:
          "View Profile",
        icon:
          "i-lucide-eye",
        onSelect() {
          openProfile(record);
        },
      },
      {
        label:
          "Edit Faculty",
        icon:
          "i-lucide-pencil",
        onSelect() {
          openEdit(record);
        },
      },
      {
        label:
          "Copy Barcode",
        icon:
          "i-lucide-copy",
        onSelect() {
          void copyBarcode(
            record,
          );
        },
      },
    ],
    [
      {
        label:
          "Borrow Books",
        icon:
          "i-lucide-book-up",
        disabled:
          !record.canBorrow,
        onSelect() {
          void openBorrow(
            record,
          );
        },
      },
      {
        label:
          "Return Books",
        icon:
          "i-lucide-book-down",
        onSelect() {
          void openReturn(
            record,
          );
        },
      },
    ],
  ];
}

let searchTimer:
  ReturnType<
    typeof setTimeout
  > | undefined;

watch(search, () => {
  clearTimeout(searchTimer);

  searchTimer =
    setTimeout(() => {
      page.value = 1;
      void loadFaculty();
    }, 350);
});

watch(statusFilter, () => {
  page.value = 1;
  void loadFaculty();
});

watch(
  [
    () => form.employeeNo,
    () => form.barcode,
  ],
  () => {
    credentialCheck.value =
      null;
  },
);

watch(
  [
    () =>
      editForm.employeeNo,
    () => editForm.barcode,
  ],
  () => {
    editCredentialCheck.value =
      null;
  },
);

watch(page, () => {
  void loadFaculty();
});

onMounted(() => {
  void loadFaculty();
});
</script>

<template>
  <UContainer
    class="py-6 sm:py-8"
  >
    <div
      class="mx-auto max-w-[1500px] space-y-6"
    >
      <header
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div
          class="flex items-start gap-3"
        >
          <div
            class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          >
            <UIcon
              name="i-lucide-briefcase-business"
              class="size-6"
            />
          </div>

          <div>
            <h1
              class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              Faculty Directory
            </h1>

            <p
              class="mt-1 max-w-3xl text-sm leading-relaxed text-muted"
            >
              Register Faculty using the barcode already printed on their institutional ID. Faculty do not need a separate Library Card or semester membership.
            </p>
          </div>
        </div>

        <UButton
          label="Register Faculty"
          icon="i-lucide-user-plus"
          color="success"
          size="lg"
          @click="
            registrationOpen =
              true
          "
        />
      </header>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-badge-check"
        title="Faculty ID is the permanent Library credential"
        description="The same institutional barcode is used for borrowing, returning, and reservations. Only Active Faculty profiles can start a new borrowing transaction."
      />

      <section
        class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <UCard
          v-for="card in cards"
          :key="card.label"
        >
          <div
            class="flex items-start justify-between gap-4"
          >
            <div>
              <p
                class="text-sm font-medium text-muted"
              >
                {{ card.label }}
              </p>

              <p
                class="mt-2 text-3xl font-bold text-highlighted"
              >
                {{ card.value }}
              </p>

              <p
                class="mt-1 text-xs text-muted"
              >
                {{
                  card.description
                }}
              </p>
            </div>

            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-primary"
            >
              <UIcon
                :name="card.icon"
                class="size-5"
              />
            </div>
          </div>
        </UCard>
      </section>

      <UCard>
        <template #header>
          <div
            class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
          >
            <div>
              <h2
                class="font-semibold text-highlighted"
              >
                Faculty Records
              </h2>

              <p
                class="mt-1 text-sm text-muted"
              >
                Search by name, employee number, barcode, department, designation, or employment type.
              </p>
            </div>

            <div
              class="flex flex-col gap-2 sm:flex-row"
            >
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Search Faculty"
                class="w-full sm:w-72"
              />

              <USelect
                v-model="
                  statusFilter
                "
                :items="statusItems"
                class="w-full sm:w-40"
              />
            </div>
          </div>
        </template>

        <div
          v-if="loading"
          class="space-y-3"
        >
          <USkeleton
            v-for="index in 6"
            :key="index"
            class="h-20 w-full"
          />
        </div>

        <div
          v-else-if="
            faculty.length === 0
          "
          class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-default bg-elevated/20 p-8 text-center"
        >
          <div
            class="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          >
            <UIcon
              name="i-lucide-users"
              class="size-7"
            />
          </div>

          <h3
            class="mt-4 font-semibold text-highlighted"
          >
            No Faculty records found
          </h3>

          <p
            class="mt-1 max-w-md text-sm text-muted"
          >
            Adjust the search filters or register a Faculty member using the barcode on the institutional ID.
          </p>
        </div>

        <UTable
          v-else
          :data="faculty"
          :columns="columns"
        >
          <template
            #faculty-cell="{ row }"
          >
            <button
              type="button"
              class="flex items-center gap-3 text-left"
              @click="
                openProfile(
                  row.original,
                )
              "
            >
              <UAvatar
                :src="
                  row.original
                    .photoUrl ??
                  undefined
                "
                :alt="
                  row.original
                    .fullName
                "
                size="md"
              />

              <div
                class="min-w-0"
              >
                <p
                  class="truncate font-semibold text-highlighted"
                >
                  {{
                    row.original
                      .fullName
                  }}
                </p>

                <p
                  class="truncate text-xs text-muted"
                >
                  {{
                    row.original
                      .employeeNo
                  }}
                  •
                  {{
                    row.original
                      .department
                  }}
                </p>
              </div>
            </button>
          </template>

          <template
            #employment-cell="{ row }"
          >
            <p
              class="text-sm font-medium text-highlighted"
            >
              {{
                row.original
                  .employmentType
              }}
            </p>

            <p
              class="text-xs text-muted"
            >
              {{
                row.original
                  .designation ||
                "No designation"
              }}
            </p>
          </template>

          <template
            #barcode-cell="{ row }"
          >
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-elevated px-3 py-2 transition hover:bg-accented"
              title="Copy Faculty ID barcode"
              @click="
                copyBarcode(
                  row.original,
                )
              "
            >
              <UIcon
                name="i-lucide-scan-barcode"
                class="size-4 text-primary"
              />

              <span
                class="font-mono text-sm font-semibold text-highlighted"
              >
                {{
                  row.original
                    .barcode
                }}
              </span>
            </button>
          </template>

          <template
            #loans-cell="{ row }"
          >
            <UBadge
              :color="
                row.original
                  .activeLoanCount > 0
                  ? 'warning'
                  : 'neutral'
              "
              variant="soft"
            >
              {{
                row.original
                  .activeLoanCount
              }}
              active
            </UBadge>
          </template>

          <template
            #status-cell="{ row }"
          >
            <div
              class="space-y-1"
            >
              <UBadge
                :color="
                  statusColor(
                    row.original
                      .status,
                  )
                "
                variant="soft"
              >
                {{
                  row.original
                    .status
                }}
              </UBadge>

              <p
                class="text-xs text-muted"
              >
                {{
                  row.original
                    .canBorrow
                    ? "Borrowing enabled"
                    : "Borrowing disabled"
                }}
              </p>
            </div>
          </template>

          <template
            #actions-cell="{ row }"
          >
            <div
              class="flex justify-end"
            >
              <UDropdownMenu
                :items="
                  rowActions(
                    row.original,
                  )
                "
              >
                <UButton
                  icon="i-lucide-ellipsis"
                  color="neutral"
                  variant="ghost"
                  square
                  aria-label="Faculty actions"
                />
              </UDropdownMenu>
            </div>
          </template>
        </UTable>

        <template #footer>
          <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p
              class="text-sm text-muted"
            >
              Showing
              {{ faculty.length }}
              of
              {{ pagination.total }}
              Faculty members
            </p>

            <UPagination
              v-model:page="page"
              :total="
                pagination.total
              "
              :items-per-page="
                pageSize
              "
              :sibling-count="1"
              show-edges
            />
          </div>
        </template>
      </UCard>
    </div>

    <!-- Register Faculty -->
    <UModal
      v-model:open="
        registrationOpen
      "
      :dismissible="
        !submitting
      "
      :ui="{
        content:
          'sm:max-w-5xl max-h-[92dvh] overflow-y-auto',
      }"
    >
      <template #content>
        <div
          class="bg-default p-5 sm:p-8"
        >
          <div
            class="flex items-start gap-3"
          >
            <div
              class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success"
            >
              <UIcon
                name="i-lucide-user-round-plus"
                class="size-6"
              />
            </div>

            <div>
              <h2
                class="text-xl font-bold text-highlighted"
              >
                Register Faculty
              </h2>

              <p
                class="mt-1 text-sm text-muted"
              >
                Verify the institutional credential first, then complete the Faculty profile.
              </p>
            </div>
          </div>

          <UForm
            :state="form"
            :validate="
              validateRegistration
            "
            class="mt-6 space-y-6"
            @submit="
              registerFaculty
            "
          >
            <section
              class="rounded-2xl border border-default bg-elevated/30 p-4 sm:p-5"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3
                    class="font-semibold text-highlighted"
                  >
                    1. Faculty ID Credential
                  </h3>

                  <p
                    class="mt-1 text-xs text-muted"
                  >
                    Scan the barcode printed on the Faculty ID and check that both credentials are available.
                  </p>
                </div>

                <UButton
                  label="Check Credential"
                  icon="i-lucide-badge-check"
                  color="primary"
                  variant="soft"
                  :loading="
                    credentialChecking
                  "
                  @click="
                    verifyCredential
                  "
                />
              </div>

              <div
                class="mt-4 grid gap-4 md:grid-cols-2"
              >
                <UFormField
                  name="barcode"
                  label="Faculty ID Barcode"
                  required
                  description="Use a barcode scanner or enter the printed value."
                >
                  <UInput
                    v-model="
                      form.barcode
                    "
                    icon="i-lucide-scan-barcode"
                    autofocus
                    autocomplete="off"
                    class="w-full"
                    @keyup.enter.prevent="
                      verifyCredential
                    "
                  />
                </UFormField>

                <UFormField
                  name="employeeNo"
                  label="Employee Number"
                  required
                >
                  <UInput
                    v-model="
                      form.employeeNo
                    "
                    icon="i-lucide-badge"
                    autocomplete="off"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UAlert
                v-if="
                  registrationCredentialState
                "
                class="mt-4"
                :color="
                  registrationCredentialState.color
                "
                variant="soft"
                :icon="
                  registrationCredentialState.icon
                "
                :title="
                  registrationCredentialState.title
                "
                :description="
                  registrationCredentialState.description
                "
              />
            </section>

            <section
              class="rounded-2xl border border-default p-4 sm:p-5"
            >
              <h3
                class="font-semibold text-highlighted"
              >
                2. Personal Information
              </h3>

              <div
                class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <UFormField
                  name="firstName"
                  label="First Name"
                  required
                >
                  <UInput
                    v-model="
                      form.firstName
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="middleName"
                  label="Middle Name"
                >
                  <UInput
                    v-model="
                      form.middleName
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="lastName"
                  label="Last Name"
                  required
                >
                  <UInput
                    v-model="
                      form.lastName
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="suffix"
                  label="Suffix"
                >
                  <UInput
                    v-model="
                      form.suffix
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="sex"
                  label="Sex"
                  class="md:col-span-1"
                >
                  <USelect
                    v-model="
                      form.sex
                    "
                    :items="sexItems"
                    placeholder="Select sex"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </section>

            <section
              class="rounded-2xl border border-default p-4 sm:p-5"
            >
              <h3
                class="font-semibold text-highlighted"
              >
                3. Employment Information
              </h3>

              <div
                class="mt-4 grid gap-4 md:grid-cols-2"
              >
                <UFormField
                  name="departmentChoice"
                  label="Department or Office"
                  required
                >
                  <USelect
                    v-model="
                      form.departmentChoice
                    "
                    :items="
                      departmentItems
                    "
                    placeholder="Select department or office"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="employmentType"
                  label="Employment Type"
                  required
                >
                  <USelect
                    v-model="
                      form.employmentType
                    "
                    :items="
                      employmentTypeItems
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  v-if="
                    form.departmentChoice ===
                    'Other'
                  "
                  name="otherDepartment"
                  label="Department or Office Name"
                  required
                >
                  <UInput
                    v-model="
                      form.otherDepartment
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="designation"
                  label="Designation or Position"
                >
                  <UInput
                    v-model="
                      form.designation
                    "
                    placeholder="Example: Instructor, Program Head"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </section>

            <section
              class="rounded-2xl border border-default p-4 sm:p-5"
            >
              <h3
                class="font-semibold text-highlighted"
              >
                4. Contact Information
              </h3>

              <div
                class="mt-4 grid gap-4 md:grid-cols-2"
              >
                <UFormField
                  name="email"
                  label="Email Address"
                >
                  <UInput
                    v-model="
                      form.email
                    "
                    type="email"
                    icon="i-lucide-mail"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="contactNo"
                  label="Contact Number"
                >
                  <UInput
                    v-model="
                      form.contactNo
                    "
                    icon="i-lucide-phone"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="address"
                  label="Address"
                  class="md:col-span-2"
                >
                  <UTextarea
                    v-model="
                      form.address
                    "
                    :rows="3"
                    autoresize
                    placeholder="House number, street, barangay, city or municipality, province"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </section>

            <div
              class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
            >
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                :disabled="
                  submitting
                "
                @click="
                  registrationOpen =
                    false
                "
              />

              <UButton
                type="submit"
                label="Register Faculty"
                icon="i-lucide-user-plus"
                color="success"
                :loading="
                  submitting
                "
              />
            </div>
          </UForm>
        </div>
      </template>
    </UModal>

    <!-- Faculty Profile -->
    <UModal
      v-model:open="
        profileOpen
      "
      :ui="{
        content:
          'sm:max-w-2xl',
      }"
    >
      <template #content>
        <div
          v-if="selected"
          class="bg-default p-6 sm:p-8"
        >
          <div
            class="flex items-start gap-4"
          >
            <UAvatar
              :src="
                selected.photoUrl ??
                undefined
              "
              :alt="
                selected.fullName
              "
              size="xl"
            />

            <div
              class="min-w-0 flex-1"
            >
              <div
                class="flex flex-wrap items-center gap-2"
              >
                <UBadge
                  :color="
                    statusColor(
                      selected.status,
                    )
                  "
                  variant="soft"
                >
                  {{
                    selected.status
                  }}
                </UBadge>

                <UBadge
                  color="neutral"
                  variant="outline"
                >
                  {{
                    selected.employmentType
                  }}
                </UBadge>
              </div>

              <h2
                class="mt-2 text-xl font-bold text-highlighted"
              >
                {{
                  selected.fullName
                }}
              </h2>

              <p
                class="mt-1 text-sm text-muted"
              >
                {{
                  selected.employeeNo
                }}
                ·
                {{
                  selected.department
                }}
              </p>
            </div>
          </div>

          <div
            class="mt-6 grid gap-4 rounded-2xl border border-default bg-elevated/30 p-4 sm:grid-cols-2"
          >
            <div>
              <p
                class="text-xs text-muted"
              >
                Faculty ID Barcode
              </p>

              <button
                type="button"
                class="mt-1 inline-flex items-center gap-2 font-mono text-sm font-semibold text-highlighted"
                @click="
                  copyBarcode(
                    selected,
                  )
                "
              >
                <UIcon
                  name="i-lucide-scan-barcode"
                  class="size-4 text-primary"
                />
                {{
                  selected.barcode
                }}
              </button>
            </div>

            <div>
              <p
                class="text-xs text-muted"
              >
                Active Loans
              </p>

              <p
                class="mt-1 text-sm font-semibold text-highlighted"
              >
                {{
                  selected.activeLoanCount
                }}
              </p>
            </div>

            <div>
              <p
                class="text-xs text-muted"
              >
                Designation
              </p>

              <p
                class="mt-1 text-sm font-medium text-highlighted"
              >
                {{
                  selected.designation ||
                  "Not recorded"
                }}
              </p>
            </div>

            <div>
              <p
                class="text-xs text-muted"
              >
                Borrowing Eligibility
              </p>

              <p
                class="mt-1 text-sm font-medium text-highlighted"
              >
                {{
                  selected.canBorrow
                    ? "Eligible"
                    : "Not eligible"
                }}
              </p>
            </div>

            <div>
              <p
                class="text-xs text-muted"
              >
                Email
              </p>

              <p
                class="mt-1 break-all text-sm font-medium text-highlighted"
              >
                {{
                  selected.email ||
                  "Not recorded"
                }}
              </p>
            </div>

            <div>
              <p
                class="text-xs text-muted"
              >
                Contact Number
              </p>

              <p
                class="mt-1 text-sm font-medium text-highlighted"
              >
                {{
                  selected.contactNo ||
                  "Not recorded"
                }}
              </p>
            </div>

            <div
              class="sm:col-span-2"
            >
              <p
                class="text-xs text-muted"
              >
                Address
              </p>

              <p
                class="mt-1 whitespace-pre-line text-sm font-medium text-highlighted"
              >
                {{
                  selected.address ||
                  "Not recorded"
                }}
              </p>
            </div>
          </div>

          <div
            class="mt-6 flex flex-wrap justify-end gap-3"
          >
            <UButton
              label="Return Books"
              icon="i-lucide-book-down"
              color="neutral"
              variant="outline"
              @click="
                openReturn(
                  selected,
                )
              "
            />

            <UButton
              label="Borrow Books"
              icon="i-lucide-book-up"
              color="primary"
              variant="soft"
              :disabled="
                !selected.canBorrow
              "
              @click="
                openBorrow(
                  selected,
                )
              "
            />

            <UButton
              label="Edit Profile"
              icon="i-lucide-pencil"
              color="success"
              @click="
                openEdit(
                  selected,
                )
              "
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Edit Faculty -->
    <UModal
      v-model:open="
        editOpen
      "
      :dismissible="
        !submitting
      "
      :ui="{
        content:
          'sm:max-w-5xl max-h-[92dvh] overflow-y-auto',
      }"
    >
      <template #content>
        <div
          class="bg-default p-5 sm:p-8"
        >
          <h2
            class="text-xl font-bold text-highlighted"
          >
            Edit Faculty Profile
          </h2>

          <p
            class="mt-1 text-sm text-muted"
          >
            Update the institutional credential, Faculty information, and borrowing eligibility.
          </p>

          <UForm
            :state="editForm"
            :validate="
              validateEdit
            "
            class="mt-6 space-y-6"
            @submit="
              saveFaculty
            "
          >
            <section
              class="rounded-2xl border border-default bg-elevated/30 p-4 sm:p-5"
            >
              <div
                class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <h3
                  class="font-semibold text-highlighted"
                >
                  Credential and Status
                </h3>

                <UButton
                  label="Verify Credential"
                  icon="i-lucide-badge-check"
                  color="primary"
                  variant="soft"
                  :loading="
                    editCredentialChecking
                  "
                  @click="
                    verifyEditCredential
                  "
                />
              </div>

              <div
                class="mt-4 grid gap-4 md:grid-cols-3"
              >
                <UFormField
                  name="barcode"
                  label="Faculty ID Barcode"
                  required
                >
                  <UInput
                    v-model="
                      editForm.barcode
                    "
                    icon="i-lucide-scan-barcode"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="employeeNo"
                  label="Employee Number"
                  required
                >
                  <UInput
                    v-model="
                      editForm.employeeNo
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="status"
                  label="Faculty Status"
                  required
                >
                  <USelect
                    v-model="
                      editForm.status
                    "
                    :items="
                      statusItems.slice(
                        1,
                      )
                    "
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UAlert
                v-if="
                  editCredentialCheck &&
                  !editCredentialCheck.canProceed
                "
                class="mt-4"
                color="error"
                variant="soft"
                icon="i-lucide-badge-x"
                title="Credential conflict"
                description="The employee number or Faculty ID barcode is assigned to another Faculty record."
              />

              <UAlert
                v-else-if="
                  editCredentialCheck?.canProceed
                "
                class="mt-4"
                color="success"
                variant="soft"
                icon="i-lucide-badge-check"
                title="Credential is available"
                description="The updated employee number and Faculty ID barcode can be saved."
              />

              <UAlert
                v-if="
                  selectedStatusWarning
                "
                class="mt-4"
                color="warning"
                variant="soft"
                icon="i-lucide-triangle-alert"
                title="Faculty has active loans"
                :description="
                  selectedStatusWarning
                "
              />
            </section>

            <section
              class="rounded-2xl border border-default p-4 sm:p-5"
            >
              <h3
                class="font-semibold text-highlighted"
              >
                Personal Information
              </h3>

              <div
                class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
              >
                <UFormField
                  name="firstName"
                  label="First Name"
                  required
                >
                  <UInput
                    v-model="
                      editForm.firstName
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="middleName"
                  label="Middle Name"
                >
                  <UInput
                    v-model="
                      editForm.middleName
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="lastName"
                  label="Last Name"
                  required
                >
                  <UInput
                    v-model="
                      editForm.lastName
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="suffix"
                  label="Suffix"
                >
                  <UInput
                    v-model="
                      editForm.suffix
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="sex"
                  label="Sex"
                >
                  <USelect
                    v-model="
                      editForm.sex
                    "
                    :items="sexItems"
                    placeholder="Select sex"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </section>

            <section
              class="rounded-2xl border border-default p-4 sm:p-5"
            >
              <h3
                class="font-semibold text-highlighted"
              >
                Employment Information
              </h3>

              <div
                class="mt-4 grid gap-4 md:grid-cols-2"
              >
                <UFormField
                  name="departmentChoice"
                  label="Department or Office"
                  required
                >
                  <USelect
                    v-model="
                      editForm.departmentChoice
                    "
                    :items="
                      departmentItems
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="employmentType"
                  label="Employment Type"
                  required
                >
                  <USelect
                    v-model="
                      editForm.employmentType
                    "
                    :items="
                      employmentTypeItems
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  v-if="
                    editForm.departmentChoice ===
                    'Other'
                  "
                  name="otherDepartment"
                  label="Department or Office Name"
                  required
                >
                  <UInput
                    v-model="
                      editForm.otherDepartment
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="designation"
                  label="Designation or Position"
                >
                  <UInput
                    v-model="
                      editForm.designation
                    "
                    class="w-full"
                  />
                </UFormField>
              </div>
            </section>

            <section
              class="rounded-2xl border border-default p-4 sm:p-5"
            >
              <h3
                class="font-semibold text-highlighted"
              >
                Contact Information
              </h3>

              <div
                class="mt-4 grid gap-4 md:grid-cols-2"
              >
                <UFormField
                  name="email"
                  label="Email Address"
                >
                  <UInput
                    v-model="
                      editForm.email
                    "
                    type="email"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="contactNo"
                  label="Contact Number"
                >
                  <UInput
                    v-model="
                      editForm.contactNo
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="address"
                  label="Address"
                  class="md:col-span-2"
                >
                  <UTextarea
                    v-model="
                      editForm.address
                    "
                    :rows="3"
                    autoresize
                    class="w-full"
                  />
                </UFormField>
              </div>
            </section>

            <div
              class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
            >
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                :disabled="
                  submitting
                "
                @click="
                  editOpen = false
                "
              />

              <UButton
                type="submit"
                label="Save Changes"
                icon="i-lucide-save"
                color="success"
                :loading="
                  submitting
                "
              />
            </div>
          </UForm>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
