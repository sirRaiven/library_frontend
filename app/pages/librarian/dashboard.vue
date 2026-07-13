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
    label: "Total Books",
    value: "14,088",
    description: "Cataloged operational items",
    icon: "i-lucide-library",
  },
  {
    label: "Active Loans",
    value: "2,113",
    description: "Books currently active out-of-hand",
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
    label: "Pending Holds",
    value: "14",
    description: "Awaiting patron pick-up queues",
    icon: "i-lucide-clock",
  },
];

const quickActions = [
  {
    title: "Issue Book File",
    description: "Process a new resource loan transaction assignment sequence.",
    icon: "i-lucide-book-up",
    action: "primary",
  },
  {
    title: "Return Entry Sync",
    description: "Process collection return sequences and settle fine ledgers.",
    icon: "i-lucide-book-down",
  },
  {
    title: "Patron Index Profile",
    description: "Modify and verify library memberships and status indicators.",
    icon: "i-lucide-users",
  },
  {
    title: "Cataloging Engine",
    description: "Register new bibliographic metadata or resource records.",
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
        class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between transition-colors"
      >
        <div class="w-full">
          <div class="mb-5">
            <h3 class="font-bold text-slate-800 dark:text-white tracking-tight">
              Quick Action Framework
            </h3>
            <p
              class="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5"
            >
              Trigger common circulation procedures efficiently.
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
