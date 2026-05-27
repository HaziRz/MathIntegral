<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { renderMath } from '@/utils/MathHelper'

interface ReferenceFormula {
  id: string
  name: string
  category: string
  latex: string
  sampleExpression: string
  sampleA?: number
  sampleB?: number
  sampleN?: number
  explanation: string
}

const formulasLibrary = ref<ReferenceFormula[]>([])

const loadFormulas = async () => {
  try {
    const response = await fetch('/formulas.json')
    if (response.ok) {
      formulasLibrary.value = await response.json()
    } else {
      console.error('Failed to load /formulas.json')
    }
  } catch (error) {
    console.error('Error loading formulas.json:', error)
  }
}

onMounted(loadFormulas)
</script>

<template>
  <div class="space-y-8 mt-16 mb-16">
    <div class="text-center max-w-2xl mx-auto">
      <h2 class="text-3xl font-extrabold tracking-tight text-slate-900">
        Formulario y Biblioteca de Integrales
      </h2>
      <p class="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
        Explora las fórmulas fundamentales del cálculo integral y haz clic en ellas para cargarlas
        instantáneamente en el resolutor matemático.
      </p>
    </div>

    <!-- Formula Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mx-32">
      <div
        v-for="formula in formulasLibrary"
        :key="formula.id"
        class="bg-white border border-slate-200 rounded-2xl shadow-md hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
      >
        <div class="p-6 space-y-4 grow">
          <div class="flex items-center justify-between">
            <span
              class="text-[10px] font-extrabold px-2.5 py-1 bg-primary/10 text-primary rounded-full tracking-wider uppercase"
            >
              {{ formula.category }}
            </span>
          </div>

          <h3
            class="font-extrabold text-xl text-slate-800 group-hover:text-primary transition-colors"
          >
            {{ formula.name }}
          </h3>

          <p class="text-sm text-slate-500 leading-relaxed">
            {{ formula.explanation }}
          </p>

          <div
            class="py-3 px-1.5 bg-slate-50 rounded-xl flex items-center justify-center overflow-x-auto min-h-[60px]"
          >
            <div v-html="renderMath(formula.latex, true)" class="text-md"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
