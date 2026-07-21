<script setup lang="ts">
import type {
  FormError,
  FormSubmitEvent,
} from "@nuxt/ui";
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
  isbn: string;
  category: string;
  publisher: string;
  edition: string;
  copyrightYear?: number;
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
  category?: string;
  call_number?: string;
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

const categories = [
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
  isbn: "",
  category: "",
  publisher: "",
  edition: "",
  copyrightYear: undefined,
  description: "",
  recordStatus: "Active",
  quantity: 1,
  price: 0,
  condition: "Good",
  remarks: "",
});

const isSubmitting = ref(false);

const callNumber = computed(() =>
  form.category || "Assigned from category",
);

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
        form.category,
    ) &&
    Number.isInteger(Number(form.inventoryDate)) &&
    Number(form.inventoryDate) >= 1900 &&
    Number.isInteger(Number(form.quantity)) &&
    Number(form.quantity) > 0 &&
    Number(form.price) >= 0,
);

const barcodeFormatPreview = computed(
  () => `LIB-${form.inventoryDate}-####`,
);

const registrationSummary = computed(() => ({
  title: form.title.trim() || "Untitled book",
  author: form.author.trim() || "Author not entered",
  category: form.category || "Not selected",
  callNumber: callNumber.value,
  inventoryDate: form.inventoryDate,
  quantity: Number(form.quantity) || 0,
  shelf: form.category || "Not selected",
  condition: form.condition,
  price: formattedPrice.value,
}));

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

function validate(
  state: Partial<BookRegistrationForm>,
): FormError[] {
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
      message: "Select a category.",
    });
  }

  const quantity = Number(state.quantity);

  if (!Number.isInteger(quantity) || quantity < 1) {
    errors.push({
      name: "quantity",
      message: "Enter at least one physical copy.",
    });
  } else if (quantity > 100) {
    errors.push({
      name: "quantity",
      message: "A registration batch can contain up to 100 copies.",
    });
  }

  const price = Number(state.price);

  if (!Number.isFinite(price) || price < 0) {
    errors.push({
      name: "price",
      message: "Enter a valid price. Use 0 for donated books.",
    });
  }

  const copyrightYear = state.copyrightYear;

  if (
    copyrightYear !== undefined &&
    (!Number.isInteger(Number(copyrightYear)) ||
      Number(copyrightYear) < 1000 ||
      Number(copyrightYear) > currentYear + 1)
  ) {
    errors.push({
      name: "copyrightYear",
      message: "Enter a valid copyright year.",
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
    const response =
      await auth.authFetch<RegistrationResponse>(
        "/api/books/register-with-copies",
        {
          method: "POST",
          body: {
            data: {
              book: {
                title: form.title.trim(),
                author: form.author.trim(),
                isbn: form.isbn.trim() || null,
                category: form.category,

                // The call number is automatically copied from
                // the selected category to reduce librarian input.
                call_number: form.category,

                publisher:
                  form.publisher.trim() || null,
                edition: form.edition.trim() || null,
                copyright_year:
                  form.copyrightYear ?? null,
                description:
                  form.description.trim() || null,
                record_status: form.recordStatus,
              },

              copies: {
                quantity: Number(form.quantity),

                // These values are applied to every physical copy
                // created in this registration batch.
                inventory_date: Number(
                  form.inventoryDate,
                ),
                price: Number(form.price),
                shelf_location: form.category,
                condition: form.condition,
                remarks: form.remarks.trim() || null,
              },
            },
          },
        },
      );

    const identifier =
      response.data.book.documentId ??
      response.data.book.id;

    if (!identifier) {
      throw new Error(
        "The book was registered, but Strapi did not return its identifier.",
      );
    }

    toast.add({
      title: "Book registered successfully",
      description: `${response.data.copies.length} ${
        response.data.copies.length === 1
          ? "copy was"
          : "copies were"
      } created with unique accession numbers and barcodes.`,
      color: "success",
      icon: "i-lucide-circle-check-big",
    });

    await navigateTo({
      path: `/librarian/books/${identifier}`,
      query: {
        registered: "1",
      },
    });
  } catch (error) {
    const status = getHttpStatus(error);

    if (status === 401) {
      auth.clearSession();

      toast.add({
        title: "Session expired",
        description:
          "Sign in again to continue registering books.",
        color: "warning",
        icon: "i-lucide-shield-alert",
      });

      await navigateTo({
        path: "/",
        query: {
          redirect:
            "/librarian/books/register",
        },
      });

      return;
    }

    if (status === 403) {
      toast.add({
        title: "Permission denied",
        description:
          "Your Librarian role cannot register books. Enable the Book registerWithCopies permission in Strapi.",
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
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mx-auto max-w-6xl space-y-6">
      <div
        class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
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
            <div
              class="flex flex-wrap items-center gap-2"
            >
              <h1
                class="text-2xl font-bold tracking-tight text-highlighted sm:text-3xl"
              >
                Register a Book
              </h1>

              <UBadge
                color="success"
                variant="soft"
              >
                Accession numbers generated automatically
              </UBadge>
            </div>

            <p class="mt-1 max-w-3xl text-sm text-muted">
              Enter the book information once. The system
              will create every physical copy, assign its
              accession number, and generate a barcode in the format
              LIB-{Inventory Year}-{Accession Number}.
            </p>
          </div>
        </div>

        <UButton
          to="/librarian/books"
          label="View Collection"
          icon="i-lucide-library"
          color="neutral"
          variant="outline"
          class="self-start"
        />
      </div>

      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-wand-sparkles"
        title="Designed to reduce repetitive encoding"
        description="The selected category is automatically used as the call number and shelf location. Every copy receives an accession number and a barcode such as LIB-2026-0001."
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
                <div
                  class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
                >
                  <UIcon
                    name="i-lucide-book-open"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Catalog information
                  </h2>
                  <p class="text-sm text-muted">
                    Fields based on the institution's
                    existing inventory record.
                  </p>
                </div>
              </div>
            </template>

            <div class="grid gap-5 md:grid-cols-2">
              <UFormField
                name="inventoryDate"
                label="Inventory date"
                description="Inventory year for this registration batch."
                required
              >
                <UInputNumber
                  v-model="form.inventoryDate"
                  :min="1900"
                  :max="currentYear + 1"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Accession number"
                description="Assigned automatically to every physical copy."
              >
                <UInput
                  model-value="Generated after registration"
                  icon="i-lucide-hash"
                  size="lg"
                  readonly
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="title"
                label="Title"
                required
                class="md:col-span-2"
              >
                <UInput
                  v-model="form.title"
                  icon="i-lucide-book"
                  placeholder="Enter the complete book title"
                  size="lg"
                  autocomplete="off"
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
                  icon="i-lucide-user-round"
                  placeholder="Author or editor"
                  size="lg"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="category"
                label="Category"
                description="This value is also used as the call number."
                required
              >
                <USelect
                  v-model="form.category"
                  :items="categories"
                  icon="i-lucide-tags"
                  placeholder="Select a category"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Call number"
                description="Automatically copied from category."
              >
                <UInput
                  :model-value="callNumber"
                  icon="i-lucide-library"
                  size="lg"
                  readonly
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="copyrightYear"
                label="Copyright date"
                hint="Optional"
              >
                <UInputNumber
                  v-model="form.copyrightYear"
                  :min="1000"
                  :max="currentYear + 1"
                  placeholder="e.g., 2026"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="publisher"
                label="Publisher"
                hint="Optional"
              >
                <UInput
                  v-model="form.publisher"
                  icon="i-lucide-building-2"
                  placeholder="Publisher name"
                  size="lg"
                  autocomplete="off"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="edition"
                label="Edition"
                hint="Optional"
              >
                <UInput
                  v-model="form.edition"
                  placeholder="e.g., 4th Edition"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="price"
                label="Price"
                description="Enter 0.00 for donated books."
                required
              >
                <UInputNumber
                  v-model="form.price"
                  :min="0"
                  :step="0.01"
                  icon="i-lucide-philippine-peso"
                  size="lg"
                  class="w-full"
                />
              </UFormField>
            </div>

            <details
              class="group mt-6 rounded-xl border border-default bg-elevated/40"
            >
              <summary
                class="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-medium text-highlighted"
              >
                <span class="flex items-center gap-2">
                  <UIcon
                    name="i-lucide-list-plus"
                    class="size-4 text-muted"
                  />
                  Optional catalog details
                </span>

                <UIcon
                  name="i-lucide-chevron-down"
                  class="size-4 text-muted transition-transform group-open:rotate-180"
                />
              </summary>

              <div
                class="grid gap-5 border-t border-default p-4 md:grid-cols-2"
              >
                <UFormField
                  name="isbn"
                  label="ISBN"
                  hint="Optional"
                >
                  <UInput
                    v-model="form.isbn"
                    icon="i-lucide-barcode"
                    placeholder="ISBN-10 or ISBN-13"
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
                    placeholder="Short summary or catalog notes"
                    :rows="4"
                    autoresize
                    class="w-full"
                  />
                </UFormField>
              </div>
            </details>
          </UCard>

          <UCard>
            <template #header>
              <div class="flex items-center gap-3">
                <div
                  class="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success"
                >
                  <UIcon
                    name="i-lucide-copy-plus"
                    class="size-5"
                  />
                </div>

                <div>
                  <h2
                    class="font-semibold text-highlighted"
                  >
                    Physical copies
                  </h2>
                  <p class="text-sm text-muted">
                    These settings are applied to every
                    copy created in this batch.
                  </p>
                </div>
              </div>
            </template>

            <div class="grid gap-5 md:grid-cols-3">
              <UFormField
                name="quantity"
                label="Number of copies"
                description="Each copy receives a unique accession number and barcode."
                required
              >
                <UInputNumber
                  v-model="form.quantity"
                  :min="1"
                  :max="100"
                  size="lg"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Shelf location"
                description="Automatically copied from the selected category."
              >
                <UInput
                  :model-value="
                    form.category ||
                    'Select a category first'
                  "
                  icon="i-lucide-map-pin"
                  size="lg"
                  readonly
                  class="w-full"
                />
              </UFormField>

              <UFormField
                name="condition"
                label="Initial condition"
                required
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
                hint="Optional"
                class="md:col-span-3"
              >
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
                <h2
                  class="font-semibold text-highlighted"
                >
                  Registration summary
                </h2>
                <p class="mt-1 text-sm text-muted">
                  Review the record before saving.
                </p>
              </div>
            </template>

            <div class="space-y-5">
              <div
                class="rounded-xl border border-default bg-elevated/50 p-4"
              >
                <p
                  class="line-clamp-2 font-semibold text-highlighted"
                >
                  {{ registrationSummary.title }}
                </p>
                <p
                  class="mt-1 truncate text-sm text-muted"
                >
                  {{ registrationSummary.author }}
                </p>
              </div>

              <dl class="space-y-3 text-sm">
                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Inventory date
                  </dt>
                  <dd class="font-semibold text-highlighted">
                    {{ registrationSummary.inventoryDate }}
                  </dd>
                </div>

                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Category
                  </dt>
                  <dd
                    class="max-w-44 text-right font-semibold text-highlighted"
                  >
                    {{ registrationSummary.category }}
                  </dd>
                </div>

                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Call number
                  </dt>
                  <dd
                    class="max-w-44 text-right font-semibold text-highlighted"
                  >
                    {{ registrationSummary.callNumber }}
                  </dd>
                </div>

                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Barcode format
                  </dt>
                  <dd class="font-mono font-semibold text-highlighted">
                    {{ barcodeFormatPreview }}
                  </dd>
                </div>

                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Physical copies
                  </dt>
                  <dd class="font-semibold text-highlighted">
                    {{ registrationSummary.quantity }}
                  </dd>
                </div>

                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Price per copy
                  </dt>
                  <dd class="font-semibold text-highlighted">
                    {{ registrationSummary.price }}
                  </dd>
                </div>

                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Shelf
                  </dt>
                  <dd
                    class="max-w-44 text-right font-semibold text-highlighted"
                  >
                    {{ registrationSummary.shelf }}
                  </dd>
                </div>

                <div
                  class="flex items-center justify-between gap-4"
                >
                  <dt class="text-muted">
                    Condition
                  </dt>
                  <dd>
                    <UBadge
                      color="neutral"
                      variant="soft"
                    >
                      {{ registrationSummary.condition }}
                    </UBadge>
                  </dd>
                </div>
              </dl>

              <div
                class="rounded-xl bg-success/10 p-4 text-sm text-success"
              >
                <div class="flex gap-3">
                  <UIcon
                    name="i-lucide-scan-barcode"
                    class="mt-0.5 size-5 shrink-0"
                  />

                  <p>
                    The system will create
                    <strong>
                      {{ registrationSummary.quantity }}
                    </strong>
                    accession number{{
                      registrationSummary.quantity === 1
                        ? ""
                        : "s"
                    }}
                    and matching barcode{{
                      registrationSummary.quantity === 1
                        ? ""
                        : "s"
                    }}.
                  </p>
                </div>
              </div>
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
                  :disabled="
                    !isReadyToRegister ||
                    isSubmitting
                  "
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
