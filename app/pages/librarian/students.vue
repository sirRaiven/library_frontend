<script setup lang="ts">
import type { FormError, FormSubmitEvent, TableColumn } from "@nuxt/ui";
import type {
  StudentMember,
  StudentRegistrationInput,
  StudentStatus,
} from "~/composables/useLibraryMembers";
import StudentLibraryCard from "~/components/librarian/StudentLibraryCard.vue";
import StudentPhotoEditor from "~/components/librarian/StudentPhotoEditor.vue";
import type { CroppedStudentPhoto } from "~/types/studentPhoto";
import {
  LIBRARY_CARD_STATUSES,
  STUDENT_EDUCATIONAL_LEVELS,
  programsForLevel,
  yearGradeLabel,
  yearLevelsFor,
  type LibraryCardStatus,
  type StudentEducationalLevel,
} from "~/constants/studentPrograms";

definePageMeta({ layout: "librarian", title: "Students" });

const members = useLibraryMembers();
const auth = useAuth();
const toast = useToast();
const route = useRoute();
const cardPrintQueue =
  useLibraryCardPrintQueue();

const students = ref<StudentMember[]>([]);
const selectedStudent = ref<StudentMember | null>(null);
const search = ref("");
const statusFilter = ref("All");
const membershipFilter = ref("All");
const educationalLevelFilter =
  ref("All");
const cardStatusFilter =
  ref("All");
const page = ref(1);
const pageSize = 10;
const loading = ref(false);
const submitting = ref(false);
const registrationOpen = ref(false);
const editOpen = ref(false);
const cardOpen = ref(false);

const registrationPhoto =
  ref<CroppedStudentPhoto | null>(
    null,
  );

const editPhoto =
  ref<CroppedStudentPhoto | null>(
    null,
  );

const removeExistingPhoto =
  ref(false);

const pagination = reactive({ page: 1, pageSize, pageCount: 1, total: 0 });
const summary = reactive({
  totalStudents: 0,
  activeMemberships: 0,
  expiredMemberships: 0,
  suspendedMemberships: 0,
});

const today = new Date().toISOString().slice(0, 10);

function defaultAcademicYear() {
  const date = new Date();
  const year = date.getFullYear();
  return date.getMonth() + 1 >= 6
    ? `${year}-${year + 1}`
    : `${year - 1}-${year}`;
}

function defaultSemester() {
  const month = new Date().getMonth() + 1;
  if (month >= 6) return "First Semester";
  if (month <= 4) return "Second Semester";
  return "Summer";
}

function defaultExpiryDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 5);
  return date.toISOString().slice(0, 10);
}

const registrationForm = reactive<StudentRegistrationInput>({
  student: {
    studentNo: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    sex: "",
    educationalLevel:
      "College",
    course: "",
    yearLevel: 1,
    section: "",
    email: "",
    contactNo: "",
    address: "",
    libraryCardStatus:
      "On Process",
    libraryCardReleaseDate:
      "",
  },
  membership: {
    academicYear: defaultAcademicYear(),
    semester: defaultSemester(),
    issuedDate: today,
    expiryDate: defaultExpiryDate(),
    enrollmentVerified: false,
    enrollmentReference: "",
    remarks: "",
  },
});

const editForm = reactive({
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  sex: "",
  educationalLevel:
    "College" as StudentEducationalLevel,
  course: "",
  yearLevel: 1,
  section: "",
  email: "",
  contactNo: "",
  address: "",
  libraryCardStatus:
    "On Process" as LibraryCardStatus,
  libraryCardReleaseDate:
    "",
  status: "Active" as StudentStatus,
});


const registrationPreviewStudent =
  computed<StudentMember>(() => ({
    documentId:
      "new-student-preview",
    studentNo:
      registrationForm.student.studentNo ||
      "STUDENT NO.",
    libraryCardNo:
      "GENERATED AFTER REGISTRATION",
    barcode:
      "GENERATED-AFTER-REGISTRATION",
    firstName:
      registrationForm.student.firstName ||
      "FIRST NAME",
    middleName:
      registrationForm.student.middleName ||
      "",
    lastName:
      registrationForm.student.lastName ||
      "LAST NAME",
    suffix:
      registrationForm.student.suffix ||
      "",
    fullName: [
      registrationForm.student.lastName ||
        "LAST NAME",
      registrationForm.student.firstName ||
        "FIRST NAME",
      registrationForm.student.middleName ||
        "",
      registrationForm.student.suffix ||
        "",
    ]
      .filter(Boolean)
      .join(" "),
    sex:
      (registrationForm.student.sex as
        | "Male"
        | "Female"
        | null) ||
      null,
    educationalLevel:
      registrationForm.student
        .educationalLevel,
    course:
      registrationForm.student.course ||
      "COURSE / PROGRAM",
    yearLevel:
      registrationForm.student.yearLevel ||
      null,
    section:
      registrationForm.student.section ||
      "",
    email:
      registrationForm.student.email ||
      "",
    contactNo:
      registrationForm.student.contactNo ||
      "",
    address:
      registrationForm.student.address ||
      "",
    photoUrl:
      registrationPhoto.value
        ?.previewUrl ??
      null,
    libraryCardStatus:
      registrationForm.student
        .libraryCardStatus ??
      "On Process",
    libraryCardReleaseDate:
      registrationForm.student
        .libraryCardReleaseDate ||
      null,
    status: "Active",
    membership: null,
  }));

const columns: TableColumn<StudentMember>[] = [
  { id: "student", header: "Student" },
  { id: "card", header: "Library Card" },
  { id: "membership", header: "Current Membership" },
  { accessorKey: "status", header: "Profile" },
  { id: "actions", header: "" },
];

const statusItems = ["All", "Active", "Inactive", "Suspended", "Graduated", "Dropped"];
const memberStatusItems = ["All", "Active", "Expired", "Suspended", "Cancelled"];
const semesterItems = ["First Semester", "Second Semester", "Summer"];
const sexItems = ["Male", "Female"];

const educationalLevelItems = [
  "All",
  ...STUDENT_EDUCATIONAL_LEVELS,
];

const cardStatusItems = [
  "All",
  ...LIBRARY_CARD_STATUSES,
];

const registrationProgramItems =
  computed(() =>
    programsForLevel(
      registrationForm.student
        .educationalLevel,
    ),
  );

const editProgramItems =
  computed(() =>
    programsForLevel(
      editForm.educationalLevel,
    ),
  );

const registrationYearItems =
  computed(() =>
    yearLevelsFor(
      registrationForm.student
        .educationalLevel,
    ),
  );

const editYearItems =
  computed(() =>
    yearLevelsFor(
      editForm.educationalLevel,
    ),
  );

const cards = computed(() => [
  { label: "Registered Students", value: summary.totalStudents, icon: "i-lucide-users" },
  { label: "Active Memberships", value: summary.activeMemberships, icon: "i-lucide-user-check" },
  { label: "Needs Renewal", value: summary.expiredMemberships, icon: "i-lucide-rotate-cw" },
  { label: "Suspended", value: summary.suspendedMemberships, icon: "i-lucide-user-x" },
]);

function membershipColor(value?: string | null) {
  if (value === "Active") return "success";
  if (value === "Suspended") return "warning";
  return "error";
}


function cardStatusColor(
  value: LibraryCardStatus,
) {
  if (value === "Released") {
    return "success";
  }

  if (
    value === "Printed" ||
    value === "On Process"
  ) {
    return "info";
  }

  if (
    value === "Replacement" ||
    value === "Duplicated"
  ) {
    return "warning";
  }

  return "neutral";
}

function validate(state: StudentRegistrationInput): FormError[] {
  const errors: FormError[] = [];
  if (!state.student.studentNo.trim()) errors.push({ name: "student.studentNo", message: "Student number is required." });
  if (!state.student.firstName.trim()) errors.push({ name: "student.firstName", message: "First name is required." });
  if (!state.student.lastName.trim()) errors.push({ name: "student.lastName", message: "Last name is required." });
  if (!state.student.educationalLevel) errors.push({ name: "student.educationalLevel", message: "Select the Student educational level." });
  if (!state.student.course.trim()) errors.push({ name: "student.course", message: "Select a program for the chosen educational level." });
  if (!state.student.yearLevel) errors.push({ name: "student.yearLevel", message: "Select the Student year or grade level." });
  if (!state.student.libraryCardStatus) errors.push({ name: "student.libraryCardStatus", message: "Select the Library Card processing status." });
  if (!registrationPhoto.value) errors.push({ name: "student.photo", message: "Upload and crop the Student photo for the Library Card." });
  if (!/^\d{4}-\d{4}$/.test(state.membership.academicYear)) errors.push({ name: "membership.academicYear", message: "Use YYYY-YYYY format." });
  if (!state.membership.expiryDate) errors.push({ name: "membership.expiryDate", message: "Expiry date is required." });
  if (!state.membership.enrollmentVerified) errors.push({ name: "membership.enrollmentVerified", message: "Verify the enrollment document." });
  return errors;
}

async function loadStudents() {
  loading.value = true;
  try {
    const response = await members.listStudents({
      search: search.value.trim(),
      status: statusFilter.value,
      membershipStatus: membershipFilter.value,
      educationalLevel:
        educationalLevelFilter.value,
      libraryCardStatus:
        cardStatusFilter.value,
      page: page.value,
      pageSize,
    });
    students.value = response.data;
    Object.assign(pagination, response.meta.pagination);
    Object.assign(summary, response.meta.summary);
  } catch (error) {
    toast.add({
      title: "Unable to load students",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}


function releasePhotoSelection(
  photo:
    CroppedStudentPhoto | null,
) {
  if (
    photo?.previewUrl.startsWith(
      "blob:",
    )
  ) {
    URL.revokeObjectURL(
      photo.previewUrl,
    );
  }
}

function resetRegistration() {
  Object.assign(registrationForm.student, {
    studentNo: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    sex: "",
    educationalLevel:
      "College",
    course: "",
    yearLevel: 1,
    section: "",
    email: "",
    contactNo: "",
    address: "",
    libraryCardStatus:
      "On Process",
    libraryCardReleaseDate:
      "",
  });
  Object.assign(registrationForm.membership, {
    academicYear: defaultAcademicYear(),
    semester: defaultSemester(),
    issuedDate: today,
    expiryDate: defaultExpiryDate(),
    enrollmentVerified: false,
    enrollmentReference: "",
    remarks: "",
  });

  releasePhotoSelection(
    registrationPhoto.value,
  );
  registrationPhoto.value =
    null;
}

async function registerStudent(_event: FormSubmitEvent<StudentRegistrationInput>) {
  if (!registrationPhoto.value) {
    toast.add({
      title: "Student photo required",
      description:
        "Choose a photo and complete the 1:1 crop before registering the Student.",
      color: "error",
      icon: "i-lucide-image-off",
    });
    return;
  }

  submitting.value = true;

  try {
    const uploadedPhoto =
      await members.uploadStudentPhoto(
        registrationPhoto.value.file,
        registrationForm.student.studentNo,
      );

    const response =
      await members.registerStudent({
        student: {
          ...registrationForm.student,
          photoId:
            uploadedPhoto.id,
        },
        membership: {
          ...registrationForm.membership,
        },
      });

    selectedStudent.value =
      response.data.student;

    cardPrintQueue.setPrintQueue(
      [
        response.data.student,
      ],
      route.fullPath,
    );

    registrationOpen.value = false;
    cardOpen.value = true;
    toast.add({
      title: "Student registered",
      description: `${response.data.student.fullName} now has an active Library Card that is ready for preview, download, or printing.`,
      color: "success",
      icon: "i-lucide-circle-check",
    });
    resetRegistration();
    await loadStudents();
  } catch (error) {
    toast.add({ title: "Registration failed", description: auth.getErrorMessage(error), color: "error", icon: "i-lucide-circle-alert" });
  } finally {
    submitting.value = false;
  }
}

function openCard(student: StudentMember) {
  selectedStudent.value = student;
  cardOpen.value = true;
}

function openEdit(student: StudentMember) {
  selectedStudent.value = student;
  Object.assign(editForm, {
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    suffix: student.suffix,
    sex: student.sex ?? "",
    educationalLevel:
      student.educationalLevel,
    course: student.course,
    yearLevel:
      student.yearLevel ??
      (
        student.educationalLevel ===
          "Senior High School"
          ? 11
          : 1
      ),
    section: student.section,
    email: student.email,
    contactNo: student.contactNo,
    address: student.address,
    libraryCardStatus:
      student.libraryCardStatus,
    libraryCardReleaseDate:
      student.libraryCardReleaseDate ??
      "",
    status: student.status,
  });

  releasePhotoSelection(
    editPhoto.value,
  );
  editPhoto.value = null;
  removeExistingPhoto.value =
    false;
  editOpen.value = true;
}

async function saveStudent() {
  if (!selectedStudent.value) {
    return;
  }

  submitting.value = true;

  try {
    let photoId:
      number | undefined;

    if (editPhoto.value) {
      const uploadedPhoto =
        await members.uploadStudentPhoto(
          editPhoto.value.file,
          selectedStudent.value.studentNo,
        );

      photoId =
        uploadedPhoto.id;
    }

    const photoWasRemoved =
      removeExistingPhoto.value &&
      !photoId;

    const response =
      await members.updateStudent(
        selectedStudent.value.documentId,
        {
          ...editForm,
          ...(photoId
            ? {
                photoId,
              }
            : {}),
          ...(photoWasRemoved
            ? {
                removePhoto: true,
              }
            : {}),
        },
      );

    selectedStudent.value =
      response.data;
    editOpen.value = false;

    releasePhotoSelection(
      editPhoto.value,
    );
    editPhoto.value = null;
    removeExistingPhoto.value =
      false;

    toast.add({
      title: "Student updated",
      description:
        photoId
          ? "The Student profile and Library Card photo were updated."
          : photoWasRemoved
            ? "The Student profile was updated and the photo was removed."
            : "The Student profile was saved.",
      color: "success",
      icon: "i-lucide-save",
    });

    await loadStudents();
  } catch (error) {
    toast.add({
      title: "Update failed",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon:
        "i-lucide-circle-alert",
    });
  } finally {
    submitting.value = false;
  }
}

async function renew(student: StudentMember) {
  await navigateTo({ path: "/librarian/memberships", query: { barcode: student.barcode } });
}

async function printStudentCard(
  student: StudentMember,
) {
  cardPrintQueue.setPrintQueue(
    [student],
    route.fullPath,
  );

  cardOpen.value = false;

  await navigateTo(
    "/librarian/library-card-print",
  );
}


function removeEditPhoto() {
  releasePhotoSelection(
    editPhoto.value,
  );
  editPhoto.value = null;
  removeExistingPhoto.value =
    true;
}

function cancelRegistration() {
  if (submitting.value) {
    return;
  }

  registrationOpen.value =
    false;
  resetRegistration();
}

function cancelEdit() {
  if (submitting.value) {
    return;
  }

  releasePhotoSelection(
    editPhoto.value,
  );
  editPhoto.value = null;
  removeExistingPhoto.value =
    false;
  editOpen.value = false;
}


watch(
  registrationPhoto,
  (
    value,
    previous,
  ) => {
    if (
      previous &&
      previous !== value
    ) {
      releasePhotoSelection(
        previous,
      );
    }
  },
);

watch(
  editPhoto,
  (
    value,
    previous,
  ) => {
    if (
      previous &&
      previous !== value
    ) {
      releasePhotoSelection(
        previous,
      );
    }

    if (value) {
      removeExistingPhoto.value =
        false;
    }
  },
);

let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    void loadStudents();
  }, 350);
});
watch(
  [
    statusFilter,
    membershipFilter,
    educationalLevelFilter,
    cardStatusFilter,
  ],
  () => {
    page.value = 1;
    void loadStudents();
  },
);

watch(
  () =>
    registrationForm.student
      .educationalLevel,
  (level) => {
    const programs =
      programsForLevel(level);

    if (
      !programs.some(
        (item) =>
          item.value ===
          registrationForm.student
            .course,
      )
    ) {
      registrationForm.student.course =
        "";
    }

    const years =
      yearLevelsFor(level);

    if (
      !years.some(
        (item) =>
          item.value ===
          registrationForm.student
            .yearLevel,
      )
    ) {
      registrationForm.student.yearLevel =
        years[0]?.value ?? 1;
    }
  },
);

watch(
  () =>
    editForm.educationalLevel,
  (level) => {
    const programs =
      programsForLevel(level);

    if (
      !programs.some(
        (item) =>
          item.value ===
          editForm.course,
      )
    ) {
      editForm.course = "";
    }

    const years =
      yearLevelsFor(level);

    if (
      !years.some(
        (item) =>
          item.value ===
          editForm.yearLevel,
      )
    ) {
      editForm.yearLevel =
        years[0]?.value ?? 1;
    }
  },
);

watch(
  () =>
    registrationForm.student
      .libraryCardStatus,
  (status) => {
    if (
      status === "Released" &&
      !registrationForm.student
        .libraryCardReleaseDate
    ) {
      registrationForm.student
        .libraryCardReleaseDate =
        today;
    }
  },
);

watch(
  () =>
    editForm.libraryCardStatus,
  (status) => {
    if (
      status === "Released" &&
      !editForm
        .libraryCardReleaseDate
    ) {
      editForm.libraryCardReleaseDate =
        today;
    }
  },
);
watch(page, () => void loadStudents());
onMounted(() => void loadStudents());

onBeforeUnmount(() => {
  releasePhotoSelection(
    registrationPhoto.value,
  );
  releasePhotoSelection(
    editPhoto.value,
  );
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-[1500px] space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex items-center gap-3">
          <div class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-graduation-cap" class="size-6" />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">Student Library Members</h1>
            <p class="mt-1 max-w-3xl text-sm text-muted">Register students, review semester validity, generate library cards, and renew memberships with fewer steps.</p>
          </div>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <UButton
            to="/librarian/library-card-designer"
            label="Card Designer"
            icon="i-lucide-palette"
            color="neutral"
            variant="outline"
          />

          <UButton
            to="/librarian/memberships"
            label="Renew by Barcode"
            icon="i-lucide-scan-barcode"
            color="neutral"
            variant="outline"
          />

          <UButton
            label="Register Student"
            icon="i-lucide-user-plus"
            color="success"
            @click="() => { registrationOpen = true }"
          />
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UCard v-for="card in cards" :key="card.label">
          <div class="flex items-start justify-between gap-4">
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
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="font-semibold text-highlighted">Student Directory</h2>
              <p class="mt-1 text-sm text-muted">Search by name, student number, card number, or barcode.</p>
            </div>
            <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <UInput
                v-model="search"
                icon="i-lucide-search"
                placeholder="Search students"
                class="w-full xl:min-w-56"
              />

              <USelect
                v-model="educationalLevelFilter"
                :items="educationalLevelItems"
                placeholder="Educational level"
              />

              <USelect
                v-model="cardStatusFilter"
                :items="cardStatusItems"
                placeholder="Card status"
              />

              <USelect
                v-model="statusFilter"
                :items="statusItems"
                placeholder="Profile status"
              />

              <USelect
                v-model="membershipFilter"
                :items="memberStatusItems"
                placeholder="Membership"
              />
            </div>
          </div>
        </template>

        <div v-if="loading" class="space-y-3">
          <USkeleton v-for="index in 6" :key="index" class="h-16 w-full" />
        </div>

        <div v-else-if="students.length === 0" class="py-16 text-center">
          <UIcon name="i-lucide-users" class="mx-auto size-10 text-dimmed" />
          <h3 class="mt-3 font-semibold text-highlighted">No student members found</h3>
          <p class="mt-1 text-sm text-muted">Register a student or adjust the filters.</p>
        </div>

        <UTable v-else :data="students" :columns="columns">
          <template #student-cell="{ row }">
            <div class="flex items-center gap-3">
              <UAvatar :src="row.original.photoUrl ?? undefined" :alt="row.original.fullName" size="md" />
              <div class="min-w-0">
                <p class="truncate font-semibold text-highlighted">{{ row.original.fullName }}</p>
                <p class="truncate text-xs text-muted">
                  {{ row.original.studentNo }}
                  •
                  {{ row.original.educationalLevel }}
                  •
                  {{
                    yearGradeLabel(
                      row.original.educationalLevel,
                      row.original.yearLevel,
                    )
                  }}
                </p>
                <p class="truncate text-xs text-muted">
                  {{ row.original.course }}
                </p>
              </div>
            </div>
          </template>
          <template #card-cell="{ row }">
            <p class="font-mono text-sm font-semibold text-highlighted">
              {{ row.original.libraryCardNo }}
            </p>

            <p class="mt-1 font-mono text-xs text-muted">
              {{ row.original.barcode }}
            </p>

            <div class="mt-2 flex flex-wrap items-center gap-2">
              <UBadge
                :color="
                  cardStatusColor(
                    row.original.libraryCardStatus,
                  )
                "
                variant="soft"
              >
                {{
                  row.original.libraryCardStatus
                }}
              </UBadge>

              <span
                v-if="
                  row.original
                    .libraryCardReleaseDate
                "
                class="text-xs text-muted"
              >
                Released
                {{
                  row.original
                    .libraryCardReleaseDate
                }}
              </span>
            </div>
          </template>
          <template #membership-cell="{ row }">
            <div v-if="row.original.membership">
              <UBadge :color="membershipColor(row.original.membership.status)" variant="soft">{{ row.original.membership.status }}</UBadge>
              <p class="mt-1 text-xs text-muted">{{ row.original.membership.semester }} • {{ row.original.membership.academicYear }}</p>
              <p class="text-xs text-muted">Until {{ row.original.membership.expiryDate }}</p>
            </div>
            <UBadge v-else color="error" variant="soft">No Membership</UBadge>
          </template>
          <template #status-cell="{ row }">
            <UBadge :color="row.original.status === 'Active' ? 'success' : 'neutral'" variant="soft">{{ row.original.status }}</UBadge>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end gap-1">
              <UTooltip text="View front and back of Library ID card">
                <UButton
                  icon="i-lucide-id-card"
                  color="neutral"
                  variant="ghost"
                  square
                  aria-label="View front and back of library card"
                  @click="openCard(row.original)"
                />
              </UTooltip>

              <UTooltip text="Open ready-to-print Library Card">
                <UButton
                  icon="i-lucide-printer"
                  color="primary"
                  variant="ghost"
                  square
                  aria-label="Print student Library Card"
                  @click="printStudentCard(row.original)"
                />
              </UTooltip>

              <UButton icon="i-lucide-rotate-cw" color="success" variant="ghost" square aria-label="Renew membership" @click="renew(row.original)" />
              <UTooltip text="Edit profile and Library Card photo">
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  square
                  aria-label="Edit Student profile and Library Card photo"
                  @click="openEdit(row.original)"
                />
              </UTooltip>
            </div>
          </template>
        </UTable>

        <template #footer>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-sm text-muted">Showing {{ students.length }} of {{ pagination.total }} students</p>
            <UPagination v-model:page="page" :total="pagination.total" :items-per-page="pageSize" />
          </div>
        </template>
      </UCard>
    </div>

    <UModal v-model:open="registrationOpen" :dismissible="!submitting" :ui="{ content: 'sm:max-w-6xl max-h-[94dvh] overflow-y-auto' }">
      <template #content>
        <div class="bg-default p-6 sm:p-8">
          <h2 class="text-xl font-bold text-highlighted">Register Student Member</h2>
          <p class="mt-1 text-sm text-muted">Create the profile, permanent card, barcode, and initial semester membership in one step.</p>

          <UForm :state="registrationForm" :validate="validate" class="mt-6 space-y-6" @submit="registerStudent">
            <div class="grid items-start gap-5 lg:grid-cols-[minmax(20rem,23rem)_minmax(0,1fr)]">
              <UFormField
                name="student.photo"
                class="min-w-0"
              >
                <StudentPhotoEditor
                  v-model="registrationPhoto"
                  required
                  :disabled="submitting"
                  title="Library Card Photo"
                  description="Choose a clear photo, then drag and zoom it inside the required 1:1 crop."
                />
              </UFormField>

              <div class="min-w-0">
                <div class="mb-3">
                  <h3 class="font-semibold text-highlighted">
                    Live Library Card Preview
                  </h3>
                  <p class="mt-1 text-sm text-muted">
                    The card updates as the Student information and cropped photo are entered. The permanent card number and barcode are generated after registration.
                  </p>
                </div>

                <div class="rounded-2xl border border-default bg-elevated/30 p-3 sm:p-4">
                  <StudentLibraryCard
                    :student="registrationPreviewStudent"
                    :show-actions="false"
                    display-side="front"
                    fit-preview
                  />
                </div>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <UFormField name="student.studentNo" label="Student Number" required><UInput v-model="registrationForm.student.studentNo" class="w-full" /></UFormField>
              <UFormField name="student.sex" label="Sex"><USelect v-model="registrationForm.student.sex" :items="sexItems" class="w-full" /></UFormField>
              <UFormField name="student.firstName" label="First Name" required><UInput v-model="registrationForm.student.firstName" class="w-full" /></UFormField>
              <UFormField name="student.middleName" label="Middle Name"><UInput v-model="registrationForm.student.middleName" class="w-full" /></UFormField>
              <UFormField name="student.lastName" label="Last Name" required><UInput v-model="registrationForm.student.lastName" class="w-full" /></UFormField>
              <UFormField name="student.suffix" label="Suffix"><UInput v-model="registrationForm.student.suffix" class="w-full" /></UFormField>
              <UFormField
                name="student.educationalLevel"
                label="Educational Level"
                description="Select College, Diploma, or Senior High School."
                required
              >
                <USelect
                  v-model="
                    registrationForm.student
                      .educationalLevel
                  "
                  :items="
                    STUDENT_EDUCATIONAL_LEVELS
                  "
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="student.course"
                label="Program"
                description="The choices are filtered by the selected educational level."
                required
              >
                <USelect
                  v-model="
                    registrationForm.student.course
                  "
                  :items="
                    registrationProgramItems
                  "
                  value-key="value"
                  placeholder="Select an approved program"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="student.yearLevel"
                :label="
                  registrationForm.student
                    .educationalLevel ===
                  'Senior High School'
                    ? 'Grade Level'
                    : 'Year Level'
                "
                required
              >
                <USelect
                  v-model="
                    registrationForm.student
                      .yearLevel
                  "
                  :items="
                    registrationYearItems
                  "
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="student.section"
                label="Section"
              >
                <UInput
                  v-model="
                    registrationForm.student
                      .section
                  "
                  class="w-full"
                />
              </UFormField>

              <UFormField name="student.email" label="Email">
                <UInput
                  v-model="registrationForm.student.email"
                  type="email"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="student.contactNo" label="Contact Number">
                <UInput
                  v-model="registrationForm.student.contactNo"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="student.address"
                label="Address"
                description="Student's current residential address."
                class="md:col-span-2"
              >
                <UTextarea
                  v-model="registrationForm.student.address"
                  :rows="2"
                  placeholder="House number, street, barangay, city or municipality, province"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="rounded-2xl border border-default bg-elevated/50 p-5">
              <div class="flex items-start gap-3">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UIcon
                    name="i-lucide-id-card"
                    class="size-5"
                  />
                </div>

                <div>
                  <h3 class="font-semibold text-highlighted">
                    Library Card Processing
                  </h3>
                  <p class="mt-1 text-xs leading-relaxed text-muted">
                    This operational status is separate from the Student profile and semester membership status.
                  </p>
                </div>
              </div>

              <div class="mt-4 grid gap-4 md:grid-cols-2">
                <UFormField
                  name="student.libraryCardStatus"
                  label="Library Card Status"
                  required
                >
                  <USelect
                    v-model="
                      registrationForm.student
                        .libraryCardStatus
                    "
                    :items="
                      LIBRARY_CARD_STATUSES
                    "
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="student.libraryCardReleaseDate"
                  label="Date of Release"
                  :hint="
                    registrationForm.student
                      .libraryCardStatus ===
                    'Released'
                      ? 'Automatically defaults to today'
                      : 'Optional'
                  "
                >
                  <UInput
                    v-model="
                      registrationForm.student
                        .libraryCardReleaseDate
                    "
                    type="date"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <UAlert
                class="mt-4"
                color="info"
                variant="soft"
                icon="i-lucide-info"
                title="Recommended workflow"
                description="New cards normally start as On Process. Change the status to Printed after production and Released when the physical card is given to the Student."
              />
            </div>

            <div class="rounded-2xl border border-default bg-elevated/50 p-5">
              <h3 class="font-semibold text-highlighted">Initial Membership</h3>
              <p class="mt-1 text-xs text-muted">The card is permanent, but access is valid only for the selected academic term.</p>
              <div class="mt-4 grid gap-4 md:grid-cols-2">
                <UFormField name="membership.academicYear" label="Academic Year" required><UInput v-model="registrationForm.membership.academicYear" placeholder="2026-2027" class="w-full" /></UFormField>
                <UFormField name="membership.semester" label="Semester" required><USelect v-model="registrationForm.membership.semester" :items="semesterItems" class="w-full" /></UFormField>
                <UFormField name="membership.issuedDate" label="Issued Date" required><UInput v-model="registrationForm.membership.issuedDate" type="date" class="w-full" /></UFormField>
                <UFormField name="membership.expiryDate" label="Valid Until" required><UInput v-model="registrationForm.membership.expiryDate" type="date" class="w-full" /></UFormField>
                <UFormField
                  name="membership.enrollmentReference"
                  label="Enrollment Reference"
                  hint="Optional"
                  description="Reference number, receipt number, or document identifier when available."
                >
                  <UInput
                    v-model="registrationForm.membership.enrollmentReference"
                    placeholder="Leave blank when not applicable"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  name="membership.remarks"
                  label="Remarks"
                  hint="Optional"
                >
                  <UTextarea
                    v-model="registrationForm.membership.remarks"
                    :rows="2"
                    placeholder="Additional notes about the registration"
                    class="w-full"
                  />
                </UFormField>
              </div>
              <UFormField name="membership.enrollmentVerified" class="mt-4">
                <UCheckbox v-model="registrationForm.membership.enrollmentVerified" label="I verified the student's enrollment document for this semester." />
              </UFormField>
            </div>

            <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <UButton label="Cancel" color="neutral" variant="outline" :disabled="submitting" @click="cancelRegistration" />
              <UButton type="submit" label="Register & Generate Card" icon="i-lucide-id-card" color="success" :loading="submitting" />
            </div>
          </UForm>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="cardOpen" :ui="{ content: 'sm:max-w-6xl max-h-[94dvh] overflow-y-auto' }">
      <template #content>
        <div class="bg-default p-6 sm:p-8">
          <div class="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 class="text-xl font-bold text-highlighted">
                Student Library ID Card
              </h2>

              <p class="mt-1 max-w-3xl text-sm text-muted">
                Preview, download, or open the dedicated ready-to-print page.
                Printing uses the active Card Designer layout and the standard
                CR80 card size.
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="selectedStudent"
                label="Print Card"
                icon="i-lucide-printer"
                color="primary"
                @click="printStudentCard(selectedStudent)"
              />

              <UButton
                icon="i-lucide-x"
                color="neutral"
                variant="ghost"
                square
                aria-label="Close Library Card preview"
                @click="() => { cardOpen = false }"
              />
            </div>
          </div>
          <StudentLibraryCard
            v-if="selectedStudent"
            :student="selectedStudent"
            :membership="selectedStudent.membership"
          />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="editOpen" :ui="{ content: 'sm:max-w-2xl max-h-[90dvh] overflow-y-auto' }">
      <template #content>
        <div class="bg-default p-6 sm:p-8">
          <h2 class="text-xl font-bold text-highlighted">Edit Student Profile</h2>
          <p class="mt-1 text-sm text-muted">Student number, card number, and barcode remain unchanged.</p>
          <div class="mt-6 space-y-5">
            <StudentPhotoEditor
              v-model="editPhoto"
              :existing-url="
                removeExistingPhoto
                  ? null
                  : selectedStudent?.photoUrl
              "
              allow-remove
              :disabled="submitting"
              title="Library Card Photo"
              description="Change the Student photo, adjust the 1:1 crop, or remove the current image."
              @remove="removeEditPhoto"
            />

            <UAlert
              v-if="removeExistingPhoto"
              color="warning"
              variant="soft"
              icon="i-lucide-image-off"
              title="Photo will be removed"
              description="Save the Student profile to remove the current Library Card photo. Choosing a new cropped photo will replace it instead."
            />

            <div class="grid gap-4 md:grid-cols-2">
              <UFormField label="First Name"><UInput v-model="editForm.firstName" class="w-full" /></UFormField>
            <UFormField label="Middle Name"><UInput v-model="editForm.middleName" class="w-full" /></UFormField>
            <UFormField label="Last Name"><UInput v-model="editForm.lastName" class="w-full" /></UFormField>
            <UFormField label="Suffix"><UInput v-model="editForm.suffix" class="w-full" /></UFormField>
            <UFormField
              label="Educational Level"
            >
              <USelect
                v-model="
                  editForm.educationalLevel
                "
                :items="
                  STUDENT_EDUCATIONAL_LEVELS
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Program"
            >
              <USelect
                v-model="editForm.course"
                :items="
                  editProgramItems
                "
                value-key="value"
                placeholder="Select an approved program"
                class="w-full"
              />
            </UFormField>

            <UFormField
              :label="
                editForm.educationalLevel ===
                'Senior High School'
                  ? 'Grade Level'
                  : 'Year Level'
              "
            >
              <USelect
                v-model="
                  editForm.yearLevel
                "
                :items="
                  editYearItems
                "
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Section">
              <UInput
                v-model="editForm.section"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Email">
              <UInput
                v-model="editForm.email"
                type="email"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Contact Number">
              <UInput
                v-model="editForm.contactNo"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Address"
              class="md:col-span-2"
            >
              <UTextarea
                v-model="editForm.address"
                :rows="2"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Library Card Status"
            >
              <USelect
                v-model="
                  editForm.libraryCardStatus
                "
                :items="
                  LIBRARY_CARD_STATUSES
                "
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Date of Release"
              :hint="
                editForm.libraryCardStatus ===
                'Released'
                  ? 'Defaults to today when blank'
                  : 'Optional'
              "
            >
              <UInput
                v-model="
                  editForm.libraryCardReleaseDate
                "
                type="date"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Status">
              <USelect
                v-model="editForm.status"
                :items="statusItems.slice(1)"
                class="w-full"
              />
            </UFormField>
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-3">
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="submitting" @click="cancelEdit" />
            <UButton label="Save Changes" icon="i-lucide-save" color="success" :loading="submitting" @click="saveStudent" />
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
