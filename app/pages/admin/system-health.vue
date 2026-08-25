<script setup lang="ts">
import SystemMaintenanceBanner from "~/components/shared/SystemMaintenanceBanner.vue";
definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "System Health & Maintenance",
});

const system = useAdminSystem();
const toast = useToast();

const form = reactive({
  enabled: false,
  message: "The system is under maintenance. Only viewing of information is currently available.",
  reason: "",
  expectedEndAt: "",
  settingsVersion: 1,
});

function syncForm() {
  const maintenance = system.health.value?.maintenance;
  if (!maintenance) return;
  form.enabled = maintenance.enabled;
  form.message = maintenance.message;
  form.reason = maintenance.reason || "";
  form.expectedEndAt = maintenance.expectedEndAt
    ? new Date(maintenance.expectedEndAt).toISOString().slice(0, 16)
    : "";
  form.settingsVersion = maintenance.settingsVersion;
}

function statusColor(status: string): "success" | "warning" | "error" | "neutral" {
  if (status === "Healthy" || status === "Verified") return "success";
  if (status === "Unavailable" || status === "Attention Required" || status.includes("Unavailable")) return "error";
  if (status === "Not Configured" || status === "No Backup Found") return "warning";
  return "neutral";
}

function bytes(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Not available";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  return `${amount.toFixed(index >= 2 ? 1 : 0)} ${units[index]}`;
}

function dateTime(value: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(date);
}

async function refresh() {
  try {
    await system.refresh();
    syncForm();
  } catch {
    toast.add({
      title: "Unable to load system health",
      description: system.error.value,
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function saveMaintenance() {
  if (form.enabled && !form.reason.trim()) {
    toast.add({
      title: "Maintenance reason required",
      description: "Enter a short reason before enabling maintenance mode.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }

  try {
    await system.updateMaintenance({
      enabled: form.enabled,
      message: form.message.trim(),
      reason: form.reason.trim(),
      expectedEndAt: form.expectedEndAt ? new Date(form.expectedEndAt).toISOString() : null,
      settingsVersion: form.settingsVersion,
    });
    syncForm();
    toast.add({
      title: form.enabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
      description: form.enabled
        ? "Student, Faculty and Librarian portals are now read-only."
        : "Normal Library operations are available again.",
      color: form.enabled ? "warning" : "success",
      icon: form.enabled ? "i-lucide-construction" : "i-lucide-circle-check",
    });
  } catch (caught) {
    toast.add({
      title: "Unable to update maintenance mode",
      description: useAuth().getErrorMessage(caught),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
    await refresh();
  }
}

onMounted(refresh);
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <AdminPageHeader
      title="System Health & Maintenance"
      description="Review application health, control read-only maintenance mode, and confirm the latest server-side backup verification."
      icon="i-lucide-server-cog"
    >
      <template #actions>
        <UButton
          label="Refresh"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="system.loading.value"
          @click="refresh"
        />
      </template>
    </AdminPageHeader>

    <SystemMaintenanceBanner admin />

    <UAlert
      v-if="system.error.value"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
      title="System health could not be loaded"
      :description="system.error.value"
    />

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">Frontend</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">Online</p>
            <p class="mt-1 text-xs text-muted">This Admin interface is responding.</p>
          </div>
          <UBadge color="success" variant="soft">Healthy</UBadge>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">Backend API</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ system.health.value?.backend.status || "Checking…" }}</p>
            <p class="mt-1 text-xs text-muted">Uptime {{ Math.floor((system.health.value?.backend.uptimeSeconds || 0) / 60) }} min</p>
          </div>
          <UBadge :color="statusColor(system.health.value?.backend.status || '')" variant="soft">
            {{ system.health.value?.backend.status || "Checking" }}
          </UBadge>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">PostgreSQL</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ system.health.value?.database.latencyMs ?? "—" }} ms</p>
            <p class="mt-1 text-xs text-muted">Database connectivity probe</p>
          </div>
          <UBadge :color="statusColor(system.health.value?.database.status || '')" variant="soft">
            {{ system.health.value?.database.status || "Checking" }}
          </UBadge>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-muted">Upload Storage</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ bytes(system.health.value?.storage.freeBytes ?? null) }}</p>
            <p class="mt-1 text-xs text-muted">Free space available to Library media</p>
          </div>
          <UBadge :color="statusColor(system.health.value?.storage.status || '')" variant="soft">
            {{ system.health.value?.storage.status || "Checking" }}
          </UBadge>
        </div>
      </UCard>
    </section>

    <div class="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="font-semibold text-highlighted">Maintenance Mode</h2>
              <p class="mt-1 text-xs text-muted">Keep Admin controls available while Student, Faculty and Librarian business mutations are blocked.</p>
            </div>
            <UBadge :color="form.enabled ? 'warning' : 'success'" variant="soft">
              {{ form.enabled ? "Read-only active" : "Normal operations" }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-5">
          <div class="flex items-start justify-between gap-5 rounded-xl border border-default bg-elevated/30 p-4">
            <div>
              <p class="text-sm font-medium text-highlighted">Enable maintenance read-only mode</p>
              <p class="mt-1 text-xs leading-5 text-muted">GET/read requests remain available. Create, update and delete operations are rejected outside the Admin APIs.</p>
            </div>
            <USwitch v-model="form.enabled" />
          </div>

          <UFormField label="Portal message" required>
            <UInput v-model="form.message" class="w-full" maxlength="500" />
          </UFormField>

          <UFormField label="Reason" :required="form.enabled" help="Recorded in the protected Audit Trail when the setting changes.">
            <UTextarea v-model="form.reason" class="w-full" :rows="3" maxlength="4000" />
          </UFormField>

          <UFormField label="Expected completion" help="Optional. Shown to portal users when provided.">
            <UInput v-model="form.expectedEndAt" type="datetime-local" class="w-full sm:max-w-sm" />
          </UFormField>

          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
            <p class="text-xs text-muted">
              <span v-if="system.health.value?.maintenance.startedAt">
                Started {{ dateTime(system.health.value.maintenance.startedAt) }} by {{ system.health.value.maintenance.startedBy || "Administrator" }}.
              </span>
              <span v-else>Maintenance mode is currently inactive.</span>
            </p>
            <UButton
              :label="form.enabled ? 'Save & Enable' : 'Save & Disable'"
              :icon="form.enabled ? 'i-lucide-construction' : 'i-lucide-circle-check'"
              :color="form.enabled ? 'warning' : 'primary'"
              :loading="system.saving.value"
              @click="saveMaintenance"
            />
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Backup Verification</h2>
            <p class="mt-1 text-xs text-muted">Backups are created on the server, outside the browser, to avoid exposing database files through the Admin UI.</p>
          </div>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">Status</span>
            <UBadge :color="statusColor(system.health.value?.backup.status || '')" variant="soft">
              {{ system.health.value?.backup.status || "Checking" }}
            </UBadge>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">Latest backup</span>
            <span class="text-right text-sm font-medium text-highlighted">{{ dateTime(system.health.value?.backup.createdAt ?? null) }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">Last verification</span>
            <span class="text-right text-sm font-medium text-highlighted">{{ dateTime(system.health.value?.backup.verifiedAt ?? null) }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">Database dump</span>
            <span class="text-sm font-medium text-highlighted">{{ bytes(system.health.value?.backup.databaseBytes ?? null) }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">Media files</span>
            <span class="text-sm font-medium text-highlighted">{{ system.health.value?.backup.mediaFileCount ?? 0 }}</span>
          </div>

          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-hard-drive-download"
            title="Server-side backup workflow"
            description="Run npm run backup:library on the backend host, then npm run backup:verify -- <backup-reference>. Copy verified backups to protected off-host storage."
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
