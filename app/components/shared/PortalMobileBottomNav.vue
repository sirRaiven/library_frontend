<script setup lang="ts">
export interface PortalMobileNavItem {
  label: string;
  icon: string;
  to: string;
  active?: boolean;
  badge?: string | number;
}

const props = withDefaults(
  defineProps<{
    items: PortalMobileNavItem[];
    moreActive?: boolean;
    moreOpen?: boolean;
    moreLabel?: string;
  }>(),
  {
    moreActive: false,
    moreOpen: false,
    moreLabel: "More",
  },
);

const emit = defineEmits<{
  more: [];
}>();
</script>

<template>
  <nav
    class="sncbt-mobile-bottom-nav lg:hidden"
    aria-label="Primary mobile navigation"
  >
    <div class="sncbt-mobile-bottom-nav__inner">
      <NuxtLink
        v-for="item in props.items"
        :key="item.to"
        :to="item.to"
        class="sncbt-mobile-bottom-nav__item"
        :class="{ 'sncbt-mobile-bottom-nav__item--active': item.active }"
        :aria-current="item.active ? 'page' : undefined"
      >
        <span class="relative inline-flex">
          <UIcon :name="item.icon" class="size-5" />
          <span
            v-if="item.badge !== undefined && String(item.badge) !== '0'"
            class="sncbt-mobile-bottom-nav__badge"
            aria-hidden="true"
          >
            {{ item.badge }}
          </span>
        </span>
        <span class="sncbt-mobile-bottom-nav__label">{{ item.label }}</span>
      </NuxtLink>

      <button
        type="button"
        class="sncbt-mobile-bottom-nav__item"
        :class="{ 'sncbt-mobile-bottom-nav__item--active': props.moreActive }"
        aria-haspopup="dialog"
        :aria-expanded="props.moreOpen"
        :aria-label="props.moreLabel"
        @click="emit('more')"
      >
        <UIcon name="i-lucide-menu" class="size-5" aria-hidden="true" />
        <span class="sncbt-mobile-bottom-nav__label">{{ props.moreLabel }}</span>
      </button>
    </div>
  </nav>
</template>
