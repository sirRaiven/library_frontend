<script setup lang="ts">
import type {
  FormError,
  FormSubmitEvent,
} from "@nuxt/ui";
import type {
  CredentialResetInput,
  CredentialResetResult,
  CredentialReviewResult,
} from "~/composables/usePublicStudentRegistration";

definePageMeta({
  layout: "librarian",
  title: "Student Credential Assistance",
});

const route = useRoute();
const toast = useToast();
const registration = usePublicStudentRegistration();

const studentNo = ref(
  typeof route.query.studentNo === "string"
    ? route.query.studentNo
    : "",
);
const loading = ref(false);
const resetting = ref(false);
const errorMessage = ref("");
const review = ref<CredentialReviewResult | null>(null);
const resetResult = ref<CredentialResetResult | null>(null);
const showPassword = ref(false);
const showConfirmation = ref(false);
const showResultPassword = ref(false);
const credentialsOpen = computed({
  get: () => Boolean(resetResult.value),
  set: (value: boolean) => {
    if (!value) {
      resetResult.value = null;
      showResultPassword.value = false;
    }
  },
});

const form = reactive<CredentialResetInput>({
  verificationMethod: "",
  reason: "",
  passwordMode: "Generated",
  temporaryPassword: "",
  temporaryPasswordConfirmation: "",
});

async function loadReview() {
  const value = studentNo.value.trim();
  if (!value) {
    errorMessage.value = "Enter the Student number.";
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  resetResult.value = null;

  try {
    review.value = await registration.loadCredentialReview(value);
    form.verificationMethod =
      review.value.allowedVerificationMethods[0] ?? "";
  } catch (error) {
    review.value = null;
    errorMessage.value = registration.getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

function validateReset(
  state: Partial<CredentialResetInput>,
): FormError[] {
  const errors: FormError[] = [];

  if (!state.verificationMethod?.trim()) {
    errors.push({
      name: "verificationMethod",
      message: "Select how the Student identity was verified.",
    });
  }

  if (!state.reason?.trim() || state.reason.trim().length < 10) {
    errors.push({
      name: "reason",
      message: "Describe the verification and reset reason using at least 10 characters.",
    });
  }

  if (state.passwordMode === "Manual") {
    const password = state.temporaryPassword ?? "";
    if (password.length < 12) {
      errors.push({
        name: "temporaryPassword",
        message: "Temporary password must contain at least 12 characters.",
      });
    }
    if (password !== state.temporaryPasswordConfirmation) {
      errors.push({
        name: "temporaryPasswordConfirmation",
        message: "Password confirmation does not match.",
      });
    }
  }

  return errors;
}

async function resetPassword(
  event: FormSubmitEvent<CredentialResetInput>,
) {
  if (!review.value || resetting.value) return;

  resetting.value = true;
  errorMessage.value = "";

  try {
    resetResult.value =
      await registration.resetCredentialPassword(
        review.value.student.studentNo,
        event.data,
      );
    toast.add({
      title: "Student credentials reset",
      description:
        "Give the one-time credentials privately to the verified Student.",
      color: "success",
    });
  } catch (error) {
    errorMessage.value = registration.getErrorMessage(error);
  } finally {
    resetting.value = false;
  }
}

async function copyCredentials() {
  if (!resetResult.value) return;
  const text = [
    `Student Portal username: ${resetResult.value.username}`,
    `Temporary password: ${resetResult.value.temporaryPassword}`,
    "Sign in and change this temporary password immediately.",
  ].join("\n");
  await navigator.clipboard.writeText(text);
  toast.add({
    title: "Credentials copied",
    description:
      "Share them only with the verified Student through an approved private channel.",
    color: "success",
  });
}

watch(
  () => form.passwordMode,
  (mode) => {
    if (mode === "Generated") {
      form.temporaryPassword = "";
      form.temporaryPasswordConfirmation = "";
    }
  },
);

onMounted(() => {
  if (studentNo.value.trim()) {
    void loadReview();
  }
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-6xl space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
            <UIcon name="i-lucide-key-round" class="size-6" />
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-warning">
              Student account support
            </p>
            <h1 class="mt-1 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
              Credential Assistance
            </h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Verify the Student in person before revealing the Portal username or resetting a password. Never ask for or reuse the Student's old password.
            </p>
          </div>
        </div>
        <UButton
          to="/librarian/students"
          label="Back to Students"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="outline"
        />
      </div>

      <UAlert
        color="warning"
        icon="i-lucide-shield-alert"
        title="Identity verification is mandatory"
        description="Confirm the Student ID and current enrollment evidence, or verify against an authorized school record. Record the method and reason before resetting credentials."
      />

      <UCard>
        <template #header>
          <h2 class="font-bold text-highlighted">Find Student Account</h2>
        </template>
        <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="loadReview">
          <UInput
            v-model="studentNo"
            icon="i-lucide-hash"
            placeholder="Enter Student number"
            class="flex-1"
            autocomplete="off"
          />
          <UButton
            type="submit"
            label="Review Account"
            icon="i-lucide-search"
            :loading="loading"
          />
        </form>
      </UCard>

      <UAlert
        v-if="errorMessage"
        color="error"
        icon="i-lucide-circle-alert"
        title="Unable to complete the request"
        :description="errorMessage"
      />

      <template v-if="review">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <UCard>
            <p class="text-sm font-medium text-muted">Student</p>
            <p class="mt-2 text-lg font-bold text-highlighted">{{ review.student.fullName }}</p>
            <p class="mt-1 font-mono text-sm text-muted">{{ review.student.studentNo }}</p>
          </UCard>
          <UCard>
            <p class="text-sm font-medium text-muted">Portal Username</p>
            <p class="mt-2 font-mono text-lg font-bold text-highlighted">
              {{ review.account.username || 'No linked account' }}
            </p>
            <p class="mt-1 text-sm text-muted">{{ review.account.email || 'No account email' }}</p>
          </UCard>
          <UCard>
            <p class="text-sm font-medium text-muted">Account Status</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <UBadge :color="review.account.linked ? 'success' : 'warning'" variant="soft">
                {{ review.account.linked ? 'Linked' : 'Not linked' }}
              </UBadge>
              <UBadge :color="review.account.blocked ? 'error' : 'success'" variant="soft">
                {{ review.account.blocked ? 'Blocked' : 'Not blocked' }}
              </UBadge>
              <UBadge :color="review.account.confirmed ? 'success' : 'warning'" variant="soft">
                {{ review.account.confirmed ? 'Confirmed' : 'Unconfirmed' }}
              </UBadge>
            </div>
          </UCard>
          <UCard>
            <p class="text-sm font-medium text-muted">Membership Verification</p>
            <p class="mt-2 text-lg font-bold text-highlighted">
              {{ review.membership?.enrollmentVerified ? 'Verified' : 'Pending verification' }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ review.membership?.membershipNo || 'No membership record' }}
            </p>
          </UCard>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <UCard>
            <template #header>
              <div>
                <h2 class="font-bold text-highlighted">Student Verification Information</h2>
                <p class="mt-1 text-sm text-muted">Compare these details with the Student's presented institutional documents.</p>
              </div>
            </template>
            <dl class="grid gap-4 sm:grid-cols-2">
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Registered email</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ review.student.email || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Contact number</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ review.student.contactNo || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Course / Program</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ review.student.course || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Year and section</dt>
                <dd class="mt-1 font-medium text-highlighted">
                  {{ [review.student.yearLevel, review.student.section].filter(Boolean).join(' · ') || 'Not recorded' }}
                </dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Library Card number</dt>
                <dd class="mt-1 font-mono font-medium text-highlighted">{{ review.student.libraryCardNo || 'Not assigned' }}</dd>
              </div>
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Student status</dt>
                <dd class="mt-1 font-medium text-highlighted">{{ review.student.status || 'Unknown' }}</dd>
              </div>
            </dl>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-bold text-highlighted">Reset Portal Password</h2>
            </template>

            <UAlert
              v-if="!review.account.linked"
              color="warning"
              icon="i-lucide-link-2-off"
              title="No linked account"
              description="Connect or create the Student Portal account from Student management before resetting credentials."
            />
            <UAlert
              v-else-if="review.account.blocked || !review.account.confirmed"
              color="error"
              icon="i-lucide-shield-x"
              title="Account requires Administrator review"
              description="Blocked or unconfirmed accounts cannot be reset by the Librarian. Ask the system administrator to review the account."
            />

            <UForm
              v-else
              :state="form"
              :validate="validateReset"
              class="space-y-4"
              @submit="resetPassword"
            >
              <UFormField name="verificationMethod" label="Verification Method" required>
                <USelect
                  v-model="form.verificationMethod"
                  :items="review.allowedVerificationMethods"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="reason" label="Verification and Reset Notes" required>
                <UTextarea
                  v-model="form.reason"
                  :rows="4"
                  placeholder="Describe the documents checked and why the reset is required."
                  class="w-full"
                />
              </UFormField>

              <UFormField name="passwordMode" label="Temporary Password Option" required>
                <URadioGroup
                  v-model="form.passwordMode"
                  :items="[
                    { label: 'Generate a secure password', value: 'Generated' },
                    { label: 'Enter a temporary password', value: 'Manual' },
                  ]"
                  value-key="value"
                />
              </UFormField>

              <template v-if="form.passwordMode === 'Manual'">
                <UFormField name="temporaryPassword" label="Temporary Password" required>
                  <UInput
                    v-model="form.temporaryPassword"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        type="button"
                        :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        square
                        @click="showPassword = !showPassword"
                      />
                    </template>
                  </UInput>
                </UFormField>
                <UFormField name="temporaryPasswordConfirmation" label="Confirm Temporary Password" required>
                  <UInput
                    v-model="form.temporaryPasswordConfirmation"
                    :type="showConfirmation ? 'text' : 'password'"
                    autocomplete="new-password"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        type="button"
                        :icon="showConfirmation ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        square
                        @click="showConfirmation = !showConfirmation"
                      />
                    </template>
                  </UInput>
                </UFormField>
              </template>

              <UButton
                type="submit"
                label="Reset Student Password"
                icon="i-lucide-key-round"
                color="warning"
                block
                :loading="resetting"
              />
            </UForm>
          </UCard>
        </div>
      </template>

      <UModal v-model:open="credentialsOpen" :dismissible="false">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
                  <UIcon name="i-lucide-circle-check" class="size-5" />
                </div>
                <div>
                  <h2 class="font-bold text-highlighted">One-Time Student Credentials</h2>
                  <p class="text-sm text-muted">These details are shown only in this result.</p>
                </div>
              </div>
            </template>

            <div v-if="resetResult" class="space-y-4">
              <UAlert
                color="warning"
                icon="i-lucide-shield-alert"
                title="Share privately"
                description="Give these credentials only to the Student whose identity you verified. Do not send them through a public group chat or place them on the Library Card."
              />
              <div class="rounded-2xl bg-elevated p-4">
                <p class="text-xs font-semibold uppercase tracking-wide text-muted">Username</p>
                <p class="mt-1 font-mono text-lg font-bold text-highlighted">{{ resetResult.username }}</p>
                <p class="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Temporary Password</p>
                <div class="mt-1 flex items-center gap-2">
                  <p class="min-w-0 flex-1 break-all font-mono text-lg font-bold text-highlighted">
                    {{ showResultPassword ? resetResult.temporaryPassword : '••••••••••••••••' }}
                  </p>
                  <UButton
                    :icon="showResultPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    color="neutral"
                    variant="ghost"
                    square
                    @click="showResultPassword = !showResultPassword"
                  />
                </div>
              </div>
              <p class="text-sm leading-6 text-muted">{{ resetResult.message }}</p>
            </div>

            <template #footer>
              <div class="flex justify-end gap-2">
                <UButton label="Copy Credentials" icon="i-lucide-copy" color="neutral" variant="outline" @click="copyCredentials" />
                <UButton label="Close" color="success" @click="resetResult = null; showResultPassword = false" />
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </div>
  </UContainer>
</template>
