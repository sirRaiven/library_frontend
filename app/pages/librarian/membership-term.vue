<script setup lang="ts">
import type {
  MembershipTerm,
  UpdateMembershipTermInput,
} from "~/composables/useMembershipTerm";

definePageMeta({
  layout: "librarian",
  title: "Academic Term and Membership Validity",
});

const termManager = useMembershipTerm();
const settings = useLibrarySettings();
const referenceData = useReferenceData();
const academicTerms = referenceData.academicTerms;
const auth = useAuth();
const toast = useToast();

const confirmOpen = ref(false);
const saving = ref(false);
const lastResult = ref<MembershipTerm | null>(null);

const form = reactive<UpdateMembershipTermInput>({
  academicTermCode: "",
  academicYear: "",
  semester: "",
  status: "Open",
  registrationOpen: true,
  validFrom: "",
  validUntil: "",
  applyToAll: true,
});

const academicTermItems = computed(() =>
  academicTerms.value.map(term => ({
    value: term.code,
    label: `${term.academicYear} · ${term.semesterName}`,
  })),
);
const statusItems = ["Open", "Closed"];

const durationDays = computed(() => {
  if (!form.validFrom || !form.validUntil) return 0;
  const start = new Date(`${form.validFrom}T00:00:00`);
  const end = new Date(`${form.validUntil}T00:00:00`);
  return Math.max(
    Math.round((end.getTime() - start.getTime()) / 86_400_000),
    0,
  );
});

const canSave = computed(() => {
  if (!form.academicTermCode) return false;
  if (!/^\d{4}-\d{4}$/.test(form.academicYear)) return false;
  if (!form.validFrom || !form.validUntil) return false;
  if (form.validUntil <= form.validFrom) return false;
  if (form.status === "Closed" && form.registrationOpen) return false;
  return true;
});

function applyTerm(term: MembershipTerm) {
  const selectedTerm = term.academicTerm
    ?? academicTerms.value.find(item =>
      item.academicYear === term.academicYear
      && item.semesterName === term.semester
    )
    ?? null;

  Object.assign(form, {
    academicTermCode: selectedTerm?.code ?? "",
    academicYear: selectedTerm?.academicYear ?? term.academicYear,
    semester: selectedTerm?.semesterName ?? term.semester,
    status: term.status,
    registrationOpen: term.registrationOpen,
    validFrom: term.validFrom,
    validUntil: term.validUntil,
  });
}


watch(
  () => form.academicTermCode,
  code => {
    const selected = academicTerms.value.find(term => term.code === code);
    if (!selected) return;
    form.academicYear = selected.academicYear;
    form.semester = selected.semesterName;
  },
);

watch(
  () => form.status,
  status => {
    if (status === "Closed") form.registrationOpen = false;
  },
);

async function loadTerm() {
  try {
    await referenceData.loadOperational(true);
    const term = await termManager.load(true);
    applyTerm(term);
  } catch (error) {
    toast.add({
      title: "Unable to load the membership term",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

function requestSave() {
  if (!canSave.value) {
    toast.add({
      title: "Complete the term information",
      description:
        "Use a valid academic year and make sure the expiry date is later than the start date.",
      color: "warning",
      icon: "i-lucide-triangle-alert",
    });
    return;
  }
  confirmOpen.value = true;
}

async function saveTerm() {
  saving.value = true;
  try {
    const result = await termManager.save({ ...form });
    lastResult.value = result;
    confirmOpen.value = false;
    await settings.load(true);
    toast.add({
      title: form.status === "Open" ? "Academic term opened" : "Academic term closed",
      description: `${form.semester}, ${form.academicYear} is valid from ${form.validFrom} to ${form.validUntil}.`,
      color: "success",
      icon: "i-lucide-calendar-check-2",
    });
  } catch (error) {
    toast.add({
      title: "Unable to save the academic term",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    saving.value = false;
  }
}

onMounted(loadTerm);
</script>

<template>
  <UContainer class="sncbt-page-shell space-y-8">
    <div class="mx-auto max-w-[1500px] space-y-6 mb-12">
      <LibrarianPageHeader
        eyebrow="Membership & Cards"
        title="Membership Term"
        description="Set the current academic term and membership validity used for registration, renewal, and Library Card access."
        icon="i-lucide-calendar-range"
      >
        <template #actions>
          <UButton to="/librarian/memberships" label="Membership Records" icon="i-lucide-id-card" color="neutral" variant="outline" />
          <UButton label="Refresh" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="termManager.loading.value" @click="loadTerm" />
        </template>
      </LibrarianPageHeader>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UCard class="sncbt-metric-card block">
          <p class="text-sm text-muted">Term Status</p>
          <div class="mt-3 flex items-center gap-2">
            <UBadge :color="form.status === 'Open' ? 'success' : 'neutral'" variant="soft">
              {{ form.status }}
            </UBadge>
          </div>
        </UCard>
        <UCard class="sncbt-metric-card block">
          <p class="text-sm text-muted">Student Registration</p>
          <p class="mt-3 text-2xl font-bold text-highlighted">
            {{ form.registrationOpen ? "Open" : "Closed" }}
          </p>
        </UCard>
        <UCard class="sncbt-metric-card block">
          <p class="text-sm text-muted">Membership Validity</p>
          <p class="mt-3 text-2xl font-bold text-highlighted">{{ durationDays }} days</p>
        </UCard>
        <UCard class="sncbt-metric-card block">
          <p class="text-sm text-muted">Current Term</p>
          <p class="mt-3 font-semibold text-highlighted">{{ form.semester }}</p>
          <p class="text-sm text-muted">{{ form.academicYear }}</p>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Open or Update the Academic Term</h2>
            <p class="mt-1 text-sm text-muted">
              These values replace the editable Initial Membership dates in Student registration forms.
            </p>
          </div>
        </template>

        <div class="grid gap-5 md:grid-cols-2">
          <UFormField label="Academic Term" required description="Choose the term already configured for the Library.">
            <USelect
              v-model="form.academicTermCode"
              :items="academicTermItems"
              value-key="value"
              label-key="label"
              placeholder="Select academic term"
              class="w-full"
            />
          </UFormField>
          <div class="grid gap-3 sm:grid-cols-2">
            <UFormField label="Academic Year">
              <UInput v-model="form.academicYear" disabled class="w-full" />
            </UFormField>
            <UFormField label="Semester">
              <UInput v-model="form.semester" disabled class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Membership Starts On" required>
            <UInput v-model="form.validFrom" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Membership Valid Until" required>
            <UInput v-model="form.validUntil" type="date" class="w-full" />
          </UFormField>
          <UFormField label="Academic Term Status" required>
            <USelect v-model="form.status" :items="statusItems" class="w-full" />
          </UFormField>
          <div class="rounded-2xl border border-default bg-elevated/40 p-4">
            <USwitch
              v-model="form.registrationOpen"
              :disabled="form.status === 'Closed'"
              label="Allow new Student registrations"
              description="Controls both Librarian registration and the public QR registration page."
            />
          </div>
        </div>

        <div class="mt-6 rounded-2xl border border-primary/25 bg-primary/5 p-5">
          <UCheckbox
            v-model="form.applyToAll"
            label="Apply this academic term to all approved Student profiles"
          />
          <p class="mt-2 pl-7 text-sm leading-6 text-muted">
            The system creates or updates the current-term membership for every Active Student. Previous active-term records are expired. Students whose enrollment is not verified remain Pending Approval and cannot use the Student Portal until verified.
          </p>
        </div>

        <UAlert
          v-if="form.status === 'Closed'"
          class="mt-5"
          color="warning"
          variant="soft"
          icon="i-lucide-lock-keyhole"
          title="Closing the term stops registration and renewal"
          description="Existing Student accounts remain subject to their saved active membership and expiry date."
        />

        <div class="mt-6 flex justify-end">
          <UButton
            :label="form.status === 'Open' ? 'Save and Open Term' : 'Save and Close Term'"
            icon="i-lucide-calendar-check-2"
            color="primary"
            size="lg"
            :disabled="!canSave"
            :loading="saving"
            @click="requestSave"
          />
        </div>
      </UCard>

      <UCard v-if="lastResult">
        <template #header>
          <h2 class="font-semibold text-highlighted">Last Application Result</h2>
        </template>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">Students Reviewed</p>
            <p class="mt-2 text-2xl font-bold">{{ lastResult.summary.studentsReviewed }}</p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">Memberships Created</p>
            <p class="mt-2 text-2xl font-bold">{{ lastResult.summary.membershipsCreated }}</p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">Memberships Updated</p>
            <p class="mt-2 text-2xl font-bold">{{ lastResult.summary.membershipsUpdated }}</p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">Active for This Term</p>
            <p class="mt-2 text-2xl font-bold text-success">{{ lastResult.summary.activeForTerm }}</p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">Pending Verification</p>
            <p class="mt-2 text-2xl font-bold text-warning">{{ lastResult.summary.pendingVerification }}</p>
          </div>
          <div class="rounded-xl border border-default p-4">
            <p class="text-sm text-muted">Previous Memberships Expired</p>
            <p class="mt-2 text-2xl font-bold">{{ lastResult.summary.priorMembershipsExpired }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="confirmOpen" :ui="{ content: 'sm:max-w-lg' }">
      <template #content>
        <div class="space-y-5 p-6">
          <div class="flex items-start gap-4">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-warning/10 text-warning">
              <UIcon name="i-lucide-calendar-clock" class="size-6" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-highlighted">Confirm academic term</h2>
              <p class="mt-2 text-sm leading-6 text-muted">
                Save {{ form.semester }}, {{ form.academicYear }} with validity from {{ form.validFrom }} until {{ form.validUntil }}?
              </p>
            </div>
          </div>

          <UAlert
            v-if="form.applyToAll"
            color="warning"
            variant="soft"
            icon="i-lucide-users-round"
            title="This will update all approved Students"
            description="Current-term memberships will be created or updated and older active memberships will be expired."
          />

          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="outline" :disabled="saving" @click="() => { confirmOpen = false; }" />
            <UButton label="Confirm and Save" icon="i-lucide-check" color="primary" :loading="saving" @click="saveTerm" />
          </div>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
