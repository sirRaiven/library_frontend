<script setup lang="ts">
import type { FormError, FormSubmitEvent } from "@nuxt/ui";
import type { CreateAdminLibrarianInput } from "~/composables/useAdminLibrarians";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Add Librarian",
});

const api = useAdminLibrarians();
const auth = useAuth();
const toast = useToast();
const saving = ref(false);
const showPassword = ref(false);

const form = reactive<CreateAdminLibrarianInput>({
  employeeNo: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  contactNo: "",
  position: "Staff",
  username: "",
  password: "",
});

const positionItems = [
  "Head Librarian",
  "Assistant Librarian",
  "Staff",
];

const passwordChecks = computed(() => [
  { label: "At least 12 characters", passed: form.password.length >= 12 },
  { label: "Contains an uppercase letter", passed: /[A-Z]/.test(form.password) },
  { label: "Contains a lowercase letter", passed: /[a-z]/.test(form.password) },
  { label: "Contains a number", passed: /\d/.test(form.password) },
  { label: "Contains a symbol", passed: /[^A-Za-z0-9]/.test(form.password) },
]);

function validate(state: Partial<CreateAdminLibrarianInput>): FormError[] {
  const errors: FormError[] = [];
  const required: Array<keyof CreateAdminLibrarianInput> = [
    "employeeNo",
    "firstName",
    "lastName",
    "email",
    "username",
    "password",
  ];

  for (const name of required) {
    if (!String(state[name] ?? "").trim()) {
      errors.push({ name, message: "This field is required." });
    }
  }

  if (state.email && !/^\S+@\S+\.\S+$/.test(state.email)) {
    errors.push({ name: "email", message: "Enter a valid email address." });
  }
  if (state.username && state.username.trim().length < 3) {
    errors.push({ name: "username", message: "Use at least 3 characters." });
  }
  if (state.password && state.password.length < 12) {
    errors.push({ name: "password", message: "Use at least 12 characters." });
  }

  return errors;
}

async function submit(event: FormSubmitEvent<CreateAdminLibrarianInput>) {
  if (saving.value) return;
  saving.value = true;

  try {
    const record = await api.create(event.data);
    toast.add({
      title: "Librarian account created",
      description: `${record.fullName} can sign in using the new Librarian account.`,
      color: "success",
      icon: "i-lucide-user-check",
    });
    await navigateTo("/admin/librarians");
  } catch (error) {
    toast.add({
      title: "Unable to create Librarian",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <AdminPageHeader
      eyebrow="Librarian Accounts"
      title="Add a Librarian"
      description="Create one linked Library staff profile and application account. The account is assigned only to the Librarian role and every creation is recorded in the security audit log."
      icon="i-lucide-user-plus"
    >
      <template #actions>
        <UButton label="Back to Librarians" icon="i-lucide-arrow-left" color="neutral" variant="outline" to="/admin/librarians" />
      </template>
    </AdminPageHeader>

    <UForm :state="form" :validate="validate" class="grid gap-6 xl:grid-cols-[1fr_22rem]" @submit="submit">
      <div class="space-y-6">
        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">Library Staff Information</h2>
              <p class="mt-1 text-xs text-muted">Official details shown in the staff directory and transaction records.</p>
            </div>
          </template>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField name="employeeNo" label="Employee Number" required>
              <UInput v-model="form.employeeNo" placeholder="e.g., EMP-2026-001" class="w-full" />
            </UFormField>
            <UFormField name="position" label="Position" required>
              <USelect v-model="form.position" :items="positionItems" class="w-full" />
            </UFormField>
            <UFormField name="firstName" label="First Name" required>
              <UInput v-model="form.firstName" class="w-full" />
            </UFormField>
            <UFormField name="middleName" label="Middle Name">
              <UInput v-model="form.middleName" class="w-full" />
            </UFormField>
            <UFormField name="lastName" label="Last Name" required>
              <UInput v-model="form.lastName" class="w-full" />
            </UFormField>
            <UFormField name="contactNo" label="Contact Number">
              <UInput v-model="form.contactNo" autocomplete="tel" class="w-full" />
            </UFormField>
            <UFormField name="email" label="Official Email Address" required class="sm:col-span-2">
              <UInput v-model="form.email" type="email" autocomplete="email" class="w-full" />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">Secured Sign-In Account</h2>
              <p class="mt-1 text-xs text-muted">The temporary password is accepted once here and is never returned by the API.</p>
            </div>
          </template>
          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField name="username" label="Username" required>
              <UInput v-model="form.username" autocomplete="off" class="w-full" />
            </UFormField>
            <UFormField name="password" label="Temporary Password" required>
              <UInput
                v-model="form.password"
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
                    square
                    size="sm"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>
            </UFormField>
          </div>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <div v-for="check in passwordChecks" :key="check.label" class="flex items-center gap-2 text-xs" :class="check.passed ? 'text-success' : 'text-muted'">
              <UIcon :name="check.passed ? 'i-lucide-circle-check' : 'i-lucide-circle'" class="size-4" />
              <span>{{ check.label }}</span>
            </div>
          </div>
        </UCard>

        <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" to="/admin/librarians" :disabled="saving" />
          <UButton type="submit" label="Create Librarian Account" icon="i-lucide-user-plus" :loading="saving" />
        </div>
      </div>

      <aside class="space-y-4">
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield-check" class="size-5 text-primary" />
              <h2 class="font-semibold text-highlighted">Security Controls</h2>
            </div>
          </template>
          <ul class="space-y-3 text-sm leading-5 text-muted">
            <li class="flex gap-2"><UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-success" />Assigned only to the Librarian application role.</li>
            <li class="flex gap-2"><UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-success" />Password is hashed by Strapi Users & Permissions.</li>
            <li class="flex gap-2"><UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-success" />Profile and account are explicitly linked.</li>
            <li class="flex gap-2"><UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-success" />Creation is written to the audit log.</li>
          </ul>
        </UCard>

        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-key-round"
          title="Share credentials securely"
          description="Do not send the temporary password in an open group chat or include it in printed reports."
        />
      </aside>
    </UForm>
  </div>
</template>
