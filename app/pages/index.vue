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
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-24 -top-20 size-80 rounded-full bg-primary/10 blur-3xl sm:size-[30rem]" />
      <div class="absolute -bottom-28 -right-20 size-96 rounded-full bg-info/7 blur-3xl sm:size-[34rem]" />
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </div>

    <div class="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
      <UTooltip text="Change color mode">
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
          color="neutral"
          variant="outline"
          size="lg"
          square
          class="border-default/80 bg-default/85 shadow-[var(--sncbt-shadow-card)] backdrop-blur"
          aria-label="Change color mode"
          @click="() => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }"
        />
      </UTooltip>
    </div>

    <main class="relative z-10 w-full max-w-5xl">
      <div class="overflow-hidden rounded-[1.5rem] border border-default/80 bg-default shadow-[var(--sncbt-shadow-overlay)] lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <section class="relative hidden overflow-hidden border-e border-default bg-primary px-8 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-10 xl:py-12">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,255,255,.16),transparent_32%),radial-gradient(circle_at_85%_88%,rgba(255,255,255,.08),transparent_28%)]" />
          <div class="relative">
            <div class="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg shadow-black/10">
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

            <p class="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-white/70">SNCBT Library</p>
            <h1 class="mt-2 max-w-md text-3xl font-semibold tracking-tight text-white xl:text-4xl">
              One place for your Library services.
            </h1>
            <p class="mt-4 max-w-md text-sm leading-6 text-white/78">
              Browse the collection, manage borrowing, keep track of Library activity, and stay connected through a secure account.
            </p>
          </div>

          <div class="relative mt-10 space-y-3">
            <div class="flex items-center gap-3 rounded-xl border border-white/15 bg-white/8 px-4 py-3 backdrop-blur-sm">
              <UIcon name="i-lucide-search" class="size-5 shrink-0 text-white/90" />
              <div>
                <p class="text-sm font-semibold">Find information quickly</p>
                <p class="mt-0.5 text-xs text-white/65">Clear navigation and searchable Library records.</p>
              </div>
            </div>
            <div class="flex items-center gap-3 rounded-xl border border-white/15 bg-white/8 px-4 py-3 backdrop-blur-sm">
              <UIcon name="i-lucide-shield-check" class="size-5 shrink-0 text-white/90" />
              <div>
                <p class="text-sm font-semibold">Access the right tools</p>
                <p class="mt-0.5 text-xs text-white/65">Your portal adapts to your Library role.</p>
              </div>
            </div>
            <div class="flex items-center gap-3 rounded-xl border border-white/15 bg-white/8 px-4 py-3 backdrop-blur-sm">
              <UIcon name="i-lucide-bell" class="size-5 shrink-0 text-white/90" />
              <div>
                <p class="text-sm font-semibold">Stay informed</p>
                <p class="mt-0.5 text-xs text-white/65">See borrowing, reservation, and account updates.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="p-6 sm:p-8 lg:p-10 xl:p-12" aria-labelledby="signin-heading">
          <div class="mx-auto max-w-md">
            <div class="flex items-center gap-3 lg:hidden">
              <div class="flex size-12 items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-white p-1.5 shadow-sm dark:bg-slate-950">
                <img src="/sncbt-library-logo.png" alt="SNCBT Library logo" class="size-full object-contain">
              </div>
              <div>
                <p class="font-semibold text-highlighted">SNCBT Library</p>
                <p class="text-xs text-muted">Management System</p>
              </div>
            </div>

            <div class="mt-7 lg:mt-0">
              <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Welcome back</p>
              <h2 id="signin-heading" class="mt-1 text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
                Sign in to continue
              </h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                Use your Library account credentials to open your portal.
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
                  :ui="{ base: 'h-12' }"
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
                  :ui="{ base: 'h-12' }"
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
                class="h-12 font-semibold shadow-sm"
              >
                Sign In
              </UButton>
            </UForm>

            <div class="mt-7 border-t border-default pt-5 text-center">
              <p class="text-xs leading-5 text-muted">
                Need a Student Library account?
                <NuxtLink to="/student-registration" class="font-semibold text-primary hover:underline">
                  Open Student Registration
                </NuxtLink>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
