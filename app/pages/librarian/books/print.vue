<template>
  <div class="print-container">
    <!-- Non-printable control bar -->
    <div
      class="no-print p-4 bg-gray-100 flex items-center justify-between border-b border-gray-200"
    >
      <UButton icon="i-heroicons-arrow-left" variant="outline" @click="goBack">
        Back to Registration
      </UButton>
      <div class="text-sm font-medium text-gray-600">
        Ready to print: <strong>{{ barcodes.length }}</strong> labels
      </div>
      <UButton icon="i-heroicons-printer" color="primary" @click="triggerPrint">
        Print Labels
      </UButton>
    </div>

    <!-- Print Labels Grid -->
    <div class="labels-grid">
      <div v-for="barcode in barcodes" :key="barcode" class="label-card">
        <div class="library-header">STATE UNIVERSITY LIBRARY</div>

        <div class="barcode-wrapper">
          <canvas :id="`canvas-${barcode}`" class="barcode-canvas"></canvas>
          <div class="fallback-barcode-text" v-if="!hasJsBarcode">
            {{ barcode }}
          </div>
        </div>

        <div class="label-footer">Keep this label clean and dry</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";

definePageMeta({ layout: false }); // Keep this to disable the app shell during print

const route = useRoute();
const router = useRouter();
const hasJsBarcode = ref(false);

const barcodes = computed(() =>
  route.query.barcodes ? route.query.barcodes.split(",") : [],
);

const goBack = () => router.back();
const triggerPrint = () => window.print();

onMounted(async () => {
  await nextTick();
  const script = document.createElement("script");
  script.src =
    "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js";
  script.onload = () => {
    hasJsBarcode.value = true;
    barcodes.value.forEach((barcode) => {
      try {
        window.JsBarcode(`#canvas-${barcode}`, barcode, {
          format: "CODE128",
          width: 2,
          height: 50,
          displayValue: true,
          fontSize: 14,
          margin: 10,
        });
      } catch (e) {
        console.error("Barcode fail", e);
      }
    });
    setTimeout(() => window.print(), 800);
  };
  document.head.appendChild(script);
});
</script>

<style scoped>
.print-container {
  min-height: 100vh;
  background-color: #f5f5f5;
}
.labels-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  padding: 20px;
  justify-content: center;
}

.label-card {
  width: 320px;
  height: 180px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
  box-sizing: border-box;
  text-align: center;
}

.library-header {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #333;
  border-bottom: 1px double #ccc;
  padding-bottom: 4px;
}
.barcode-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.barcode-canvas {
  max-width: 100%;
  height: auto;
}
.fallback-barcode-text {
  font-family: monospace;
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 2px;
}
.label-footer {
  font-size: 9px;
  color: #666;
  text-transform: uppercase;
}

@media print {
  .no-print {
    display: none !important;
  }
  body,
  .print-container {
    background: white !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .labels-grid {
    padding: 0 !important;
    gap: 0 !important;
    display: block !important;
  }
  .label-card {
    border: none !important;
    page-break-after: always;
    margin: 0 auto !important;
    width: 100% !important;
    height: 100vh !important;
    justify-content: space-around;
  }
}
</style>
