<script setup>
definePageMeta({
  layout: "librarian",
  title: "Notifications",
});

const notifications = ref([
  {
    id: 1,
    type: "Alert",
    title: "Overdue Limit Reached",
    message:
      "Student STU202600125 has exceeded the maximum overdue penalty duration.",
    time: "10 mins ago",
    icon: "i-lucide-alert-triangle",
    color: "red",
    read: false,
  },
  {
    id: 2,
    type: "System",
    title: "Database Backup Completed",
    message: "Automated backup for system records completed successfully.",
    time: "1 hour ago",
    icon: "i-lucide-database",
    color: "blue",
    read: false,
  },
  {
    id: 3,
    type: "Reservation",
    title: "Reservation Ready",
    message:
      "Requested book 'RFID Smart Toll Systems' is now available for Queue Q-104.",
    time: "2 hours ago",
    icon: "i-lucide-calendar-check",
    color: "emerald",
    read: true,
  },
]);

const markAllRead = () => {
  notifications.value.forEach((n) => (n.read = true));
};
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between">
      <div>
        <h2
          class="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight"
        >
          System Notifications
        </h2>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Alerts, updates, and automated system logs.
        </p>
      </div>
      <UButton
        color="gray"
        variant="ghost"
        icon="i-lucide-check-check"
        @click="markAllRead"
      >
        Mark all as read
      </UButton>
    </div>

    <div
      class="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-800 overflow-hidden"
    >
      <div v-if="notifications.length === 0" class="p-12 text-center">
        <UIcon
          name="i-lucide-bell-off"
          class="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-700 mb-3"
        />
        <p class="text-neutral-500">You're all caught up!</p>
      </div>

      <ul v-else class="divide-y divide-neutral-100 dark:divide-neutral-800">
        <li
          v-for="notification in notifications"
          :key="notification.id"
          class="p-5 flex gap-4 transition-colors"
          :class="
            notification.read
              ? 'bg-transparent'
              : 'bg-neutral-50/50 dark:bg-neutral-800/20'
          "
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1"
            :class="`bg-${notification.color}-50 dark:bg-${notification.color}-500/10 text-${notification.color}-600 dark:text-${notification.color}-400`"
          >
            <UIcon :name="notification.icon" class="w-5 h-5" />
          </div>

          <div class="flex-1">
            <div class="flex items-start justify-between gap-2">
              <h4
                class="font-bold text-neutral-900 dark:text-white"
                :class="{
                  'text-neutral-600 dark:text-neutral-400 font-medium':
                    notification.read,
                }"
              >
                {{ notification.title }}
              </h4>
              <span class="text-xs text-neutral-400 whitespace-nowrap">{{
                notification.time
              }}</span>
            </div>
            <p class="text-sm text-neutral-500 mt-1">
              {{ notification.message }}
            </p>
          </div>

          <div class="flex items-center">
            <div
              v-if="!notification.read"
              class="w-2.5 h-2.5 rounded-full bg-emerald-500"
            ></div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
