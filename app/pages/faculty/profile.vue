<script setup lang="ts">
import AppFormSection from "~/components/shared/AppFormSection.vue";
import AppStickyFormActions from "~/components/shared/AppStickyFormActions.vue";
definePageMeta({
  layout: "faculty",
  middleware: ["faculty"],
  title: "My Account",
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
  <div class="sncbt-page-shell sncbt-member-page sncbt-page-shell-narrow space-y-5 sm:space-y-6">
    <FacultyPageHeader
      eyebrow="Account"
      title="My Account"
      description="Review your Faculty Library record and keep your contact information up to date."
      icon="i-lucide-user-round-cog"
    />

    <div v-if="portal.loading.value && !faculty" class="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <USkeleton class="h-80 rounded-2xl" />
      <USkeleton class="h-80 rounded-2xl" />
    </div>

    <template v-else-if="faculty">
      <UCard class="sncbt-account-identity-card" :ui="{ body: 'p-5 sm:p-6' }">
        <div class="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <UAvatar
              :src="faculty.photoUrl || undefined"
              :alt="faculty.fullName"
              :text="faculty.fullName.split(/\s+/).slice(0, 2).map(value => value[0]).join('')"
              size="3xl"
              class="size-20 shrink-0 rounded-2xl ring-4 ring-primary/10"
            />
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate text-xl font-bold text-highlighted sm:text-2xl">{{ faculty.fullName }}</h2>
                <UBadge :label="faculty.status" :color="faculty.status === 'Active' ? 'success' : 'warning'" variant="soft" />
              </div>
              <p class="mt-1 text-sm font-semibold text-primary">{{ faculty.employeeNo }}</p>
              <p class="mt-1 text-sm text-muted">{{ faculty.designation || 'Faculty member' }} · {{ faculty.department }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 sm:min-w-[26rem]">
            <div class="rounded-xl border border-default/80 bg-elevated/30 px-3 py-3">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Department</p>
              <p class="mt-1 truncate text-sm font-semibold text-highlighted">{{ faculty.department }}</p>
            </div>
            <div class="rounded-xl border border-default/80 bg-elevated/30 px-3 py-3">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-muted">Employment</p>
              <p class="mt-1 truncate text-sm font-semibold text-highlighted">{{ faculty.employmentType || 'Not recorded' }}</p>
            </div>
          </div>
        </div>
      </UCard>

      <div class="grid gap-5 xl:grid-cols-[minmax(18rem,0.78fr)_minmax(0,1.22fr)]">
        <UCard :ui="{ body: 'p-5 sm:p-6' }">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-highlighted">Faculty information</h2>
              <p class="mt-1 text-sm text-muted">Official details maintained by authorized Library staff.</p>
            </div>
            <UBadge label="Read-only" color="info" variant="soft" icon="i-lucide-lock-keyhole" />
          </div>

          <dl class="mt-5 space-y-3">
            <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
              <dt class="text-xs text-muted">Employee number</dt>
              <dd class="mt-1 text-sm font-semibold text-highlighted">{{ faculty.employeeNo }}</dd>
            </div>
            <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
              <dt class="text-xs text-muted">Faculty ID barcode</dt>
              <dd class="mt-1 break-all font-mono text-sm font-semibold text-highlighted">{{ faculty.barcode }}</dd>
            </div>
            <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
              <dt class="text-xs text-muted">Designation</dt>
              <dd class="mt-1 text-sm font-semibold text-highlighted">{{ faculty.designation || 'Not recorded' }}</dd>
            </div>
            <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
              <dt class="text-xs text-muted">Department</dt>
              <dd class="mt-1 text-sm font-semibold text-highlighted">{{ faculty.department }}</dd>
            </div>
            <div class="rounded-xl border border-default/80 bg-elevated/25 p-3.5">
              <dt class="text-xs text-muted">Employment type</dt>
              <dd class="mt-1 text-sm font-semibold text-highlighted">{{ faculty.employmentType || 'Not recorded' }}</dd>
            </div>
          </dl>

          <UAlert
            class="mt-5"
            title="Need to correct an official detail?"
            description="Ask authorized Library staff to update your employee number, name, department, designation, employment type, or Faculty status."
            icon="i-lucide-info"
            color="info"
            variant="soft"
          />
        </UCard>

        <AppFormSection
          title="Contact information"
          description="Update the email, contact number, and address that Library staff may use to reach you."
          icon="i-lucide-contact-round"
        >
          <div class="grid gap-5 sm:grid-cols-2">
            <UFormField label="Email address">
              <UInput v-model="form.email" type="email" icon="i-lucide-mail" autocomplete="email" class="w-full" />
            </UFormField>
            <UFormField label="Contact number">
              <UInput v-model="form.contactNo" icon="i-lucide-phone" autocomplete="tel" class="w-full" />
            </UFormField>
            <UFormField label="Current address" class="sm:col-span-2">
              <UTextarea v-model="form.address" :rows="5" autoresize class="w-full" />
            </UFormField>
          </div>

          <div class="mt-5 rounded-xl border border-primary/15 bg-primary/5 p-4">
            <div class="flex items-start gap-3">
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UIcon name="i-lucide-mail-check" class="size-4.5" />
              </div>
              <div>
                <p class="text-sm font-semibold text-highlighted">Keep your contact details current</p>
                <p class="mt-1 text-xs leading-5 text-muted">These details help Library staff contact you about borrowed books, replacement verification, and status reports.</p>
              </div>
            </div>
          </div>

          <AppStickyFormActions>
            <template #secondary>
              <UButton label="Reset" color="neutral" variant="outline" :disabled="saving" @click="fillForm" />
            </template>
            <UButton label="Save Changes" icon="i-lucide-save" :loading="saving" @click="save" />
          </AppStickyFormActions>
        </AppFormSection>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <NuxtLink to="/faculty/books" class="group rounded-xl border border-default bg-default p-4 transition hover:border-primary/35 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <div class="flex items-center gap-3">
            <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-book-open" class="size-4.5" /></div>
            <div class="min-w-0 flex-1"><p class="text-sm font-semibold text-highlighted">Book Collection</p><p class="mt-0.5 text-xs text-muted">Browse available titles</p></div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed group-hover:text-primary" />
          </div>
        </NuxtLink>
        <NuxtLink to="/faculty/borrowings" class="group rounded-xl border border-default bg-default p-4 transition hover:border-primary/35 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <div class="flex items-center gap-3">
            <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-library-big" class="size-4.5" /></div>
            <div class="min-w-0 flex-1"><p class="text-sm font-semibold text-highlighted">Borrowed Books</p><p class="mt-0.5 text-xs text-muted">Review assigned books</p></div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed group-hover:text-primary" />
          </div>
        </NuxtLink>
        <NuxtLink to="/faculty/reports" class="group rounded-xl border border-default bg-default p-4 transition hover:border-primary/35 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <div class="flex items-center gap-3">
            <div class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-clipboard-check" class="size-4.5" /></div>
            <div class="min-w-0 flex-1"><p class="text-sm font-semibold text-highlighted">Status Reports</p><p class="mt-0.5 text-xs text-muted">Track submitted updates</p></div>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed group-hover:text-primary" />
          </div>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
