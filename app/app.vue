<template>
  <UApp>
    <NuxtLoadingIndicator
      color="#047857"
      error-color="#b91c1c"
      :height="3"
      :throttle="160"
      :duration="1800"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>