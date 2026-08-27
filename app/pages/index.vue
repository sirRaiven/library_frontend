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
  <div class="relative min-h-screen overflow-hidden bg-[#020c12] text-white">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.10),transparent_25%),radial-gradient(circle_at_90%_85%,rgba(14,165,233,0.08),transparent_24%),linear-gradient(180deg,#031118_0%,#020b11_100%)]" />
    <div class="pointer-events-none absolute -left-28 top-8 size-72 rounded-full bg-emerald-400/8 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-32 -right-24 size-96 rounded-full bg-emerald-400/6 blur-3xl" />

    <main class="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <div class="grid w-full overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#041725]/92 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur lg:grid-cols-[0.88fr_1.12fr]">
        <section class="relative hidden min-h-[620px] overflow-hidden border-r border-white/10 px-9 py-10 lg:flex lg:flex-col lg:justify-between xl:px-11 xl:py-11">
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(6,34,48,0.34),rgba(2,13,23,0.36))]" />
          <div class="pointer-events-none absolute -right-16 top-16 size-40 rounded-full border border-emerald-300/10 bg-emerald-400/6" />
          <div class="pointer-events-none absolute -bottom-20 right-4 size-64 rounded-full bg-emerald-400/8" />

          <div class="relative">
            <div class="flex items-center gap-3">
              <div class="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-lg shadow-black/20">
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
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.19em] text-emerald-200/80">SNCBT Library</p>
                <p class="mt-1 text-sm text-slate-300">Library Management System</p>
              </div>
            </div>

            <div class="mt-14 max-w-md">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300/80">Library portal</p>
              <h1 class="mt-3 text-[2.7rem] font-semibold leading-[1.08] tracking-tight text-white">
                Welcome back to your Library workspace.
              </h1>
              <p class="mt-5 text-sm leading-7 text-slate-300">
                Sign in with your assigned account to continue to the Library portal available for your role.
              </p>
            </div>
          </div>

          <div class="relative overflow-hidden rounded-[1.35rem] border border-emerald-300/15 bg-[#071f35] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.26)]">
            <div class="pointer-events-none absolute -bottom-12 -right-8 size-40 rounded-full bg-emerald-400/8" />
            <div class="relative flex items-start justify-between gap-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Portal access</p>
                <p class="mt-2 text-3xl font-bold tracking-tight text-white">Secure</p>
                <p class="mt-2 text-sm leading-6 text-slate-300">Authorized Library accounts only</p>
              </div>
              <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-300 shadow-[0_10px_22px_rgba(16,185,129,0.16)]">
                <UIcon name="i-lucide-shield-check" class="size-5" />
              </div>
            </div>
          </div>
        </section>

        <section class="relative px-4 py-4 sm:px-7 sm:py-7 lg:flex lg:items-center lg:px-10 lg:py-10 xl:px-12">
          <div class="pointer-events-none absolute right-3 top-3 size-24 rounded-full border border-emerald-300/10 bg-emerald-400/6 lg:hidden" />

          <div class="relative mx-auto w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#071c31]/95 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.32)] sm:p-7">
            <div class="pointer-events-none absolute -bottom-16 -right-10 size-48 rounded-full bg-emerald-400/7" />

            <div class="relative">
              <div class="flex items-center gap-3 lg:hidden">
                <div class="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-md shadow-black/20">
                  <img src="/sncbt-library-logo.png" alt="SNCBT Library logo" class="size-full object-contain">
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-white">SNCBT Library</p>
                  <p class="truncate text-xs text-slate-400">Library Management System</p>
                </div>
              </div>

              <div class="mt-6 flex items-start justify-between gap-4 lg:mt-0">
                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300/85">Account access</p>
                  <h2 id="signin-heading" class="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Sign in to continue
                  </h2>
                  <p class="mt-2 text-sm leading-6 text-slate-300">
                    Enter your Library account credentials.
                  </p>
                </div>

                <div class="hidden size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-300 sm:flex">
                  <UIcon name="i-lucide-user-round-check" class="size-5" />
                </div>
              </div>

              <div class="mt-5 space-y-3">
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
                class="mt-6 space-y-4"
                @submit="handleLogin"
              >
                <UFormField
                  name="identifier"
                  label="Email or Username"
                  :ui="{ label: 'text-sm font-semibold text-slate-100' }"
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
                    :ui="{
                      base: 'h-12 rounded-xl border-white/10 bg-[#08172a]/85 text-white placeholder:text-slate-500',
                      leadingIcon: 'text-emerald-300'
                    }"
                    autofocus
                  />
                </UFormField>

                <UFormField
                  name="password"
                  label="Password"
                  :ui="{ label: 'text-sm font-semibold text-slate-100' }"
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
                    :ui="{
                      base: 'h-12 rounded-xl border-white/10 bg-[#08172a]/85 text-white placeholder:text-slate-500',
                      leadingIcon: 'text-emerald-300'
                    }"
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
                        class="text-slate-300 hover:bg-white/5 hover:text-white"
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
                  class="h-12 rounded-xl border border-emerald-300/20 bg-emerald-500 font-semibold text-slate-950 shadow-[0_14px_28px_rgba(16,185,129,0.22)] transition hover:bg-emerald-400"
                >
                  Sign In
                </UButton>
              </UForm>

              <div class="mt-5 flex items-center gap-2 border-t border-white/8 pt-4 text-xs text-slate-400">
                <UIcon name="i-lucide-lock-keyhole" class="size-3.5 text-emerald-300/80" />
                <span>Authorized SNCBT Library users only</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
