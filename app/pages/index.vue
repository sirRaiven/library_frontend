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

function safeInternalRedirect(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return null;
  }

  try {
    const baseOrigin = "https://sncbt.local";
    const target = new URL(value, baseOrigin);

    if (target.origin !== baseOrigin) {
      return null;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

const isLoggingIn = ref(false);
const loginStatus = computed(() => isLoggingIn.value ? "Signing you in…" : "");
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

    const requestedRedirect = safeInternalRedirect(
      route.query.redirect,
    );
    const destination =
      requestedRedirect ?? auth.homeRoute.value;

    // Use a document navigation after authentication. Protected portal pages
    // are client-rendered and code-split; a fresh document avoids Firefox
    // racing a route-chunk import against the sign-in page's pending prefetches.
    await navigateTo(destination, { external: true });
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
  <div class="sncbt-signin min-h-dvh bg-[var(--sncbt-canvas)] text-default">
    <div class="sncbt-signin-topline" aria-hidden="true" />
    <div class="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-10">
      <header class="flex items-center justify-between gap-4 border-b border-default/80 pb-5">
        <div class="flex min-w-0 items-center gap-3.5">
          <img src="/sncbt-library-logo.png" alt="SNCBT Library" width="54" height="54"
            class="size-12 shrink-0 rounded-lg bg-white object-contain p-1 sm:size-14" />
          <div class="min-w-0">
            <p class="text-sm font-bold tracking-tight text-highlighted">St. Nicolas College of Business and Technology</p>
            <p class="mt-0.5 text-xs text-muted sm:text-sm">Library Management System</p>
          </div>
        </div>
        <UColorModeButton color="neutral" variant="ghost" square size="lg" aria-label="Change color theme" />
      </header>

      <main id="main-content" tabindex="-1" class="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1fr_0.88fr] lg:gap-20 lg:py-16">
        <aside class="sncbt-signin-context hidden lg:block">
          <p class="max-w-md text-3xl font-semibold leading-tight tracking-tight text-highlighted xl:text-4xl">
            Library services for students, faculty, and staff
          </p>
          <p class="mt-4 max-w-md text-base leading-7 text-muted">
            Browse the catalog, check your loans and reservations, or manage library records using your staff account.
          </p>
        </aside>

        <section class="sncbt-signin-form-wrap" aria-labelledby="signin-heading">
          <div class="mb-7">
            <h1 id="signin-heading" class="text-3xl font-semibold tracking-tight text-highlighted">Sign in to the Library</h1>
          </div>

          <div class="space-y-3">
            <UAlert v-if="maintenance.enabled.value" color="warning" variant="soft"
              icon="i-lucide-construction" title="Library maintenance"
              description="Some Library features are temporarily limited. You can still sign in and view available information." />
            <UAlert v-if="blockedDeviceNotice" color="error" variant="soft"
              icon="i-lucide-shield-ban" title="Sign-in unavailable on this device"
              :description="blockedDeviceNotice" />
            <UAlert v-if="membershipAccessNotice" color="warning" variant="soft"
              icon="i-lucide-calendar-x-2" title="Membership renewal needed"
              :description="membershipAccessNotice" />
          </div>

          <UForm :validate="validate" :state="form" :aria-busy="isLoggingIn"
            class="mt-6 space-y-5" @submit="handleLogin">
            <UFormField name="identifier" label="Email or username">
              <UInput v-model="form.identifier" icon="i-lucide-user-round" color="neutral" variant="outline"
                placeholder="Enter email or username" autocomplete="username" size="xl"
                :disabled="isLoggingIn" class="w-full"
                :ui="{ base: 'h-12 rounded-lg' }" />
            </UFormField>

            <UFormField name="password" label="Password">
              <UInput v-model="form.password" :type="showPassword ? 'text' : 'password'"
                icon="i-lucide-lock-keyhole" color="neutral" variant="outline"
                placeholder="Enter password" autocomplete="current-password"
                size="xl" :disabled="isLoggingIn" class="w-full" :ui="{ base: 'h-12 rounded-lg' }">
                <template #trailing>
                  <button type="button" class="sncbt-password-toggle"
                    :disabled="isLoggingIn"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    @click="showPassword = !showPassword">
                    <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="size-4" />
                  </button>
                </template>
              </UInput>
            </UFormField>

            <UButton type="submit" color="primary" size="xl" block
              :loading="isLoggingIn" :disabled="isLoggingIn"
              class="sncbt-signin-submit h-12 rounded-lg font-semibold">
              {{ isLoggingIn ? 'Signing in…' : 'Sign in' }}
            </UButton>
          </UForm>

          <div role="status" class="sr-only">{{ loginStatus }}</div>
          <div v-if="isLoggingIn" class="sncbt-signin-progress mt-3" aria-hidden="true"><span /></div>
          <UAlert v-if="loginError" class="mt-4" role="alert" color="error" variant="soft"
            icon="i-lucide-circle-alert" title="Unable to sign in" :description="loginError" />

          <div class="mt-7 border-t border-default/80 pt-5">
            <p class="flex items-start gap-2 text-xs leading-5 text-muted">
              <UIcon name="i-lucide-circle-help" class="mt-0.5 size-4 shrink-0" />
              Need help with your account? Please contact Library staff.
            </p>
          </div>
        </section>
      </main>

      <footer class="border-t border-default/80 py-5 text-xs text-muted">
        <span>St. Nicolas College of Business and Technology · Library Office</span>
      </footer>
    </div>
  </div>
</template>
