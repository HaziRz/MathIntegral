<script setup lang="ts">
import { clearHistory, type HistoryItem } from '@/utils/LocalHistoryUtil'
import { renderMath } from '@/utils/MathHelper'

defineProps<{
  history: HistoryItem[]
}>()

const emit = defineEmits<{
  (e: 'updt'): void
  (e: 'load', item: HistoryItem): void
}>()
</script>

<template>
  <main class="mt-16 mb-16">
    <div class="space-y-8">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
        <div class="text-center max-w-2xl mx-auto">
          <h2 class="text-3xl font-extrabold tracking-tight text-slate-900">
            Historial de Consultas
          </h2>
          <p class="mt-2 text-sm sm:text-base text-slate-600">
            Visualiza tus integrales calculadas recientemente para volver a cargarlas en un click.
          </p>
        </div>

        <button
          v-if="history.length > 0"
          @click="
            () => {
              clearHistory()
              emit('updt')
            }
          "
          class="px-4 py-2 text-xs font-bold text-red-600 hover:text-white bg-white hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
        >
          Limpiar Historial
        </button>
      </div>

      <div class="max-w-4xl mx-auto">
        <div
          v-if="history.length === 0"
          class="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center"
        >
          <h3 class="font-extrabold text-xl">Sin Registro</h3>
          <p class="text-sm text-slate-500 max-w-xs mx-auto mt-2 leading-relaxed">
            Las integrales que resuelvas aparecerán aquí de forma local para un acceso rápido.
          </p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="item in history"
            :key="item.id"
            class="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
            <div class="space-y-3 grow overflow-hidden">
              <div class="flex items-center space-x-2.5">
                <span
                  :class="[
                    'text-sm font-extrabold px-2.5 py-1 rounded-full tracking-wider uppercase',
                    item.calcMode === 'numerical'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-blue-100 text-blue-700',
                  ]"
                >
                  {{
                    item.calcMode === 'numerical'
                      ? `Área (${item.numericalMethod?.replace('_', ' ')})`
                      : 'Analítica'
                  }}
                </span>
                <span class="text-xs text-slate-400 font-semibold">{{ item.timestamp }}</span>
              </div>

              <div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
                <div
                  class="flex items-center space-x-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100"
                >
                  <span class="text-sm font-bold text-slate-500 font-mono">Integral:</span>
                  <code class="font-mono font-bold text-slate-700">{{ item.expression }}</code>
                </div>

                <div
                  v-if="item.calcMode === 'numerical'"
                  class="text-sm text-slate-600 font-semibold"
                >
                  Límites: [{{ item.lowerBound }}, {{ item.upperBound }}] &middot; Particiones:
                  {{ item.intervals }}
                </div>
              </div>

              <!-- Equation results -->
              <div class="ml-2 py-2 flex items-center space-x-3 overflow-x-auto scrollbar-none">
                <span class="text-sm font-bold text-slate-400 uppercase">Respuesta:</span>
                <div
                  v-html="renderMath(item.result, false)"
                  class="font-semibold text-slate-900"
                ></div>
              </div>
            </div>

            <div class="shrink-0 flex items-center">
              <button
                @click="emit('load', item)"
                class="w-full md:w-auto px-4.5 py-2.5 text-sm font-bold bg-slate-50 hover:bg-primary text-slate-700 hover:text-white rounded-xl border border-slate-200 hover:border-primary shadow-sm transition-all duration-200 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Cargar de Nuevo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
