<script setup lang="ts">
import type { AdminRoleDetail } from "~/composables/useAdminRoles";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Role Details",
});

const route = useRoute();
const api = useAdminRoles();
const auth = useAuth();
const toast = useToast();
const loading = ref(false);
const role = ref<AdminRoleDetail | null>(null);
const permissionSearch = ref("");

const roleId = computed(() => Number(route.params.id));

const groupedPermissions = computed(() => {
  const groups = new Map<string, Array<{ id: number; action: string; label: string }>>();
  const search = permissionSearch.value.trim().toLowerCase();

  for (const permission of role.value?.permissions ?? []) {
    if (
      search &&
      !permission.action.toLowerCase().includes(search) &&
      !permission.label.toLowerCase().includes(search)
    ) {
      continue;
    }

    const firstPart = permission.action.split(".")[0] || "Other";
    const group = firstPart
      .replace(/^api::/, "Library API: ")
      .replace(/^plugin::/, "Plugin: ");

    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(permission);
  }

  return [...groups.entries()].map(([name, permissions]) => ({ name, permissions }));
});

async function load() {
  if (!Number.isInteger(roleId.value) || roleId.value <= 0) {
    throw createError({ statusCode: 404, statusMessage: "Role not found" });
  }

  loading.value = true;
  try {
    role.value = await api.get(roleId.value);
  } catch (error) {
    toast.add({
      title: "Unable to load role",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6 lg:p-8">
    <AdminPageHeader
      eyebrow="Role Permission Review"
      :title="role?.name || 'Role Details'"
      :description="role?.description || 'Review the users and protected API actions assigned to this role.'"
      icon="i-lucide-shield-check"
    >
      <template #actions>
        <UButton label="Back to Roles" icon="i-lucide-arrow-left" color="neutral" variant="outline" to="/admin/roles" />
      </template>
    </AdminPageHeader>

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-32 w-full rounded-2xl" />
      <USkeleton class="h-80 w-full rounded-2xl" />
    </div>

    <template v-else-if="role">
      <div class="grid gap-4 sm:grid-cols-3">
        <AdminMetricCard label="Assigned Users" :value="role.userCount" description="Accounts currently using this role" icon="i-lucide-users" tone="primary" />
        <AdminMetricCard label="Granted Actions" :value="role.permissions.length" description="Strapi API actions enabled for this role" icon="i-lucide-key-round" tone="success" />
        <AdminMetricCard label="Role Type" :value="role.type" description="Internal role identifier used during authorization" icon="i-lucide-fingerprint" :tone="role.protected ? 'warning' : 'neutral'" />
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="font-semibold text-highlighted">Granted Permission Actions</h2>
              <p class="mt-1 text-xs text-muted">Read-only technical review of actions currently stored in Strapi Users & Permissions.</p>
            </div>
            <UInput v-model="permissionSearch" icon="i-lucide-search" placeholder="Search permission action" class="sm:w-80" />
          </div>
        </template>

        <div v-if="groupedPermissions.length" class="divide-y divide-default">
          <section v-for="group in groupedPermissions" :key="group.name" class="p-5 sm:p-6">
            <h3 class="text-sm font-bold text-highlighted">{{ group.name }}</h3>
            <div class="mt-3 grid gap-2 lg:grid-cols-2">
              <div v-for="permission in group.permissions" :key="permission.id" class="flex items-start gap-3 rounded-xl border border-default bg-elevated/40 p-3">
                <div class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <UIcon name="i-lucide-check" class="size-4" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-highlighted">{{ permission.label }}</p>
                  <p class="mt-1 break-all font-mono text-[11px] text-muted">{{ permission.action }}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="px-6 py-16 text-center">
          <UIcon name="i-lucide-key-round" class="mx-auto size-11 text-dimmed" />
          <h3 class="mt-3 font-semibold text-highlighted">No matching permissions</h3>
          <p class="mt-1 text-sm text-muted">Clear the search field to show all granted actions.</p>
        </div>
      </UCard>
    </template>
  </div>
</template>
