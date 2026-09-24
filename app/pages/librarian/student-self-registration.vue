<script setup lang="ts">
import QRCode from "qrcode";

definePageMeta({
  layout: "librarian",
  title: "Student Registration QR Code",
});

const registration = useStudentSelfRegistration();
const toast = useToast();

const generatingLink = ref(false);
const registrationUrl = ref("");
const qrDataUrl = ref("");

async function generateLink() {
  if (generatingLink.value) return;
  generatingLink.value = true;

  try {
    const result = await registration.createAccessLink();
    registrationUrl.value =
      result.registrationUrl ||
      new URL(result.registrationPath, window.location.origin).toString();
    qrDataUrl.value = await QRCode.toDataURL(registrationUrl.value, {
      width: 720,
      margin: 2,
      errorCorrectionLevel: "M",
    });
  } catch (error) {
    toast.add({
      title: "Unable to create the QR code",
      description: registration.errorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    generatingLink.value = false;
  }
}

async function copyLink() {
  if (!registrationUrl.value) return;
  await navigator.clipboard.writeText(registrationUrl.value);
  toast.add({
    title: "Registration link copied",
    color: "success",
    icon: "i-lucide-copy-check",
  });
}

function downloadQr() {
  if (!qrDataUrl.value) return;
  const link = document.createElement("a");
  link.href = qrDataUrl.value;
  link.download = `sncbt-student-registration-qr-${new Date()
    .toISOString()
    .slice(0, 10)}.png`;
  link.click();
}

function printQr() {
  if (!qrDataUrl.value || !registrationUrl.value) return;
  const windowRef = window.open("", "_blank", "width=760,height=900");
  if (!windowRef) return;

  windowRef.document.write(`<!doctype html><html><head><title>SNCBT Student Registration QR</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;color:#0f172a}img{width:520px;max-width:90%}h1{margin-bottom:8px}.url{font-size:11px;word-break:break-all;margin-top:20px}.note{font-size:14px;line-height:1.5;max-width:620px;margin:15px auto}</style></head><body><h1>SNCBT Library Student Registration</h1><p class="note">Scan this QR code to submit a Student Library membership and Student Portal account application. The Librarian must approve the application before sign-in becomes available.</p><img src="${qrDataUrl.value}" alt="Student registration QR code"><p class="url">${registrationUrl.value}</p><script>window.onload=()=>window.print()<\/script></body></html>`);
  windowRef.document.close();
}

onMounted(generateLink);
</script>

<template>
  <div class="sncbt-page-shell sncbt-staff-page sncbt-specialist-page space-y-6">
    <LibrarianPageHeader
      eyebrow="Student Registration"
      title="Registration QR Code"
      description="Display, download, or print the QR code Students can use to submit their Library membership and Portal account application."
      icon="i-lucide-qr-code"
    >
      <template #actions>
        <UButton to="/librarian/student-registration-approvals" label="Registration Approvals" icon="i-lucide-clipboard-check" color="primary" />
        <UButton to="/librarian/students" label="Back to Students" icon="i-lucide-arrow-left" color="neutral" variant="outline" />
      </template>
    </LibrarianPageHeader>

    <UAlert
      color="warning"
      variant="soft"
      icon="i-lucide-shield-alert"
      title="Approval is required before Student sign-in"
      description="A submitted application stays pending and does not appear in the normal Student list until a Librarian approves it."
    />

    <section class="overflow-hidden rounded-3xl border border-default bg-default shadow-sm">
      <div class="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="space-y-5">
          <div>
            <h2 class="text-lg font-bold text-highlighted">Public Registration Link</h2>
            <p class="mt-1 text-sm text-muted">
              This fixed URL opens the public Student registration form without requiring an existing account.
            </p>
          </div>

          <div v-if="registrationUrl" class="rounded-2xl border border-default bg-elevated p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">Registration URL</p>
            <p class="mt-2 break-all text-sm font-medium text-highlighted">{{ registrationUrl }}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              label="Refresh QR Code"
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="outline"
              :loading="generatingLink"
              @click="generateLink"
            />
            <UButton
              label="Copy Link"
              icon="i-lucide-copy"
              color="neutral"
              variant="outline"
              :disabled="!registrationUrl"
              @click="copyLink"
            />
            <UButton
              :to="registrationUrl || '/student-registration'"
              target="_blank"
              label="Open Registration Page"
              icon="i-lucide-external-link"
              color="neutral"
              variant="outline"
            />
            <UButton
              label="Download QR"
              icon="i-lucide-download"
              color="primary"
              variant="soft"
              :disabled="!qrDataUrl"
              @click="downloadQr"
            />
            <UButton
              label="Print QR"
              icon="i-lucide-printer"
              color="neutral"
              variant="outline"
              :disabled="!qrDataUrl"
              @click="printQr"
            />
          </div>

          <div class="rounded-2xl border border-default p-4 text-sm text-muted">
            <p class="font-semibold text-highlighted">Registration process</p>
            <ol class="mt-3 space-y-2 pl-5 list-decimal">
              <li>The Student scans the QR code and submits the complete form and photo.</li>
              <li>The application appears under Registration Approvals.</li>
              <li>The Librarian verifies the school ID or enrollment document.</li>
              <li>Approval activates the profile, membership, photo, and Portal account.</li>
            </ol>
          </div>
        </div>

        <div class="flex min-h-80 items-center justify-center rounded-2xl border border-dashed border-default bg-elevated p-5">
          <div v-if="qrDataUrl" class="text-center">
            <img
              :src="qrDataUrl"
              alt="Student registration QR code"
              class="mx-auto w-full max-w-72 rounded-xl bg-white p-2"
            >
            <p class="mt-3 text-xs text-muted">Official Student registration QR code</p>
          </div>
          <div v-else class="text-center text-muted">
            <UIcon name="i-lucide-loader-circle" class="mx-auto size-12 animate-spin" />
            <p class="mt-3 text-sm">Creating the QR code…</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
