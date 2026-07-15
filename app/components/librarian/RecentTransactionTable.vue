<script setup lang="ts">
import { h, resolveComponent } from "vue";
import type { TableColumn } from "@nuxt/ui";

const UBadge = resolveComponent("UBadge");
const UAvatar = resolveComponent("UAvatar");

const transactions = ref([
  {
    borrower: "METCHELYN R. SAMSON",
    title: "Introduction to Database Systems",
    barcode: "BK-100234",
    type: "Faculty",
    status: "Borrowed",
    date: "Jul 13, 2026",
  },
  {
    borrower: "CATHERINE JOY P. CALMA",
    title: "Programming with Java",
    barcode: "BK-100982",
    type: "Student",
    status: "Returned",
    date: "Jul 13, 2026",
  },
  {
    borrower: "JARHEN G. MANIEGO",
    title: "Computer Networks",
    barcode: "BK-100118",
    type: "Student",
    status: "Borrowed",
    date: "Jul 13, 2026",
  },
]);

const columns: TableColumn<typeof transactions.value[number]>[] = [
  {
    accessorKey: "borrower",
    header: "Borrower",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-3" }, [
        h(UAvatar, {
          size: "sm",
          icon: "i-lucide-user",
        }),
        h(
          "span",
          {
            class: "font-medium text-neutral-900 dark:text-white",
          },
          row.original.borrower
        ),
      ]),
  },

  {
    accessorKey: "title",
    header: "Book Title",
  },

  {
    accessorKey: "barcode",
    header: "Barcode",
    cell: ({ row }) =>
      h(
        "span",
        {
          class:
            "font-mono text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded",
        },
        row.original.barcode
      ),
  },

  {
    accessorKey: "type",
    header: "User",
  },

  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color:
            row.original.status === "Borrowed"
              ? "primary"
              : "neutral",
          variant: "soft",
        },
        () => row.original.status
      ),
  },

  {
    accessorKey: "date",
    header: "Date",
  },
];
</script>

<template>
  <UCard
  class="shadow-md shadow-emerald-100 dark:shadow-none border border-emerald-100 dark:border-slate-800 rounded-2xl flex flex-col h-full transition-colors"
    :ui="{
      body: 'p-0'
    }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h2 class="font-semibold text-lg">
            Recent Library Activity
          </h2>

          <p class="text-sm text-neutral-500">
            Latest borrowing and returning transactions.
          </p>
        </div>

        <UButton
          variant="ghost"
          trailing-icon="i-lucide-arrow-right"
        >
          View All
        </UButton>
      </div>
    </template>

    <UTable
      :data="transactions"
      :columns="columns"
      sticky
      class="flex-1"
      :ui="{
        td: 'py-4',
        th: 'font-semibold text-neutral-500'
      }"
    />
  </UCard>
</template>