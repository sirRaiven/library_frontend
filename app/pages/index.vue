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
    loginError.value = auth.getErrorMessage(error);
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
    <!-- Restrained brand atmosphere keeps the form visually focused. -->
    <div
      class="pointer-events-none absolute -left-28 top-12 size-72 rounded-full bg-primary/7 blur-3xl sm:size-96"
    />
    <div
      class="pointer-events-none absolute -right-28 bottom-0 size-80 rounded-full bg-primary/5 blur-3xl sm:size-[28rem]"
    />

    <!-- Color mode stays available without competing with the sign-in form. -->
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

    <main class="relative z-10 flex w-full justify-center">
      <UCard
        class="w-full max-w-md overflow-hidden border border-default bg-default shadow-[var(--sncbt-shadow-overlay)]"
        :ui="{
          root: 'rounded-2xl',
          header: 'p-0 sm:p-0',
          body: 'p-6 sm:p-8',
        }"
      >
        <template #header>
          <div
            class="relative border-b border-default bg-elevated/25 px-6 pb-7 pt-8 text-center sm:px-8 sm:pb-8 sm:pt-9"
          >
            <div
              class="pointer-events-none absolute inset-x-12 top-0 h-24 rounded-full bg-primary/7 blur-3xl"
            />

            <div
              class="relative mx-auto flex size-16 items-center justify-center overflow-hidden rounded-xl border border-primary/15 bg-white p-2 shadow-sm dark:bg-slate-950"
            >
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

            <div class="relative mt-5">
              <h1 class="text-2xl font-semibold tracking-tight text-highlighted">
                SNCBT Library
              </h1>
              <p class="mt-1 text-sm text-muted">
                Management System
              </p>
              <p class="mt-4 text-sm leading-6 text-muted">
                Sign in with your library account to continue.
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-5">
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

          <UForm
            :validate="validate"
            :state="form"
            class="space-y-5"
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
              class="h-12 font-semibold"
            >
              Sign In
            </UButton>
          </UForm>
        </div>
      </UCard>
    </main>
  </div>
</template>
