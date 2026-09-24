<script setup lang="ts">
const open = defineModel<boolean>("open", {
  default: false,
});

const props = withDefaults(
  defineProps<{
    loading?: boolean;
    title?: string;
    description: string;
    accountName?: string;
    accountDetail?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    loading: false,
    title: "Sign out of SNCBT Library?",
    accountName: "",
    accountDetail: "",
    confirmLabel: "Sign Out",
    cancelLabel: "Stay Signed In",
  },
);

const emit = defineEmits<{
  confirm: [];
}>();

const accountInitials = computed(() => {
  const source = props.accountName.trim();

  if (!source) {
    return "S";
  }

  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "S"
  );
});

function closeModal() {
  if (props.loading) {
    return;
  }

  open.value = false;
}

function confirmSignOut() {
  if (props.loading) {
    return;
  }

  emit("confirm");
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="!loading"
    :title="title"
    :description="description"
    :ui="{
      content: 'sncbt-signout-modal overflow-hidden sm:max-w-[28rem]',
    }"
  >
    <template #content>
      <section
        class="sncbt-signout-modal__surface relative isolate overflow-hidden"
        aria-labelledby="sncbt-signout-title"
        aria-describedby="sncbt-signout-description"
      >
        <div
          class="sncbt-signout-modal__orb sncbt-signout-modal__orb--large"
          aria-hidden="true"
        />
        <div
          class="sncbt-signout-modal__orb sncbt-signout-modal__orb--small"
          aria-hidden="true"
        />

        <div class="relative z-10 p-5 sm:p-7">
          <div class="flex items-start gap-4">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-error/15 bg-error/10 text-error shadow-sm"
              aria-hidden="true"
            >
              <UIcon
                name="i-lucide-log-out"
                class="size-5.5"
              />
            </div>

            <div class="min-w-0 flex-1">
              <p
                class="text-[11px] font-bold uppercase tracking-[0.18em] text-primary"
              >
                Session security
              </p>
              <h2
                id="sncbt-signout-title"
                class="mt-1.5 text-xl font-semibold tracking-tight text-highlighted sm:text-2xl"
              >
                {{ title }}
              </h2>
              <p
                id="sncbt-signout-description"
                class="mt-2 text-sm leading-6 text-muted"
              >
                {{ description }}
              </p>
            </div>

            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              square
              size="sm"
              class="-mr-1 -mt-1 shrink-0"
              aria-label="Close sign out confirmation"
              :disabled="loading"
              @click="closeModal"
            />
          </div>

          <div
            v-if="accountName"
            class="mt-5 flex min-w-0 items-center gap-3 rounded-xl border border-default/80 bg-elevated/70 p-3.5 shadow-sm"
          >
            <UAvatar
              :alt="accountName"
              :text="accountInitials"
              size="md"
              class="shrink-0 ring-2 ring-primary/10"
            />

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-highlighted">
                {{ accountName }}
              </p>
              <p
                v-if="accountDetail"
                class="mt-0.5 truncate text-xs text-muted"
              >
                {{ accountDetail }}
              </p>
            </div>

            <div
              class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <UIcon
                name="i-lucide-shield-check"
                class="size-4.5"
              />
            </div>
          </div>

          <div
            class="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 px-3.5 py-3 text-sm text-muted"
          >
            <UIcon
              name="i-lucide-info"
              class="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <p class="leading-5">
              You can sign in again at any time. This only closes the current portal session on this browser.
            </p>
          </div>

          <div
            class="mt-6 grid gap-2.5 sm:grid-cols-2"
          >
            <UButton
              :label="cancelLabel"
              color="primary"
              variant="soft"
              size="lg"
              block
              autofocus
              :disabled="loading"
              @click="closeModal"
            />
            <UButton
              :label="confirmLabel"
              icon="i-lucide-log-out"
              color="error"
              size="lg"
              block
              :loading="loading"
              @click="confirmSignOut"
            />
          </div>
        </div>
      </section>
    </template>
  </UModal>
</template>

<style scoped>
.sncbt-signout-modal__surface {
  background:
    radial-gradient(
      circle at 102% 108%,
      color-mix(in srgb, var(--ui-primary) 11%, transparent) 0 7.5rem,
      transparent 7.6rem
    ),
    radial-gradient(
      circle at -8% -12%,
      color-mix(in srgb, var(--ui-primary) 7%, transparent) 0 5.25rem,
      transparent 5.35rem
    ),
    linear-gradient(
      145deg,
      var(--sncbt-theme-surface-start),
      var(--sncbt-theme-surface-end)
    );
}

.sncbt-signout-modal__orb {
  position: absolute;
  z-index: 0;
  border-radius: 999px;
  pointer-events: none;
  border: 1px solid var(--sncbt-theme-orb-border);
  background: var(--sncbt-theme-orb);
}

.sncbt-signout-modal__orb--large {
  width: 9rem;
  height: 9rem;
  right: -5.25rem;
  bottom: -5rem;
}

.sncbt-signout-modal__orb--small {
  width: 4rem;
  height: 4rem;
  left: -2.2rem;
  top: 4.75rem;
  opacity: 0.62;
}

</style>
