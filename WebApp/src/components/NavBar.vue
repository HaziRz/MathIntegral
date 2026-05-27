<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { renderMath } from '@/utils/MathHelper'

const activeTab = ref<'solver' | 'formulas' | 'history'>('solver')

interface HistoryItem {
  id: string
  expression: string
  calcMode: 'analytical' | 'numerical'
  lowerBound?: number
  upperBound?: number
  intervals?: number
  numericalMethod?: string
  timestamp: string
  result: string
  numericalResult?: number | null
}

const calculationHistory = ref<HistoryItem[]>([])

onMounted(() => {
  const saved = localStorage.getItem('math_integral_history')
  if (saved) {
    try {
      calculationHistory.value = JSON.parse(saved)
    } catch (e) {
      localStorage.removeItem('math_integral_history')
    }
  }
})
</script>

<template>
  <header class="sticky top-0 z-30 w-full backdrop-blur-sm bg-white/50 border-b border-primary">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <!-- Logo -->
      <div class="flex items-center space-x-2">
        <div
          class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white text-lg shadow-md shadow-primary/20"
          v-html="renderMath('\\int')"
        ></div>
        <div>
          <h1 class="font-extrabold text-xl bg-primary bg-clip-text text-transparent">
            MathIntegral
          </h1>
          <p class="text-xs text-slate-500 -mt-1">Cálculo Analítico de Integrales</p>
        </div>
      </div>

      <!-- Desktop Navigation Tabs -->
      <nav class="flex items-center space-x-4 sm:space-x-2">
        <button
          @click="activeTab = 'solver'"
          :class="[
            'px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-1.5 cursor-pointer',
            activeTab === 'solver'
              ? 'bg-primary/10 text-primary'
              : 'text-slate-600 hover:bg-slate-100',
          ]"
        >
          <span>Calculadora</span>
        </button>

        <button
          @click="activeTab = 'formulas'"
          :class="[
            'px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-1.5 cursor-pointer',
            activeTab === 'formulas'
              ? 'bg-primary/10 text-primary'
              : 'text-slate-600 hover:bg-slate-100',
          ]"
        >
          <span>Fórmulas</span>
        </button>

        <button
          @click="activeTab = 'history'"
          :class="[
            'px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center space-x-1.5 cursor-pointer',
            activeTab === 'history'
              ? 'bg-primary/10 text-primary'
              : 'text-slate-600 hover:bg-slate-100',
          ]"
        >
          <span>Historial</span>
          <span
            v-if="calculationHistory.length > 0"
            class="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full font-bold"
          >
            {{ calculationHistory.length }}
          </span>
        </button>
      </nav>
    </div>
  </header>
</template>
