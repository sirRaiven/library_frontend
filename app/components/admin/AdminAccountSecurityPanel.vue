<script setup lang="ts">
import type {
  AdminAccountSecurityData,
  AdminAuthenticationSession,
} from "~/composables/useAdminAccountSecurity";

const props = defineProps<{
  userId: number;
  username: string;
}>();

const securityApi = useAdminAccountSecurity();
const auth = useAuth();
const toast = useToast();

const security = ref<AdminAccountSecurityData | null>(null);
const loading = ref(true);
const action = ref("");
const selectedSession = ref<AdminAuthenticationSession | null>(null);
const revokeSessionOpen = ref(false);
const revokeAllOpen = ref(false);
const resetPasswordOpen = ref(false);
const reason = ref("");
const temporaryPassword = ref("");
const passwordConfirmation = ref("");
const revealPassword = ref(false);

function formatDate(value?: string | null) {
  if (!value) return "No activity recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity recorded";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

function sessionLabel(session: AdminAuthenticationSession) {
  return session.deviceName || session.deviceId || "Unknown device session";
}

function openSessionRevoke(session: AdminAuthenticationSession) {
  selectedSession.value = session;
  reason.value = "";
  revokeSessionOpen.value = true;
}

function openRevokeAll() {
  reason.value = "";
  revokeAllOpen.value = true;
}

function openPasswordReset() {
  reason.value = "";
  temporaryPassword.value = "";
  passwordConfirmation.value = "";
  revealPassword.value = false;
  resetPasswordOpen.value = true;
}

async function loadSecurity() {
  if (!props.userId) return;
  loading.value = true;
  try {
    security.value = await securityApi.get(props.userId);
  } catch (error) {
    toast.add({
      title: "Unable to load account security",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

async function confirmSessionRevoke() {
  if (!selectedSession.value || action.value) return;
  if (reason.value.trim().length < 5) {
    toast.add({
      title: "Reason required",
      description: "Provide a clear reason containing at least 5 characters.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  action.value = `session:${selectedSession.value.id}`;
  try {
    security.value = await securityApi.revokeSession(
      props.userId,
      selectedSession.value.id,
      reason.value.trim(),
    );
    revokeSessionOpen.value = false;
    toast.add({
      title: "Session revoked",
      description: "The selected sign-in session can no longer refresh its access.",
      color: "success",
      icon: "i-lucide-shield-check",
    });
  } catch (error) {
    toast.add({
      title: "Unable to revoke session",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    action.value = "";
  }
}

async function confirmRevokeAll() {
  if (action.value) return;
  if (reason.value.trim().length < 5) {
    toast.add({
      title: "Reason required",
      description: "Provide a clear reason containing at least 5 characters.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  action.value = "sessions:all";
  try {
    const result = await securityApi.revokeAllSessions(
      props.userId,
      reason.value.trim(),
    );
    security.value = result.security;
    revokeAllOpen.value = false;
    toast.add({
      title: "Active sessions revoked",
      description: `${result.revokedAuthenticationSessions} authentication session(s) and ${result.invalidatedTrackedSessions} monitoring session(s) were closed.`,
      color: "success",
      icon: "i-lucide-log-out",
    });
  } catch (error) {
    toast.add({
      title: "Unable to revoke all sessions",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    action.value = "";
  }
}

async function confirmPasswordReset() {
  if (action.value) return;
  if (temporaryPassword.value.length < 12) {
    toast.add({
      title: "Temporary password is too short",
      description: "Use at least 12 characters.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }
  if (temporaryPassword.value !== passwordConfirmation.value) {
    toast.add({
      title: "Passwords do not match",
      description: "Re-enter the same temporary password in both fields.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }
  if (reason.value.trim().length < 5) {
    toast.add({
      title: "Reason required",
      description: "Provide a clear reason containing at least 5 characters.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  action.value = "password";
  try {
    const result = await securityApi.resetPassword(props.userId, {
      temporaryPassword: temporaryPassword.value,
      reason: reason.value.trim(),
    });
    resetPasswordOpen.value = false;
    await loadSecurity();
    toast.add({
      title: "Temporary password applied",
      description: `${result.revokedAuthenticationSessions} authentication session(s) were revoked. Share the temporary password through an approved secure channel.`,
      color: "success",
      icon: "i-lucide-key-round",
    });
  } catch (error) {
    toast.add({
      title: "Unable to reset password",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    action.value = "";
    temporaryPassword.value = "";
    passwordConfirmation.value = "";
  }
}

watch(() => props.userId, loadSecurity);
onMounted(loadSecurity);
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-lg font-bold text-highlighted">Account Security and Sessions</h2>
          <p class="mt-1 text-sm text-muted">
            Review sign-in sessions, recognized devices, and recent authentication activity.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UButton
            label="Refresh"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :loading="loading"
            @click="loadSecurity"
          />
          <UButton
            label="Reset Password"
            icon="i-lucide-key-round"
            color="warning"
            variant="soft"
            @click="openPasswordReset"
          />
          <UButton
            label="Revoke All Sessions"
            icon="i-lucide-log-out"
            color="error"
            variant="soft"
            :disabled="!security?.sessionManagementAvailable && !security?.summary.activeTrackedSessions"
            @click="openRevokeAll"
          />
        </div>
      </div>
    </template>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <USkeleton v-for="index in 4" :key="index" class="h-28 w-full" />
    </div>

    <template v-else-if="security">
      <UAlert
        v-if="!security.sessionManagementAvailable"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Authentication-session management is unavailable"
        description="Strapi must use refresh-token session management before individual authentication sessions can be revoked."
        class="mb-5"
      />

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Active Sign-ins"
          :value="security.summary.activeAuthenticationSessions"
          :description="`${security.summary.activeTrackedSessions} active portal-monitoring session(s)`"
          icon="i-lucide-monitor-dot"
          :tone="security.summary.activeAuthenticationSessions > 1 ? 'warning' : 'primary'"
        />
        <AdminMetricCard
          label="Known Devices"
          :value="security.summary.knownDevices"
          :description="`${security.summary.registeredDevices} portal · ${security.summary.sessionDerivedDevices} from sign-ins`"
          icon="i-lucide-devices"
          :tone="security.summary.blockedDevices ? 'error' : 'neutral'"
        />
        <AdminMetricCard
          label="Last Successful Login" 
          :value="security.summary.lastSuccessfulLoginAt ? formatDate(security.summary.lastSuccessfulLoginAt).split(',')[0] : 'No record'"
          :description="formatDate(security.summary.lastSuccessfulLoginAt)"
          icon="i-lucide-log-in"
          tone="success"
        />
        <AdminMetricCard
          label="Failed Sign-ins"
          :value="security.summary.failedLoginCount30Days"
          :description="security.summary.lastFailedLoginAt ? `Last: ${formatDate(security.summary.lastFailedLoginAt)}` : 'No failed sign-in recorded in the available activity history.'"
          icon="i-lucide-shield-alert"
          :tone="security.summary.failedLoginCount30Days ? 'warning' : 'neutral'"
        />
      </div>

      <div class="mt-6 grid gap-6 xl:grid-cols-2">
        <section class="rounded-2xl border border-default p-4 sm:p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="font-bold text-highlighted">Authentication Sessions</h3>
              <p class="mt-1 text-xs text-muted">Refresh-token sessions currently recognized by Strapi.</p>
            </div>
            <UBadge
              :label="`${security.authenticationSessions.length} active`"
              :color="security.authenticationSessions.length ? 'primary' : 'neutral'"
              variant="soft"
            />
          </div>

          <div v-if="security.authenticationSessions.length" class="mt-4 space-y-3">
            <div
              v-for="session in security.authenticationSessions"
              :key="session.id"
              class="flex flex-col gap-3 rounded-xl border border-default bg-elevated/30 p-4 sm:flex-row sm:items-center"
            >
              <div class="flex min-w-0 flex-1 items-start gap-3">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UIcon name="i-lucide-monitor-smartphone" class="size-5" />
                </div>
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="truncate font-semibold text-highlighted">{{ sessionLabel(session) }}</p>
                    <UBadge v-if="session.current" label="Current admin session" color="success" variant="soft" size="sm" />
                  </div>
                  <p class="mt-1 text-xs text-muted">Started: {{ formatDate(session.loginAt) }}</p>
                  <p class="text-xs text-muted">Last active: {{ formatDate(session.lastActiveAt) }}</p>
                </div>
              </div>
              <UButton
                label="Revoke"
                icon="i-lucide-log-out"
                color="error"
                variant="ghost"
                size="sm"
                :disabled="session.current"
                :loading="action === `session:${session.id}`"
                @click="openSessionRevoke(session)"
              />
            </div>
          </div>
          <div v-else class="mt-4 rounded-xl border border-dashed border-default px-5 py-8 text-center">
            <UIcon name="i-lucide-monitor-off" class="mx-auto size-8 text-dimmed" />
            <p class="mt-2 font-semibold text-highlighted">No active authentication sessions</p>
          </div>
        </section>

        <section class="rounded-2xl border border-default p-4 sm:p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="font-bold text-highlighted">Known Devices</h3>
              <p class="mt-1 text-xs text-muted">Recognized from active Strapi sign-ins and privacy-safe portal device records.</p>
            </div>
            <UBadge :label="`${security.devices.length} device(s)`" color="neutral" variant="soft" />
          </div>

          <div v-if="security.devices.length" class="mt-4 space-y-3">
            <div
              v-for="device in security.devices.slice(0, 6)"
              :key="device.documentId || device.id"
              class="rounded-xl border border-default bg-elevated/30 p-4"
            >
              <div class="flex items-start gap-3">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-neutral/10 text-muted">
                  <UIcon name="i-lucide-laptop" class="size-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-semibold text-highlighted">{{ device.displayName }}</p>
                    <UBadge v-if="device.trusted" label="Trusted" color="success" variant="soft" size="sm" />
                    <UBadge v-if="device.blocked" label="Blocked" color="error" variant="soft" size="sm" />
                    <UBadge
                      v-if="device.source === 'Authentication Session'"
                      label="Active sign-in"
                      color="primary"
                      variant="soft"
                      size="sm"
                    />
                    <UBadge
                      v-else-if="device.activeSessionCount"
                      :label="`${device.activeSessionCount} active sign-in${device.activeSessionCount === 1 ? '' : 's'}`"
                      color="primary"
                      variant="soft"
                      size="sm"
                    />
                  </div>
                  <p class="mt-1 text-xs text-muted">{{ device.browser }} · {{ device.operatingSystem }} · {{ device.applicationMode }}</p>
                  <p class="text-xs text-muted">Last seen: {{ formatDate(device.lastSeenAt) }}</p>
                  <p v-if="device.maskedIpAddress" class="text-xs text-muted">Network: {{ device.maskedIpAddress }}</p>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="mt-4 rounded-xl border border-dashed border-default px-5 py-8 text-center">
            <UIcon name="i-lucide-devices" class="mx-auto size-8 text-dimmed" />
            <p class="mt-2 font-semibold text-highlighted">No recognized devices available</p>
            <p class="mt-1 text-xs text-muted">A device appears after the account has an active sign-in or a portal monitoring record.</p>
          </div>
        </section>
      </div>

      <section class="mt-6 rounded-2xl border border-default p-4 sm:p-5">
        <div>
          <h3 class="font-bold text-highlighted">Recent Security Activity</h3>
          <p class="mt-1 text-xs text-muted">Authentication, account, and security events recorded for this account.</p>
        </div>
        <div v-if="security.recentSecurityActivity.length" class="mt-4 divide-y divide-default">
          <div
            v-for="activity in security.recentSecurityActivity.slice(0, 8)"
            :key="activity.id"
            class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-highlighted">{{ activity.description }}</p>
                <AdminStatusBadge :label="activity.outcome" />
              </div>
              <p class="mt-1 text-xs text-muted">{{ activity.eventCode }} · {{ activity.category }}</p>
            </div>
            <p class="shrink-0 text-xs text-muted">{{ formatDate(activity.occurredAt) }}</p>
          </div>
        </div>
        <p v-else class="mt-4 rounded-xl border border-dashed border-default px-5 py-8 text-center text-sm text-muted">
          No recent authentication or security activity is available for this account.
        </p>
      </section>
    </template>
  </UCard>

  <UModal v-model:open="revokeSessionOpen" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <div class="space-y-5 bg-default p-6">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Revoke This Session?</h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ selectedSession ? sessionLabel(selectedSession) : 'The selected session' }} will be unable to refresh access and must sign in again.
          </p>
        </div>
        <UFormField label="Reason for revoking the session" required>
          <UTextarea v-model="reason" :rows="3" class="w-full" placeholder="Example: Unrecognized sign-in reported by the account owner" />
        </UFormField>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" :disabled="Boolean(action)" @click="revokeSessionOpen = false" />
          <UButton label="Revoke Session" icon="i-lucide-log-out" color="error" :loading="Boolean(action)" @click="confirmSessionRevoke" />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="revokeAllOpen" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <div class="space-y-5 bg-default p-6">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Revoke All Active Sessions?</h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            {{ username }} will be signed out from all other recognized sessions. When reviewing your own account, the current Administrator session is preserved.
          </p>
        </div>
        <UFormField label="Reason for revoking all sessions" required>
          <UTextarea v-model="reason" :rows="3" class="w-full" placeholder="Example: Account recovery after a suspected compromise" />
        </UFormField>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" :disabled="Boolean(action)" @click="revokeAllOpen = false" />
          <UButton label="Revoke All Sessions" icon="i-lucide-log-out" color="error" :loading="action === 'sessions:all'" @click="confirmRevokeAll" />
        </div>
      </div>
    </template>
  </UModal>

  <UModal v-model:open="resetPasswordOpen" :ui="{ content: 'sm:max-w-lg' }">
    <template #content>
      <form class="space-y-5 bg-default p-6" @submit.prevent="confirmPasswordReset">
        <div>
          <h2 class="text-xl font-bold text-highlighted">Set a Temporary Password</h2>
          <p class="mt-2 text-sm leading-6 text-muted">
            The password is never returned by the API or written to audit records. All active sessions will be invalidated.
          </p>
        </div>
        <UFormField label="Temporary Password" required help="Use 12–128 characters and avoid the username or email address.">
          <UInput
            v-model="temporaryPassword"
            :type="revealPassword ? 'text' : 'password'"
            autocomplete="new-password"
            class="w-full"
          >
            <template #trailing>
              <UButton
                :icon="revealPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="xs"
                square
                type="button"
                @click="revealPassword = !revealPassword"
              />
            </template>
          </UInput>
        </UFormField>
        <UFormField label="Confirm Temporary Password" required>
          <UInput
            v-model="passwordConfirmation"
            :type="revealPassword ? 'text' : 'password'"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Reason for the password reset" required>
          <UTextarea v-model="reason" :rows="3" class="w-full" placeholder="Example: Identity verified after the user forgot the password" />
        </UFormField>
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton label="Cancel" color="neutral" variant="outline" :disabled="Boolean(action)" @click="resetPasswordOpen = false" />
          <UButton type="submit" label="Apply Temporary Password" icon="i-lucide-key-round" color="warning" :loading="action === 'password'" />
        </div>
      </form>
    </template>
  </UModal>
</template>
