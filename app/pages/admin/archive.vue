<script setup lang="ts">
import AppDialogFrame from "~/components/shared/AppDialogFrame.vue";
import AdminPageHeader from "~/components/admin/AdminPageHeader.vue";
import type { AdminDataCatalog, AdminDeletionImpact, AdminManagedRecord } from "~/composables/useAdminDataManagement";

definePageMeta({ layout: "admin", middleware: ["admin"], title: "Archive" });

const auth = useAuth();
const api = useAdminDataManagement();
const toast = useToast();
const catalog = ref<AdminDataCatalog | null>(null);
const domainKey = ref("");
const search = ref("");
const records = ref<AdminManagedRecord[]>([]);
const loading = ref(true);
const actionLoading = ref(false);
const page = ref(1);
const meta = reactive({ page: 1, pageSize: 25, pageCount: 1, total: 0 });
const selected = ref<AdminManagedRecord | null>(null);
const restoreOpen = ref(false);
const deleteOpen = ref(false);
const restoreReason = ref("");
const deleteReason = ref("");
const confirmation = ref("");
const impact = ref<AdminDeletionImpact | null>(null);
const impactLoading = ref(false);

const domains = computed(() => catalog.value?.managed ?? []);
const selectedDomain = computed(() => domains.value.find(item => item.key === domainKey.value));
const deleteReasonValid = computed(() => deleteReason.value.trim().length >= 8);
const confirmationMatches = computed(() => Boolean(
  impact.value?.confirmationPhrase && confirmation.value.trim() === impact.value.confirmationPhrase,
));
const deleteReady = computed(() => Boolean(
  impact.value?.allowed && deleteReasonValid.value && confirmationMatches.value,
));

async function loadCatalog() {
  catalog.value = await api.catalog();
  if (!domainKey.value) domainKey.value = domains.value.find(item => item.counts.archived > 0)?.key ?? domains.value[0]?.key ?? "";
}
async function loadRecords() {
  if (!domainKey.value) return;
  loading.value = true;
  try {
    const response = await api.list(domainKey.value, { scope: "archived", search: search.value, page: page.value, pageSize: 25 });
    records.value = response.data;
    Object.assign(meta, response.meta);
  } catch (error) {
    toast.add({ title: "Unable to load archive", description: auth.getErrorMessage(error), color: "error" });
  } finally { loading.value = false; }
}
async function refresh() { await loadCatalog(); await loadRecords(); }
function openRestore(record: AdminManagedRecord) {
  selected.value = record;
  restoreReason.value = "";
  restoreOpen.value = true;
}
async function openDelete(record: AdminManagedRecord) {
  selected.value = record;
  deleteReason.value = "";
  confirmation.value = "";
  impact.value = null;
  deleteOpen.value = true;
  impactLoading.value = true;
  try {
    impact.value = await api.deletionImpact(domainKey.value, record.documentId);
  } catch (error) {
    toast.add({ title: "Unable to calculate deletion impact", description: auth.getErrorMessage(error), color: "error" });
  } finally { impactLoading.value = false; }
}
async function restoreRecord() {
  if (!selected.value || restoreReason.value.trim().length < 8) return;
  actionLoading.value = true;
  try {
    const title = selected.value.title;
    await api.restore(domainKey.value, selected.value.documentId, restoreReason.value.trim());
    restoreOpen.value = false;
    await refresh();
    toast.add({ title: "Record restored", description: `${title} is active again.`, color: "success" });
  } catch (error) {
    toast.add({ title: "Unable to restore record", description: auth.getErrorMessage(error), color: "error" });
  } finally { actionLoading.value = false; }
}
async function permanentlyDelete() {
  if (!selected.value || !impact.value || !deleteReady.value) return;
  actionLoading.value = true;
  try {
    const title = selected.value.title;
    await api.deletePermanently(domainKey.value, selected.value.documentId, {
      reason: deleteReason.value.trim(),
      confirmation: confirmation.value.trim(),
    });
    deleteOpen.value = false;
    await refresh();
    toast.add({ title: "Record permanently deleted", description: `${title} and its listed dependent records were removed.`, color: "success" });
  } catch (error) {
    toast.add({ title: "Permanent deletion failed", description: auth.getErrorMessage(error), color: "error" });
  } finally { actionLoading.value = false; }
}
let timer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; void loadRecords(); }, 300); });
watch(domainKey, () => { page.value = 1; search.value = ""; void loadRecords(); });
watch(page, () => void loadRecords());
onMounted(refresh);
</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page space-y-6">
    <AdminPageHeader title="Archive" description="Restore archived records or permanently remove them after reviewing every affected dependency." icon="i-lucide-archive">
      <template #actions>
        <UButton to="/admin/data-management" icon="i-lucide-database-zap" color="neutral" variant="outline" label="Manage Active Data" />
      </template>
    </AdminPageHeader>

    <UAlert color="warning" variant="soft" icon="i-lucide-triangle-alert" title="Permanent deletion is destructive" description="Administrators can permanently delete archived records. Related records are resolved automatically in dependency-safe order. Audit Trail entries are retained." />

    <UCard>
      <div class="grid gap-4 md:grid-cols-[minmax(220px,320px)_1fr]">
        <UFormField label="Data category">
          <USelect v-model="domainKey" :items="domains.map(d => ({ label: `${d.label} (${d.counts.archived})`, value: d.key }))" value-key="value" label-key="label" class="w-full" />
        </UFormField>
        <UFormField label="Search archived records">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Search this archive…" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <div v-if="loading" class="grid gap-3">
      <USkeleton v-for="n in 4" :key="n" class="h-28 rounded-xl" />
    </div>
    <UCard v-else-if="!records.length">
      <div class="py-10 text-center">
        <UIcon name="i-lucide-archive-restore" class="mx-auto size-10 text-muted" />
        <h2 class="mt-3 font-semibold">No archived records</h2>
        <p class="mt-1 text-sm text-muted">{{ selectedDomain?.label || 'This category' }} has nothing waiting in the archive.</p>
      </div>
    </UCard>
    <div v-else class="grid gap-3">
      <UCard v-for="record in records" :key="record.documentId">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-semibold">{{ record.title }}</h2>
              <UBadge color="neutral" variant="soft">Archived</UBadge>
            </div>
            <p class="mt-1 text-sm text-muted">{{ record.subtitle }}</p>
            <p v-if="record.meta.length" class="mt-2 text-xs text-muted">{{ record.meta.join(' · ') }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton label="Restore" icon="i-lucide-archive-restore" color="neutral" variant="outline" @click="openRestore(record)" />
            <UButton label="Delete Permanently" icon="i-lucide-trash-2" color="error" variant="soft" @click="openDelete(record)" />
          </div>
        </div>
      </UCard>
    </div>

    <div v-if="meta.pageCount > 1" class="flex justify-center">
      <UPagination v-model:page="page" :total="meta.total" :items-per-page="meta.pageSize" />
    </div>

    <UModal v-model:open="restoreOpen" :dismissible="!actionLoading" :ui="{ content: 'sm:max-w-lg max-h-[90vh] overflow-y-auto' }">
      <template #content>
        <AppDialogFrame
          v-if="selected"
          title="Restore archived record?"
          description="The record will return to its previous active state when possible."
          icon="i-lucide-archive-restore"
          tone="success"
        >
          <UFormField label="Reason" required description="At least 8 characters. This is recorded in the Audit Trail.">
            <UTextarea v-model="restoreReason" :rows="3" placeholder="Explain why this record should be restored" class="w-full" />
          </UFormField>
          <template #actions>
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="actionLoading" @click="() => { restoreOpen = false; }" />
            <UButton label="Restore Record" icon="i-lucide-archive-restore" color="success" :loading="actionLoading" :disabled="restoreReason.trim().length < 8" @click="restoreRecord" />
          </template>
        </AppDialogFrame>
      </template>
    </UModal>

    <UModal v-model:open="deleteOpen" :dismissible="!actionLoading" :ui="{ content: 'sm:max-w-2xl max-h-[90vh] overflow-y-auto' }">
      <template #content>
        <AppDialogFrame
          v-if="selected"
          title="Permanently delete archived record?"
          :description="`Review the impact carefully before permanently removing ${selected.title}. This action cannot be undone.`"
          icon="i-lucide-trash-2"
          tone="error"
        >
          <div v-if="impactLoading" class="space-y-3">
            <USkeleton class="h-20 rounded-lg" />
            <USkeleton class="h-20 rounded-lg" />
          </div>

          <div v-else-if="impact" class="space-y-4">
            <UAlert
              color="error"
              variant="soft"
              icon="i-lucide-triangle-alert"
              title="Permanent deletion"
              :description="`${impact.affectedRecords || 0} related record(s) will also be removed or safely detached.`"
            />

            <div v-if="impact.blockers?.length" class="space-y-2">
              <UAlert
                v-for="blocker in impact.blockers"
                :key="blocker.key"
                color="warning"
                variant="soft"
                icon="i-lucide-shield-alert"
                :title="blocker.label"
                :description="blocker.message"
              />
            </div>

            <div v-if="impact.dependencies?.length" class="space-y-2">
              <div v-for="item in impact.dependencies" :key="item.key" class="flex items-center justify-between rounded-lg border border-default p-3">
                <span class="text-sm">{{ item.label }}</span>
                <UBadge color="warning" variant="soft">{{ item.count }}</UBadge>
              </div>
            </div>

            <ul class="list-disc space-y-1 pl-5 text-sm text-muted">
              <li v-for="note in impact.notes" :key="note">{{ note }}</li>
            </ul>

            <UFormField label="Deletion reason" required description="At least 8 characters. This is recorded in the Audit Trail.">
              <UTextarea v-model="deleteReason" :rows="3" placeholder="Explain why permanent removal is necessary" class="w-full" />
              <template #help>
                <span v-if="deleteReason && !deleteReasonValid" class="text-error">Enter at least 8 characters.</span>
              </template>
            </UFormField>

            <UFormField label="Type the confirmation phrase" required>
              <div class="space-y-2">
                <div class="rounded-lg border border-default bg-elevated px-3 py-2 font-mono text-xs text-highlighted">
                  {{ impact.confirmationPhrase }}
                </div>
                <UInput v-model="confirmation" autocomplete="off" class="w-full font-mono" placeholder="Type the phrase exactly" />
                <p v-if="confirmation && !confirmationMatches" class="text-xs text-error">The confirmation phrase must match exactly.</p>
              </div>
            </UFormField>
          </div>

          <UAlert
            v-else
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="Deletion impact unavailable"
            description="Close this dialog and try again. Permanent deletion cannot continue until the impact check succeeds."
          />

          <template #actions>
            <UButton label="Keep Archived" color="neutral" variant="outline" :disabled="actionLoading" @click="() => { deleteOpen = false; }" />
            <UButton
              label="Delete Permanently"
              icon="i-lucide-trash-2"
              color="error"
              :loading="actionLoading"
              :disabled="!deleteReady"
              @click="permanentlyDelete"
            />
          </template>
        </AppDialogFrame>
      </template>
    </UModal>
  </div>
</template>
