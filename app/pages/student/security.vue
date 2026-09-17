<script setup lang="ts">
import type { StudentKnownDevice } from "~/composables/useStudentProfileSecurity";

definePageMeta({
  layout: "student",
  middleware: ["student"],
  title: "Profile and Security",
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
  { label: "My Profile", value: "profile", icon: "i-lucide-user-round" },
  { label: "Change Password", value: "password", icon: "i-lucide-key-round" },
  { label: "Sessions and Devices", value: "sessions", icon: "i-lucide-monitor-smartphone" },
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
      title: "Unable to load profile and security",
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
  <div class="sncbt-page-shell space-y-6">
    <StudentPageHeader
      eyebrow="Account and Privacy"
      title="Profile and Security"
      description="Review your official Student information, maintain permitted contact details, and protect access to your Library account."
      icon="i-lucide-shield-user"
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
      title="Profile and security information could not be loaded"
      :description="center.error.value"
    />

    <div class="grid gap-4 sm:grid-cols-3">
      <StudentMetricCard
        label="Active Sessions"
        :value="center.summary.value.activeSessions"
        description="Authenticated browser sessions currently associated with your account."
        icon="i-lucide-log-in"
        tone="primary"
      />
      <StudentMetricCard
        label="Known Devices"
        :value="center.summary.value.knownDevices"
        description="Privacy-safe browser-device records observed by the Library System."
        icon="i-lucide-monitor-smartphone"
        tone="neutral"
      />
      <StudentMetricCard
        label="Trusted Devices"
        :value="center.summary.value.trustedDevices"
        description="Devices you have personally marked as recognized."
        icon="i-lucide-shield-check"
        tone="success"
      />
    </div>

    <UCard :ui="{ body: 'p-3 sm:p-4' }">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="item in sectionItems"
          :key="item.value"
          :label="item.label"
          :icon="item.icon"
          :color="activeSection === item.value ? 'primary' : 'neutral'"
          :variant="activeSection === item.value ? 'solid' : 'ghost'"
          @click="() => { activeSection = item.value; }"
        />
      </div>
    </UCard>

    <template v-if="activeSection === 'profile'">
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.7fr)] mb-12">
        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
            <UAvatar
              :src="mediaUrl(center.profile.value?.photoUrl)"
              :alt="center.profile.value?.fullName || 'Student'"
              :text="center.profile.value?.fullName?.split(/\s+/).slice(0,2).map(part => part[0]).join('') || 'S'"
              size="3xl"
              class="size-24 rounded-2xl ring-4 ring-primary/10"
            />
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-2xl font-bold text-highlighted">
                {{ center.profile.value?.fullName || 'Student profile' }}
              </h2>
              <p class="mt-1 font-medium text-primary">
                {{ center.profile.value?.studentNo || 'Student number unavailable' }}
              </p>
              <p class="mt-1 text-sm text-muted">
                {{ center.profile.value?.course }}
                <template v-if="center.profile.value?.yearLevel"> · Year {{ center.profile.value.yearLevel }}</template>
                <template v-if="center.profile.value?.section"> · {{ center.profile.value.section }}</template>
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <StudentStatusBadge :status="center.profile.value?.studentStatus || 'Checking'" />
              <StudentStatusBadge :status="center.profile.value?.libraryCardStatus || 'Checking'" />
            </div>
          </div>

          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <UFormField label="Official account username">
              <UInput :model-value="center.account.value?.username || ''" disabled icon="i-lucide-at-sign" />
            </UFormField>
            <UFormField label="Official account email">
              <UInput :model-value="center.account.value?.email || ''" disabled icon="i-lucide-mail" />
            </UFormField>
            <UFormField label="Educational level">
              <UInput :model-value="center.profile.value?.educationalLevel || ''" disabled />
            </UFormField>
            <UFormField label="Library Card number">
              <UInput :model-value="center.profile.value?.libraryCardNo || 'Not issued'" disabled icon="i-lucide-id-card" />
            </UFormField>
          </div>

          <UAlert
            class="mt-5"
            color="info"
            variant="soft"
            icon="i-lucide-info"
            title="Official academic information is read-only"
            description="Ask the Registrar or Library personnel to correct your name, Student number, course, year level, section, official email, status, or Library Card record."
          />
        </UCard>

        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <h2 class="text-lg font-semibold text-highlighted">Contact information</h2>
          <p class="mt-1 text-sm text-muted">
            Only your contact number and current address can be updated from this portal.
          </p>

          <form class="mt-5 space-y-5" @submit.prevent="saveProfile">
            <UFormField label="Contact number" hint="Example: +63 912 345 6789">
              <UInput
                v-model="profileForm.contactNo"
                icon="i-lucide-phone"
                autocomplete="tel"
                maxlength="30"
                placeholder="Enter your active contact number"
              />
            </UFormField>
            <UFormField label="Current address">
              <UTextarea
                v-model="profileForm.address"
                :rows="5"
                maxlength="500"
                autoresize
                placeholder="Enter your current residential address"
              />
            </UFormField>
            <UButton
              type="submit"
              label="Save Contact Information"
              icon="i-lucide-save"
              color="primary"
              :loading="center.saving.value"
              block
            />
          </form>
        </UCard>
      </div>
    </template>

    <template v-else-if="activeSection === 'password'">
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <h2 class="text-lg font-semibold text-highlighted">Change Student Portal password</h2>
          <p class="mt-1 text-sm text-muted">
            Changing your password invalidates all current sessions and requires you to sign in again.
          </p>

          <form class="mt-6 max-w-2xl space-y-5" @submit.prevent="submitPasswordChange">
            <UFormField label="Current password" required>
              <UInput
                v-model="passwordForm.currentPassword"
                :type="showCurrentPassword ? 'text' : 'password'"
                icon="i-lucide-lock-keyhole"
                autocomplete="current-password"
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
          <h3 class="font-semibold text-highlighted">Password requirements</h3>
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
      <div class="space-y-6">
        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">Authentication sessions</h2>
              <p class="mt-1 text-sm text-muted">
                Review browsers that can refresh access to your Student Portal account.
              </p>
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
            title="Individual session management is unavailable"
            description="Individual sign-in session management is not available for this account right now."
          />

          <div v-else-if="center.sessions.value.length" class="mt-5 divide-y divide-default rounded-xl border border-default">
            <div
              v-for="session in center.sessions.value"
              :key="session.id"
              class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
            >
              <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted">
                <UIcon name="i-lucide-monitor" class="size-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-medium text-highlighted">{{ session.deviceName || 'Authenticated browser session' }}</p>
                  <UBadge v-if="session.current" label="Current" color="success" variant="soft" />
                </div>
                <p class="mt-1 text-xs text-muted">
                  Signed in {{ formatDateTime(session.loginAt) }} · Last active {{ formatDateTime(session.lastActiveAt) }}
                </p>
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

          <div v-else class="mt-5 rounded-xl border border-dashed border-default p-8 text-center text-sm text-muted">
            No authentication sessions are available.
          </div>
        </UCard>

        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <div>
            <h2 class="text-lg font-semibold text-highlighted">Known devices</h2>
            <p class="mt-1 text-sm text-muted">
              These privacy-safe records use a random Library System identifier—not hardware serial numbers, MAC addresses, or IMEI values.
            </p>
          </div>

          <div v-if="center.devices.value.length" class="mt-5 grid gap-4 lg:grid-cols-2">
            <div
              v-for="device in center.devices.value"
              :key="device.documentId"
              class="rounded-2xl border border-default bg-muted/30 p-5"
            >
              <div class="flex gap-4">
                <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-muted">
                  <UIcon :name="device.deviceType === 'Mobile Phone' ? 'i-lucide-smartphone' : 'i-lucide-monitor'" class="size-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="font-semibold text-highlighted">{{ device.displayName }}</h3>
                    <UBadge v-if="device.current" label="Current device" color="success" variant="soft" />
                    <UBadge v-if="device.trusted" label="Trusted" color="primary" variant="soft" />
                    <UBadge v-if="device.blocked" label="Blocked" color="error" variant="soft" />
                  </div>
                  <p class="mt-1 text-sm text-muted">
                    {{ device.deviceType }} · {{ device.applicationMode }}
                  </p>
                </div>
              </div>
              <dl class="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt class="text-muted">First seen</dt>
                  <dd class="mt-1 font-medium text-highlighted">{{ formatDateTime(device.firstSeenAt) }}</dd>
                </div>
                <div>
                  <dt class="text-muted">Last seen</dt>
                  <dd class="mt-1 font-medium text-highlighted">{{ formatDateTime(device.lastSeenAt) }}</dd>
                </div>
                <div>
                  <dt class="text-muted">Network</dt>
                  <dd class="mt-1 font-medium text-highlighted">{{ device.lastIpAddress || 'Not available' }}</dd>
                </div>
                <div>
                  <dt class="text-muted">Browser</dt>
                  <dd class="mt-1 font-medium text-highlighted">{{ device.browser }}</dd>
                </div>
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
          <div v-else class="mt-5 rounded-xl border border-dashed border-default p-8 text-center text-sm text-muted">
            No known device records are available.
          </div>
        </UCard>
      </div>
    </template>
  </div>

  <UModal v-model:open="confirmOtherSessions" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <div class="p-6 sm:p-8">
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-error/10 text-error">
          <UIcon name="i-lucide-log-out" class="size-7" />
        </div>
        <div class="mt-5 text-center">
          <h2 class="text-xl font-bold text-highlighted">Sign out all other sessions?</h2>
          <p class="mt-2 text-sm leading-relaxed text-muted">
            Your current browser remains signed in. Every other refresh session for this account will be revoked.
          </p>
        </div>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <UButton label="Cancel" color="neutral" variant="outline" block @click="() => { confirmOtherSessions = false; }" />
          <UButton
            label="Sign Out Others"
            icon="i-lucide-log-out"
            color="error"
            block
            :loading="center.securityAction.value === 'sessions:others'"
            @click="revokeOthers"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
