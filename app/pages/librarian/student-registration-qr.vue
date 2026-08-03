<script setup lang="ts">
import QRCode from "qrcode";
import type { LibrarianRegistrationLink } from "~/composables/usePublicStudentRegistration";

definePageMeta({
  layout: "librarian",
  title: "Student Registration QR Code",
});

const registration = usePublicStudentRegistration();
const toast = useToast();

const loading = ref(true);
const errorMessage = ref("");
const link = ref<LibrarianRegistrationLink | null>(null);
const qrDataUrl = ref("");

async function load() {
  loading.value = true;
  errorMessage.value = "";

  try {
    link.value = await registration.loadLibrarianLink();
    qrDataUrl.value = await QRCode.toDataURL(link.value.url, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 720,
      color: {
        dark: "#071a15",
        light: "#ffffff",
      },
    });
  } catch (error) {
    errorMessage.value = registration.getErrorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function copyLink() {
  if (!link.value?.url) return;
  await navigator.clipboard.writeText(link.value.url);
  toast.add({
    title: "Registration link copied",
    description: "The authorized Student registration link is ready to share.",
    color: "success",
  });
}

function downloadQr() {
  if (!qrDataUrl.value) return;
  const anchor = document.createElement("a");
  anchor.href = qrDataUrl.value;
  anchor.download = "SNCBT-Student-Membership-Registration-QR.png";
  anchor.click();
}

function printQr() {
  window.print();
}

onMounted(() => void load());
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-5xl space-y-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UIcon name="i-lucide-qr-code" class="size-6" />
          </div>
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.18em] text-primary">Student registration</p>
            <h1 class="mt-1 text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">Registration QR Code</h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Display or print this QR code during authorized registration periods. Students who scan it can create a Student Portal account and Library membership.
            </p>
          </div>
        </div>
        <UButton to="/librarian/students" label="Back to Students" icon="i-lucide-arrow-left" color="neutral" variant="outline" />
      </div>

      <UAlert
        color="warning"
        icon="i-lucide-shield-alert"
        title="Treat this QR code as a controlled registration link"
        description="Do not post it permanently on public social-media pages. Disable or rotate the registration code after the approved registration period."
      />

      <UCard v-if="loading">
        <div class="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
          <UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-primary" />
          <p class="text-sm text-muted">Generating the authorized registration QR code…</p>
        </div>
      </UCard>

      <UAlert
        v-else-if="errorMessage"
        color="error"
        icon="i-lucide-circle-alert"
        title="Unable to create the QR code"
        :description="errorMessage"
      >
        <template #actions>
          <UButton label="Try Again" icon="i-lucide-refresh-cw" color="error" variant="soft" @click="load" />
        </template>
      </UAlert>

      <div v-else-if="link" class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <UCard class="registration-print-card">
          <div class="flex flex-col items-center p-2 text-center sm:p-6">
            <img src="/sncbt-library-logo.png" alt="SNCBT Library logo" class="size-20 object-contain">
            <p class="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">SNCBT Library</p>
            <h2 class="mt-2 text-2xl font-bold text-highlighted">Student Membership Registration</h2>
            <p class="mt-2 max-w-md text-sm leading-6 text-muted">Scan the QR code using your phone camera. Complete the form using your official Student information.</p>

            <div class="mt-6 rounded-3xl border border-default bg-white p-4 shadow-sm">
              <img :src="qrDataUrl" alt="Student registration QR code" class="size-72 max-w-full object-contain">
            </div>

            <div class="mt-5 rounded-xl bg-elevated px-4 py-3 text-sm">
              <p class="font-semibold text-highlighted">After registration</p>
              <p class="mt-1 text-muted">Proceed to the Student Portal sign-in page. Bring your Student ID and current enrollment proof to the Library for membership verification.</p>
            </div>

            <p v-if="link.expiresAt" class="mt-4 text-xs font-medium text-warning">
              Registration link expires: {{ new Date(link.expiresAt).toLocaleString() }}
            </p>
          </div>
        </UCard>

        <div class="space-y-4 print:hidden">
          <UCard>
            <template #header>
              <h3 class="font-bold text-highlighted">QR Code Actions</h3>
            </template>
            <div class="grid gap-3">
              <UButton label="Download QR Image" icon="i-lucide-download" color="success" block @click="downloadQr" />
              <UButton label="Print Registration Poster" icon="i-lucide-printer" color="neutral" variant="outline" block @click="printQr" />
              <UButton label="Copy Registration Link" icon="i-lucide-copy" color="neutral" variant="outline" block @click="copyLink" />
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h3 class="font-bold text-highlighted">Registration Link</h3>
            </template>
            <p class="break-all rounded-xl bg-elevated p-3 font-mono text-xs text-muted">{{ link.url }}</p>
            <p class="mt-3 text-xs leading-5 text-muted">{{ link.instructions }}</p>
          </UCard>
        </div>
      </div>
    </div>
  </UContainer>
</template>

<style scoped>
@media print {
  :global(body) {
    background: white !important;
  }

  :global(.registration-print-card) {
    box-shadow: none !important;
    border: 0 !important;
  }
}
</style>
