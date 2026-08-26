<script setup lang="ts">
import type { AdminRoleSummary } from "~/composables/useAdminUsers";

definePageMeta({
  layout: "admin",
  middleware: ["admin"],
  title: "Roles & Permissions",
});

const api = useAdminRoles();
const auth = useAuth();
const toast = useToast();
const roles = ref<AdminRoleSummary[]>([]);
const loading = ref(false);

const roleIcons: Record<string, string> = {
  "super-administrator": "i-lucide-shield-crown",
  administrator: "i-lucide-shield-check",
  "system-administrator": "i-lucide-shield-check",
  admin: "i-lucide-shield-check",
  librarian: "i-lucide-library",
  student: "i-lucide-graduation-cap",
  faculty: "i-lucide-briefcase-business",
  authenticated: "i-lucide-user-check",
  public: "i-lucide-globe-2",
};

function iconFor(type: string) {
  return roleIcons[type] || "i-lucide-user-cog";
}

async function load() {
  loading.value = true;
  try {
    roles.value = await api.list();
  } catch (error) {
    toast.add({
      title: "Unable to load roles",
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
  <div class="sncbt-page-shell space-y-6">
    <AdminPageHeader
      eyebrow="Accounts and Access"
      title="Roles & Permissions"
      description="Review application roles, their permissions, and the users assigned to each role. Role assignment is performed from Users."
      icon="i-lucide-shield-check"
    />

    <UAlert
      color="warning"
      variant="soft"
      icon="i-lucide-shield-alert"
      title="Permission changes require controlled review"
      description="Permissions are shown for review only. Role assignments are managed from Users to reduce accidental access changes."
    />

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <USkeleton v-for="index in 6" :key="index" class="h-44 w-full rounded-2xl" />
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <NuxtLink
        v-for="role in roles"
        :key="role.id"
        :to="`/admin/roles/${role.id}`"
        class="group rounded-2xl border border-default bg-default p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <UIcon :name="iconFor(role.type)" class="size-5" />
          </div>
          <UBadge
            v-if="role.protected"
            label="Protected"
            color="warning"
            variant="soft"
            icon="i-lucide-lock-keyhole"
          />
        </div>
        <h2 class="mt-4 text-lg font-bold text-highlighted">{{ role.name }}</h2>
        <p class="mt-1 text-xs font-mono text-muted">{{ role.type }}</p>
        <p class="mt-3 min-h-10 text-sm leading-5 text-muted">{{ role.description || 'Application access role.' }}</p>
        <div class="mt-4 flex items-center justify-between border-t border-default pt-4">
          <span class="text-sm font-medium text-default">{{ role.userCount || 0 }} assigned user{{ role.userCount === 1 ? '' : 's' }}</span>
          <UIcon name="i-lucide-arrow-right" class="size-4 text-muted transition group-hover:translate-x-1 group-hover:text-primary" />
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
