<script setup lang="ts">
import PortalBookCard from "~/components/shared/PortalBookCard.vue";
import type { StudentBookRecord } from "~/composables/useStudentBooks";

const props = defineProps<{
  book: StudentBookRecord;
}>();

const detailRoute = computed(() =>
  `/student/books/${encodeURIComponent(props.book.documentId)}`,
);
</script>

<template>
  <PortalBookCard
    :title="book.title"
    :author="book.author"
    :document-id="book.documentId"
    :to="detailRoute"
    :isbn="book.isbn"
    :category="book.category"
    :call-number="book.callNumber"
    :cover="book.cover"
    :status="book.availability.status"
    :total-copies="book.availability.totalCopies"
    :available-copies="book.availability.availableCopies"
  />
</template>
