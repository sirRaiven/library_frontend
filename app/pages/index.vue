<script setup lang="ts">
// @ts-nocheck
// Ensure this page uses the blank default layout, not the librarian sidebar
definePageMeta({
  layout: 'default',
  title: 'Sign In'
})

const colorMode = useColorMode()
const router = useRouter()
const roleCookie = useCookie('user-role') // Mocking authentication state

const username = ref('')
const password = ref('')
const isLoggingIn = ref(false)
const showPassword = ref(false)

// TEMPORARY DEVELOPMENT CREDENTIALS
const TEMP_CREDENTIALS = {
  username: 'admin',
  password: 'Admin123'
}

const handleLogin = async () => {
    isLoggingIn.value = true;
  
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
  
    // Check against hardcoded credentials
    if (username.value === TEMP_CREDENTIALS.username && password.value === TEMP_CREDENTIALS.password) {
      roleCookie.value = 'librarian'; // Set session cookie for RBAC
      await router.push('/librarian/dashboard');
    } else {
      isLoggingIn.value = false;
      alert(`Invalid credentials. Use: ${TEMP_CREDENTIALS.username} / ${TEMP_CREDENTIALS.password}`);
    }
  }
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center items-center bg-neutral-50 dark:bg-neutral-950 p-4 transition-colors">
    
    <!-- Theme Toggle (Top Right) -->
    <div class="absolute top-6 right-6">
      <UButton
        :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
        color="neutral"
        variant="ghost"
        @click="() => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }"
        class="text-neutral-500 dark:text-neutral-400"
      />
    </div>

    <!-- Login Container -->
    <div class="w-full max-w-md">
      
      <!-- Brand Logo/Header -->
      <div class="text-center mb-8">
        <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 text-white mb-4 shadow-lg shadow-emerald-500/20">
          <UIcon name="i-lucide-library-big" class="w-8 h-8" />
        </div>
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">SNCBT Library</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Sign in to manage the circulation system</p>
      </div>

      <!-- Login Card -->
      <UCard 
        :ui="{ 
          base: 'bg-white dark:bg-neutral-900 shadow-xl shadow-neutral-200/20 dark:shadow-none border border-neutral-100 dark:border-neutral-800',
          ring: '', 
          rounded: 'rounded-2xl' 
        }"
      >
        <form @submit.prevent="handleLogin" class="space-y-5 p-2">
          
          <!-- Modern Nuxt UI uses UFormField to wrap inputs -->
          <UFormField label="Username or ID">
            <UInput
              v-model="username"
              icon="i-lucide-user"
              placeholder="Enter your employee ID"
              size="lg"
              color="neutral"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UFormField label="Password">
            <UInput
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              icon="i-lucide-lock"
              placeholder="Enter your password"
              size="lg"
              color="neutral"
              class="w-full"
              :ui="{ icon: { trailing: { pointer: '' } } }"
            >
              <template #trailing>
                <UButton
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="link"
                  size="sm"
                  :padded="false"
                  @click="() => { showPassword = !showPassword }"
                />
              </template>
            </UInput>
          </UFormField>

          <div class="flex items-center justify-between mt-2">
            <UCheckbox name="remember" label="Remember me" color="emerald" />
            <NuxtLink to="/" class="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline">
              Forgot password?
            </NuxtLink>
          </div>

          <div class="pt-4">
            <UButton
              type="submit"
              color="emerald"
              size="lg"
              block
              :loading="isLoggingIn"
              class="font-semibold shadow-md shadow-emerald-500/10"
            >
              Sign In to System
            </UButton>
          </div>
        </form>
      </UCard>
    </div>
  </div>
</template>