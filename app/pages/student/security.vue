<script setup lang="ts">
import AppFormSection from "~/components/shared/AppFormSection.vue";
import AppStickyFormActions from "~/components/shared/AppStickyFormActions.vue";
import type { StudentKnownDevice } from "~/composables/useStudentProfileSecurity";

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "My Account",
  roleTitle: "Student",
});

const center = useStudentProfileSecurity();
const auth = useAuth();
const monitoring = useStudentSession();
const toast = useToast();
const config = useRuntimeConfig();

const activeSection = ref<"profile" | "password" | "sessions">("profile");
const profileForm = reactive({ contactNo: "", address: "" });
const passwordForm = reactive({
  currentPassword: "",
  password: "",
  passwordConfirmation: "",
});
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmation = ref(false);
const confirmOtherSessions = ref(false);
const signingOutAfterPassword = ref(false);

const strapiUrl = String(config.public.strapiUrl).replace(/\/$/, "");

const sectionItems = [
  { label: "Profile", value: "profile", icon: "i-lucide-user-round" },
  { label: "Password", value: "password", icon: "i-lucide-key-round" },
  { label: "Sessions & Devices", value: "sessions", icon: "i-lucide-monitor-smartphone" },
] as const;

const passwordChecks = computed(() => [
  { label: "At least 12 characters", valid: passwordForm.password.length >= 12 },
  { label: "Uppercase and lowercase letters", valid: /[A-Z]/.test(passwordForm.password) && /[a-z]/.test(passwordForm.password) },
  { label: "At least one number", valid: /[0-9]/.test(passwordForm.password) },
  { label: "At least one symbol", valid: /[^A-Za-z0-9]/.test(passwordForm.password) },
  { label: "Passwords match", valid: Boolean(passwordForm.password) && passwordForm.password === passwordForm.passwordConfirmation },
]);

const canChangePassword = computed(() =>
  Boolean(passwordForm.currentPassword) && passwordChecks.value.every(item => item.valid),
);

function mediaUrl(value: string | null | undefined) {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${strapiUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

function syncForm() {
  profileForm.contactNo = center.profile.value?.contactNo ?? "";
  profileForm.address = center.profile.value?.address ?? "";
}

async function refresh() {
  try {
    await center.refresh();
    syncForm();
  } catch (error) {
    toast.add({
      title: "Unable to load account settings",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function saveProfile() {
  try {
    await center.updateProfile(profileForm);
    toast.add({
      title: "Contact information updated",
      description: "Your permitted Student contact information has been saved.",
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    toast.add({
      title: "Unable to update profile",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function submitPasswordChange() {
  if (!canChangePassword.value) return;
  try {
    await center.changePassword(passwordForm);
    signingOutAfterPassword.value = true;
    monitoring.sessionKey.value = null;
    auth.clearSession();
    toast.add({
      title: "Password changed",
      description: "For security, all sessions were invalidated. Sign in again using your new password.",
      color: "success",
      icon: "i-lucide-shield-check",
    });
    await navigateTo("/");
  } catch (error) {
    toast.add({
      title: "Unable to change password",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    signingOutAfterPassword.value = false;
  }
}

async function revokeSession(id: string) {
  try {
    await center.revokeSession(id);
    toast.add({
      title: "Session revoked",
      description: "That authentication session can no longer refresh its access.",
      color: "success",
      icon: "i-lucide-log-out",
    });
  } catch (error) {
    toast.add({
      title: "Unable to revoke session",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function revokeOthers() {
  try {
    const result = await center.revokeOtherSessions();
    confirmOtherSessions.value = false;
    toast.add({
      title: "Other sessions signed out",
      description: `${result.revoked} other session${result.revoked === 1 ? " was" : "s were"} revoked.`,
      color: "success",
      icon: "i-lucide-shield-check",
    });
  } catch (error) {
    toast.add({
      title: "Unable to sign out other sessions",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function toggleTrust(device: StudentKnownDevice) {
  try {
    await center.setDeviceTrust(device, !device.trusted);
    toast.add({
      title: device.trusted ? "Trusted status removed" : "Device marked as trusted",
      description: device.displayName,
      color: "success",
      icon: "i-lucide-shield-check",
    });
  } catch (error) {
    toast.add({
      title: "Unable to update device",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

onMounted(refresh);
</script>

<template>
  <div class="sncbt-page-shell sncbt-member-page space-y-5 sm:space-y-6">
    <StudentPageHeader
      eyebrow="Account Settings"
      title="My Account"
      description="Manage your contact information, password, signed-in sessions, and trusted devices."
      icon="i-lucide-user-round-cog"
    >
      <template #actions>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="center.loading.value"
          @click="refresh"
        />
      </template>
    </StudentPageHeader>

    <UAlert
      v-if="center.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="Account information could not be loaded"
      :description="center.error.value"
    />

    <UCard class="sncbt-account-identity-card" :ui="{ body: 'p-5 sm:p-6' }">
      <div class="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-center">
        <div class="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <UAvatar
            :src="mediaUrl(center.profile.value?.photoUrl)"
            :alt="center.profile.value?.fullName || 'Student'"
            :text="center.profile.value?.fullName?.split(/\s+/).slice(0, 2).map(part => part[0]).join('') || 'S'"
            size="3xl"
            class="size-20 shrink-0 rounded-2xl ring-4 ring-primary/10"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="truncate text-xl font-bold text-highlighted sm:text-2xl">
                {{ center.profile.value?.fullName || 'Student account' }}
              </h2>
              <StudentStatusBadge :status="center.profile.value?.studentStatus || 'Checking'" />
            </div>
            <p class="mt-1 text-sm font-semibold text-primary">
              {{ center.profile.value?.studentNo || 'Student number unavailable' }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ center.profile.value?.course || 'Program not recorded' }}
              <template v-if="center.profile.value?.yearLevel"> · Year {{ center.profile.value.yearLevel }}</template>
              <template v-if="center.profile.value?.section"> · {{ center.profile.value.section }}</template>
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:min-w-[28rem]">
          <div class="rounded-xl border border-default/80 bg-elevated/30 px-3 py-3">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Library Card</p>
            <div class="mt-1.5"><StudentStatusBadge :status="center.profile.value?.libraryCardStatus || 'Checking'" /></div>
          </div>
          <div class="rounded-xl border border-default/80 bg-elevated/30 px-3 py-3">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Sessions</p>
            <p class="mt-1 text-xl font-bold text-highlighted">{{ center.summary.value.activeSessions }}</p>
          </div>
          <div class="col-span-2 rounded-xl border border-default/80 bg-elevated/30 px-3 py-3 sm:col-span-1">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Trusted Devices</p>
            <p class="mt-1 text-xl font-bold text-highlighted">{{ center.summary.value.trustedDevices }}</p>
          </div>
        </div>
      </div>
    </UCard>

    <div class="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:items-start">
      <aside class="lg:sticky lg:top-4">
        <UCard class="sncbt-account-settings-nav" :ui="{ body: 'p-2.5 sm:p-3' }">
          <div class="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Account settings sections">
            <UButton
              v-for="item in sectionItems"
              :key="item.value"
              :label="item.label"
              :icon="item.icon"
              :color="activeSection === item.value ? 'primary' : 'neutral'"
              :variant="activeSection === item.value ? 'soft' : 'ghost'"
              class="min-w-max justify-start lg:w-full"
              :aria-pressed="activeSection === item.value"
              @click="() => { activeSection = item.value; }"
            />
          </div>

          <div class="mt-3 hidden border-t border-default/80 pt-3 lg:block">
            <p class="px-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Security overview</p>
            <dl class="mt-2 space-y-1.5 px-2 text-xs">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-muted">Known devices</dt>
                <dd class="font-semibold text-highlighted">{{ center.summary.value.knownDevices }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-muted">Trusted</dt>
                <dd class="font-semibold text-success">{{ center.summary.value.trustedDevices }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-muted">Blocked</dt>
                <dd class="font-semibold" :class="center.summary.value.blockedDevices ? 'text-error' : 'text-highlighted'">{{ center.summary.value.blockedDevices }}</dd>
              </div>
            </dl>
          </div>
        </UCard>
      </aside>

      <div class="min-w-0 space-y-5">
        <template v-if="activeSection === 'profile'">
          <UCard :ui="{ body: 'p-5 sm:p-6' }">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">Student information</h2>
                <p class="mt-1 text-sm text-muted">Official academic and Library account details associated with your record.</p>
              </div>
              <UBadge label="Managed by SNCBT" color="info" variant="soft" icon="i-lucide-lock-keyhole" />
            </div>

            <dl class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
                <dt class="text-xs text-muted">Username</dt>
                <dd class="mt-1 break-words text-sm font-semibold text-highlighted">{{ center.account.value?.username || 'Not available' }}</dd>
              </div>
              <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
                <dt class="text-xs text-muted">Official email</dt>
                <dd class="mt-1 break-words text-sm font-semibold text-highlighted">{{ center.account.value?.email || 'Not available' }}</dd>
              </div>
              <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
                <dt class="text-xs text-muted">Educational level</dt>
                <dd class="mt-1 text-sm font-semibold text-highlighted">{{ center.profile.value?.educationalLevel || 'Not recorded' }}</dd>
              </div>
              <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
                <dt class="text-xs text-muted">Program</dt>
                <dd class="mt-1 text-sm font-semibold text-highlighted">{{ center.profile.value?.course || 'Not recorded' }}</dd>
              </div>
              <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
                <dt class="text-xs text-muted">Year / Section</dt>
                <dd class="mt-1 text-sm font-semibold text-highlighted">
                  <template v-if="center.profile.value?.yearLevel">Year {{ center.profile.value.yearLevel }}</template>
                  <template v-else>Not recorded</template>
                  <template v-if="center.profile.value?.section"> · {{ center.profile.value.section }}</template>
                </dd>
              </div>
              <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
                <dt class="text-xs text-muted">Library Card number</dt>
                <dd class="mt-1 font-mono text-sm font-semibold text-highlighted">{{ center.profile.value?.libraryCardNo || 'Not issued' }}</dd>
              </div>
            </dl>

            <UAlert
              class="mt-5"
              color="info"
              variant="soft"
              icon="i-lucide-info"
              title="Need to correct an official record?"
              description="Ask the Registrar or Library personnel to update your name, Student number, program, year level, section, official email, status, or Library Card record."
            />
          </UCard>

          <AppFormSection
            title="Contact information"
            description="Keep the contact details that Library staff may use to reach you up to date."
            icon="i-lucide-contact-round"
          >
            <form class="space-y-5" @submit.prevent="saveProfile">
              <div class="grid gap-5 sm:grid-cols-2">
                <UFormField label="Contact number" hint="Example: +63 912 345 6789">
                  <UInput
                    v-model="profileForm.contactNo"
                    icon="i-lucide-phone"
                    autocomplete="tel"
                    maxlength="30"
                    placeholder="Enter your active contact number"
                    class="w-full"
                  />
                </UFormField>
                <UFormField label="Current address" class="sm:col-span-2">
                  <UTextarea
                    v-model="profileForm.address"
                    :rows="4"
                    maxlength="500"
                    autoresize
                    placeholder="Enter your current residential address"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <AppStickyFormActions>
                <template #secondary>
                  <UButton label="Reset" color="neutral" variant="outline" :disabled="center.saving.value" @click="syncForm" />
                </template>
                <UButton type="submit" label="Save Changes" icon="i-lucide-save" :loading="center.saving.value" />
              </AppStickyFormActions>
            </form>
          </AppFormSection>
        </template>

        <template v-else-if="activeSection === 'password'">
          <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <UCard :ui="{ body: 'p-5 sm:p-6' }">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">Change password</h2>
                <p class="mt-1 text-sm text-muted">Choose a strong password that you do not use on other services.</p>
              </div>

              <form class="mt-5 space-y-5" @submit.prevent="submitPasswordChange">
                <UFormField label="Current password" required>
                  <UInput
                    v-model="passwordForm.currentPassword"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    icon="i-lucide-lock-keyhole"
                    autocomplete="current-password"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        :icon="showCurrentPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        square
                        :aria-label="showCurrentPassword ? 'Hide current password' : 'Show current password'"
                        @click="() => { showCurrentPassword = !showCurrentPassword; }"
                      />
                    </template>
                  </UInput>
                </UFormField>
                <UFormField label="New password" required>
                  <UInput
                    v-model="passwordForm.password"
                    :type="showNewPassword ? 'text' : 'password'"
                    icon="i-lucide-key-round"
                    autocomplete="new-password"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        :icon="showNewPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        square
                        :aria-label="showNewPassword ? 'Hide new password' : 'Show new password'"
                        @click="() => { showNewPassword = !showNewPassword; }"
                      />
                    </template>
                  </UInput>
                </UFormField>
                <UFormField label="Confirm new password" required>
                  <UInput
                    v-model="passwordForm.passwordConfirmation"
                    :type="showConfirmation ? 'text' : 'password'"
                    icon="i-lucide-shield-check"
                    autocomplete="new-password"
                    class="w-full"
                  >
                    <template #trailing>
                      <UButton
                        :icon="showConfirmation ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        square
                        :aria-label="showConfirmation ? 'Hide password confirmation' : 'Show password confirmation'"
                        @click="() => { showConfirmation = !showConfirmation; }"
                      />
                    </template>
                  </UInput>
                </UFormField>
                <UButton
                  type="submit"
                  label="Change Password and Sign Out"
                  icon="i-lucide-shield-check"
                  color="primary"
                  :disabled="!canChangePassword"
                  :loading="center.securityAction.value === 'password' || signingOutAfterPassword"
                />
              </form>
            </UCard>

            <UCard :ui="{ body: 'p-5 sm:p-6' }">
              <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UIcon name="i-lucide-shield-check" class="size-5" />
              </div>
              <h3 class="mt-4 font-semibold text-highlighted">Password requirements</h3>
              <ul class="mt-4 space-y-3">
                <li v-for="item in passwordChecks" :key="item.label" class="flex gap-2 text-sm">
                  <UIcon
                    :name="item.valid ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                    class="mt-0.5 size-4 shrink-0"
                    :class="item.valid ? 'text-success' : 'text-muted'"
                  />
                  <span :class="item.valid ? 'text-highlighted' : 'text-muted'">{{ item.label }}</span>
                </li>
              </ul>
              <UAlert
                class="mt-5"
                color="warning"
                variant="soft"
                icon="i-lucide-triangle-alert"
                title="Keep your password private"
                description="Library personnel should never ask you to reveal your current password."
              />
            </UCard>
          </div>
        </template>

        <template v-else>
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <StudentMetricCard label="Active Sessions" :value="center.summary.value.activeSessions" description="Signed-in browser sessions." icon="i-lucide-log-in" tone="primary" />
            <StudentMetricCard label="Known Devices" :value="center.summary.value.knownDevices" description="Devices seen by the Library System." icon="i-lucide-monitor-smartphone" tone="neutral" />
            <StudentMetricCard label="Trusted Devices" :value="center.summary.value.trustedDevices" description="Devices you marked as recognized." icon="i-lucide-shield-check" tone="success" />
          </div>

          <UCard :ui="{ body: 'p-5 sm:p-6' }">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">Signed-in sessions</h2>
                <p class="mt-1 text-sm text-muted">Review browsers that can refresh access to your Student Portal account.</p>
              </div>
              <UButton
                v-if="center.sessionManagementAvailable.value && center.sessions.value.some(item => !item.current)"
                label="Sign Out Other Sessions"
                icon="i-lucide-log-out"
                color="error"
                variant="outline"
                @click="() => { confirmOtherSessions = true; }"
              />
            </div>

            <UAlert
              v-if="!center.sessionManagementAvailable.value"
              class="mt-5"
              color="warning"
              variant="soft"
              icon="i-lucide-info"
              title="Session management is unavailable"
              description="Individual sign-in sessions cannot be managed for this account right now."
            />

            <div v-else-if="center.sessions.value.length" class="mt-5 divide-y divide-default rounded-xl border border-default">
              <div v-for="session in center.sessions.value" :key="session.id" class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted">
                  <UIcon name="i-lucide-monitor" class="size-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-medium text-highlighted">{{ session.deviceName || 'Authenticated browser session' }}</p>
                    <UBadge v-if="session.current" label="Current" color="success" variant="soft" />
                  </div>
                  <p class="mt-1 text-xs text-muted">Signed in {{ formatDateTime(session.loginAt) }} · Last active {{ formatDateTime(session.lastActiveAt) }}</p>
                </div>
                <UButton
                  v-if="!session.current"
                  label="Revoke"
                  icon="i-lucide-log-out"
                  color="error"
                  variant="ghost"
                  :loading="center.securityAction.value === `session:${session.id}`"
                  @click="revokeSession(session.id)"
                />
              </div>
            </div>
            <div v-else class="mt-5 rounded-xl border border-dashed border-default p-8 text-center text-sm text-muted">No signed-in sessions are available.</div>
          </UCard>

          <UCard :ui="{ body: 'p-5 sm:p-6' }">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">Your devices</h2>
              <p class="mt-1 text-sm text-muted">Review devices associated with your account and mark devices you recognize as trusted.</p>
            </div>

            <div v-if="center.devices.value.length" class="mt-5 grid gap-4 lg:grid-cols-2">
              <div v-for="device in center.devices.value" :key="device.documentId" class="rounded-2xl border border-default bg-elevated/30 p-5">
                <div class="flex gap-4">
                  <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-default text-muted">
                    <UIcon :name="device.deviceType === 'Mobile Phone' ? 'i-lucide-smartphone' : 'i-lucide-monitor'" class="size-5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="font-semibold text-highlighted">{{ device.displayName }}</h3>
                      <UBadge v-if="device.current" label="Current device" color="success" variant="soft" />
                      <UBadge v-if="device.trusted" label="Trusted" color="primary" variant="soft" />
                      <UBadge v-if="device.blocked" label="Blocked" color="error" variant="soft" />
                    </div>
                    <p class="mt-1 text-sm text-muted">{{ device.deviceType }} · {{ device.applicationMode }}</p>
                  </div>
                </div>
                <dl class="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><dt class="text-muted">First seen</dt><dd class="mt-1 font-medium text-highlighted">{{ formatDateTime(device.firstSeenAt) }}</dd></div>
                  <div><dt class="text-muted">Last seen</dt><dd class="mt-1 font-medium text-highlighted">{{ formatDateTime(device.lastSeenAt) }}</dd></div>
                  <div><dt class="text-muted">Network</dt><dd class="mt-1 font-medium text-highlighted">{{ device.lastIpAddress || 'Not available' }}</dd></div>
                  <div><dt class="text-muted">Browser</dt><dd class="mt-1 font-medium text-highlighted">{{ device.browser }}</dd></div>
                </dl>
                <UButton
                  class="mt-4"
                  :label="device.trusted ? 'Remove Trusted Status' : 'Mark as Trusted'"
                  :icon="device.trusted ? 'i-lucide-shield-off' : 'i-lucide-shield-check'"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  :disabled="device.blocked"
                  :loading="center.securityAction.value === `device:${device.documentId}`"
                  @click="toggleTrust(device)"
                />
              </div>
            </div>
            <div v-else class="mt-5 rounded-xl border border-dashed border-default p-8 text-center text-sm text-muted">No known device records are available.</div>
          </UCard>
        </template>
      </div>
    </div>
  </div>

  <UModal v-model:open="confirmOtherSessions" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <div class="relative overflow-hidden p-6 sm:p-8">
        <div class="pointer-events-none absolute -right-14 -top-14 size-40 rounded-full border border-error/10 bg-error/5" />
        <div class="relative">
          <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-error/10 text-error">
            <UIcon name="i-lucide-log-out" class="size-7" />
          </div>
          <div class="mt-5 text-center">
            <h2 class="text-xl font-bold text-highlighted">Sign out all other sessions?</h2>
            <p class="mt-2 text-sm leading-relaxed text-muted">Your current browser remains signed in. Every other refresh session for this account will be revoked.</p>
          </div>
          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <UButton label="Cancel" color="neutral" variant="outline" block @click="() => { confirmOtherSessions = false; }" />
            <UButton label="Sign Out Others" icon="i-lucide-log-out" color="error" block :loading="center.securityAction.value === 'sessions:others'" @click="revokeOthers" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
