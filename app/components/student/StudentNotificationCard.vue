<script setup lang="ts">
import type {
  StudentNotification,
} from "~/composables/useStudentNotifications";

const props = defineProps<{
  notification: StudentNotification;
  busy?: boolean;
}>();

const emit = defineEmits<{
  read: [value: boolean];
  open: [];
}>();

const style = computed(() =>
  ({
    Critical: {
      color: "error",
      icon: "i-lucide-octagon-alert",
    },
    Warning: {
      color: "warning",
      icon: "i-lucide-triangle-alert",
    },
    Success: {
      color: "success",
      icon: "i-lucide-circle-check",
    },
    Info: {
      color: "info",
      icon: "i-lucide-info",
    },
  }[props.notification.severity] ?? {
    color: "neutral",
    icon: "i-lucide-bell",
  }),
);

function dateTime(
  value: string | null,
) {
  return value
    ? new Intl.DateTimeFormat(
        "en-PH",
        {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Manila",
        },
      ).format(new Date(value))
    : "Date unavailable";
}
</script>

<template>
  <UCard
    class="sncbt-card-interactive hover:bg-elevated/20"
    :class="
      !notification.isRead
        ? 'ring-1 ring-primary/25'
        : ''
    "
  >
    <button
      type="button"
      class="block w-full rounded-xl text-left outline-none ring-primary transition focus-visible:ring-2"
      :aria-label="`${notification.title}. ${notification.isRead ? 'Read notification' : 'Unread notification. Select to mark as read'}.`"
      @click="emit('open')"
    >
      <div class="flex gap-4">
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-xl"
          :class="`bg-${style.color}/10 text-${style.color}`"
        >
          <UIcon
            :name="style.icon"
            class="size-5"
          />
        </div>

        <div class="min-w-0 flex-1">
          <div
            class="flex flex-wrap items-start justify-between gap-2"
          >
            <div class="min-w-0">
              <div
                class="flex flex-wrap items-center gap-2"
              >
                <h3
                  class="font-semibold text-highlighted"
                >
                  {{ notification.title }}
                </h3>

                <UBadge
                  v-if="!notification.isRead"
                  label="New"
                  color="primary"
                  variant="soft"
                  size="sm"
                />

                <UBadge
                  :label="notification.category"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                />
              </div>

              <p
                class="mt-1 text-sm leading-relaxed text-muted"
              >
                {{ notification.message }}
              </p>
            </div>

            <UBadge
              :label="notification.severity"
              :color="style.color as any"
              variant="soft"
            />
          </div>
        </div>
      </div>
    </button>

    <div
      class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-default pt-3"
    >
      <p class="text-xs text-muted">
        {{ dateTime(notification.occurredAt) }}
      </p>

      <div class="flex flex-wrap gap-2">
        <UButton
          :label="
            notification.isRead
              ? 'Mark Unread'
              : 'Mark Read'
          "
          :icon="
            notification.isRead
              ? 'i-lucide-mail'
              : 'i-lucide-mail-check'
          "
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="busy"
          @click="
            emit(
              'read',
              !notification.isRead,
            )
          "
        />

        <UButton
          v-if="notification.actionUrl"
          :to="notification.actionUrl"
          :label="
            notification.actionLabel ||
            'Open'
          "
          icon="i-lucide-arrow-right"
          color="primary"
          variant="outline"
          size="sm"
          @click="emit('open')"
        />
      </div>
    </div>
  </UCard>
</template>
