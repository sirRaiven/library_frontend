<script setup lang="ts">
const route = useRoute();

const parentLabels: Record<string, string> = {
  "/admin/users": "Users",
  "/admin/roles": "Roles",
  "/admin/librarians": "Librarians",
  "/librarian/books": "Library Collection",
  "/librarian/students": "Students",
  "/student/books": "Book Collection",
  "/faculty/books": "Book Collection",
};

const parents = computed(() => {
  const [, portal, section, identifier, detail] = route.path.split("/");
  if (!identifier) return [];

  const sectionPath = `/${portal}/${section}`;
  const label = parentLabels[sectionPath];
  if (!label) return [];

  const items = [{ label, to: sectionPath }];
  if (
    (sectionPath === "/admin/users" && ["activity", "sessions", "devices"].includes(detail ?? "")) ||
    (sectionPath === "/librarian/books" && detail === "edit")
  ) {
    items.push({
      label: sectionPath === "/admin/users" ? "User Details" : "Book Record",
      to: `${sectionPath}/${identifier}`,
    });
  }
  return items;
});

const current = computed(() => route.meta.title);
</script>

<template>
  <nav v-if="parents.length && current" aria-label="Breadcrumb" class="sncbt-portal-breadcrumb">
    <ol class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <li v-for="item in parents" :key="item.to" class="inline-flex items-center gap-2">
        <NuxtLink :to="item.to" class="rounded-sm text-muted underline decoration-transparent underline-offset-4 hover:text-highlighted hover:decoration-current">
          {{ item.label }}
        </NuxtLink>
        <UIcon name="i-lucide-chevron-right" class="size-3.5 shrink-0 text-muted rtl:rotate-180" aria-hidden="true" />
      </li>
      <li aria-current="page" class="font-medium text-highlighted">{{ current }}</li>
    </ol>
  </nav>
</template>

<style scoped>
.sncbt-portal-breadcrumb {
  max-width: var(--sncbt-content-max);
  margin-inline: auto;
  padding: var(--sncbt-space-page);
  padding-bottom: 0;
}
</style>
