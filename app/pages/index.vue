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

  return "This device cannot be used to sign in. Please try another device or ask Library staff for help.";
});

const membershipAccessNotice = computed(() => {
  if (
    route.query.access !== "membership-required" &&
    !auth.membershipAccessMessage.value
  ) {
    return "";
  }

  return "Your library membership needs to be renewed before you can sign in. Please visit the Library for assistance.";
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
        "We could not open a Library page for this account. Please ask Library staff for help.";
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
  <div class="relative min-h-screen overflow-hidden bg-[#eef6f2] text-slate-900 transition-colors dark:bg-[#020c12] dark:text-white">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(5,150,105,0.10),transparent_25%),radial-gradient(circle_at_90%_85%,rgba(14,165,233,0.06),transparent_24%),linear-gradient(180deg,#f4faf7_0%,#eaf3ef_100%)] dark:bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.10),transparent_25%),radial-gradient(circle_at_90%_85%,rgba(14,165,233,0.08),transparent_24%),linear-gradient(180deg,#031118_0%,#020b11_100%)]" />
    <div class="pointer-events-none absolute -left-28 top-8 size-72 rounded-full bg-emerald-500/8 blur-3xl dark:bg-emerald-400/8" />
    <div class="pointer-events-none absolute -bottom-32 -right-24 size-96 rounded-full bg-emerald-600/6 blur-3xl dark:bg-emerald-400/6" />

    <div class="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
      <UTooltip :text="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="outline"
          size="lg"
          square
          class="border-slate-300/80 bg-white/85 text-slate-700 shadow-sm backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:shadow-lg dark:shadow-black/20 dark:hover:bg-white/10"
          :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="() => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }"
        />
      </UTooltip>
    </div>

    <main class="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-16 sm:px-6 sm:py-14 lg:px-8 lg:py-10">
      <div class="grid w-full overflow-hidden rounded-[1.6rem] border border-slate-200/90 bg-white/88 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur dark:border-white/10 dark:bg-[#041725]/92 dark:shadow-[0_28px_80px_rgba(0,0,0,0.42)] lg:grid-cols-[0.88fr_1.12fr]">
        <section class="relative hidden min-h-[600px] overflow-hidden border-r border-slate-200/80 bg-[#f8fbf9]/80 px-9 py-10 lg:flex lg:flex-col lg:justify-between xl:px-11 xl:py-11 dark:border-white/10 dark:bg-transparent">
          <div class="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(5,150,105,0.035),rgba(255,255,255,0.10))] dark:bg-[linear-gradient(145deg,rgba(6,34,48,0.34),rgba(2,13,23,0.36))]" />
          <div class="pointer-events-none absolute -right-16 top-16 size-40 rounded-full border border-emerald-600/10 bg-emerald-500/6 dark:border-emerald-300/10 dark:bg-emerald-400/6" />
          <div class="pointer-events-none absolute -bottom-20 right-4 size-64 rounded-full bg-emerald-500/7 dark:bg-emerald-400/8" />

          <div class="relative">
            <div class="flex items-center gap-3">
              <div class="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-white p-2 shadow-md ring-1 ring-slate-200/80 dark:shadow-lg dark:shadow-black/20 dark:ring-0">
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
                <p class="text-xs font-semibold uppercase tracking-[0.19em] text-emerald-700 dark:text-emerald-200/80">SNCBT Library</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-300">Library Management System</p>
              </div>
            </div>

            <div class="mt-14 max-w-md">
              <p class="text-s font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300/80">Welcome</p>
              <h1 class="mt-3 text-[2.7rem] font-semibold leading-[1.08] tracking-tight text-slate-950 dark:text-white">
                Your Library, all in one place.
              </h1>
              <p class="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Sign in to view and use the Library services available to your account.
              </p>
            </div>
          </div>

          <div class="relative overflow-hidden rounded-[1.35rem] border border-emerald-700/15 bg-[#f1f8f4] p-5 shadow-[0_14px_32px_rgba(15,23,42,0.08)] dark:border-emerald-300/15 dark:bg-[#071f35] dark:shadow-[0_18px_40px_rgba(0,0,0,0.26)]">
            <div class="pointer-events-none absolute -bottom-12 -right-8 size-40 rounded-full bg-emerald-500/8 dark:bg-emerald-400/8" />
            <div class="relative flex items-start justify-between gap-5">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-300">Library access</p>
                <p class="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Ready</p>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Sign in to continue</p>
              </div>
              <div class="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-600/15 bg-emerald-500/10 text-emerald-700 shadow-[0_10px_22px_rgba(5,150,105,0.12)] dark:border-emerald-300/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:shadow-[0_10px_22px_rgba(16,185,129,0.16)]">
                <UIcon name="i-lucide-library" class="size-5" />
              </div>
            </div>
          </div>
        </section>

        <section class="relative px-4 py-4 sm:px-7 sm:py-7 lg:flex lg:items-center lg:px-10 lg:py-10 xl:px-12">
          <div class="pointer-events-none absolute right-3 top-3 size-24 rounded-full border border-emerald-600/10 bg-emerald-500/6 lg:hidden dark:border-emerald-300/10 dark:bg-emerald-400/6" />

          <div class="relative mx-auto w-full max-w-lg overflow-hidden rounded-[1.5rem] border border-slate-200/90 bg-white/95 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.10)] sm:p-7 dark:border-white/10 dark:bg-[#071c31]/95 dark:shadow-[0_18px_45px_rgba(0,0,0,0.32)]">
            <div class="pointer-events-none absolute -bottom-16 -right-10 size-48 rounded-full bg-emerald-500/6 dark:bg-emerald-400/7" />

            <div class="relative">
              <div class="flex items-center gap-3 lg:hidden">
                <div class="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200/80 dark:shadow-md dark:shadow-black/20 dark:ring-0">
                  <img src="/sncbt-library-logo.png" alt="SNCBT Library logo" class="size-full object-contain">
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">SNCBT Library</p>
                  <p class="truncate text-xs text-slate-500 dark:text-slate-400">Library Management System</p>
                </div>
              </div>

              <div class="mt-6 flex items-start justify-between gap-4 lg:mt-0">
                <div class="min-w-0">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300/85">Welcome back</p>
                  <h2 id="signin-heading" class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
                    Sign in
                  </h2>
                  <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Enter your email or username and password.
                  </p>
                </div>

                <div class="hidden size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-600/15 bg-emerald-500/10 text-emerald-700 sm:flex dark:border-emerald-300/15 dark:bg-emerald-400/10 dark:text-emerald-300">
                  <UIcon name="i-lucide-user-round-check" class="size-5" />
                </div>
              </div>

              <div class="mt-5 space-y-3">
                <UAlert
                  v-if="maintenance.enabled.value"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-construction"
                  title="Library maintenance"
                  description="Some Library features are temporarily limited. You can still sign in and view available information."
                />

                <UAlert
                  v-if="blockedDeviceNotice"
                  color="error"
                  variant="soft"
                  icon="i-lucide-shield-ban"
                  title="Sign-in unavailable on this device"
                  :description="blockedDeviceNotice"
                />

                <UAlert
                  v-if="membershipAccessNotice"
                  color="warning"
                  variant="soft"
                  icon="i-lucide-calendar-x-2"
                  title="Membership renewal needed"
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
                  :ui="{ label: 'text-sm font-semibold text-slate-800 dark:text-slate-100' }"
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
                      base: 'h-12 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#08172a]/85 dark:text-white dark:placeholder:text-slate-500',
                      leadingIcon: 'text-emerald-700 dark:text-emerald-300'
                    }"
                    autofocus
                  />
                </UFormField>

                <UFormField
                  name="password"
                  label="Password"
                  :ui="{ label: 'text-sm font-semibold text-slate-800 dark:text-slate-100' }"
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
                      base: 'h-12 rounded-xl border-slate-300/90 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#08172a]/85 dark:text-white dark:placeholder:text-slate-500',
                      leadingIcon: 'text-emerald-700 dark:text-emerald-300'
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
                        class="text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
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
                  class="h-12 rounded-xl border border-emerald-500/20 bg-emerald-600 font-semibold text-white shadow-[0_12px_26px_rgba(5,150,105,0.20)] transition hover:bg-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-500 dark:text-slate-950 dark:shadow-[0_14px_28px_rgba(16,185,129,0.22)] dark:hover:bg-emerald-400"
                >
                  Sign In
                </UButton>
              </UForm>

              <div class="mt-5 flex items-center gap-2 border-t border-slate-200/80 pt-4 text-xs text-slate-500 dark:border-white/8 dark:text-slate-400">
                <UIcon name="i-lucide-circle-help" class="size-3.5 text-emerald-700 dark:text-emerald-300/80" />
                <span>Need help signing in? Please ask Library staff.</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
