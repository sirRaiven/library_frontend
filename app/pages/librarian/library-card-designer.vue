<script setup lang="ts">
import {
  DEFAULT_LIBRARY_CARD_DESIGN,
  LIBRARY_CARD_PRESET_CATEGORIES,
  LIBRARY_CARD_PRESETS,
  cloneLibraryCardDesign,
  normalizeLibraryCardDesign,
  type LibraryCardDesign,
  type LibraryCardPreset,
  type LibraryCardPresetCategory,
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

const cardDesign =
  useLibraryCardDesign();
const auth = useAuth();
const toast = useToast();

const backgroundInput =
  ref<HTMLInputElement | null>(null);
const logoInput =
  ref<HTMLInputElement | null>(null);
const importInput =
  ref<HTMLInputElement | null>(null);

const draft = reactive<LibraryCardDesign>(
  cloneLibraryCardDesign(
    DEFAULT_LIBRARY_CARD_DESIGN,
  ),
);

const loading = ref(true);
const uploadingBackground =
  ref(false);
const uploadingLogo = ref(false);
const importing = ref(false);
const presetCategory =
  ref<"All" | LibraryCardPresetCategory>(
    "All",
  );

const saveState = ref<
  "idle" | "saving" | "saved" | "error"
>("idle");
const savedAt = ref<Date | null>(null);

const previewStudent =
  {
    documentId: "preview-student",
    studentNo: "23-00123",
    libraryCardNo: "LC2026-0123",
    barcode: "LC2026-0123",
    firstName: "John",
    middleName: "B.",
    lastName: "Doe",
    suffix: "",
    fullName:
      "Doe, John B.",
    sex: "Male",
    course:
      "BS - INFORMATION TECHNOLOGY",
    yearLevel: 2,
    section: "A",
    email:
      "john.doe@student.sncbt.edu.ph",
    contactNo: "0912 345 6789",
    address:
      "City of San Fernando, Pampanga",
    photoUrl: null,
    status: "Active",
    membership: null,
  } as StudentMember & {
    address: string;
  };

const previewMembership:
  MembershipRecord = {
    documentId:
      "preview-membership",
    membershipNo:
      "MEM-2026-000001",
    academicYear: "2026-2027",
    semester: "First Semester",
    issuedDate: "2026-06-15",
    expiryDate: "2026-10-31",
    status: "Active",
    storedStatus: "Active",
    renewalType: "Renewal",
    enrollmentVerified: true,
    enrollmentReference:
      "Enrollment Copy",
    verifiedBy: "Librarian",
    verifiedAt:
      "2026-06-15T08:00:00.000Z",
    remarks: null,
  };

const layoutItems = [
  {
    label:
      "Cinematic Building",
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
  {
    label: "Glass Panel",
    value: "glass",
  },
  {
    label: "Diagonal Modern",
    value: "diagonal",
  },
  {
    label: "Portrait Focus",
    value: "portrait",
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
  {
    label: "Gradient",
    value: "gradient",
  },
];

const backLayoutItems = [
  {
    label:
      "Credential + Student Details",
    value: "credential",
  },
  {
    label:
      "Profile + Wide Barcode",
    value: "profile",
  },
  {
    label:
      "Minimal Barcode",
    value: "minimal",
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
  | "showBarcode"
  | "showBackStudentDetails"
  | "showYearSection"
  | "showEmail"
  | "showAddress";

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
  description: string;
}> = [
  {
    key: "showPhoto",
    label: "Student Photo",
    description:
      "Show the student photo on the front.",
  },
  {
    key: "showStudentNumber",
    label: "Student Number",
    description:
      "Display the student number on both sides.",
  },
  {
    key: "showCourse",
    label: "Course / Program",
    description:
      "Display the registered academic program.",
  },
  {
    key: "showCardNumber",
    label: "Library Card Number",
    description:
      "Display the permanent library-card number.",
  },
  {
    key: "showMembershipStatus",
    label: "Membership Status",
    description:
      "Optional visual status on the front. Disabled by default because renewal is checked electronically.",
  },
  {
    key: "showBarcode",
    label: "Barcode",
    description:
      "Required for membership verification and renewal.",
  },
  {
    key: "showBackStudentDetails",
    label: "Back Cardholder Details",
    description:
      "Add student information beside the barcode.",
  },
  {
    key: "showYearSection",
    label: "Year / Section",
    description:
      "Display year level and section on the back.",
  },
  {
    key: "showEmail",
    label: "Student Email",
    description:
      "Display the student email on the back.",
  },
  {
    key: "showAddress",
    label: "Student Address",
    description:
      "Display the registered address on the back.",
  },
];

const saving = cardDesign.saving;

const filteredPresets = computed(() =>
  presetCategory.value === "All"
    ? LIBRARY_CARD_PRESETS
    : LIBRARY_CARD_PRESETS.filter(
        (item) =>
          item.category ===
          presetCategory.value,
      ),
);

const hasUnsavedChanges = computed(
  () =>
    JSON.stringify(
      normalizeLibraryCardDesign(
        draft,
      ),
    ) !==
    JSON.stringify(
      cardDesign.design.value,
    ),
);

const saveButtonLabel = computed(() => {
  if (saving.value) {
    return "Saving Design…";
  }

  return hasUnsavedChanges.value
    ? "Save & Activate Design"
    : "Active Design Saved";
});

const saveStatusText = computed(() => {
  if (saveState.value === "saving") {
    return "Saving the active design to Strapi…";
  }

  if (saveState.value === "error") {
    return "The design could not be saved. Review the error message and try again.";
  }

  if (
    saveState.value === "saved" &&
    savedAt.value
  ) {
    return `Saved at ${new Intl.DateTimeFormat(
      "en-PH",
      {
        hour: "numeric",
        minute: "2-digit",
      },
    ).format(savedAt.value)}.`;
  }

  return hasUnsavedChanges.value
    ? "You have unsaved design changes."
    : "The preview matches the active saved design.";
});

function chooseBackgroundImage() {
  backgroundInput.value?.click();
}

function chooseLogoImage() {
  logoInput.value?.click();
}

function chooseImportFile() {
  importInput.value?.click();
}

function colorValue(
  key: ColorFieldKey,
): string {
  return draft[key];
}

function setColorValue(
  key: ColorFieldKey,
  value: unknown,
) {
  draft[key] = String(value ?? "");
}

function onNativeColorInput(
  key: ColorFieldKey,
  event: Event,
) {
  const input =
    event.target as HTMLInputElement;

  setColorValue(
    key,
    input.value,
  );
}

function visibilityValue(
  key: VisibilityFieldKey,
): boolean {
  return draft[key];
}

function setVisibilityValue(
  key: VisibilityFieldKey,
  value: unknown,
) {
  draft[key] = Boolean(value);
}

function replaceDraft(
  value: LibraryCardDesign,
) {
  Object.assign(
    draft,
    cloneLibraryCardDesign(value),
  );
}

function applyPreset(
  selectedPreset:
    LibraryCardPreset,
) {
  replaceDraft(
    cloneLibraryCardDesign(
      selectedPreset.design,
    ),
  );

  saveState.value = "idle";

  toast.add({
    title:
      `${selectedPreset.name} applied`,
    description:
      "Review the live preview, then save and activate the design.",
    color: "info",
    icon: "i-lucide-palette",
  });
}

function presetPreviewStyle(
  selectedPreset:
    LibraryCardPreset,
) {
  const design =
    selectedPreset.design;

  if (
    design.backgroundMode === "image"
  ) {
    return {
      backgroundImage:
        `linear-gradient(110deg, ${design.primaryColor}E8, ${design.secondaryColor}55), url("${design.backgroundImage}")`,
      backgroundPosition:
        design.backgroundPosition,
      backgroundSize: "cover",
    };
  }

  if (
    design.backgroundMode ===
    "gradient"
  ) {
    return {
      backgroundImage:
        `linear-gradient(135deg, ${design.primaryColor}, ${design.secondaryColor})`,
    };
  }

  return {
    backgroundColor:
      design.primaryColor,
  };
}

async function saveDesign() {
  if (
    saving.value ||
    !hasUnsavedChanges.value
  ) {
    return;
  }

  saveState.value = "saving";

  try {
    const saved =
      await cardDesign.saveDesign(
        draft,
      );

    replaceDraft(saved);
    savedAt.value = new Date();
    saveState.value = "saved";

    toast.add({
      title:
        "Design saved and activated",
      description:
        "The design is now used by Student Library Card previews and downloads.",
      color: "success",
      icon: "i-lucide-circle-check",
    });
  } catch (error) {
    saveState.value = "error";

    toast.add({
      title:
        "Unable to save design",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  }
}

function resetToDefault() {
  replaceDraft(
    cloneLibraryCardDesign(
      DEFAULT_LIBRARY_CARD_DESIGN,
    ),
  );

  saveState.value = "idle";

  toast.add({
    title:
      "Default design restored",
    description:
      "Save and activate it to apply the default design to all Student cards.",
    color: "info",
    icon: "i-lucide-rotate-ccw",
  });
}

function exportDesign() {
  const content = JSON.stringify(
    normalizeLibraryCardDesign(
      draft,
    ),
    null,
    2,
  );

  const blob = new Blob(
    [content],
    {
      type: "application/json",
    },
  );

  const url =
    URL.createObjectURL(blob);
  const link =
    document.createElement("a");

  link.href = url;
  link.download =
    "sncbt-library-card-design.json";

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importDesign(
  event: Event,
) {
  const input =
    event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  importing.value = true;

  try {
    const fileText =
      await file.text();
    const parsed =
      JSON.parse(fileText) as Partial<LibraryCardDesign>;

    replaceDraft(
      normalizeLibraryCardDesign(
        parsed,
      ),
    );

    saveState.value = "idle";

    toast.add({
      title: "Design imported",
      description:
        "The imported design is shown in the preview. Save and activate it when ready.",
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

async function uploadBackground(
  event: Event,
) {
  const input =
    event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  uploadingBackground.value = true;

  try {
    const url =
      await cardDesign.uploadAsset(
        file,
      );

    draft.backgroundImage = url;
    draft.backgroundMode = "image";
    saveState.value = "idle";

    toast.add({
      title:
        "Background uploaded",
      description:
        "The uploaded image is displayed in the live preview.",
      color: "success",
      icon: "i-lucide-image",
    });
  } catch (error) {
    toast.add({
      title:
        "Background upload failed",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    uploadingBackground.value = false;
    input.value = "";
  }
}

async function uploadLogo(
  event: Event,
) {
  const input =
    event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  uploadingLogo.value = true;

  try {
    const url =
      await cardDesign.uploadAsset(
        file,
      );

    draft.logoUrl = url;
    draft.showLogo = true;
    saveState.value = "idle";

    toast.add({
      title: "Logo uploaded",
      description:
        "The uploaded logo is displayed in the live preview.",
      color: "success",
      icon: "i-lucide-badge-check",
    });
  } catch (error) {
    toast.add({
      title:
        "Logo upload failed",
      description:
        auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-alert",
    });
  } finally {
    uploadingLogo.value = false;
    input.value = "";
  }
}

function handleSaveShortcut(
  event: KeyboardEvent,
) {
  if (
    (event.ctrlKey ||
      event.metaKey) &&
    event.key.toLowerCase() === "s"
  ) {
    event.preventDefault();
    void saveDesign();
  }
}

onBeforeRouteLeave(() => {
  if (
    !hasUnsavedChanges.value ||
    !import.meta.client
  ) {
    return true;
  }

  return window.confirm(
    "You have unsaved Library Card design changes. Leave this page without saving?",
  );
});

onMounted(async () => {
  window.addEventListener(
    "keydown",
    handleSaveShortcut,
  );

  try {
    const current =
      await cardDesign.loadDesign(
        true,
      );

    replaceDraft(current);
    saveState.value = "saved";
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener(
      "keydown",
      handleSaveShortcut,
    );
  }
});
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div
      class="mx-auto max-w-[1750px] space-y-6"
    >
      <div
        class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
      >
        <div
          class="flex items-start gap-3"
        >
          <div
            class="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"
          >
            <UIcon
              name="i-lucide-palette"
              class="size-6"
            />
          </div>

          <div>
            <h1
              class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
            >
              Library Card Designer
            </h1>

            <p
              class="mt-1 max-w-4xl text-sm leading-relaxed text-muted"
            >
              Choose a categorized preset or
              build a custom Student Library
              Card. The printed card remains
              permanent; current semester
              membership is verified digitally
              through the barcode.
            </p>
          </div>
        </div>

        <div
          class="flex flex-wrap items-center gap-2"
        >
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
            :label="saveButtonLabel"
            :icon="
              hasUnsavedChanges
                ? 'i-lucide-save'
                : 'i-lucide-circle-check'
            "
            color="primary"
            size="lg"
            :loading="saving"
            :disabled="
              !hasUnsavedChanges
            "
            aria-keyshortcuts="Control+S Meta+S"
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

      <div
        aria-live="polite"
        class="sr-only"
      >
        {{ saveStatusText }}
      </div>

      <div
        v-if="loading"
        class="grid gap-6 xl:grid-cols-[28rem_minmax(0,1fr)]"
      >
        <USkeleton
          class="h-225 w-full"
        />
        <USkeleton
          class="h-180 w-full"
        />
      </div>

      <div
        v-else
        class="grid items-start gap-6 xl:grid-cols-[28rem_minmax(0,1fr)]"
      >
        <div class="space-y-4">
          <UCard>
            <template #header>
              <div>
                <h2
                  class="font-semibold text-highlighted"
                >
                  Design Presets
                </h2>
                <p
                  class="mt-1 text-sm text-muted"
                >
                  Select a category and use a
                  complete preset as your
                  starting point.
                </p>
              </div>
            </template>

            <div
              class="flex flex-wrap gap-2"
            >
              <UButton
                v-for="
                  category in
                  LIBRARY_CARD_PRESET_CATEGORIES
                "
                :key="category"
                :label="category"
                size="sm"
                :color="
                  presetCategory ===
                  category
                    ? 'primary'
                    : 'neutral'
                "
                :variant="
                  presetCategory ===
                  category
                    ? 'solid'
                    : 'soft'
                "
                @click="() => {
                  presetCategory =
                    category
                }"
              />
            </div>

            <div
              class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1"
            >
              <button
                v-for="
                  selectedPreset in
                  filteredPresets
                "
                :key="
                  selectedPreset.key
                "
                type="button"
                class="preset-card"
                @click="
                  applyPreset(
                    selectedPreset,
                  )
                "
              >
                <div
                  class="preset-preview"
                  :style="
                    presetPreviewStyle(
                      selectedPreset,
                    )
                  "
                >
                  <div
                    class="preset-preview-logo"
                  >
                    <UIcon
                      :name="
                        selectedPreset.icon
                      "
                      class="size-5"
                    />
                  </div>

                  <div
                    class="preset-preview-lines"
                  >
                    <span />
                    <span />
                    <span />
                  </div>
                </div>

                <div
                  class="min-w-0 flex-1 text-left"
                >
                  <div
                    class="flex items-center justify-between gap-2"
                  >
                    <p
                      class="font-semibold text-highlighted"
                    >
                      {{
                        selectedPreset.name
                      }}
                    </p>

                    <UBadge
                      color="neutral"
                      variant="soft"
                      size="sm"
                    >
                      {{
                        selectedPreset.category
                      }}
                    </UBadge>
                  </div>

                  <p
                    class="mt-1 text-xs leading-relaxed text-muted"
                  >
                    {{
                      selectedPreset.description
                    }}
                  </p>
                </div>
              </button>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2
                class="font-semibold text-highlighted"
              >
                Branding
              </h2>
            </template>

            <div class="space-y-4">
              <UFormField
                label="Design Name"
              >
                <UInput
                  v-model="
                    draft.designName
                  "
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Institution Name"
              >
                <UTextarea
                  v-model="
                    draft.institutionName
                  "
                  :rows="2"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Card Title"
              >
                <UInput
                  v-model="
                    draft.cardTitle
                  "
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Front Tagline"
              >
                <UInput
                  v-model="
                    draft.frontTagline
                  "
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Department Label"
              >
                <UInput
                  v-model="
                    draft.departmentLabel
                  "
                  class="w-full"
                />
              </UFormField>

              <div
                class="rounded-xl border border-default bg-elevated/40 p-4"
              >
                <div
                  class="flex items-center justify-between gap-3"
                >
                  <div>
                    <p
                      class="text-sm font-medium text-highlighted"
                    >
                      Institution Logo
                    </p>
                    <p
                      class="text-xs text-muted"
                    >
                      A transparent PNG is
                      recommended.
                    </p>
                  </div>

                  <USwitch
                    v-model="
                      draft.showLogo
                    "
                  />
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
                  :loading="
                    uploadingLogo
                  "
                  @click="
                    chooseLogoImage
                  "
                />
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2
                class="font-semibold text-highlighted"
              >
                Layout & Background
              </h2>
            </template>

            <div class="space-y-4">
              <UFormField
                label="Front Layout"
              >
                <USelect
                  v-model="
                    draft.frontLayout
                  "
                  :items="layoutItems"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Back Layout"
              >
                <USelect
                  v-model="
                    draft.backLayout
                  "
                  :items="
                    backLayoutItems
                  "
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Back Style"
              >
                <USelect
                  v-model="
                    draft.backStyle
                  "
                  :items="
                    backStyleItems
                  "
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Background Mode"
              >
                <USelect
                  v-model="
                    draft.backgroundMode
                  "
                  :items="
                    backgroundModeItems
                  "
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <div
                v-if="
                  draft.backgroundMode ===
                  'image'
                "
                class="space-y-3"
              >
                <UFormField
                  label="Background Image URL"
                  description="The bundled SNCBT building image is /library-card/sncbt-building.jpg."
                >
                  <UInput
                    v-model="
                      draft.backgroundImage
                    "
                    placeholder="/library-card/sncbt-building.jpg"
                    class="w-full"
                  />
                </UFormField>

                <UFormField
                  label="Image Position"
                >
                  <UInput
                    v-model="
                      draft.backgroundPosition
                    "
                    placeholder="center 45%"
                    class="w-full"
                  />
                </UFormField>

                <input
                  ref="backgroundInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="
                    uploadBackground
                  "
                />

                <UButton
                  label="Upload Background"
                  icon="i-lucide-image-up"
                  color="neutral"
                  variant="outline"
                  block
                  :loading="
                    uploadingBackground
                  "
                  @click="
                    chooseBackgroundImage
                  "
                />
              </div>

              <UFormField
                label="Overlay Strength"
                :description="`${draft.overlayOpacity}%`"
              >
                <input
                  v-model.number="
                    draft.overlayOpacity
                  "
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
                  v-model.number="
                    draft.cornerRadius
                  "
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  class="w-full accent-current"
                />
              </UFormField>

              <UFormField
                label="Font Scale"
                :description="`${draft.fontScale}%`"
              >
                <input
                  v-model.number="
                    draft.fontScale
                  "
                  type="range"
                  min="85"
                  max="120"
                  step="1"
                  class="w-full accent-current"
                />
              </UFormField>

              <UFormField
                label="Photo Shape"
              >
                <USelect
                  v-model="
                    draft.photoShape
                  "
                  :items="
                    photoShapeItems
                  "
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2
                class="font-semibold text-highlighted"
              >
                Color Palette
              </h2>
            </template>

            <div class="space-y-3">
              <label
                v-for="
                  field in colorFields
                "
                :key="field.key"
                class="flex items-center gap-3 rounded-xl border border-default p-3"
              >
                <input
                  :value="
                    colorValue(field.key)
                  "
                  type="color"
                  class="size-10 cursor-pointer rounded-lg border-0 bg-transparent"
                  @input="
                    onNativeColorInput(
                      field.key,
                      $event,
                    )
                  "
                />

                <div
                  class="min-w-0 flex-1"
                >
                  <p
                    class="text-sm font-medium text-highlighted"
                  >
                    {{ field.label }}
                  </p>

                  <UInput
                    :model-value="
                      colorValue(
                        field.key,
                      )
                    "
                    class="mt-1 w-full"
                    @update:model-value="
                      setColorValue(
                        field.key,
                        $event,
                      )
                    "
                  />
                </div>
              </label>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h2
                  class="font-semibold text-highlighted"
                >
                  Visible Information
                </h2>
                <p
                  class="mt-1 text-sm text-muted"
                >
                  The validity table and printed
                  expiration date were removed.
                  Renewal is verified using the
                  permanent barcode.
                </p>
              </div>
            </template>

            <div class="space-y-3">
              <label
                v-for="
                  field in
                  visibilityFields
                "
                :key="field.key"
                class="flex items-start justify-between gap-3 rounded-xl border border-default p-3"
              >
                <div>
                  <span
                    class="text-sm font-medium text-highlighted"
                  >
                    {{ field.label }}
                  </span>
                  <p
                    class="mt-1 text-xs leading-relaxed text-muted"
                  >
                    {{
                      field.description
                    }}
                  </p>
                </div>

                <USwitch
                  :model-value="
                    visibilityValue(
                      field.key,
                    )
                  "
                  @update:model-value="
                    setVisibilityValue(
                      field.key,
                      $event,
                    )
                  "
                />
              </label>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2
                class="font-semibold text-highlighted"
              >
                Back Card Content
              </h2>
            </template>

            <div class="space-y-4">
              <UFormField
                label="Back Heading"
              >
                <UInput
                  v-model="
                    draft.backTitle
                  "
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Barcode Instruction"
              >
                <UTextarea
                  v-model="
                    draft.noticeText
                  "
                  :rows="2"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Librarian Label"
              >
                <UInput
                  v-model="
                    draft.librarianLabel
                  "
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Footer Text"
              >
                <UTextarea
                  v-model="
                    draft.backFooterText
                  "
                  :rows="2"
                  class="w-full"
                />
              </UFormField>
            </div>
          </UCard>
        </div>

        <div
          class="space-y-4 xl:sticky xl:top-6"
        >
          <UCard>
            <template #header>
              <div
                class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Live Preview
                  </h2>
                  <p
                    class="mt-1 text-sm text-muted"
                  >
                    The preview uses the sample
                    details from the existing
                    SNCBT Library Card.
                  </p>
                </div>

                <UBadge
                  :color="
                    hasUnsavedChanges
                      ? 'warning'
                      : 'success'
                  "
                  variant="soft"
                >
                  {{
                    hasUnsavedChanges
                      ? "Unsaved Changes"
                      : "Active Design"
                  }}
                </UBadge>
              </div>
            </template>

            <StudentLibraryCard
              :student="previewStudent"
              :membership="
                previewMembership
              "
              :design="draft"
              preview-mode
            />
          </UCard>

          <UAlert
            color="info"
            variant="soft"
            icon="i-lucide-info"
            title="Permanent barcode workflow"
            description="The card no longer prints the current term or validity date. The librarian scans the permanent barcode to verify or renew the current membership in the system."
          />
        </div>
      </div>

      <div
        class="sticky-save-bar"
      >
        <div
          class="flex min-w-0 items-center gap-3"
        >
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <UIcon
              :name="
                hasUnsavedChanges
                  ? 'i-lucide-save'
                  : 'i-lucide-circle-check'
              "
              class="size-5"
            />
          </div>

          <div class="min-w-0">
            <p
              class="font-semibold text-highlighted"
            >
              {{
                hasUnsavedChanges
                  ? "Unsaved design changes"
                  : "Active design is saved"
              }}
            </p>
            <p
              class="truncate text-sm text-muted"
            >
              {{ saveStatusText }}
              <span
                class="hidden sm:inline"
              >
                Press Ctrl+S or Command+S
                to save.
              </span>
            </p>
          </div>
        </div>

        <UButton
          :label="saveButtonLabel"
          :icon="
            hasUnsavedChanges
              ? 'i-lucide-save'
              : 'i-lucide-circle-check'
          "
          color="primary"
          size="lg"
          :loading="saving"
          :disabled="
            !hasUnsavedChanges
          "
          aria-keyshortcuts="Control+S Meta+S"
          class="w-full sm:w-auto"
          @click="saveDesign"
        />
      </div>
    </div>
  </UContainer>
</template>

<style scoped>
.preset-card {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.85rem;
  border: 1px solid
    var(--ui-border);
  border-radius: 1rem;
  background:
    var(--ui-bg);
  padding: 0.7rem;
  text-align: left;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.preset-card:hover {
  transform: translateY(-1px);
  border-color:
    var(--ui-primary);
  box-shadow:
    0 10px 24px
      rgb(15 23 42 / 10%);
}

.preset-card:focus-visible {
  outline: 2px solid
    var(--ui-primary);
  outline-offset: 2px;
}

.preset-preview {
  position: relative;
  display: flex;
  width: 6.7rem;
  aspect-ratio: 1.586 / 1;
  flex: 0 0 auto;
  align-items: flex-end;
  justify-content: space-between;
  overflow: hidden;
  border-radius: 0.65rem;
  padding: 0.55rem;
  color: #FFFFFF;
  box-shadow:
    inset 0 0 0 1px
      rgb(255 255 255 / 20%);
}

.preset-preview-logo {
  display: flex;
  width: 1.55rem;
  height: 1.55rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background:
    rgb(255 255 255 / 90%);
  color: #0B1F3A;
}

.preset-preview-lines {
  display: grid;
  width: 2.8rem;
  gap: 0.2rem;
}

.preset-preview-lines span {
  height: 0.18rem;
  border-radius: 9999px;
  background:
    rgb(255 255 255 / 72%);
}

.preset-preview-lines
  span:nth-child(2) {
  width: 78%;
}

.preset-preview-lines
  span:nth-child(3) {
  width: 58%;
}

.sticky-save-bar {
  position: sticky;
  bottom: 1rem;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  border: 1px solid
    var(--ui-border);
  border-radius: 1.15rem;
  background:
    var(--ui-bg);
  padding: 0.85rem;
  box-shadow:
    0 18px 45px
      rgb(15 23 42 / 18%);
  backdrop-filter: blur(16px);
}

@media (min-width: 640px) {
  .sticky-save-bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}
</style>
