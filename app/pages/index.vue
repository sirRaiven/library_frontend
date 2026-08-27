<script setup lang="ts">
import { signInErrorMessage } from "~/utils/user-facing-error";
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
const maintenance = useSystemMaintenance();

const form = reactive<LoginForm>({
  identifier: "",
  password: "",
});

const showPassword = ref(false);
const isLoggingIn = ref(false);
const loginError = ref("");

const blockedDeviceNotice = computed(() => {
  if (route.query.access !== "device-blocked") return "";

  return (
    auth.deviceAccessMessage.value ||
    "This device has been blocked by the system administrator. Use another authorized device or contact the Library administrator."
  );
});

const membershipAccessNotice = computed(() => {
  if (
    route.query.access !== "membership-required" &&
    !auth.membershipAccessMessage.value
  ) {
    return "";
  }

  return (
    auth.membershipAccessMessage.value ||
    "Your Student Portal account requires an active and verified Library membership. Visit the Library to renew your membership before signing in again."
  );
});

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
      auth.clearSession();
      loginError.value =
        "This account is not assigned to an available Library System portal. Please contact the system administrator.";
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
    loginError.value = signInErrorMessage(error);
  } finally {
    isLoggingIn.value = false;
  }
}

onMounted(() => {
  void maintenance.refresh().catch(() => undefined);
});
</script>

<template>
  <div
    class="min-h-screen flex flex-col justify-center items-center bg-[#f4fbf8] dark:bg-neutral-950 p-4 transition-colors relative overflow-hidden"
  >
    <div class="pointer-events-none absolute inset-0 bg-slate-200/55 dark:bg-neutral-950" />
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-32 -top-28 size-[28rem] rounded-full bg-emerald-900/8 blur-3xl dark:bg-emerald-400/5" />
      <div class="absolute -bottom-36 -right-28 size-[30rem] rounded-full bg-slate-500/8 blur-3xl dark:bg-slate-400/5" />
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/15 to-transparent dark:via-white/8" />
    </div>

    <div class="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
      <UTooltip text="Change color mode">
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
          color="neutral"
          variant="outline"
          size="lg"
          square
          class="border-slate-300/80 bg-white/80 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/85"
          aria-label="Change color mode"
          @click="() => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }"
        />
      </UTooltip>
    </div>

    <main class="relative z-10 w-full max-w-4xl">
      <div class="overflow-hidden rounded-[1.4rem] border border-slate-300/80 bg-white shadow-[0_22px_60px_rgba(15,23,42,.12)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_24px_70px_rgba(0,0,0,.35)] lg:grid lg:grid-cols-[0.82fr_1.18fr]">
        <section class="relative hidden overflow-hidden border-e border-emerald-950/40 bg-[#163a33] px-8 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-10 xl:py-12">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,.08),transparent_35%),linear-gradient(145deg,transparent_35%,rgba(0,0,0,.10))]" />

          <div class="relative">
            <div class="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white/95 p-2 shadow-lg shadow-black/15 ring-1 ring-white/15">
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

            <p class="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100/70">SNCBT Library</p>
            <h1 class="mt-2 max-w-sm text-3xl font-semibold tracking-tight text-white">
              Library Management System
            </h1>
            <p class="mt-4 max-w-sm text-sm leading-6 text-emerald-50/70">
              Secure access to the Library services assigned to your account.
            </p>
          </div>

          <div class="relative mt-12 border-t border-white/10 pt-5">
            <p class="text-xs leading-5 text-emerald-50/55">
              SNCBT Library · Authorized users only
            </p>
          </div>
        </section>

        <section class="p-6 sm:p-8 lg:p-10 xl:p-12" aria-labelledby="signin-heading">
          <div class="mx-auto max-w-md">
            <div class="flex items-center gap-3 lg:hidden">
              <div class="flex size-12 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <img src="/sncbt-library-logo.png" alt="SNCBT Library logo" class="size-full object-contain">
              </div>
              <div>
                <p class="font-semibold text-highlighted">SNCBT Library</p>
                <p class="text-xs text-muted">Library Management System</p>
              </div>
            </div>

            <div class="mt-7 lg:mt-0">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">Account access</p>
              <h2 id="signin-heading" class="mt-1 text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
                Sign in to continue
              </h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                Enter your Library account credentials.
              </p>
            </div>

            <div class="mt-6 space-y-4">
              <UAlert
                v-if="maintenance.enabled.value"
                color="warning"
                variant="soft"
                icon="i-lucide-construction"
                title="System maintenance in progress"
                description="Student, Faculty and Librarian portals are currently read-only. Administrators may still sign in to manage the system."
              />

              <UAlert
                v-if="blockedDeviceNotice"
                color="error"
                variant="soft"
                icon="i-lucide-shield-ban"
                title="Device access blocked"
                :description="blockedDeviceNotice"
              />

              <UAlert
                v-if="membershipAccessNotice"
                color="warning"
                variant="soft"
                icon="i-lucide-calendar-x-2"
                title="Library membership renewal required"
                :description="membershipAccessNotice"
              />
            </div>

            <UForm
              :validate="validate"
              :state="form"
              class="mt-6 space-y-5"
              @submit="handleLogin"
            >
              <UFormField
                name="identifier"
                label="Email or Username"
                :ui="{ label: 'text-sm font-semibold text-highlighted' }"
              >
                <UInput
                  v-model="form.identifier"
                  icon="i-lucide-user"
                  placeholder="Enter email or username"
                  autocomplete="username"
                  size="xl"
                  color="neutral"
                  variant="outline"
                  class="w-full"
                  :ui="{ base: 'h-12 bg-white/80 dark:bg-neutral-950/70' }"
                  autofocus
                />
              </UFormField>

              <UFormField
                name="password"
                label="Password"
                :ui="{ label: 'text-sm font-semibold text-highlighted' }"
              >
                <UInput
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  icon="i-lucide-lock"
                  placeholder="Enter password"
                  autocomplete="current-password"
                  size="xl"
                  color="neutral"
                  variant="outline"
                  class="w-full"
                  :ui="{ base: 'h-12 bg-white/80 dark:bg-neutral-950/70' }"
                >
                  <template #trailing>
                    <UButton
                      type="button"
                      :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                      :aria-label="showPassword ? 'Hide password' : 'Show password'"
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
                title="Check your sign-in details"
                :description="loginError"
              />

              <UButton
                type="submit"
                color="primary"
                size="xl"
                block
                icon="i-lucide-log-in"
                :loading="isLoggingIn"
                class="h-12 bg-emerald-700 font-semibold shadow-sm hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              >
                Sign In
              </UButton>
            </UForm>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
