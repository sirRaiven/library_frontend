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
    loginError.value = auth.getErrorMessage(error);
  } finally {
    isLoggingIn.value = false;
  }
}
</script>

<template>
  <div class="sncbt-dashboard-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
    <div class="pointer-events-none absolute -left-32 top-10 size-80 rounded-full bg-primary/10 blur-3xl" />
    <div class="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-info/10 blur-3xl" />

    <div class="absolute right-5 top-5 z-20 sm:right-7 sm:top-7">
      <UTooltip text="Change color mode">
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
          color="neutral"
          variant="outline"
          size="lg"
          square
          class="border-default/80 bg-default/80 shadow-[var(--sncbt-shadow-card)] backdrop-blur"
          @click="() => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }"
        />
      </UTooltip>
    </div>

    <main class="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-default/80 bg-default shadow-[var(--sncbt-shadow-overlay)] lg:grid-cols-[1.05fr_0.95fr]">
      <section
        class="relative hidden min-h-[650px] overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 p-10 text-white lg:flex lg:flex-col lg:justify-between"
        aria-label="SNCBT Library Management System"
      >
        <div class="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_12%_15%,rgba(110,231,183,.22),transparent_26%),radial-gradient(circle_at_88%_12%,rgba(56,189,248,.13),transparent_24%),linear-gradient(135deg,transparent_0%,rgba(255,255,255,.03)_48%,transparent_100%)]" />

        <div class="relative">
          <div class="flex items-center gap-3">
            <div class="flex size-12 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white p-1.5 shadow-xl shadow-black/10">
              <img
                src="/sncbt-library-logo.png"
                alt="SNCBT Library logo"
                width="48"
                height="48"
                class="size-full object-contain"
                decoding="async"
                draggable="false"
              >
            </div>
            <div>
              <p class="text-sm font-bold tracking-wide text-emerald-100">SNCBT Library</p>
              <p class="text-xs text-emerald-200/80">Management System</p>
            </div>
          </div>

          <div class="mt-16 max-w-md">
            <p class="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Library operations, simplified</p>
            <h1 class="mt-4 text-4xl font-bold tracking-tight text-white xl:text-5xl">
              One secure workspace for your library community.
            </h1>
            <p class="mt-5 text-sm leading-7 text-emerald-100/80">
              Manage circulation, members, reservations, reports, and account access from a consistent role-based portal.
            </p>
          </div>

          <div class="mt-10 grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl border border-white/10 bg-white/7 p-4 backdrop-blur-sm">
              <div class="flex size-9 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-200">
                <UIcon name="i-lucide-book-open-check" class="size-4.5" />
              </div>
              <p class="mt-3 text-sm font-semibold text-white">Circulation ready</p>
              <p class="mt-1 text-xs leading-5 text-emerald-100/65">Borrowing, returns, reservations and collection workflows.</p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/7 p-4 backdrop-blur-sm">
              <div class="flex size-9 items-center justify-center rounded-xl bg-sky-300/15 text-sky-200">
                <UIcon name="i-lucide-shield-check" class="size-4.5" />
              </div>
              <p class="mt-3 text-sm font-semibold text-white">Role-protected access</p>
              <p class="mt-1 text-xs leading-5 text-emerald-100/65">Dedicated portals for Library staff, students, faculty, and administrators.</p>
            </div>
          </div>
        </div>

        <p class="relative text-xs text-emerald-200/60">
          St. Nicolas College of Business and Technology
        </p>
      </section>

      <section class="flex min-h-[620px] flex-col justify-center p-6 sm:p-10 lg:p-12">
        <div class="mx-auto w-full max-w-md">
          <div class="mb-8 flex items-center gap-3 lg:hidden">
            <div class="flex size-12 items-center justify-center overflow-hidden rounded-2xl border border-primary/15 bg-white p-1.5 shadow-[var(--sncbt-shadow-card)] dark:bg-slate-950">
              <img
                src="/sncbt-library-logo.png"
                alt="SNCBT Library logo"
                width="48"
                height="48"
                class="size-full object-contain"
                decoding="async"
                draggable="false"
              >
            </div>
            <div>
              <p class="font-bold text-highlighted">SNCBT Library</p>
              <p class="text-xs text-muted">Management System</p>
            </div>
          </div>

          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary">Authorized access</p>
            <h2 class="mt-2 text-3xl font-bold tracking-tight text-highlighted">Welcome back</h2>
            <p class="mt-2 text-sm leading-6 text-muted">
              Sign in with your assigned Library System account to continue.
            </p>
          </div>

          <div class="mt-7 space-y-4">
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
            class="mt-7 space-y-5"
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
              title="Unable to sign in"
              :description="loginError"
            />

            <UButton
              type="submit"
              color="primary"
              size="xl"
              block
              icon="i-lucide-log-in"
              :loading="isLoggingIn"
              class="h-12 shadow-lg shadow-emerald-500/20 active:translate-y-px"
            >
              Sign In
            </UButton>
          </UForm>

          <div class="mt-7 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UIcon name="i-lucide-lock-keyhole" class="size-4" />
            </div>
            <div>
              <p class="text-xs font-semibold text-highlighted">Protected institutional access</p>
              <p class="mt-1 text-xs leading-5 text-muted">
                Access is limited to authorized Library System users. Session and device safeguards may apply based on your role.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
