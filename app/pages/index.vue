<script setup lang="ts">
import type {
  FormError,
  FormSubmitEvent,
} from "@nuxt/ui";

interface LoginForm {
  identifier: string;
  password: string;
}

definePageMeta({
  layout: "default",
  title: "Sign In",
});

const route = useRoute();
const colorMode = useColorMode();
const auth = useAuth();

const form = reactive<LoginForm>({
  identifier: "",
  password: "",
});

const showPassword = ref(false);
const isLoggingIn = ref(false);
const loginError = ref("");

function validate(
  state: Partial<LoginForm>,
): FormError[] {
  const errors: FormError[] = [];

  if (!state.identifier?.trim()) {
    errors.push({
      name: "identifier",
      message: "Email or username is required.",
    });
  }

  if (!state.password) {
    errors.push({
      name: "password",
      message: "Password is required.",
    });
  }

  return errors;
}

async function handleLogin(
  event: FormSubmitEvent<LoginForm>,
) {
  if (isLoggingIn.value) {
    return;
  }

  loginError.value = "";
  isLoggingIn.value = true;

  try {
    await auth.login(
      event.data.identifier,
      event.data.password,
    );

    if (
      auth.role.value !== "super-administrator" &&
      auth.role.value !== "administrator" &&
      auth.role.value !== "librarian" &&
      auth.role.value !== "student" &&
      auth.role.value !== "faculty"
    ) {
      const returnedRole =
        auth.user.value?.role?.name ??
        auth.user.value?.role?.type ??
        "None";

      auth.clearSession();

      loginError.value =
        `Your Strapi account returned the role "${returnedRole}". ` +
        "Assign the account to Administrator, Librarian, Student, or Faculty.";

      return;
    }

    const requestedRedirect =
      typeof route.query.redirect === "string" &&
      route.query.redirect.startsWith("/")
        ? route.query.redirect
        : null;

    await navigateTo(
      requestedRedirect ?? auth.homeRoute.value,
    );
  } catch (error) {
    loginError.value = auth.getErrorMessage(error);
  } finally {
    isLoggingIn.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-[#f4fbf8] dark:bg-neutral-950 p-4 transition-colors relative overflow-hidden">
    
    <!-- Theme Toggle (Top Right) -->
    <div class="absolute top-6 right-6 z-10">
      <UButton
        :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
        color="neutral"
        variant="ghost"
        @click="() => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }"
        class="text-neutral-500 dark:text-neutral-400 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm"
      />
    </div>

    <!-- Login Container -->
    <div class="w-full max-w-md z-10">
      
      <!-- Card Custom Structure -->
      <div class="bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)] dark:shadow-none border border-neutral-100 dark:border-neutral-800 overflow-hidden">
        
        <!-- Header Section (With subtle gradient background) -->
        <div class="bg-[linear-gradient(180deg,rgba(16,185,129,0.05)_0%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.05)_0%,rgba(23,23,23,0)_100%)] pt-12 pb-8 px-8 flex flex-col items-center text-center border-b border-neutral-100 dark:border-neutral-800">
          
          <div class="mb-6 flex size-16 items-center justify-center overflow-hidden rounded-[1.25rem] border border-emerald-100 bg-white p-2 shadow-lg shadow-emerald-500/20 dark:border-emerald-900/50 dark:bg-neutral-950">
            <img
              src="/sncbt-library-logo.png"
              alt="SNCBT Library logo"
              width="64"
              height="64"
              class="size-full object-contain"
              decoding="async"
              draggable="false"
            >
          </div>
          
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">
            SNCBT Library
          </h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Sign in to access the library management dashboard.
          </p>
        </div>

        <!-- Form Section -->
        <div class="p-8">
          <UForm :validate="validate" :state="form" @submit="handleLogin" class="space-y-5">
                      
          <UFormField
          name="identifier"
          label="Email or Username"
          :ui="{
            label:
              'text-sm font-semibold text-neutral-700 dark:text-neutral-300',
          }"
          >
          <UInput
            v-model="form.identifier"
            icon="i-lucide-user"
            placeholder="Enter email or username"
            autocomplete="username"
            size="lg"
            color="neutral"
            variant="outline"
            class="w-full"
            :ui="{ base: 'h-12 rounded-xl' }"
            autofocus
          />
          </UFormField>

            <UFormField
            name="password"
            label="Password"
            :ui="{
              label:
                'text-sm font-semibold text-neutral-700 dark:text-neutral-300',
            }"
            >
            <UInput
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              icon="i-lucide-lock"
              placeholder="Enter password"
              autocomplete="current-password"
              size="lg"
              color="neutral"
              variant="outline"
              class="w-full"
              :ui="{ base: 'h-12 rounded-xl' }"
            >
              <template #trailing>
                <UButton
                  type="button"
                  :icon="
                    showPassword
                      ? 'i-lucide-eye-off'
                      : 'i-lucide-eye'
                  "
                  :aria-label="
                    showPassword
                      ? 'Hide password'
                      : 'Show password'
                  "
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  square
                  @click="() => { showPassword = !showPassword; }"
                />
              </template>
            </UInput>
            </UFormField>

            <UAlert
              v-if="loginError"
              color="error"
              variant="soft"
              icon="i-lucide-circle-alert"
              title="Unable to sign in"
              :description="loginError"
            />

            <!-- Sign In Button -->
            <div class="pt-2">
              <UButton
                type="submit"
                color="success"
                size="xl"
                block
                icon="i-lucide-log-in"
                :loading="isLoggingIn"
                class="font-semibold shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.98] rounded-xl"
              >
                Sign In
              </UButton>
            </div>

            <!-- Footer Note Pill -->
            <div class="mt-6 px-4 py-3 bg-[#f4fbf8] dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-center">
              <span class="text-[11px] sm:text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80">
                Secure access for administrators, staff, and librarians.
              </span>
            </div>

          </UForm>
        </div>
      </div>
      
    </div>
  </div>
</template>