<script setup lang="ts">
import type { FormError, FormSubmitEvent, TableColumn } from "@nuxt/ui";
import type {
  StudentMember,
  StudentRegistrationInput,
  StudentStatus,
  StudentPortalCredentials,
  StudentPortalPasswordMode,
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
const termManager = useMembershipTerm();
const auth = useAuth();
const toast = useToast();
const route = useRoute();
const cardPrintQueue =
  useLibraryCardPrintQueue();

const students = ref<StudentMember[]>([]);
const selectedStudents =
  ref<Record<string, StudentMember>>({});
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
const preparingAllCards = ref(false);
const submitting = ref(false);
const registrationOpen = ref(false);
const editOpen = ref(false);
const cardOpen = ref(false);
const portalCredentials =
  ref<StudentPortalCredentials | null>(
    null,
  );
const showTemporaryPassword =
  ref(false);
const portalPasswordConfirmation =
  ref("");
const showRegistrationPassword =
  ref(false);
const showRegistrationPasswordConfirmation =
  ref(false);

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
  portalAccount: {
    create: true,
    username: "",
    passwordMode: "Generated",
    temporaryPassword: "",
  },
});

const activeMembershipTerm = computed(() => termManager.term.value);

function syncRegistrationMembership() {
  const term = activeMembershipTerm.value;
  Object.assign(registrationForm.membership, {
    academicYear: term.academicYear,
    semester: term.semester,
    issuedDate: term.validFrom,
    expiryDate: term.validUntil,
  });
}

const suggestedPortalUsername = computed(() =>
  registrationForm.student.studentNo
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 100),
);

const displayedPortalUsername = computed(() =>
  registrationForm.portalAccount.username
    ?.trim() ||
  suggestedPortalUsername.value ||
  "Generated from Student number",
);

function manualPasswordIssues(
  password: string,
  username: string,
  email: string,
  studentNo: string,
): string[] {
  const issues: string[] = [];

  if (password.length < 12) {
    issues.push(
      "Use at least 12 characters.",
    );
  }

  if (password.length > 128) {
    issues.push(
      "Use no more than 128 characters.",
    );
  }

  if (password !== password.trim()) {
    issues.push(
      "Remove spaces at the beginning or end.",
    );
  }

  if (!/[A-Z]/.test(password)) {
    issues.push(
      "Add at least one uppercase letter.",
    );
  }

  if (!/[a-z]/.test(password)) {
    issues.push(
      "Add at least one lowercase letter.",
    );
  }

  if (!/\d/.test(password)) {
    issues.push(
      "Add at least one number.",
    );
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    issues.push(
      "Add at least one symbol.",
    );
  }

  const loweredPassword =
    password.toLowerCase();
  const identifiers = [
    username,
    studentNo,
    email.split("@")[0] ?? "",
  ]
    .map((value) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),
    )
    .filter((value) =>
      value.length >= 4,
    );
  const comparablePassword =
    loweredPassword.replace(
      /[^a-z0-9]/g,
      "",
    );

  if (
    identifiers.some((identifier) =>
      comparablePassword.includes(
        identifier,
      ),
    )
  ) {
    issues.push(
      "Do not include the username, Student number, or email name.",
    );
  }

  return issues;
}

const manualPortalPasswordIssues =
  computed(() =>
    manualPasswordIssues(
      registrationForm.portalAccount
        .temporaryPassword ?? "",
      displayedPortalUsername.value,
      registrationForm.student.email ??
        "",
      registrationForm.student.studentNo,
    ),
  );

const manualPasswordChecks = computed(
  () => {
    const password =
      registrationForm.portalAccount
        .temporaryPassword ?? "";

    return [
      {
        label: "12 to 128 characters",
        met:
          password.length >= 12 &&
          password.length <= 128,
      },
      {
        label:
          "Uppercase and lowercase letters",
        met:
          /[A-Z]/.test(password) &&
          /[a-z]/.test(password),
      },
      {
        label: "At least one number",
        met: /\d/.test(password),
      },
      {
        label: "At least one symbol",
        met:
          /[^A-Za-z0-9\s]/.test(
            password,
          ),
      },
      {
        label:
          "Does not contain account identifiers",
        met:
          password.length > 0 &&
          !manualPortalPasswordIssues.value.some(
            (issue) =>
              issue.startsWith(
                "Do not include",
              ),
          ),
      },
    ];
  },
);

function setPortalPasswordMode(
  mode: StudentPortalPasswordMode,
) {
  registrationForm.portalAccount.passwordMode =
    mode;

  if (mode === "Generated") {
    registrationForm.portalAccount.temporaryPassword =
      "";
    portalPasswordConfirmation.value =
      "";
    showRegistrationPassword.value =
      false;
    showRegistrationPasswordConfirmation.value =
      false;
  }
}

watch(
  () =>
    registrationForm.portalAccount.create,
  (createAccount) => {
    if (!createAccount) {
      setPortalPasswordMode(
        "Generated",
      );
    }
  },
);

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
  { id: "select", header: "" },
  { id: "student", header: "Student" },
  { id: "card", header: "Library Card" },
  { id: "membership", header: "Current Membership" },
  { accessorKey: "status", header: "Profile" },
  { id: "actions", header: "" },
];

function studentSelectionKey(
  student: StudentMember,
): string {
  return (
    student.documentId ||
    student.libraryCardNo ||
    student.studentNo
  );
}

const selectedStudentList = computed(
  () => Object.values(selectedStudents.value),
);

function isStudentSelected(
  student: StudentMember,
): boolean {
  return Boolean(
    selectedStudents.value[
      studentSelectionKey(student)
    ],
  );
}

function setStudentSelected(
  student: StudentMember,
  selected: boolean,
) {
  const key = studentSelectionKey(student);
  const next = {
    ...selectedStudents.value,
  };

  if (selected) {
    next[key] = student;
  } else {
    delete next[key];
  }

  selectedStudents.value = next;
}

const allShownSelected = computed({
  get: () =>
    students.value.length > 0 &&
    students.value.every(
      isStudentSelected,
    ),
  set: (selected: boolean) => {
    const next = {
      ...selectedStudents.value,
    };

    for (const student of students.value) {
      const key = studentSelectionKey(student);

      if (selected) {
        next[key] = student;
      } else {
        delete next[key];
      }
    }

    selectedStudents.value = next;
  },
});

function clearStudentSelection() {
  selectedStudents.value = {};
}

const statusItems = ["All", "Active", "Inactive", "Suspended", "Graduated", "Dropped"];
const memberStatusItems = ["All", "Active", "Expired", "Suspended", "Cancelled"];
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
  if (activeMembershipTerm.value.status !== "Open" || !activeMembershipTerm.value.registrationOpen) {
    errors.push({
      name: "membership.term",
      message: "Student registration is closed for the current academic term.",
    });
  }
  if (!activeMembershipTerm.value.validFrom || !activeMembershipTerm.value.validUntil) {
    errors.push({
      name: "membership.term",
      message: "Configure the academic term and membership validity before registration.",
    });
  }
  if (!state.membership.enrollmentVerified) errors.push({ name: "membership.enrollmentVerified", message: "Verify the enrollment document." });
  if (state.portalAccount.create) {
    if (!state.student.email?.trim()) {
      errors.push({
        name: "student.email",
        message:
          "A valid email address is required to create the Student Portal account.",
      });
    }

    const username =
      state.portalAccount.username?.trim() ||
      state.student.studentNo
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9._-]/g, "");

    if (username.length < 3) {
      errors.push({
        name: "portalAccount.username",
        message:
          "Portal username must contain at least 3 valid characters.",
      });
    }

    if (
      state.portalAccount.passwordMode ===
      "Manual"
    ) {
      const password =
        state.portalAccount
          .temporaryPassword ?? "";
      const passwordIssues =
        manualPasswordIssues(
          password,
          username,
          state.student.email ?? "",
          state.student.studentNo,
        );

      if (passwordIssues.length) {
        errors.push({
          name:
            "portalAccount.temporaryPassword",
          message:
            passwordIssues[0] ??
            "Enter a secure temporary password.",
        });
      }

      if (
        password !==
        portalPasswordConfirmation.value
      ) {
        errors.push({
          name:
            "portalAccount.confirmTemporaryPassword",
          message:
            "The password confirmation does not match.",
        });
      }
    }
  }
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

    const refreshedSelection = {
      ...selectedStudents.value,
    };

    for (const student of response.data) {
      const key = studentSelectionKey(student);

      if (refreshedSelection[key]) {
        refreshedSelection[key] = student;
      }
    }

    selectedStudents.value =
      refreshedSelection;

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
    academicYear: activeMembershipTerm.value.academicYear,
    semester: activeMembershipTerm.value.semester,
    issuedDate: activeMembershipTerm.value.validFrom,
    expiryDate: activeMembershipTerm.value.validUntil,
    enrollmentVerified: false,
    enrollmentReference: "",
    remarks: "",
  });
  Object.assign(registrationForm.portalAccount, {
    create: true,
    username: "",
    passwordMode: "Generated",
    temporaryPassword: "",
  });
  portalPasswordConfirmation.value =
    "";
  showRegistrationPassword.value =
    false;
  showRegistrationPasswordConfirmation.value =
    false;

  releasePhotoSelection(
    registrationPhoto.value,
  );
  registrationPhoto.value =
    null;
}

async function copyPortalCredentials() {
  if (!portalCredentials.value) {
    return;
  }

  const credentials = [
    "SNCBT Student Portal",
    `Username: ${portalCredentials.value.username}`,
    `Email: ${portalCredentials.value.email}`,
    `Temporary password: ${portalCredentials.value.temporaryPassword}`,
    "Sign in and change this temporary password immediately.",
  ].join("\n");

  try {
    await navigator.clipboard.writeText(
      credentials,
    );
    toast.add({
      title: "Credentials copied",
      description:
        "The one-time Student Portal credentials were copied to the clipboard.",
      color: "success",
      icon: "i-lucide-copy-check",
    });
  } catch {
    toast.add({
      title: "Unable to copy credentials",
      description:
        "Copy the username and temporary password manually.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
  }
}

function closeCardPreview() {
  cardOpen.value = false;
  portalCredentials.value = null;
  showTemporaryPassword.value = false;
}

async function registerStudent(_event: FormSubmitEvent<StudentRegistrationInput>) {
  if (
    activeMembershipTerm.value.status !== "Open" ||
    !activeMembershipTerm.value.registrationOpen
  ) {
    toast.add({
      title: "Student registration is closed",
      description: "Open an academic membership term before registering a Student.",
      color: "warning",
      icon: "i-lucide-calendar-x-2",
    });
    return;
  }

  syncRegistrationMembership();

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
        portalAccount: {
          ...registrationForm.portalAccount,
          username:
            registrationForm.portalAccount.username
              ?.trim() ||
            suggestedPortalUsername.value,
        },
      });

    selectedStudent.value =
      response.data.student;
    portalCredentials.value =
      response.data.portalAccount;
    showTemporaryPassword.value =
      false;

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
      description: response.data.portalAccount
        ? `${response.data.student.fullName} now has an active Library Card and a linked Student Portal account.`
        : `${response.data.student.fullName} now has an active Library Card that is ready for preview, download, or printing.`,
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

function canPrintLibraryCard(student: StudentMember): boolean {
  return student.libraryCardStatus !== "Replacement";
}

async function openCardPrintPreview(
  sourceStudents: StudentMember[],
) {
  if (sourceStudents.length === 0) {
    toast.add({
      title: "No Library Cards selected",
      description:
        "Select at least one Student before opening the print preview.",
      color: "warning",
      icon: "i-lucide-printer",
    });

    return;
  }

  const blockedStudents = sourceStudents.filter(
    (student) => !canPrintLibraryCard(student),
  );
  const printableStudents = sourceStudents.filter(canPrintLibraryCard);

  if (blockedStudents.length > 0) {
    toast.add({
      title: "Replacement payment required",
      description: `${blockedStudents.length} Library Card${blockedStudents.length === 1 ? " is" : "s are"} awaiting cashier OR verification and cannot be printed yet.`,
      color: "warning",
      icon: "i-lucide-receipt-text",
    });
  }

  if (printableStudents.length === 0) {
    return;
  }

  const orderedStudents = [
    ...printableStudents,
  ].sort((left, right) => {
    const nameOrder =
      left.fullName.localeCompare(
        right.fullName,
        undefined,
        { sensitivity: "base" },
      );

    return (
      nameOrder ||
      left.studentNo.localeCompare(
        right.studentNo,
        undefined,
        { numeric: true },
      )
    );
  });

  cardPrintQueue.setPrintQueue(
    orderedStudents,
    route.fullPath,
  );

  cardOpen.value = false;

  await navigateTo(
    "/librarian/library-card-print",
  );
}

async function printStudentCard(
  student: StudentMember,
) {
  await openCardPrintPreview([student]);
}

async function printSelectedStudents() {
  await openCardPrintPreview(
    selectedStudentList.value,
  );
}

async function printAllStudents() {
  if (preparingAllCards.value) {
    return;
  }

  preparingAllCards.value = true;

  try {
    const allStudents =
      await members.listAllStudents();

    const printableStudents =
      allStudents.filter(
        (student) =>
          student.status !==
          "Pending Approval",
      );

    if (printableStudents.length === 0) {
      toast.add({
        title: "No Students available",
        description:
          "There are no approved Student Library Cards to print.",
        color: "warning",
        icon: "i-lucide-printer",
      });

      return;
    }

    await openCardPrintPreview(
      printableStudents,
    );
  } catch (error) {
    toast.add({
      title:
        "Unable to prepare all Library Cards",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    preparingAllCards.value = false;
  }
}


function removeEditPhoto() {
  releasePhotoSelection(
    editPhoto.value,
  );
  editPhoto.value = null;
  removeExistingPhoto.value =
    true;
}

async function openRegistrationModal() {
  try {
    await termManager.load(true);
    syncRegistrationMembership();

    if (
      activeMembershipTerm.value.status !== "Open" ||
      !activeMembershipTerm.value.registrationOpen
    ) {
      toast.add({
        title: "Student registration is closed",
        description: "Open the academic term and allow Student registration first.",
        color: "warning",
        icon: "i-lucide-calendar-x-2",
        actions: [
          {
            label: "Manage Term",
            onClick: () => navigateTo("/librarian/membership-term"),
          },
        ],
      });
      return;
    }

    registrationOpen.value = true;
  } catch (error) {
    toast.add({
      title: "Unable to load the academic term",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
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
onMounted(async () => {
  try {
    await termManager.load(true);
    syncRegistrationMembership();
  } catch (error) {
    console.warn("Academic membership term could not be loaded.", error);
  }
  await loadStudents();
});

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
            to="/librarian/student-registration-approvals"
            label="Registration Approvals"
            icon="i-lucide-clipboard-check"
            color="warning"
            variant="soft"
          />

          <UButton
            to="/librarian/student-self-registration"
            label="Registration QR"
            icon="i-lucide-qr-code"
            color="neutral"
            variant="outline"
          />

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
            to="/librarian/membership-term"
            label="Academic Term"
            icon="i-lucide-calendar-range"
            color="neutral"
            variant="outline"
          />

          <UButton
            label="Register Student"
            icon="i-lucide-user-plus"
            color="success"
            @click="openRegistrationModal"
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

        <div
          class="mb-4 flex flex-col gap-3 rounded-xl border border-default bg-elevated/40 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="flex flex-wrap items-center gap-3">
            <UCheckbox
              v-model="allShownSelected"
              :disabled="loading || students.length === 0"
              :label="`Select all shown (${students.length})`"
            />

            <span class="text-sm text-muted">
              {{ selectedStudentList.length }}
              {{
                selectedStudentList.length === 1
                  ? "Student selected"
                  : "Students selected"
              }}
              across pages
            </span>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="selectedStudentList.length > 0"
              label="Clear Selection"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              @click="clearStudentSelection"
            />

            <UButton
              :label="`Print Selected (${selectedStudentList.length})`"
              icon="i-lucide-printer"
              color="primary"
              variant="soft"
              :disabled="selectedStudentList.length === 0"
              @click="printSelectedStudents"
            />

            <UTooltip
              text="Prepare every approved Student in the directory, including Students on other pages."
            >
              <UButton
                label="Print All Students"
                icon="i-lucide-printer-check"
                color="primary"
                :loading="preparingAllCards"
                :disabled="loading"
                @click="printAllStudents"
              />
            </UTooltip>
          </div>
        </div>

        <div v-if="loading" class="space-y-3">
          <USkeleton v-for="index in 6" :key="index" class="h-16 w-full" />
        </div>

        <div v-else-if="students.length === 0" class="py-16 text-center">
          <UIcon name="i-lucide-users" class="mx-auto size-10 text-dimmed" />
          <h3 class="mt-3 font-semibold text-highlighted">No student members found</h3>
          <p class="mt-1 text-sm text-muted">Register a student or adjust the filters.</p>
        </div>

        <UTable v-else :data="students" :columns="columns">
          <template #select-cell="{ row }">
            <UCheckbox
              :model-value="isStudentSelected(row.original)"
              :aria-label="`Select ${row.original.fullName} for Library Card printing`"
              @update:model-value="
                setStudentSelected(
                  row.original,
                  Boolean($event),
                )
              "
            />
          </template>

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

              <UTooltip :text="canPrintLibraryCard(row.original) ? 'Open ready-to-print Library Card' : 'Verify the cashier OR for the replacement fee before printing'">
                <UButton
                  icon="i-lucide-printer"
                  color="primary"
                  variant="ghost"
                  square
                  aria-label="Print student Library Card"
                  :disabled="!canPrintLibraryCard(row.original)"
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

              <UFormField
                name="student.email"
                label="Email"
                :required="registrationForm.portalAccount.create"
                :description="
                  registrationForm.portalAccount.create
                    ? 'Required for Student Portal sign-in and account recovery.'
                    : 'Optional when no Student Portal account will be created.'
                "
              >
                <UInput
                  v-model="registrationForm.student.email"
                  type="email"
                  autocomplete="email"
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

            <div class="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex min-w-0 items-start gap-3">
                  <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UIcon
                      name="i-lucide-user-round-check"
                      class="size-5"
                    />
                  </div>

                  <div class="min-w-0">
                    <h3 class="font-semibold text-highlighted">
                      Student Portal Account
                    </h3>
                    <p class="mt-1 text-xs leading-relaxed text-muted">
                      Create and securely link the Student login account to this Library profile. Choose an automatically generated password or enter a secure temporary password for the Student.
                    </p>
                  </div>
                </div>

                <USwitch
                  v-model="registrationForm.portalAccount.create"
                  :disabled="submitting"
                  label="Create account"
                />
              </div>

              <div
                v-if="registrationForm.portalAccount.create"
                class="mt-4 grid gap-4 md:grid-cols-2"
              >
                <UFormField
                  name="portalAccount.username"
                  label="Portal Username"
                  description="Leave blank to use the Student number automatically."
                >
                  <UInput
                    v-model="registrationForm.portalAccount.username"
                    :placeholder="displayedPortalUsername"
                    autocomplete="off"
                    class="w-full"
                  />
                </UFormField>

                <div class="rounded-xl border border-default bg-default/70 p-4">
                  <p class="text-xs font-medium uppercase tracking-wide text-muted">
                    Account preview
                  </p>
                  <p class="mt-2 break-all font-mono text-sm font-semibold text-highlighted">
                    {{ displayedPortalUsername }}
                  </p>
                  <p class="mt-1 break-all text-xs text-muted">
                    {{ registrationForm.student.email || 'Enter the Student email address' }}
                  </p>
                </div>

                <div class="md:col-span-2">
                  <div class="mb-3">
                    <p class="text-sm font-medium text-highlighted">
                      Temporary Password Setup
                    </p>
                    <p class="mt-1 text-xs leading-relaxed text-muted">
                      Generate a secure password automatically or enter a temporary password agreed with the Student. The password is shown only in the registration result.
                    </p>
                  </div>

                  <div class="grid gap-3 sm:grid-cols-2">
                    <UButton
                      type="button"
                      block
                      icon="i-lucide-wand-sparkles"
                      label="Generate Secure Password"
                      :color="
                        registrationForm.portalAccount.passwordMode === 'Generated'
                          ? 'primary'
                          : 'neutral'
                      "
                      :variant="
                        registrationForm.portalAccount.passwordMode === 'Generated'
                          ? 'solid'
                          : 'outline'
                      "
                      @click="setPortalPasswordMode('Generated')"
                    />

                    <UButton
                      type="button"
                      block
                      icon="i-lucide-key-round"
                      label="Enter Temporary Password"
                      :color="
                        registrationForm.portalAccount.passwordMode === 'Manual'
                          ? 'primary'
                          : 'neutral'
                      "
                      :variant="
                        registrationForm.portalAccount.passwordMode === 'Manual'
                          ? 'solid'
                          : 'outline'
                      "
                      @click="setPortalPasswordMode('Manual')"
                    />
                  </div>
                </div>

                <UAlert
                  v-if="registrationForm.portalAccount.passwordMode === 'Generated'"
                  class="md:col-span-2"
                  color="info"
                  variant="soft"
                  icon="i-lucide-shield-check"
                  title="Secure password will be generated"
                  description="The backend will generate a unique 16-character password containing uppercase and lowercase letters, numbers, and symbols. Give it privately to the Student after registration."
                />

                <template
                  v-if="registrationForm.portalAccount.passwordMode === 'Manual'"
                >
                  <UFormField
                    name="portalAccount.temporaryPassword"
                    label="Temporary Password"
                    description="Enter a strong password agreed with the Student."
                    required
                  >
                    <UInput
                      v-model="registrationForm.portalAccount.temporaryPassword"
                      :type="showRegistrationPassword ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="Enter 12–128 characters"
                      class="w-full font-mono"
                    >
                      <template #trailing>
                        <UButton
                          type="button"
                          :icon="
                            showRegistrationPassword
                              ? 'i-lucide-eye-off'
                              : 'i-lucide-eye'
                          "
                          color="neutral"
                          variant="ghost"
                          square
                          :aria-label="
                            showRegistrationPassword
                              ? 'Hide temporary password'
                              : 'Show temporary password'
                          "
                          @click="showRegistrationPassword = !showRegistrationPassword"
                        />
                      </template>
                    </UInput>
                  </UFormField>

                  <UFormField
                    name="portalAccount.confirmTemporaryPassword"
                    label="Confirm Temporary Password"
                    description="Enter the same password again."
                    required
                  >
                    <UInput
                      v-model="portalPasswordConfirmation"
                      :type="showRegistrationPasswordConfirmation ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="Re-enter the password"
                      class="w-full font-mono"
                    >
                      <template #trailing>
                        <UButton
                          type="button"
                          :icon="
                            showRegistrationPasswordConfirmation
                              ? 'i-lucide-eye-off'
                              : 'i-lucide-eye'
                          "
                          color="neutral"
                          variant="ghost"
                          square
                          :aria-label="
                            showRegistrationPasswordConfirmation
                              ? 'Hide password confirmation'
                              : 'Show password confirmation'
                          "
                          @click="showRegistrationPasswordConfirmation = !showRegistrationPasswordConfirmation"
                        />
                      </template>
                    </UInput>
                  </UFormField>

                  <div class="rounded-xl border border-default bg-default/70 p-4 md:col-span-2">
                    <p class="text-xs font-semibold uppercase tracking-wide text-muted">
                      Password requirements
                    </p>
                    <div class="mt-3 grid gap-2 sm:grid-cols-2">
                      <div
                        v-for="check in manualPasswordChecks"
                        :key="check.label"
                        class="flex items-center gap-2 text-xs"
                        :class="check.met ? 'text-success' : 'text-muted'"
                      >
                        <UIcon
                          :name="check.met ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                          class="size-4 shrink-0"
                        />
                        <span>{{ check.label }}</span>
                      </div>
                    </div>
                  </div>

                  <UAlert
                    class="md:col-span-2"
                    color="warning"
                    variant="soft"
                    icon="i-lucide-key-round"
                    title="Keep the password private"
                    description="Do not use a shared default password. Confirm the password privately with the Student and instruct the Student to change it after the first sign-in."
                  />
                </template>
              </div>
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

            <div class="rounded-2xl border border-primary/25 bg-primary/5 p-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 class="font-semibold text-highlighted">Initial Membership</h3>
                  <p class="mt-1 text-xs leading-5 text-muted">
                    Academic-term dates are managed centrally and cannot be changed inside this registration form.
                  </p>
                </div>
                <UButton
                  to="/librarian/membership-term"
                  label="Manage Term"
                  icon="i-lucide-calendar-range"
                  color="neutral"
                  variant="outline"
                  size="sm"
                />
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div class="rounded-xl border border-default bg-default/70 p-4">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">Academic Year</p>
                  <p class="mt-2 font-semibold text-highlighted">{{ activeMembershipTerm.academicYear }}</p>
                </div>
                <div class="rounded-xl border border-default bg-default/70 p-4">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">Semester</p>
                  <p class="mt-2 font-semibold text-highlighted">{{ activeMembershipTerm.semester }}</p>
                </div>
                <div class="rounded-xl border border-default bg-default/70 p-4">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">Valid From</p>
                  <p class="mt-2 font-semibold text-highlighted">{{ activeMembershipTerm.validFrom }}</p>
                </div>
                <div class="rounded-xl border border-default bg-default/70 p-4">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted">Valid Until</p>
                  <p class="mt-2 font-semibold text-highlighted">{{ activeMembershipTerm.validUntil }}</p>
                </div>
              </div>

              <UAlert
                v-if="activeMembershipTerm.status !== 'Open' || !activeMembershipTerm.registrationOpen"
                class="mt-4"
                color="warning"
                variant="soft"
                icon="i-lucide-calendar-x-2"
                title="Student registration is closed"
                description="Open the academic term before completing this registration."
              />

              <div class="mt-4 grid gap-4 md:grid-cols-2">
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
                <UCheckbox
                  v-model="registrationForm.membership.enrollmentVerified"
                  label="I verified the Student's enrollment document for the active semester."
                />
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
                @click="closeCardPreview"
              />
            </div>
          </div>

          <div
            v-if="portalCredentials"
            class="mb-6 rounded-2xl border border-success/40 bg-success/5 p-5"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="flex min-w-0 items-start gap-3">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                  <UIcon
                    name="i-lucide-shield-check"
                    class="size-5"
                  />
                </div>
                <div>
                  <h3 class="font-semibold text-highlighted">
                    Student Portal Account Created
                  </h3>
                  <p class="mt-1 text-sm text-muted">
                    These credentials are shown only in this registration result. Copy them before closing this window.
                  </p>
                </div>
              </div>

              <UButton
                label="Copy Credentials"
                icon="i-lucide-copy"
                color="success"
                variant="soft"
                @click="copyPortalCredentials"
              />
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <UFormField label="Username">
                <UInput
                  :model-value="portalCredentials.username"
                  readonly
                  class="w-full font-mono"
                />
              </UFormField>

              <UFormField label="Email">
                <UInput
                  :model-value="portalCredentials.email"
                  readonly
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Temporary Password"
                class="md:col-span-2"
              >
                <UInput
                  :model-value="portalCredentials.temporaryPassword"
                  :type="showTemporaryPassword ? 'text' : 'password'"
                  readonly
                  class="w-full font-mono"
                >
                  <template #trailing>
                    <UButton
                      :icon="
                        showTemporaryPassword
                          ? 'i-lucide-eye-off'
                          : 'i-lucide-eye'
                      "
                      color="neutral"
                      variant="ghost"
                      square
                      :aria-label="
                        showTemporaryPassword
                          ? 'Hide temporary password'
                          : 'Show temporary password'
                      "
                      @click="showTemporaryPassword = !showTemporaryPassword"
                    />
                  </template>
                </UInput>
              </UFormField>
            </div>

            <UAlert
              class="mt-4"
              color="warning"
              variant="soft"
              icon="i-lucide-triangle-alert"
              title="Confidential credentials"
              description="Do not place the temporary password on the public side of the Library Card. Give it privately to the Student and require an immediate password change."
            />
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
