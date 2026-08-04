<script setup lang="ts">
import type { FormError, FormSubmitEvent } from "@nuxt/ui";
import { useAuth } from "~/composables/useAuth";

definePageMeta({
  layout: "librarian",
  title: "Register Book",
});

type BookStatus = "Active" | "Archived";
type CopyCondition = "New" | "Good" | "Fair" | "Damaged";

interface BookRegistrationForm {
  inventoryDate: number;
  title: string;
  author: string;
  classificationNumber: string;
  authorNumber: string;
  copyrightYear?: number;
  shelfLocation: string;
  subject: string;
  isbn: string;
  publisher: string;
  edition: string;
  description: string;
  recordStatus: BookStatus;
  quantity: number;
  price: number;
  condition: CopyCondition;
  remarks: string;
}

interface RegisteredBook {
  id?: number;
  documentId?: string;
  title: string;
  author: string;
  classification_number?: string;
  author_number?: string;
  call_number?: string;
  subject?: string | null;
}

interface RegisteredCopy {
  id?: number;
  documentId?: string;
  accession_number?: string;
  control_number: string;
}

interface RegistrationResponse {
  data: {
    book: RegisteredBook;
    copies: RegisteredCopy[];
  };
}

const auth = useAuth();
const toast = useToast();
const currentYear = new Date().getFullYear();

const shelfLocations = [
  "Filipiniana",
  "Reference",
  "Computer Program",
  "Health Care",
  "Business Administration",
  "Hospitality & Tourism Management",
  "Criminal Justice Education",
];

const conditions: CopyCondition[] = [
  "New",
  "Good",
  "Fair",
  "Damaged",
];

const form = reactive<BookRegistrationForm>({
  inventoryDate: currentYear,
  title: "",
  author: "",
  classificationNumber: "",
  authorNumber: "",
  copyrightYear: undefined,
  shelfLocation: "",
  subject: "",
  isbn: "",
  publisher: "",
  edition: "",
  description: "",
  recordStatus: "Active",
  quantity: 1,
  price: 0,
  condition: "Good",
  remarks: "",
});

const isSubmitting = ref(false);

const normalizedClassificationNumber = computed(() =>
  form.classificationNumber.trim().replace(/\s+/g, ""),
);

const normalizedAuthorNumber = computed(() =>
  form.authorNumber.trim().replace(/\s+/g, "").toUpperCase(),
);

const callNumber = computed(() => {
  if (
    !normalizedClassificationNumber.value ||
    !normalizedAuthorNumber.value ||
    !form.copyrightYear
  ) {
    return "Enter classification, author number, and copyright date";
  }

  return `${normalizedClassificationNumber.value} ${normalizedAuthorNumber.value} ${form.copyrightYear}`;
});

const formattedPrice = computed(() =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(form.price) || 0),
);

const isReadyToRegister = computed(
  () =>
    Boolean(
      form.title.trim() &&
        form.author.trim() &&
        /^\d{3}(?:\.\d{1,10})?$/.test(
          normalizedClassificationNumber.value,
        ) &&
        /^[A-Z0-9]{1,12}$/.test(normalizedAuthorNumber.value) &&
        form.copyrightYear &&
        form.shelfLocation,
    ) &&
    Number.isInteger(Number(form.inventoryDate)) &&
    Number.isInteger(Number(form.quantity)) &&
    Number(form.quantity) > 0 &&
    Number(form.price) >= 0,
);

const registrationSummary = computed(() => ({
  title: form.title.trim() || "Untitled book",
  author: form.author.trim() || "Author not entered",
  callNumber: callNumber.value,
  shelfLocation: form.shelfLocation || "Not selected",
  subject: form.subject.trim() || "Not provided",
  quantity: Number(form.quantity) || 0,
  condition: form.condition,
  price: formattedPrice.value,
}));

function getHttpStatus(error: unknown): number | undefined {
  const fetchError = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
  };

  return (
    fetchError.response?.status ??
    fetchError.statusCode ??
    fetchError.status
  );
}

function validate(state: Partial<BookRegistrationForm>): FormError[] {
  const errors: FormError[] = [];
  const inventoryDate = Number(state.inventoryDate);

  if (
    !Number.isInteger(inventoryDate) ||
    inventoryDate < 1900 ||
    inventoryDate > currentYear + 1
  ) {
    errors.push({
      name: "inventoryDate",
      message: "Enter a valid inventory year.",
    });
  }

  if (!state.title?.trim()) {
    errors.push({ name: "title", message: "Book title is required." });
  }

  if (!state.author?.trim()) {
    errors.push({ name: "author", message: "Author is required." });
  }

  const classificationNumber = String(
    state.classificationNumber ?? "",
  )
    .trim()
    .replace(/\s+/g, "");

  if (!/^\d{3}(?:\.\d{1,10})?$/.test(classificationNumber)) {
    errors.push({
      name: "classificationNumber",
      message:
        "Use a Dewey number with three digits and an optional decimal, such as 002 or 005.133.",
    });
  }

  const authorNumber = String(state.authorNumber ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();

  if (!/^[A-Z0-9]{1,12}$/.test(authorNumber)) {
    errors.push({
      name: "authorNumber",
      message:
        "Enter an author number/code using letters and numbers only, such as 13E3.",
    });
  }

  const copyrightYear = Number(state.copyrightYear);

  if (
    !Number.isInteger(copyrightYear) ||
    copyrightYear < 1000 ||
    copyrightYear > currentYear + 1
  ) {
    errors.push({
      name: "copyrightYear",
      message: "Enter a valid copyright year.",
    });
  }

  if (!state.shelfLocation) {
    errors.push({
      name: "shelfLocation",
      message: "Select the physical shelf location.",
    });
  }

  const quantity = Number(state.quantity);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    errors.push({
      name: "quantity",
      message: "Enter a whole number from 1 to 100.",
    });
  }

  const price = Number(state.price);

  if (!Number.isFinite(price) || price < 0) {
    errors.push({
      name: "price",
      message: "Enter a valid price. Use 0 for donated books.",
    });
  }

  return errors;
}

async function submitRegistration(
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
              classification_number:
                normalizedClassificationNumber.value,
              author_number: normalizedAuthorNumber.value,
              copyright_year: Number(form.copyrightYear),
              subject: form.subject.trim() || null,
              isbn: form.isbn.trim() || null,
              publisher: form.publisher.trim() || null,
              edition: form.edition.trim() || null,
              description: form.description.trim() || null,
              record_status: form.recordStatus,
            },
            copies: {
              quantity: Number(form.quantity),
              inventory_date: Number(form.inventoryDate),
              price: Number(form.price),
              shelf_location: form.shelfLocation,
              condition: form.condition,
              remarks: form.remarks.trim() || null,
            },
          },
        },
      },
    );

    const identifier =
      response.data.book.documentId ?? response.data.book.id;

    if (!identifier) {
      throw new Error(
        "The book was registered, but Strapi did not return its identifier.",
      );
    }

    toast.add({
      title: "Book registered successfully",
      description: `${response.data.copies.length} ${
        response.data.copies.length === 1 ? "copy was" : "copies were"
      } created. Each barcode contains its accession number only.`,
      color: "success",
      icon: "i-lucide-circle-check-big",
    });

    await navigateTo({
      path: `/librarian/books/${identifier}`,
      query: { registered: "1" },
    });
  } catch (error) {
    const status = getHttpStatus(error);

    if (status === 401) {
      auth.clearSession();
      await navigateTo({
        path: "/",
        query: { redirect: "/librarian/books/register" },
      });
      return;
    }

    toast.add({
      title: status === 403 ? "Permission denied" : "Registration failed",
      description:
        status === 403
          ? "Your Librarian role cannot register books."
          : auth.getErrorMessage(error),
      color: "error",
      icon: "i-lucide-circle-x",
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-6xl space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3">
          <UButton
            to="/librarian/books"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            square
            aria-label="Back to library collection"
          />

          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl">
                Register a Book
              </h1>
              <UBadge color="success" variant="soft">
                Accession-number barcode
              </UBadge>
            </div>
            <p class="mt-1 max-w-3xl text-sm text-muted">
              Enter the catalog and physical-copy information. The call number is
              generated from the Dewey classification number, author number, and
              copyright date.
            </p>
          </div>
        </div>

        <UButton
          to="/librarian/books/import"
          label="Import Excel"
          icon="i-lucide-file-up"
          color="neutral"
          variant="outline"
        />
      </div>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-library"
        title="Institutional call-number format"
        description="Example: 002 13E3 2025. The physical barcode contains the accession number only, such as 0001."
      />

      <UForm
        :state="form"
        :validate="validate"
        class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
        @submit="submitRegistration"
      >
        <div class="space-y-6">
          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UIcon name="i-lucide-book-open" class="size-5" />
                </div>
                <div>
                  <h2 class="font-semibold text-highlighted">Catalog information</h2>
                  <p class="text-sm text-muted">Book identity and classification details.</p>
                </div>
              </div>
            </template>

            <div class="grid gap-5 md:grid-cols-2">
              <UFormField name="inventoryDate" label="Inventory date" required>
                <UInputNumber
                  v-model="form.inventoryDate"
                  :min="1900"
                  :max="currentYear + 1"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Accession number / Barcode">
                <UInput
                  model-value="Generated after registration"
                  icon="i-lucide-scan-barcode"
                  size="lg"
                  readonly
                  class="w-full"
                />
              </UFormField>

              <UFormField name="title" label="Title" required class="md:col-span-2">
                <UInput
                  v-model="form.title"
                  icon="i-lucide-book"
                  placeholder="Enter the complete book title"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="author" label="Author" required>
                <UInput
                  v-model="form.author"
                  icon="i-lucide-user-round"
                  placeholder="Author or editor"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="subject"
                label="Subject"
                hint="Optional"
              >
                <UInput
                  v-model="form.subject"
                  icon="i-lucide-tags"
                  placeholder="Book subject or topic"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="classificationNumber"
                label="Classification number"
                description="Dewey Decimal Classification number."
                required
              >
                <UInput
                  v-model="form.classificationNumber"
                  icon="i-lucide-binary"
                  placeholder="e.g., 002 or 005.133"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="authorNumber"
                label="Author number/code"
                description="Library author or Cutter-style code."
                required
              >
                <UInput
                  v-model="form.authorNumber"
                  icon="i-lucide-signature"
                  placeholder="e.g., 13E3"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="copyrightYear" label="Copyright date" required>
                <UInputNumber
                  v-model="form.copyrightYear"
                  :min="1000"
                  :max="currentYear + 1"
                  placeholder="e.g., 2025"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="shelfLocation"
                label="Shelf location"
                description="Physical shelf where the copies will be stored."
                required
              >
                <USelect
                  v-model="form.shelfLocation"
                  :items="shelfLocations"
                  icon="i-lucide-map-pin"
                  placeholder="Select shelf location"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Generated call number" class="md:col-span-2">
                <UInput
                  :model-value="callNumber"
                  icon="i-lucide-library"
                  size="lg"
                  readonly
                  class="w-full font-mono"
                />
              </UFormField>

              <UFormField name="publisher" label="Publisher" hint="Optional">
                <UInput
                  v-model="form.publisher"
                  icon="i-lucide-building-2"
                  placeholder="Publisher name"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="edition" label="Edition" hint="Optional">
                <UInput
                  v-model="form.edition"
                  placeholder="e.g., 4th Edition"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="isbn" label="ISBN" hint="Optional">
                <UInput
                  v-model="form.isbn"
                  icon="i-lucide-barcode"
                  placeholder="ISBN-10 or ISBN-13"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="recordStatus" label="Record status" required>
                <USelect
                  v-model="form.recordStatus"
                  :items="['Active', 'Archived']"
                  icon="i-lucide-circle-dot"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="description" label="Description" hint="Optional" class="md:col-span-2">
                <UTextarea
                  v-model="form.description"
                  placeholder="Short summary or catalog notes"
                  :rows="4"
                  autoresize
                  class="w-full"
                />
              </UFormField>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success">
                  <UIcon name="i-lucide-copy-plus" class="size-5" />
                </div>
                <div>
                  <h2 class="font-semibold text-highlighted">Physical copies</h2>
                  <p class="text-sm text-muted">Applied to every copy created in this batch.</p>
                </div>
              </div>
            </template>

            <div class="grid gap-5 md:grid-cols-3">
              <UFormField name="quantity" label="Number of copies" required>
                <UInputNumber
                  v-model="form.quantity"
                  :min="1"
                  :max="100"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="price" label="Price per copy" required>
                <UInputNumber
                  v-model="form.price"
                  :min="0"
                  :step="0.01"
                  icon="i-lucide-philippine-peso"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="condition" label="Initial condition" required>
                <USelect
                  v-model="form.condition"
                  :items="conditions"
                  icon="i-lucide-shield-check"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField name="remarks" label="Acquisition remarks" hint="Optional" class="md:col-span-3">
                <UTextarea
                  v-model="form.remarks"
                  placeholder="Donor, supplier, purchase order, acquisition batch, or other notes"
                  :rows="3"
                  autoresize
                  class="w-full"
                />
              </UFormField>
            </div>
          </UCard>
        </div>

        <aside class="lg:sticky lg:top-6 lg:self-start">
          <UCard>
            <template #header>
              <div>
                <h2 class="font-semibold text-highlighted">Registration summary</h2>
                <p class="mt-1 text-sm text-muted">Review before saving.</p>
              </div>
            </template>

            <div class="space-y-5">
              <div class="rounded-xl border border-default bg-elevated/50 p-4">
                <p class="line-clamp-2 font-semibold text-highlighted">
                  {{ registrationSummary.title }}
                </p>
                <p class="mt-1 truncate text-sm text-muted">
                  {{ registrationSummary.author }}
                </p>
              </div>

              <dl class="space-y-3 text-sm">
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-muted">Call number</dt>
                  <dd class="max-w-48 text-right font-mono font-semibold text-highlighted">
                    {{ registrationSummary.callNumber }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted">Shelf location</dt>
                  <dd class="max-w-48 text-right font-semibold text-highlighted">
                    {{ registrationSummary.shelfLocation }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted">Subject</dt>
                  <dd class="max-w-48 text-right font-semibold text-highlighted">
                    {{ registrationSummary.subject }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted">Barcode value</dt>
                  <dd class="font-mono font-semibold text-highlighted">Accession number</dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted">Physical copies</dt>
                  <dd class="font-semibold text-highlighted">{{ registrationSummary.quantity }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted">Price per copy</dt>
                  <dd class="font-semibold text-highlighted">{{ registrationSummary.price }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4">
                  <dt class="text-muted">Condition</dt>
                  <dd><UBadge color="neutral" variant="soft">{{ registrationSummary.condition }}</UBadge></dd>
                </div>
              </dl>

              <UAlert
                color="success"
                variant="soft"
                icon="i-lucide-scan-barcode"
                title="Accession-number barcode"
                :description="`The system will create ${registrationSummary.quantity} unique accession number${registrationSummary.quantity === 1 ? '' : 's'} and encode each number directly into its barcode.`"
              />
            </div>

            <template #footer>
              <div class="space-y-3">
                <UButton
                  type="submit"
                  label="Register & View Barcodes"
                  icon="i-lucide-check"
                  color="success"
                  size="xl"
                  block
                  :loading="isSubmitting"
                  :disabled="!isReadyToRegister || isSubmitting"
                />
                <UButton
                  to="/librarian/books"
                  label="Cancel"
                  color="neutral"
                  variant="ghost"
                  block
                  :disabled="isSubmitting"
                />
              </div>
            </template>
          </UCard>
        </aside>
      </UForm>
    </div>
  </UContainer>
</template>
