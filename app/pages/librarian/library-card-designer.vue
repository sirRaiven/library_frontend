<script setup lang="ts">
import {
  DEFAULT_LIBRARY_CARD_DESIGN,
  LIBRARY_CARD_PRESETS,
  cloneLibraryCardDesign,
  normalizeLibraryCardDesign,
  type LibraryCardDesign,
} from "~/composables/useLibraryCardDesign";
import type {
  MembershipRecord,
  StudentMember,
} from "~/composables/useLibraryMembers";
import StudentLibraryCard from "~/components/librarian/StudentLibraryCard.vue";

definePageMeta({
  layout: "librarian",
  title: "Library Card Designer",
});

const cardDesign = useLibraryCardDesign();
const auth = useAuth();
const toast = useToast();

const backgroundInput = ref<HTMLInputElement | null>(null);
const logoInput = ref<HTMLInputElement | null>(null);
const importInput = ref<HTMLInputElement | null>(null);

const draft = reactive<LibraryCardDesign>(
  cloneLibraryCardDesign(DEFAULT_LIBRARY_CARD_DESIGN),
);

const loading = ref(true);
const uploadingBackground = ref(false);
const uploadingLogo = ref(false);
const importing = ref(false);

const previewStudent: StudentMember = {
  documentId: "preview-student",
  studentNo: "26-00883",
  libraryCardNo: "LC2026-0704",
  barcode: "LC2026-0704",
  firstName: "John",
  middleName: " ",
  lastName: " Doe",
  suffix: "",
  fullName: "Doe, John ",
  sex: "Male",
  course: "BS - INFORMATION TECHNOLOGY",
  yearLevel: 3,
  section: "A",
  email: "student@sncbt.edu.ph",
  contactNo: "",
  photoUrl: null,
  status: "Active",
  membership: null,
  address: ""
};

const previewMembership: MembershipRecord = {
  documentId: "preview-membership",
  membershipNo: "MEM-2026-000001",
  academicYear: "2026-2027",
  semester: "First Semester",
  issuedDate: "2026-06-15",
  expiryDate: "2026-10-31",
  status: "Active",
  storedStatus: "Active",
  renewalType: "Renewal",
  enrollmentVerified: true,
  enrollmentReference: "Enrollment Copy",
  verifiedBy: "Librarian",
  verifiedAt: "2026-06-15T08:00:00.000Z",
  remarks: null,
};

const layoutItems = [
  {
    label: "Cinematic Building",
    value: "cinematic",
  },
  {
    label: "Split Layout",
    value: "split",
  },
  {
    label: "Minimal Academic",
    value: "minimal",
  },
];

const backStyleItems = [
  {
    label: "Navy",
    value: "navy",
  },
  {
    label: "Light",
    value: "light",
  },
];

const backgroundModeItems = [
  {
    label: "Institution Image",
    value: "image",
  },
  {
    label: "Color Gradient",
    value: "gradient",
  },
  {
    label: "Solid Color",
    value: "solid",
  },
];

const photoShapeItems = [
  {
    label: "Rounded",
    value: "rounded",
  },
  {
    label: "Square",
    value: "square",
  },
  {
    label: "Circle",
    value: "circle",
  },
];

type ColorFieldKey =
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "surfaceColor"
  | "textColor"
  | "mutedTextColor"
  | "photoBorderColor";

type VisibilityFieldKey =
  | "showPhoto"
  | "showStudentNumber"
  | "showCourse"
  | "showCardNumber"
  | "showMembershipStatus"
  | "showValidityTable"
  | "showBarcode";

const colorFields: Array<{
  key: ColorFieldKey;
  label: string;
}> = [
  {
    key: "primaryColor",
    label: "Primary Navy",
  },
  {
    key: "secondaryColor",
    label: "Secondary",
  },
  {
    key: "accentColor",
    label: "Accent",
  },
  {
    key: "surfaceColor",
    label: "Surface",
  },
  {
    key: "textColor",
    label: "Main Text",
  },
  {
    key: "mutedTextColor",
    label: "Muted Text",
  },
  {
    key: "photoBorderColor",
    label: "Photo Border",
  },
];

const visibilityFields: Array<{
  key: VisibilityFieldKey;
  label: string;
}> = [
  {
    key: "showPhoto",
    label: "Student Photo",
  },
  {
    key: "showStudentNumber",
    label: "Student Number",
  },
  {
    key: "showCourse",
    label: "Course / Program",
  },
  {
    key: "showCardNumber",
    label: "Library Card Number",
  },
  {
    key: "showMembershipStatus",
    label: "Membership Status",
  },
  {
    key: "showValidityTable",
    label: "Semester Validity Table",
  },
  {
    key: "showBarcode",
    label: "Barcode",
  },
];

const saving = cardDesign.saving;

function chooseBackgroundImage() {
  backgroundInput.value?.click();
}

function chooseLogoImage() {
  logoInput.value?.click();
}

function chooseImportFile() {
  importInput.value?.click();
}

function colorValue(key: ColorFieldKey): string {
  return draft[key];
}

function setColorValue(key: ColorFieldKey, value: unknown) {
  draft[key] = String(value ?? "");
}

function onNativeColorInput(key: ColorFieldKey, event: Event) {
  const input = event.target as HTMLInputElement;

  setColorValue(key, input.value);
}

function visibilityValue(key: VisibilityFieldKey): boolean {
  return draft[key];
}

function setVisibilityValue(key: VisibilityFieldKey, value: unknown) {
  draft[key] = Boolean(value);
}

const hasUnsavedChanges = computed(
  () =>
    JSON.stringify(normalizeLibraryCardDesign(draft)) !==
    JSON.stringify(cardDesign.design.value),
);

function replaceDraft(value: LibraryCardDesign) {
  Object.assign(draft, cloneLibraryCardDesign(value));
}

function applyPreset(key: "building" | "gradient" | "minimal") {
  replaceDraft(cloneLibraryCardDesign(LIBRARY_CARD_PRESETS[key]));

  toast.add({
    title: "Preset applied",
    description: "Review the preview, then save it as the active design.",
    color: "info",
    icon: "i-lucide-palette",
  });
}

async function saveDesign() {
  try {
    const saved = await cardDesign.saveDesign(draft);

    replaceDraft(saved);

    toast.add({
      title: "Design saved",
      description:
        "The saved layout is now used by Student Library Card previews and downloads.",
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    toast.add({
      title: "Unable to save design",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

async function resetToDefault() {
  replaceDraft(cloneLibraryCardDesign(DEFAULT_LIBRARY_CARD_DESIGN));

  toast.add({
    title: "Default restored locally",
    description: "Click Save Design to make it active for all librarians.",
    color: "info",
    icon: "i-lucide-rotate-ccw",
  });
}

function exportDesign() {
  const content = JSON.stringify(normalizeLibraryCardDesign(draft), null, 2);

  const blob = new Blob([content], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "sncbt-library-card-design.json";

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importDesign(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  importing.value = true;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as Partial<LibraryCardDesign>;

    replaceDraft(normalizeLibraryCardDesign(parsed));

    toast.add({
      title: "Design imported",
      description:
        "The imported settings are shown in the preview. Save to activate them.",
      color: "success",
      icon: "i-lucide-file-check-2",
    });
  } catch (error) {
    toast.add({
      title: "Invalid design file",
      description:
        error instanceof Error
          ? error.message
          : "The JSON file could not be imported.",
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    importing.value = false;
    input.value = "";
  }
}

async function uploadBackground(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  uploadingBackground.value = true;

  try {
    const url = await cardDesign.uploadAsset(file);

    draft.backgroundImage = url;
    draft.backgroundMode = "image";

    toast.add({
      title: "Background uploaded",
      description: "The uploaded image is now displayed in the live preview.",
      color: "success",
      icon: "i-lucide-image",
    });
  } catch (error) {
    toast.add({
      title: "Background upload failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    uploadingBackground.value = false;
    input.value = "";
  }
}

async function uploadLogo(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  uploadingLogo.value = true;

  try {
    const url = await cardDesign.uploadAsset(file);

    draft.logoUrl = url;
    draft.showLogo = true;

    toast.add({
      title: "Logo uploaded",
      description: "The uploaded logo is now displayed in the live preview.",
      color: "success",
      icon: "i-lucide-badge-check",
    });
  } catch (error) {
    toast.add({
      title: "Logo upload failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    uploadingLogo.value = false;
    input.value = "";
  }
}

onMounted(async () => {
  try {
    const current = await cardDesign.loadDesign(true);

    replaceDraft(current);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-[1700px] space-y-6">
      <div
        class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          >
            <UIcon name="i-lucide-palette" class="size-6" />
          </div>

          <div>
            <h1
              class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              Library Card Designer
            </h1>

            <p class="mt-1 max-w-4xl text-sm leading-relaxed text-muted">
              Modify the Student Library Card branding, colors, institution
              background, layout, content visibility, validity panel, and
              barcode presentation. Saved settings are reused across the
              Students and Membership pages.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            label="Import JSON"
            icon="i-lucide-file-up"
            color="neutral"
            variant="outline"
            :loading="importing"
            @click="chooseImportFile"
          />

          <UButton
            label="Export JSON"
            icon="i-lucide-file-down"
            color="neutral"
            variant="outline"
            @click="exportDesign"
          />

          <UButton
            label="Reset"
            icon="i-lucide-rotate-ccw"
            color="neutral"
            variant="soft"
            @click="resetToDefault"
          />

          <UButton
            :label="hasUnsavedChanges ? 'Save Design' : 'Design Saved'"
            :icon="
              hasUnsavedChanges ? 'i-lucide-save' : 'i-lucide-circle-check'
            "
            color="primary"
            :loading="saving"
            :disabled="!hasUnsavedChanges"
            @click="saveDesign"
          />
        </div>
      </div>

      <input
        ref="importInput"
        type="file"
        accept="application/json,.json"
        class="hidden"
        @change="importDesign"
      />

      <div v-if="loading" class="grid gap-6 xl:grid-cols-[26rem_minmax(0,1fr)]">
        <USkeleton class="h-[900px] w-full" />
        <USkeleton class="h-[720px] w-full" />
      </div>

      <div
        v-else
        class="grid items-start gap-6 xl:grid-cols-[26rem_minmax(0,1fr)]"
      >
        <div class="space-y-4">
          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Quick Presets</h2>
                <p class="mt-1 text-sm text-muted">
                  Start from a complete design, then customize it.
                </p>
              </div>
            </template>

            <div class="grid gap-2">
              <UButton
                label="Modern Building"
                icon="i-lucide-building-2"
                color="primary"
                variant="soft"
                block
                @click="applyPreset('building')"
              />

              <UButton
                label="Navy Aurora"
                icon="i-lucide-sparkles"
                color="neutral"
                variant="soft"
                block
                @click="applyPreset('gradient')"
              />

              <UButton
                label="Minimal Academic"
                icon="i-lucide-layout-template"
                color="neutral"
                variant="soft"
                block
                @click="applyPreset('minimal')"
              />
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">Branding</h2>
            </template>

            <div class="space-y-4">
              <UFormField label="Design Name">
                <UInput v-model="draft.designName" class="w-full" />
              </UFormField>

              <UFormField label="Institution Name">
                <UTextarea
                  v-model="draft.institutionName"
                  :rows="2"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Card Title">
                <UInput v-model="draft.cardTitle" class="w-full" />
              </UFormField>

              <UFormField label="Front Tagline">
                <UInput v-model="draft.frontTagline" class="w-full" />
              </UFormField>

              <UFormField label="Department Label">
                <UInput v-model="draft.departmentLabel" class="w-full" />
              </UFormField>

              <div class="rounded-xl border border-default bg-elevated/40 p-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-highlighted">
                      Institution Logo
                    </p>
                    <p class="text-xs text-muted">
                      PNG with a transparent background is recommended.
                    </p>
                  </div>

                  <USwitch v-model="draft.showLogo" />
                </div>

                <UInput
                  v-model="draft.logoUrl"
                  placeholder="/sncbt-logo.png"
                  class="mt-3 w-full"
                />

                <input
                  ref="logoInput"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="hidden"
                  @change="uploadLogo"
                />

                <UButton
                  label="Upload Logo"
                  icon="i-lucide-upload"
                  color="neutral"
                  variant="outline"
                  block
                  class="mt-2"
                  :loading="uploadingLogo"
                  @click="chooseLogoImage"
                />
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">
                Layout & Background
              </h2>
            </template>

            <div class="space-y-4">
              <UFormField label="Front Layout">
                <USelect
                  v-model="draft.frontLayout"
                  :items="layoutItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Back Style">
                <USelect
                  v-model="draft.backStyle"
                  :items="backStyleItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Background Mode">
                <USelect
                  v-model="draft.backgroundMode"
                  :items="backgroundModeItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <div v-if="draft.backgroundMode === 'image'" class="space-y-3">
                <UFormField label="Background Image URL">
                  <UInput
                    v-model="draft.backgroundImage"
                    placeholder="/library-card/sncbt-building.jpg"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Image Position">
                  <UInput
                    v-model="draft.backgroundPosition"
                    placeholder="center 45%"
                    class="w-full"
                  />
                </UFormField>

                <input
                  ref="backgroundInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="uploadBackground"
                />

                <UButton
                  label="Upload Background"
                  icon="i-lucide-image-up"
                  color="neutral"
                  variant="outline"
                  block
                  :loading="uploadingBackground"
                  @click="chooseBackgroundImage"
                />
              </div>

              <UFormField
                label="Overlay Strength"
                :description="`${draft.overlayOpacity}%`"
              >
                <input
                  v-model.number="draft.overlayOpacity"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  class="w-full accent-current"
                />
              </UFormField>

              <UFormField
                label="Corner Radius"
                :description="`${draft.cornerRadius}px`"
              >
                <input
                  v-model.number="draft.cornerRadius"
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  class="w-full accent-current"
                />
              </UFormField>

              <UFormField label="Photo Shape">
                <USelect
                  v-model="draft.photoShape"
                  :items="photoShapeItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">Color Palette</h2>
            </template>

            <div class="space-y-3">
              <label
                v-for="field in colorFields"
                :key="field.key"
                class="flex items-center gap-3 rounded-xl border border-default p-3"
              >
                <input
                  :value="colorValue(field.key)"
                  type="color"
                  class="size-10 cursor-pointer rounded-lg border-0 bg-transparent"
                  @input="onNativeColorInput(field.key, $event)"
                />

                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-highlighted">
                    {{ field.label }}
                  </p>

                  <UInput
                    :model-value="colorValue(field.key)"
                    class="mt-1 w-full"
                    @update:model-value="setColorValue(field.key, $event)"
                  />
                </div>
              </label>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">
                Visible Information
              </h2>
            </template>

            <div class="space-y-3">
              <label
                v-for="field in visibilityFields"
                :key="field.key"
                class="flex items-center justify-between gap-3 rounded-xl border border-default p-3"
              >
                <span class="text-sm font-medium text-highlighted">
                  {{ field.label }}
                </span>

                <USwitch
                  :model-value="visibilityValue(field.key)"
                  @update:model-value="setVisibilityValue(field.key, $event)"
                />
              </label>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">Back Card Text</h2>
            </template>

            <div class="space-y-4">
              <UFormField label="Transaction Notice">
                <UTextarea
                  v-model="draft.noticeText"
                  :rows="2"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Validity Heading">
                <UInput v-model="draft.validityTitle" class="w-full" />
              </UFormField>

              <UFormField label="Librarian Label">
                <UInput v-model="draft.librarianLabel" class="w-full" />
              </UFormField>

              <UFormField label="Footer Text">
                <UTextarea
                  v-model="draft.backFooterText"
                  :rows="2"
                  class="w-full"
                />
              </UFormField>
            </div>
          </UCard>
        </div>

        <div class="space-y-4 xl:sticky xl:top-6">
          <UCard>
            <template #header>
              <div
                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 class="font-semibold text-highlighted">Live Preview</h2>
                  <p class="mt-1 text-sm text-muted">
                    Sample information follows the existing physical card:
                    Gomez, Karl Lian A.; 23-00883; BS - Information Technology;
                    LC2023-0704.
                  </p>
                </div>

                <UBadge
                  :color="hasUnsavedChanges ? 'warning' : 'success'"
                  variant="soft"
                >
                  {{ hasUnsavedChanges ? "Unsaved Changes" : "Saved Design" }}
                </UBadge>
              </div>
            </template>

            <StudentLibraryCard
              :student="previewStudent"
              :membership="previewMembership"
              :design="draft"
              preview-mode
            />
          </UCard>

          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            title="Image upload permission"
            description="Uploading a custom logo or background uses Strapi's Upload API. Enable the Upload permission for the Librarian role, or place images in Nuxt's public folder and enter their /path here."
          />
        </div>
      </div>
    </div>
  </UContainer>
</template>
