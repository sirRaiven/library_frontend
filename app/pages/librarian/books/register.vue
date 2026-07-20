<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import type { FormError, FormSubmitEvent } from "@nuxt/ui";
import BarcodeCard from "~/components/librarian/BarcodeCard.vue";
const auth = useAuth();

definePageMeta({
  layout: "librarian",
  title: "Register Book",
});

type BookStatus = "Active" | "Archived";
type CopyCondition = "New" | "Good" | "Fair" | "Damaged";
type CopyStatus =
  | "Available"
  | "Borrowed"
  | "Reserved"
  | "Damaged"
  | "Lost"
  | "Archived";

interface BookRegistrationForm {
  title: string;
  author: string;
  isbn: string;
  category: string;
  publisher: string;
  edition: string;
  copyrightYear?: number;
  description: string;
  recordStatus: BookStatus;
  quantity: number;
  shelfLocation: string;
  condition: CopyCondition;
  remarks: string;
}

interface RegisteredBook {
  id?: number;
  documentId?: string;
  title: string;
  author: string;
  isbn?: string | null;
  category?: string | null;
  publisher?: string | null;
}

interface RegisteredCopyResponse {
  id?: number;
  documentId?: string;
  control_number: string;
  shelf_location: string;
  copy_status: CopyStatus;
  condition: CopyCondition;
  remarks?: string | null;
}

interface RegisteredCopy extends RegisteredCopyResponse {
  selected: boolean;
}

interface RegistrationResponse {
  data: {
    book: RegisteredBook;
    copies: RegisteredCopyResponse[];
  };
}

interface BarcodeCardHandle {
  createPngDataUrl: () => Promise<string>;
  downloadPng: () => Promise<void>;
  renderBarcode: () => Promise<void>;
}

const toast = useToast();

/*
 * These values must exactly match the enumeration values configured
 * in Strapi's Book.category field.
 */
const categories = [
"General Reference",
"Computer Science",
"Information Technology",
"Business",
"Education",
"Engineering",
"Literature",
"History",
"Science",
"Mathematics",
];

const conditions: CopyCondition[] = ["New", "Good", "Fair", "Damaged"];

const form = reactive<BookRegistrationForm>({
  title: "",
  author: "",
  isbn: "",
  category: "",
  publisher: "",
  edition: "",
  copyrightYear: undefined,
  description: "",
  recordStatus: "Active",
  quantity: 1,
  shelfLocation: "",
  condition: "Good",
  remarks: "",
});

const isSubmitting = ref(false);
const isSuccess = ref(false);
const isDownloadingSelected = ref(false);
const createdBook = ref<RegisteredBook | null>(null);
const generatedCopies = ref<RegisteredCopy[]>([]);

const barcodeCardRefs = new Map<string, BarcodeCardHandle>();

const selectedCopies = computed(() =>
  generatedCopies.value.filter((copy) => copy.selected),
);

const allSelected = computed({
  get: () =>
    generatedCopies.value.length > 0 &&
    generatedCopies.value.every((copy) => copy.selected),
  set: (value: boolean) => {
    generatedCopies.value.forEach((copy) => {
      copy.selected = value;
    });
  },
});

const availableCopiesCount = computed(
  () =>
    generatedCopies.value.filter(
      (copy) => copy.copy_status === "Available",
    ).length,
);

const createdBookRoute = computed(() => {
  const identifier = createdBook.value?.documentId ?? createdBook.value?.id;

  return identifier
    ? `/librarian/books/${identifier}`
    : "/librarian/books";
});

function getHttpStatus(error: unknown): number | undefined {
  const fetchError = error as {
    status?: number;
    statusCode?: number;
    response?: {
      status?: number;
    };
  };

  return (
    fetchError.response?.status ??
    fetchError.statusCode ??
    fetchError.status
  );
}

function validateBookForm(
  state: Partial<BookRegistrationForm>,
): FormError[] {
  const errors: FormError[] = [];

  if (!state.title?.trim()) {
    errors.push({
      name: "title",
      message: "Book title is required.",
    });
  }

  if (!state.author?.trim()) {
    errors.push({
      name: "author",
      message: "Author is required.",
    });
  }

  if (!state.category) {
    errors.push({
      name: "category",
      message: "Category is required.",
    });
  }

  const rawCopyrightYear = state.copyrightYear as
    | number
    | string
    | undefined;
  const copyrightYear = Number(rawCopyrightYear);

  if (
    rawCopyrightYear !== undefined &&
    rawCopyrightYear !== "" &&
    (!Number.isInteger(copyrightYear) ||
      copyrightYear < 1000 ||
      copyrightYear > new Date().getFullYear() + 1)
  ) {
    errors.push({
      name: "copyrightYear",
      message: "Enter a valid publication year.",
    });
  }

  const quantity = Number(state.quantity);

  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push({
      name: "quantity",
      message: "At least one physical copy is required.",
    });
  } else if (quantity > 100) {
    errors.push({
      name: "quantity",
      message: "You can register up to 100 copies at a time.",
    });
  }

  if (!state.shelfLocation?.trim()) {
    errors.push({
      name: "shelfLocation",
      message: "Shelf location is required.",
    });
  }

  return errors;
}

async function registerBook(
  _event: FormSubmitEvent<BookRegistrationForm>,
) {
  if (isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await auth.authFetch<RegistrationResponse>(
      "/api/books/register-with-copies",
      {
        method: "POST",
        body: {
          data: {
            book: {
              title: form.title.trim(),
              author: form.author.trim(),
              isbn: form.isbn.trim() || null,
              publisher: form.publisher.trim() || null,
              category: form.category,
              copyright_year:
                form.copyrightYear !== undefined
                  ? Number(form.copyrightYear)
                  : null,
              edition: form.edition.trim() || null,
              description: form.description.trim() || null,
              record_status: form.recordStatus,
            },
            copies: {
              quantity: Number(form.quantity),
              shelf_location: form.shelfLocation.trim(),
              condition: form.condition,
              remarks: form.remarks.trim() || null,
            },
          },
        },
      },
    );

    createdBook.value = response.data.book;
    generatedCopies.value = response.data.copies.map((copy) => ({
      ...copy,
      selected: true,
    }));
    isSuccess.value = true;

    await nextTick();

    toast.add({
      title: "Book registered",
      description: `${generatedCopies.value.length} physical ${
        generatedCopies.value.length === 1 ? "copy was" : "copies were"
      } created successfully.`,
      color: "success",
      icon: "i-lucide-circle-check-big",
    });

    if (import.meta.client) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  } catch (error) {
    const status = getHttpStatus(error);

    if (status === 401) {
      auth.clearSession();

      toast.add({
        title: "Session expired",
        description:
          "Your session could not be renewed. Sign in again to continue.",
        color: "warning",
        icon: "i-lucide-shield-alert",
      });

      await navigateTo({
        path: "/",
        query: {
          redirect: "/librarian/books/register",
        },
      });

      return;
    }

    if (status === 403) {
      toast.add({
        title: "Permission denied",
        description:
          "Your account does not have permission to register books and physical copies.",
        color: "error",
        icon: "i-lucide-shield-x",
      });

      return;
    }

    toast.add({
      title: "Registration failed",
      description: auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isSubmitting.value = false;
  }
}

function setBarcodeCardRef(
  instance: Element | ComponentPublicInstance | null,
  controlNumber: string,
) {
  if (
    instance &&
    typeof (instance as unknown as BarcodeCardHandle).createPngDataUrl ===
      "function"
  ) {
    barcodeCardRefs.set(
      controlNumber,
      instance as unknown as BarcodeCardHandle,
    );
    return;
  }

  barcodeCardRefs.delete(controlNumber);
}

function triggerImageDownload(dataUrl: string, controlNumber: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${controlNumber}.png`;

  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function downloadSelectedBarcodes() {
  if (!import.meta.client || selectedCopies.value.length === 0) {
    return;
  }

  isDownloadingSelected.value = true;

  try {
    let downloadedCount = 0;

    for (const copy of selectedCopies.value) {
      const barcodeCard = barcodeCardRefs.get(copy.control_number);

      if (!barcodeCard) {
        continue;
      }

      const dataUrl = await barcodeCard.createPngDataUrl();
      triggerImageDownload(dataUrl, copy.control_number);
      downloadedCount += 1;

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 180);
      });
    }

    if (downloadedCount === 0) {
      throw new Error(
        "The selected barcode labels are not ready. Please try again.",
      );
    }

    toast.add({
      title: "Barcodes downloaded",
      description: `${downloadedCount} barcode ${
        downloadedCount === 1 ? "image was" : "images were"
      } downloaded.`,
      color: "success",
      icon: "i-lucide-download",
    });
  } catch (error) {
    toast.add({
      title: "Download failed",
      description:
        error instanceof Error
          ? error.message
          : "Unable to download the selected barcodes.",
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isDownloadingSelected.value = false;
  }
}

async function openPrintPage() {
  if (selectedCopies.value.length === 0) {
    toast.add({
      title: "No labels selected",
      description: "Select at least one barcode label before printing.",
      color: "warning",
      icon: "i-lucide-printer",
    });
    return;
  }

  const bookIdentifier =
    createdBook.value?.documentId ?? createdBook.value?.id;

  await navigateTo({
    path: "/librarian/books/print",
    query: {
      barcodes: selectedCopies.value
        .map((copy) => copy.control_number)
        .join(","),
      ...(bookIdentifier
        ? {
            book: String(bookIdentifier),
          }
        : {}),
    },
  });
}

function resetRegistration() {
  form.title = "";
  form.author = "";
  form.isbn = "";
  form.category = "";
  form.publisher = "";
  form.edition = "";
  form.copyrightYear = undefined;
  form.description = "";
  form.recordStatus = "Active";
  form.quantity = 1;
  form.shelfLocation = "";
  form.condition = "Good";
  form.remarks = "";

  barcodeCardRefs.clear();
  createdBook.value = null;
  generatedCopies.value = [];
  isSuccess.value = false;

  if (import.meta.client) {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
}

onBeforeUnmount(() => {
  barcodeCardRefs.clear();
});
</script>

<template>
  <UContainer class="max-w-7xl py-8">
    <div
      class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <div class="mb-2 flex items-center gap-2 text-sm text-muted">
          <NuxtLink
            to="/librarian/books"
            class="transition-colors hover:text-primary"
          >
            Library Collection
          </NuxtLink>

          <UIcon
            name="i-lucide-chevron-right"
            class="size-4"
          />

          <span>Register Book</span>
        </div>

        <h1
          class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
        >
          {{ isSuccess ? "Generated Book Barcodes" : "Register New Book" }}
        </h1>

        <p class="mt-1 text-sm text-muted sm:text-base">
          {{
            isSuccess
              ? "Review, download, or print the barcode label for every physical copy."
              : "Create a catalog record and register its physical copies in one step."
          }}
        </p>
      </div>

      <UButton
        to="/librarian/books"
        color="neutral"
        variant="outline"
        icon="i-lucide-arrow-left"
      >
        Back to Catalog
      </UButton>
    </div>

    <template v-if="!isSuccess">
      <UForm
        :state="form"
        :validate="validateBookForm"
        class="space-y-6"
        @submit="registerBook"
      >
        <div
          class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]"
        >
          <UCard
            :ui="{
              header: 'border-b border-default',
              body: 'space-y-6',
            }"
          >
            <template #header>
              <div class="flex items-start gap-3">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <UIcon
                    name="i-lucide-book-open"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2 class="font-semibold text-highlighted">
                    Book information
                  </h2>
                  <p class="text-sm text-muted">
                    Enter the catalog information shared by all physical
                    copies.
                  </p>
                </div>
              </div>
            </template>

            <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
              <UFormField
                name="title"
                label="Book title"
                required
                class="md:col-span-2"
              >
                <UInput
                  v-model="form.title"
                  placeholder="Enter the complete book title"
                  icon="i-lucide-book-type"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="author"
                label="Author"
                required
              >
                <UInput
                  v-model="form.author"
                  placeholder="Enter the author name"
                  icon="i-lucide-user-round"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="isbn"
                label="ISBN"
              >
                <UInput
                  v-model="form.isbn"
                  placeholder="Example: 9780132350884"
                  icon="i-lucide-hash"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="category"
                label="Category"
                required
              >
                <USelect
                  v-model="form.category"
                  :items="categories"
                  placeholder="Select a category"
                  icon="i-lucide-folder-open"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="publisher"
                label="Publisher"
              >
                <UInput
                  v-model="form.publisher"
                  placeholder="Enter the publisher"
                  icon="i-lucide-building-2"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="edition"
                label="Edition"
              >
                <UInput
                  v-model="form.edition"
                  placeholder="Example: 3rd Edition"
                  icon="i-lucide-layers-3"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="copyrightYear"
                label="Publication year"
              >
                <UInput
                  v-model.number="form.copyrightYear"
                  type="number"
                  min="1000"
                  :max="new Date().getFullYear() + 1"
                  placeholder="Example: 2026"
                  icon="i-lucide-calendar-days"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="description"
                label="Description"
                class="md:col-span-2"
              >
                <UTextarea
                  v-model="form.description"
                  placeholder="Add a short description or catalog note"
                  :rows="5"
                  autoresize
                  class="w-full"
                />
              </UFormField>
            </div>
          </UCard>

          <div class="space-y-6">
            <UCard
              :ui="{
                header: 'border-b border-default',
                body: 'space-y-5',
              }"
            >
              <template #header>
                <div class="flex items-start gap-3">
                  <div
                    class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success"
                  >
                    <UIcon
                      name="i-lucide-copy-plus"
                      class="size-5"
                    />
                  </div>

                  <div>
                    <h2 class="font-semibold text-highlighted">
                      Physical copies
                    </h2>
                    <p class="text-sm text-muted">
                      Each copy receives a unique control number and barcode.
                    </p>
                  </div>
                </div>
              </template>

              <UFormField
                name="quantity"
                label="Number of copies"
                required
                help="Maximum of 100 copies per registration."
              >
                <UInput
                  v-model.number="form.quantity"
                  type="number"
                  min="1"
                  max="100"
                  icon="i-lucide-copy"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="shelfLocation"
                label="Initial shelf location"
                required
              >
                <UInput
                  v-model="form.shelfLocation"
                  placeholder="Example: CS-A-01"
                  icon="i-lucide-library"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="condition"
                label="Initial condition"
              >
                <USelect
                  v-model="form.condition"
                  :items="conditions"
                  icon="i-lucide-shield-check"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="remarks"
                label="Acquisition remarks"
              >
                <UTextarea
                  v-model="form.remarks"
                  placeholder="Optional acquisition or inventory note"
                  :rows="3"
                  autoresize
                  class="w-full"
                />
              </UFormField>
            </UCard>

            <UAlert
              color="info"
              variant="subtle"
              icon="i-lucide-barcode"
              title="Automatic barcode generation"
              description="Control numbers are created securely by Strapi. The same control number is encoded in the CODE 128 barcode."
            />
          </div>
        </div>

        <div
          class="flex flex-col-reverse gap-3 rounded-2xl border border-default bg-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-muted">
            The book title and all physical copies are saved together.
          </p>

          <div class="flex flex-col gap-3 sm:flex-row">
            <UButton
              type="button"
              to="/librarian/books"
              color="neutral"
              variant="outline"
              size="lg"
              block
            >
              Cancel
            </UButton>

            <UButton
              type="submit"
              color="success"
              icon="i-lucide-save"
              size="lg"
              :loading="isSubmitting"
              :disabled="isSubmitting"
              block
            >
              Register Book and Generate Barcodes
            </UButton>
          </div>
        </div>
      </UForm>
    </template>

    <template v-else>
      <div class="space-y-6">
        <UAlert
          color="success"
          variant="subtle"
          icon="i-lucide-circle-check-big"
          title="Book registered successfully"
          :description="`${createdBook?.title ?? form.title} now has ${
            generatedCopies.length
          } registered physical ${
            generatedCopies.length === 1 ? 'copy' : 'copies'
          }.`"
        />

        <UCard>
          <div
            class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-muted">
                Registered title
              </p>
              <h2 class="mt-1 truncate text-xl font-bold text-highlighted">
                {{ createdBook?.title ?? form.title }}
              </h2>
              <p class="mt-1 text-sm text-muted">
                {{ createdBook?.author ?? form.author }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-3 sm:flex">
              <div
                class="rounded-xl border border-default bg-elevated px-4 py-3 text-center"
              >
                <div class="text-2xl font-bold text-highlighted">
                  {{ generatedCopies.length }}
                </div>
                <div class="text-xs text-muted">
                  Physical copies
                </div>
              </div>

              <div
                class="rounded-xl border border-default bg-elevated px-4 py-3 text-center"
              >
                <div class="text-2xl font-bold text-success">
                  {{ availableCopiesCount }}
                </div>
                <div class="text-xs text-muted">
                  Available
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <div
          class="sticky top-0 z-10 flex flex-col gap-3 rounded-2xl border border-default bg-default/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
        >
          <UCheckbox
            v-model="allSelected"
            :label="`Select all ${generatedCopies.length} labels`"
          />

          <div class="flex flex-col gap-2 sm:flex-row">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              :loading="isDownloadingSelected"
              :disabled="
                selectedCopies.length === 0 || isDownloadingSelected
              "
              @click="downloadSelectedBarcodes"
            >
              Download Selected ({{ selectedCopies.length }})
            </UButton>

            <UButton
              color="success"
              icon="i-lucide-printer"
              :disabled="selectedCopies.length === 0"
              @click="openPrintPage"
            >
              Print Selected ({{ selectedCopies.length }})
            </UButton>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          <div
            v-for="(copy, index) in generatedCopies"
            :key="copy.documentId ?? copy.id ?? copy.control_number"
            class="space-y-3"
          >
            <div
              class="flex items-center justify-between gap-3 rounded-xl border border-default bg-elevated px-4 py-3"
            >
              <div class="flex min-w-0 items-center gap-3">
                <UCheckbox
                  v-model="copy.selected"
                  :aria-label="`Select ${copy.control_number}`"
                />

                <div class="min-w-0">
                  <p class="text-sm font-semibold text-highlighted">
                    Physical Copy #{{ index + 1 }}
                  </p>
                  <p
                    class="truncate font-mono text-xs font-bold text-primary"
                  >
                    {{ copy.control_number }}
                  </p>
                </div>
              </div>

              <UBadge
                :color="
                  copy.copy_status === 'Available' ? 'success' : 'neutral'
                "
                variant="subtle"
              >
                {{ copy.copy_status }}
              </UBadge>
            </div>

            <BarcodeCard
              :ref="
                (instance) =>
                  setBarcodeCardRef(instance, copy.control_number)
              "
              :control-number="copy.control_number"
              :title="createdBook?.title ?? form.title"
              :author="createdBook?.author ?? form.author"
              :shelf-location="copy.shelf_location"
              :status="copy.copy_status"
              :condition="copy.condition"
            />
          </div>
        </div>

        <div
          class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"
        >
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-plus"
            @click="resetRegistration"
          >
            Register Another Book
          </UButton>

          <div class="flex flex-col gap-3 sm:flex-row">
            <UButton
              to="/librarian/books"
              color="neutral"
              variant="soft"
              icon="i-lucide-library-big"
            >
              Return to Catalog
            </UButton>

            <UButton
              :to="createdBookRoute"
              color="success"
              icon="i-lucide-eye"
            >
              View Registered Book
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UContainer>
</template>
