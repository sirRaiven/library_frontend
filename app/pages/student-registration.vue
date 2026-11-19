<script setup lang="ts">
import AppSkipLink from "~/components/shared/AppSkipLink.vue";
import type { FormError, FormSubmitEvent } from "@nuxt/ui";
import StudentPhotoEditor from "~/components/librarian/StudentPhotoEditor.vue";
import type { CroppedStudentPhoto } from "~/types/studentPhoto";
import type {
  CredentialHelpInput,
  CredentialHelpResult,
  PublicStudentRegistrationInput,
  RegistrationAccessDetails,
  StudentRegistrationResult,
} from "~/composables/useStudentSelfRegistration";

definePageMeta({
  layout: false,
  title: "Student Library Registration",
  public: true,
});

useHead({
  meta: [
    { name: "robots", content: "noindex, nofollow, noarchive" },
    { name: "referrer", content: "same-origin" },
  ],
});

const colorMode = useColorMode();
const selfRegistration = useStudentSelfRegistration();
const libraryOptions = useLibraryOptions();
const toast = useToast();

const access = ref<RegistrationAccessDetails | null>(null);
const accessLoading = ref(true);
const accessError = ref("");
const activeView = ref<"registration" | "help">("registration");
const submitting = ref(false);
const registrationResult = ref<StudentRegistrationResult | null>(null);
const registrationSuccessOpen = ref(false);
const helpResult = ref<CredentialHelpResult | null>(null);
const credentialHelpSuccessOpen = ref(false);
const registrationPhoto = ref<CroppedStudentPhoto | null>(null);
const showPassword = ref(false);
const showConfirmPassword = ref(false);

const registration = reactive<PublicStudentRegistrationInput>({
  student: {
    studentNo: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    sex: undefined,
    educationalLevelCode: "",
    programCode: "",
    yearLevelCode: "",
    section: "",
    email: "",
    contactNo: "",
    address: "",
  },
  membership: {
    enrollmentReference: "",
  },
  account: {
    password: "",
    confirmPassword: "",
  },
  photo: {
    data: "",
    mimeType: "",
    fileName: "",
  },
  privacyNoticeAccepted: false,
  termsAccepted: false,
});

const credentialHelp = reactive<CredentialHelpInput>({
  studentNo: "",
  firstName: "",
  lastName: "",
  email: "",
  contactNo: "",
  privacyNoticeAccepted: false,
});

const educationalLevelOptions = computed(() => libraryOptions.educationalLevels.value);
const programOptions = computed(() =>
  libraryOptions.programsForEducationalLevel(registration.student.educationalLevelCode),
);
const yearOptions = computed(() =>
  libraryOptions.yearLevelsForEducationalLevel(registration.student.educationalLevelCode),
);
const registrationChoicesAvailable = computed(() =>
  libraryOptions.publicLoaded.value &&
  educationalLevelOptions.value.length > 0 &&
  programOptions.value.length > 0 &&
  yearOptions.value.length > 0,
);
const registrationChoicesError = computed(() => libraryOptions.error.value);
const sexOptions = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
];

const registrationAvailable = computed(() =>
  Boolean(
    access.value &&
    access.value.membership.termStatus === "Open" &&
    access.value.membership.registrationOpen &&
    Boolean(access.value.membership.validFrom) &&
    Boolean(access.value.membership.validUntil),
  ),
);

const portalUsername = computed(() =>
  registration.student.studentNo
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "") || "Student number",
);

function syncRegistrationChoices() {
  const levels = libraryOptions.educationalLevels.value;
  if (!levels.some((item) => item.value === registration.student.educationalLevelCode)) {
    registration.student.educationalLevelCode = levels[0]?.value ?? "";
  }

  const programs = libraryOptions.programsForEducationalLevel(registration.student.educationalLevelCode);
  if (!programs.some((item) => item.value === registration.student.programCode)) {
    registration.student.programCode = programs[0]?.value ?? "";
  }

  const years = libraryOptions.yearLevelsForEducationalLevel(registration.student.educationalLevelCode);
  if (!years.some((item) => item.value === registration.student.yearLevelCode)) {
    registration.student.yearLevelCode = years[0]?.value ?? "";
  }
}

watch(
  [
    () => libraryOptions.educationalLevels.value,
    () => registration.student.educationalLevelCode,
    () => registration.student.programCode,
  ],
  syncRegistrationChoices,
  { deep: true },
);

function registrationErrors(state: PublicStudentRegistrationInput): FormError[] {
  const errors: FormError[] = [];
  if (!registrationAvailable.value) {
    errors.push({
      name: "membership.term",
      message: "Student registration is closed for the current academic term.",
    });
  }
  const requiredFields: Array<[string, string, unknown]> = [
    ["student.studentNo", "Student number is required.", state.student.studentNo],
    ["student.firstName", "First name is required.", state.student.firstName],
    ["student.lastName", "Last name is required.", state.student.lastName],
    ["student.programCode", "Course or program is required.", state.student.programCode],
    ["student.educationalLevelCode", "Educational level is required.", state.student.educationalLevelCode],
    ["student.yearLevelCode", "Year or grade level is required.", state.student.yearLevelCode],
    ["student.email", "Email address is required.", state.student.email],
    ["account.password", "Password is required.", state.account.password],
  ];

  for (const [name, message, value] of requiredFields) {
    if (!String(value ?? "").trim()) errors.push({ name, message });
  }
  if (!registrationPhoto.value) {
    errors.push({
      name: "photo",
      message: "Upload and crop the Student Library Card photo.",
    });
  }
  if (state.account.password.length > 0 && state.account.password.length < 12) {
    errors.push({
      name: "account.password",
      message: "Password must contain at least 12 characters.",
    });
  }
  if (state.account.password !== state.account.confirmPassword) {
    errors.push({
      name: "account.confirmPassword",
      message: "Password confirmation does not match.",
    });
  }
  if (!state.privacyNoticeAccepted) {
    errors.push({ name: "privacyNoticeAccepted", message: "Accept the privacy notice." });
  }
  if (!state.termsAccepted) {
    errors.push({ name: "termsAccepted", message: "Confirm that the information is accurate." });
  }
  return errors;
}

function helpErrors(state: CredentialHelpInput): FormError[] {
  const errors: FormError[] = [];
  for (const [name, label, value] of [
    ["studentNo", "Student number", state.studentNo],
    ["firstName", "First name", state.firstName],
    ["lastName", "Last name", state.lastName],
  ] as const) {
    if (!String(value ?? "").trim()) errors.push({ name, message: `${label} is required.` });
  }
  if (!state.email?.trim() && !state.contactNo?.trim()) {
    errors.push({ name: "email", message: "Enter the registered email or contact number." });
  }
  if (!state.privacyNoticeAccepted) {
    errors.push({ name: "privacyNoticeAccepted", message: "Accept the privacy notice." });
  }
  return errors;
}

async function loadAccess() {
  accessLoading.value = true;
  accessError.value = "";
  try {
    access.value = await selfRegistration.validateAccess();
  } catch (error) {
    accessError.value = selfRegistration.errorMessage(error);
  } finally {
    accessLoading.value = false;
  }
}

async function loadRegistrationChoices(force = false) {
  try {
    await libraryOptions.loadPublicRegistration(force);
    syncRegistrationChoices();
  } catch {
    // The composable exposes a safe retryable state; keep the rest of the page usable.
  }
}

function resetRegistrationForm() {
  const previewUrl = registrationPhoto.value?.previewUrl;
  if (previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }

  Object.assign(registration.student, {
    studentNo: "",
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    sex: undefined,
    educationalLevelCode: "",
    programCode: "",
    yearLevelCode: "",
    section: "",
    email: "",
    contactNo: "",
    address: "",
  });
  Object.assign(registration.membership, { enrollmentReference: "" });
  Object.assign(registration.account, { password: "", confirmPassword: "" });
  registration.photo = { data: "", mimeType: "", fileName: "" };
  registration.privacyNoticeAccepted = false;
  registration.termsAccepted = false;
  registrationPhoto.value = null;
  syncRegistrationChoices();
  showPassword.value = false;
  showConfirmPassword.value = false;
}

function resetCredentialHelpForm() {
  Object.assign(credentialHelp, {
    studentNo: "",
    firstName: "",
    lastName: "",
    email: "",
    contactNo: "",
    privacyNoticeAccepted: false,
  });
}

async function proceedToSignIn() {
  registrationSuccessOpen.value = false;
  registrationResult.value = null;
  await navigateTo("/");
}

async function proceedAfterCredentialHelp() {
  credentialHelpSuccessOpen.value = false;
  helpResult.value = null;
  await navigateTo("/");
}

async function submitRegistration(
  event: FormSubmitEvent<PublicStudentRegistrationInput>,
) {
  if (
    submitting.value ||
    !access.value ||
    !registrationPhoto.value ||
    !registrationAvailable.value ||
    !registrationChoicesAvailable.value
  ) {
    if (!registrationAvailable.value) {
      toast.add({
        title: "Registration is closed",
        description: "Please wait for the Library to open the next academic term.",
        color: "warning",
        icon: "i-lucide-calendar-x-2",
      });
    } else if (!registrationChoicesAvailable.value) {
      toast.add({
        title: "Registration choices are unavailable",
        description: "Try loading the registration choices again before submitting.",
        color: "warning",
        icon: "i-lucide-refresh-cw",
      });
    }
    return;
  }
  submitting.value = true;
  registrationResult.value = null;

  try {
    const photo = await selfRegistration.fileToPhotoPayload(
      registrationPhoto.value.file,
    );
    registrationResult.value = await selfRegistration.register({
      ...event.data,
      photo,
    });
    resetRegistrationForm();
    registrationSuccessOpen.value = true;
  } catch (error) {
    toast.add({
      title: "Registration was not submitted",
      description: selfRegistration.errorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    submitting.value = false;
  }
}

async function submitCredentialHelp(
  event: FormSubmitEvent<CredentialHelpInput>,
) {
  if (submitting.value || !access.value) return;
  submitting.value = true;
  helpResult.value = null;
  try {
    helpResult.value = await selfRegistration.requestCredentialHelp(event.data);
    resetCredentialHelpForm();
    credentialHelpSuccessOpen.value = true;
  } catch (error) {
    toast.add({
      title: "Request was not submitted",
      description: selfRegistration.errorMessage(error),
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void loadAccess();
  void loadRegistrationChoices();
});
</script>

<template>
  <AppSkipLink />
  <div class="sncbt-public-registration-shell min-h-dvh bg-[var(--sncbt-canvas)] text-default">
    <header class="sncbt-navbar-surface border-b border-default/70">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div class="flex min-w-0 items-center gap-3">
          <div class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-default bg-default p-1.5 shadow-sm">
            <img src="/sncbt-library-logo.png" alt="SNCBT Library" class="size-full object-contain">
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold text-primary">SNCBT LIBRARY</p>
            <h1 class="truncate text-base font-bold sm:text-lg">Student Membership Registration</h1>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton to="/" label="Student Portal" icon="i-lucide-log-in" color="neutral" variant="outline" class="hidden sm:inline-flex" />
          <UButton
            :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
            color="neutral"
            variant="ghost"
            square
            aria-label="Change color mode"
            @click="() => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'; }"
          />
        </div>
      </div>
    </header>

    <main class="sncbt-page-shell py-8 lg:py-10">
      <AppDataSkeleton v-if="accessLoading" variant="form" :rows="8" label="Checking student registration availability" />

      <UAlert
        v-else-if="accessError"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="Registration page is unavailable"
        :description="accessError"
      />

      <template v-else-if="access">
        <section class="sncbt-page-hero mb-7 p-6 sm:p-8">
          <div class="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Student Registration</p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight text-highlighted sm:text-[1.75rem]">Register your Library membership and Portal account</h2>
              <p class="mt-3 max-w-3xl text-sm leading-6 text-muted">
                Complete the same essential information collected at the Library counter. Your Student number will be your Portal username. The Librarian must approve the request before you can sign in.
              </p>
            </div>
            <div class="rounded-xl border border-default bg-elevated/50 p-4 text-sm">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold">{{ access.membership.academicYear }}</p>
                  <p class="mt-1 text-muted">{{ access.membership.semester }}</p>
                </div>
                <UBadge
                  :color="registrationAvailable ? 'success' : 'warning'"
                  variant="soft"
                >
                  {{ registrationAvailable ? "Open" : "Closed" }}
                </UBadge>
              </div>
              <p class="mt-3 text-xs text-muted">
                Valid {{ access.membership.validFrom || '—' }} to {{ access.membership.validUntil || '—' }}
              </p>
            </div>
          </div>
        </section>

        <UAlert
          v-if="!registrationAvailable"
          class="mb-6"
          color="warning"
          variant="soft"
          icon="i-lucide-calendar-x-2"
          title="Student registration is currently closed"
          description="The Library has not opened new Student memberships for this academic term. You may still submit a credential-help request for an existing account."
        />

        <div class="mb-6 flex flex-wrap gap-2">
          <UButton label="New Membership Registration" icon="i-lucide-user-plus" :variant="activeView === 'registration' ? 'solid' : 'outline'" color="primary" @click="() => { activeView = 'registration'; }" />
          <UButton label="Forgotten Credentials" icon="i-lucide-key-round" :variant="activeView === 'help' ? 'solid' : 'outline'" color="neutral" @click="() => { activeView = 'help'; }" />
        </div>

        <UForm
          v-if="activeView === 'registration'"
          :state="registration"
          :validate="registrationErrors"
          class="space-y-6"
          @submit="submitRegistration"
        >
          <section class="sncbt-form-section">
            <div class="mb-5">
              <h3 class="text-xl font-bold text-highlighted">Student Library Card Photo</h3>
              <p class="mt-1 text-sm text-muted">Upload a clear, recent, front-facing photo and complete the 1:1 crop.</p>
            </div>
            <UFormField name="photo">
              <StudentPhotoEditor
                v-model="registrationPhoto"
                required
                :disabled="submitting"
                title="Student Photo"
                description="This photo will appear on the digital and printed Student Library Card after Librarian approval."
              />
            </UFormField>
          </section>

          <div v-if="registrationChoicesError" class="space-y-2">
            <UAlert
              color="warning"
              variant="soft"
              icon="i-lucide-refresh-cw"
              title="Registration choices are unavailable"
              description="Registration choices could not be loaded. Try again."
            />
            <UButton
              label="Try again"
              icon="i-lucide-refresh-cw"
              color="warning"
              variant="soft"
              :loading="libraryOptions.loading.value"
              @click="loadRegistrationChoices(true)"
            />
          </div>

          <section class="sncbt-form-section">
            <h3 class="text-xl font-bold text-highlighted">Student Information</h3>
            <p class="mt-1 text-sm text-muted">Enter information that matches your school records.</p>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <UFormField name="student.studentNo" label="Student Number" required>
                <UInput v-model="registration.student.studentNo" class="w-full" placeholder="Example: 26-000321" />
              </UFormField>
              <UFormField name="student.sex" label="Sex">
                <USelect v-model="registration.student.sex" :items="sexOptions" class="w-full" />
              </UFormField>
              <UFormField name="student.firstName" label="First Name" required><UInput v-model="registration.student.firstName" class="w-full" /></UFormField>
              <UFormField name="student.middleName" label="Middle Name"><UInput v-model="registration.student.middleName" class="w-full" /></UFormField>
              <UFormField name="student.lastName" label="Last Name" required><UInput v-model="registration.student.lastName" class="w-full" /></UFormField>
              <UFormField name="student.suffix" label="Suffix"><UInput v-model="registration.student.suffix" class="w-full" placeholder="Jr., III" /></UFormField>
              <UFormField name="student.educationalLevelCode" label="Educational Level" required><USelect v-model="registration.student.educationalLevelCode" :items="educationalLevelOptions" :disabled="libraryOptions.loading.value" class="w-full" /></UFormField>
              <UFormField name="student.programCode" label="Course / Program" required><USelect v-model="registration.student.programCode" :items="programOptions" :disabled="libraryOptions.loading.value || !registration.student.educationalLevelCode" class="w-full" /></UFormField>
              <UFormField name="student.yearLevelCode" label="Year / Grade Level" required><USelect v-model="registration.student.yearLevelCode" :items="yearOptions" :disabled="libraryOptions.loading.value || !registration.student.programCode" class="w-full" /></UFormField>
              <UFormField name="student.section" label="Section"><UInput v-model="registration.student.section" class="w-full" /></UFormField>
              <UFormField name="student.email" label="Email Address" required><UInput v-model="registration.student.email" type="email" class="w-full" /></UFormField>
              <UFormField name="student.contactNo" label="Contact Number"><UInput v-model="registration.student.contactNo" class="w-full" /></UFormField>
              <UFormField name="student.address" label="Home Address" class="md:col-span-2"><UTextarea v-model="registration.student.address" :rows="3" class="w-full" /></UFormField>
            </div>
          </section>

          <section class="sncbt-form-section border-primary/25 bg-primary/5">
            <h3 class="text-xl font-bold text-highlighted">Student Portal Account</h3>
            <p class="mt-1 text-sm text-muted">Your Student number is automatically used as your username and cannot be changed during registration.</p>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <UFormField label="Portal Username">
                <UInput :model-value="portalUsername" readonly disabled class="w-full font-mono" />
              </UFormField>
              <div class="rounded-xl border border-default bg-default/70 p-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">Account status</p>
                <p class="mt-2 font-semibold text-warning">Pending Librarian approval</p>
                <p class="mt-1 text-xs text-muted">Sign-in becomes available only after approval.</p>
              </div>
              <UFormField name="account.password" label="Password" required>
                <UInput v-model="registration.account.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" class="w-full" :ui="{ trailing: 'pe-1' }">
                  <template #trailing><UButton :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" :aria-label="showPassword ? 'Hide password' : 'Show password'" color="neutral" variant="ghost" size="sm" square @click="() => { showPassword = !showPassword; }" /></template>
                </UInput>
              </UFormField>
              <UFormField name="account.confirmPassword" label="Confirm Password" required>
                <UInput v-model="registration.account.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password" class="w-full" :ui="{ trailing: 'pe-1' }">
                  <template #trailing><UButton :icon="showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" :aria-label="showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'" color="neutral" variant="ghost" size="sm" square @click="() => { showConfirmPassword = !showConfirmPassword; }" /></template>
                </UInput>
              </UFormField>
            </div>
            <UAlert class="mt-4" color="info" variant="soft" icon="i-lucide-shield-check" title="Password requirements" description="Use 12 or more characters with uppercase, lowercase, number, and symbol. Do not include your Student number or email name." />
          </section>

          <section class="sncbt-form-section">
            <h3 class="text-xl font-bold text-highlighted">Initial Library Membership</h3>
            <div class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-xl border border-default p-4"><p class="text-xs uppercase text-muted">Academic Year</p><p class="mt-2 font-semibold">{{ access.membership.academicYear }}</p></div>
              <div class="rounded-xl border border-default p-4"><p class="text-xs uppercase text-muted">Semester</p><p class="mt-2 font-semibold">{{ access.membership.semester }}</p></div>
              <div class="rounded-xl border border-default p-4"><p class="text-xs uppercase text-muted">Membership Validity</p><p class="mt-2 font-semibold">{{ access.membership.validFrom || '—' }} to {{ access.membership.validUntil || '—' }}</p></div>
              <div class="rounded-xl border border-default p-4"><p class="text-xs uppercase text-muted">Membership Status</p><p class="mt-2 font-semibold text-warning">Pending approval</p></div>
            </div>
          </section>

          <section class="sncbt-form-section">
            <UFormField name="privacyNoticeAccepted"><UCheckbox v-model="registration.privacyNoticeAccepted" label="I understand that the information and photo will be used for Library membership, account verification, and Library Card processing." /></UFormField>
            <UFormField name="termsAccepted" class="mt-4"><UCheckbox v-model="registration.termsAccepted" label="I confirm that the submitted information is complete and matches my school records." /></UFormField>
          </section>

          <div class="flex justify-end">
            <UButton
              type="submit"
              label="Submit Registration for Approval"
              icon="i-lucide-send"
              color="primary"
              size="lg"
              :loading="submitting"
              :disabled="!registrationAvailable || !registrationChoicesAvailable"
            />
          </div>
        </UForm>

        <UForm v-else :state="credentialHelp" :validate="helpErrors" class="sncbt-form-section" @submit="submitCredentialHelp">
          <h3 class="text-xl font-bold text-highlighted">Forgotten Student Portal Credentials</h3>
          <p class="mt-1 text-sm text-muted">Submit a request, then visit the Library counter. The Librarian must validate your identity before resetting credentials.</p>
          <div class="mt-5 grid gap-4 md:grid-cols-2">
            <UFormField name="studentNo" label="Student Number" required><UInput v-model="credentialHelp.studentNo" class="w-full" /></UFormField>
            <UFormField name="email" label="Registered Email"><UInput v-model="credentialHelp.email" type="email" class="w-full" /></UFormField>
            <UFormField name="firstName" label="First Name" required><UInput v-model="credentialHelp.firstName" class="w-full" /></UFormField>
            <UFormField name="lastName" label="Last Name" required><UInput v-model="credentialHelp.lastName" class="w-full" /></UFormField>
            <UFormField name="contactNo" label="Registered Contact Number" class="md:col-span-2"><UInput v-model="credentialHelp.contactNo" class="w-full" /></UFormField>
          </div>
          <UFormField name="privacyNoticeAccepted" class="mt-5"><UCheckbox v-model="credentialHelp.privacyNoticeAccepted" label="I authorize the Library to use these details only to locate and validate my existing account." /></UFormField>
          <div class="mt-6 flex justify-end"><UButton type="submit" label="Submit Credential Help Request" icon="i-lucide-send" color="warning" :loading="submitting" /></div>
        </UForm>
      </template>
    </main>

    <UModal
      v-model:open="registrationSuccessOpen"
      :dismissible="false"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #content>
        <div v-if="registrationResult" class="space-y-5 p-6">
          <div class="flex items-start gap-4">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
              <UIcon name="i-lucide-circle-check-big" class="size-7" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-highlighted">Registration submitted</h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                Your application is waiting for Librarian approval. Present your school ID or current enrollment document at the Library.
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-default bg-elevated p-4 text-sm">
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">Request Number</p>
                <p class="mt-1 font-mono font-semibold text-highlighted">{{ registrationResult.requestNo }}</p>
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">Portal Username</p>
                <p class="mt-1 font-mono font-semibold text-highlighted">{{ registrationResult.username }}</p>
              </div>
            </div>
          </div>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-clock-3"
            title="Sign-in is available after approval"
            description="The Librarian must approve your membership and activate your Student Portal account before your first sign-in."
          />

          <div class="flex justify-end">
            <UButton
              label="Continue to Sign In"
              icon="i-lucide-log-in"
              color="primary"
              @click="proceedToSignIn"
            />
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="credentialHelpSuccessOpen"
      :dismissible="false"
      :ui="{ content: 'sm:max-w-lg' }"
    >
      <template #content>
        <div v-if="helpResult" class="space-y-5 p-6">
          <div class="flex items-start gap-4">
            <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success/10 text-success">
              <UIcon name="i-lucide-circle-check-big" class="size-7" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-highlighted">Credential help request submitted</h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                {{ helpResult.message }}
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-default bg-elevated p-4 text-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Request Number</p>
            <p class="mt-1 font-mono font-semibold text-highlighted">{{ helpResult.requestNo }}</p>
          </div>

          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-shield-check"
            title="Visit the Library counter"
            description="Bring your school ID or another approved school record. The Librarian must confirm your identity before resetting your account credentials."
          />

          <div class="flex justify-end">
            <UButton
              label="Continue to Sign In"
              icon="i-lucide-log-in"
              color="primary"
              @click="proceedAfterCredentialHelp"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
