<script setup lang="ts">
definePageMeta({
  layout: "faculty",
  middleware: ["faculty"],
  title: "Profile",
});

const portal = useFacultyPortal();
const toast = useToast();
const saving = ref(false);

const form = reactive({
  email: "",
  contactNo: "",
  address: "",
});

const faculty = computed(() => portal.dashboard.value.faculty);

function fillForm() {
  form.email = faculty.value?.email ?? "";
  form.contactNo = faculty.value?.contactNo ?? "";
  form.address = faculty.value?.address ?? "";
}

async function load() {
  try {
    await portal.loadDashboard();
    fillForm();
  } catch (error) {
    toast.add({
      title: "Faculty account details unavailable",
      description: portal.error.value || "Please refresh the page.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function save() {
  if (saving.value) return;
  saving.value = true;
  try {
    await portal.updateProfile(form);
    fillForm();
    toast.add({
      title: "Contact information updated",
      description: "Your Faculty contact information was saved.",
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    toast.add({
      title: "Account details not updated",
      description: useAuth().getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="sncbt-page-shell sncbt-page-shell-narrow space-y-6">
    <FacultyPageHeader
      eyebrow="Account"
      title="Profile"
      description="Review your Faculty Library account details and keep your contact information current."
      icon="i-lucide-user-round-cog"
    />

    <div v-if="portal.loading.value && !faculty" class="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <USkeleton class="h-96 rounded-3xl" />
      <USkeleton class="h-96 rounded-3xl" />
    </div>

    <div v-else-if="faculty" class="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <UCard :ui="{ root: 'ring-1 ring-default', body: 'p-6' }">
        <div class="text-center">
          <UAvatar :src="faculty.photoUrl || undefined" :alt="faculty.fullName" :text="faculty.fullName.split(/\s+/).slice(0, 2).map(value => value[0]).join('')" size="2xl" class="mx-auto" />
          <h2 class="mt-4 text-xl font-bold text-highlighted">{{ faculty.fullName }}</h2>
          <p class="mt-1 text-sm text-muted">{{ faculty.designation || 'Faculty member' }}</p>
          <div class="mt-4 flex justify-center">
            <UBadge :label="faculty.status" :color="faculty.status === 'Active' ? 'success' : 'warning'" variant="soft" />
          </div>
        </div>

        <dl class="mt-6 space-y-4 border-t border-default pt-6 text-sm">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Employee number</dt>
            <dd class="mt-1 font-medium text-highlighted">{{ faculty.employeeNo }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Faculty ID barcode</dt>
            <dd class="mt-1 font-mono text-xs text-highlighted">{{ faculty.barcode }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Department</dt>
            <dd class="mt-1 font-medium text-highlighted">{{ faculty.department }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-muted">Employment type</dt>
            <dd class="mt-1 font-medium text-highlighted">{{ faculty.employmentType || 'Not recorded' }}</dd>
          </div>
        </dl>
      </UCard>

      <div class="space-y-6">
        <UCard :ui="{ root: 'ring-1 ring-default', header: 'border-b border-default p-5', body: 'space-y-5 p-5 sm:p-6' }">
          <template #header>
            <div>
              <h2 class="font-semibold text-highlighted">Contact information</h2>
              <p class="mt-1 text-xs text-muted">These details may be updated from the Faculty Portal.</p>
            </div>
          </template>

          <div class="grid gap-5 sm:grid-cols-2">
            <UFormField label="Email address">
              <UInput v-model="form.email" type="email" icon="i-lucide-mail" class="w-full" />
            </UFormField>
            <UFormField label="Contact number">
              <UInput v-model="form.contactNo" icon="i-lucide-phone" class="w-full" />
            </UFormField>
            <UFormField label="Address" class="sm:col-span-2">
              <UTextarea v-model="form.address" :rows="4" class="w-full" />
            </UFormField>
          </div>

          <div class="flex justify-end gap-2">
            <UButton label="Reset" color="neutral" variant="outline" :disabled="saving" @click="fillForm" />
            <UButton label="Save Changes" icon="i-lucide-save" :loading="saving" @click="save" />
          </div>
        </UCard>

        <UAlert
          title="Faculty information can be completed by Library staff"
          description="Employee number, name, department, designation, and Faculty status are managed by authorized staff. Your portal access does not depend on completing every optional detail."
          icon="i-lucide-lock-keyhole"
          color="neutral"
          variant="soft"
        />

        <UAlert
          title="Account security page will follow in the next Faculty Portal phase"
          description="Password, session, and device controls will be added after the core borrowing and replacement workflow is validated."
          icon="i-lucide-shield-user"
          color="primary"
          variant="soft"
        />
      </div>
    </div>
  </div>
</template>
