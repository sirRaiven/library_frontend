<script setup lang="ts">
import AppPageHeader from "~/components/shared/AppPageHeader.vue";
import LibrarianReportExport from "~/components/librarian/LibrarianReportExport.vue";
import type { LibrarianExportChoice, ReportPeriod } from "~/utils/librarian-export-choices";

defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: string;
  reportChoices?: LibrarianExportChoice[];
  reportPeriod?: Partial<ReportPeriod>;
  reportDisabled?: boolean;
}>();
</script>

<template>
  <AppPageHeader
    :eyebrow="eyebrow"
    :title="title"
    :description="description"
    :icon="icon || 'i-lucide-library-big'"
  >
    <template #actions>
      <LibrarianReportExport :choices="reportChoices" :period="reportPeriod" :disabled="reportDisabled" />
      <slot name="actions" />
    </template>
  </AppPageHeader>
</template>
