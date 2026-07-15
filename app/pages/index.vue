<script setup lang="ts">
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
  <div class="min-h-screen flex flex-col justify-center items-center bg-[#f4fbf8] dark:bg-neutral-950 p-4 transition-colors relative overflow-hidden">
    
    <!-- Theme Toggle (Top Right) -->
    <div class="absolute top-6 right-6 z-10">
      <UButton
        :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
        color="neutral"
        variant="ghost"
        @click="() => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }"
        class="text-neutral-500 dark:text-neutral-400 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm"
      />
    </div>

    <!-- Login Container -->
    <div class="w-full max-w-md z-10">
      
      <!-- Card Custom Structure -->
      <div class="bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(16,185,129,0.15)] dark:shadow-none border border-neutral-100 dark:border-neutral-800 overflow-hidden">
        
        <!-- Header Section (With subtle gradient background) -->
        <div class="bg-[linear-gradient(180deg,rgba(16,185,129,0.05)_0%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.05)_0%,rgba(23,23,23,0)_100%)] pt-12 pb-8 px-8 flex flex-col items-center text-center border-b border-neutral-100 dark:border-neutral-800">
          
          <div class="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6">
            <UIcon name="i-lucide-library-big" class="w-8 h-8" />
          </div>
          
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">
            SNCBT Library
          </h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            Sign in to access the library management dashboard.
          </p>
        </div>

        <!-- Form Section -->
        <div class="p-8">
          <form @submit.prevent="handleLogin" class="space-y-5">
                      
            <UFormField label="Email or Username" :ui="{ label: 'text-sm font-semibold text-neutral-700 dark:text-neutral-300' }">
              <UInput
                v-model="username"
                icon="i-lucide-user"
                placeholder="Enter email or username"
                size="lg"
                color="neutral"
                variant="outline"
                class="w-full"
                :ui="{ base: 'h-12 rounded-xl' }"
                autofocus
              />
            </UFormField>

            <UFormField label="Password" :ui="{ label: 'text-sm font-semibold text-neutral-700 dark:text-neutral-300' }">
              <UInput
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                icon="i-lucide-lock"
                placeholder="Enter password"
                size="lg"
                color="neutral"
                variant="outline"
                class="w-full"
                :ui="{ base: 'h-12 rounded-xl' }"
              >
                <template #trailing>
                  <UButton
                    :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    color="neutral"
                    variant="link"
                    size="sm"
                    :padded="false"
                    @click="() => { showPassword = !showPassword }"
                    class="text-neutral-400 hover:text-neutral-600 pointer-events-auto"
                  />
                </template>
              </UInput>
            </UFormField>

            <!-- Sign In Button -->
            <div class="pt-2">
              <UButton
                type="submit"
                color="success"
                size="xl"
                block
                icon="i-lucide-log-in"
                :loading="isLoggingIn"
                class="font-semibold shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.98] rounded-xl"
              >
                Sign In
              </UButton>
            </div>

            <!-- Footer Note Pill -->
            <div class="mt-6 px-4 py-3 bg-[#f4fbf8] dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-center">
              <span class="text-[11px] sm:text-xs font-medium text-emerald-600/80 dark:text-emerald-400/80">
                Secure access for administrators, staff, and librarians.
              </span>
            </div>

          </form>
        </div>
      </div>
      
    </div>
  </div>
</template>