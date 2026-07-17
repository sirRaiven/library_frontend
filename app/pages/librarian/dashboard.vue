<script setup>
import WelcomeCard from "~/components/librarian/WelcomeCard.vue";
import StatisticCard from "~/components/shared/StatisticCard.vue";
import QuickActionCard from "~/components/librarian/QuickActionCard.vue";
import WorkflowCard from "~/components/librarian/WorkflowCard.vue";
import RecentTransactionTable from "~/components/librarian/RecentTransactionTable.vue";

definePageMeta({
  layout: "librarian",
  title: "Dashboard",
});

const stats = [
  {
    label: "Books Available",
    value: "14,088",
    description: "Available for borrowing",
    icon: "i-lucide-library",
  },
  {
    label: "Books Borrowed",
    value: "2,113",
    description: "Currewntly borrowed",
    icon: "i-lucide-book-up",
  },
  {
    label: "Overdue Incidents",
    value: "4",
    description: "Requires administrative action",
    icon: "i-lucide-alert-circle",
    isAlert: true,
  },
  {
    label: "Reservations",
    value: "14",
    description: "Awaiting for pickup",
    icon: "i-lucide-clock",
  },
];

const quickActions = [
  {
    title: "Borrow Book",
    description: "Scan a borrower ID and book barcode.",
    icon: "i-lucide-book-up",
    action: "primary",
  },
  {
    title: "Return Book",
    description: "Process returned books.",
    icon: "i-lucide-book-down",
  },
  {
    title: "Register Student",
    description: "Create a student library account and barcode.",
    icon: "i-lucide-users",
  },
  {
    title: "Add New Book",
    description: "Register a new book and print its barcode.",
    icon: "i-lucide-book-plus",
  },
];
</script>

<template>
  <div class="space-y-6">
    <!-- Hero Row -->
    <WelcomeCard />

    <!-- Metrics Ledger Array -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatisticCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <!-- Content Control Hub Grid Split -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div
        class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-md border border-emerald-100 dark:border-slate-800 flex flex-col justify-between transition-colors"
      >
        <div class="w-full">
          <div class="mb-5">
            <h3 class="font-bold text-slate-800 dark:text-white tracking-tight">
              Quick Actions
            </h3>
            <p
              class="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5"
            >
            Start common library tasks.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- We no longer need the 'action' prop since all cards are now uniform -->
            <QuickActionCard
              v-for="action in quickActions"
              :key="action.title"
              v-bind="action"
            />
          </div>
        </div>
      </div>

      <div class="lg:col-span-1">
        <WorkflowCard />
      </div>
    </div>

    <!-- Active Circulation Ledger Section -->
    <RecentTransactionTable />
  </div>
</template>
