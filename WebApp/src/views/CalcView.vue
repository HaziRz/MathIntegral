<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import Plotly from 'plotly.js-dist'
import { renderMath, toLatex, calculateNumericalIntegration, safeEval } from '@/utils/MathHelper'

interface Step {
  title: string
  explanation: string
  latex: string
}

// --- Props & Models ---
const expression = defineModel<string>('expression', { required: true })
const calcMode = defineModel<'analytical' | 'numerical'>('calcMode', { required: true })
const lowerBound = defineModel<number>('lowerBound', { required: true })
const upperBound = defineModel<number>('upperBound', { required: true })
const intervals = defineModel<number>('intervals', { required: true })
const numericalMethod = defineModel<
  'riemann_left' | 'riemann_right' | 'riemann_midpoint' | 'trapezoidal' | 'simpson'
>('numericalMethod', { required: true })
const useMockMode = defineModel<boolean>('useMockMode', { required: true })

const props = defineProps<{
  isLoading: boolean
  errorMessage: string
  resultReady: boolean
  finalResultLatex: string
  finalNumericalValue: number | null
  resolutionSteps: Step[]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const chartRef = ref<HTMLDivElement | null>(null)
const activeStepIndex = ref<number | null>(0)

// --- Math Keypad Input Helper ---
const insertSymbol = (symbol: string) => {
  if (!inputRef.value) {
    expression.value += symbol
    return
  }
  const start = inputRef.value.selectionStart || 0
  const end = inputRef.value.selectionEnd || 0
  const text = expression.value

  expression.value = text.substring(0, start) + symbol + text.substring(end)

  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus()
      let offset = symbol.length
      if (symbol.includes('()')) {
        offset = symbol.indexOf('()') + 1 // cursor inside parentheses
      }
      const newCursorPos = start + offset
      inputRef.value.setSelectionRange(newCursorPos, newCursorPos)
    }
  })
}

// --- LaTeX Realtime Live Preview ---
const livePreviewLatex = computed(() => {
  try {
    const parsed = toLatex(expression.value)
    if (!parsed) return '\\int f(x) \\, dx'

    if (calcMode.value === 'numerical') {
      const a = lowerBound.value !== null ? lowerBound.value : 'a'
      const b = upperBound.value !== null ? upperBound.value : 'b'
      return `\\int_{${a}}^{${b}} \\left( ${parsed} \\right) \\, dx`
    } else {
      return `\\int \\left( ${parsed} \\right) \\, dx`
    }
  } catch (e) {
    return '\\int f(x) \\, dx'
  }
})

// --- Plotly Chart Renderer ---
const drawPlotlyChart = () => {
  if (!chartRef.value || calcMode.value !== 'numerical') return

  const a = lowerBound.value
  const b = upperBound.value
  const expr = expression.value

  // 1. Generate smooth curve points for f(x)
  const curveX: number[] = []
  const curveY: number[] = []

  const range = b - a
  const plotMin = a - Math.max(1, range * 0.2)
  const plotMax = b + Math.max(1, range * 0.2)
  const totalPoints = 300
  const stepSize = (plotMax - plotMin) / totalPoints

  for (let i = 0; i <= totalPoints; i++) {
    const px = plotMin + i * stepSize
    const py = safeEval(expr, px)
    curveX.push(px)
    curveY.push(py)
  }

  // 2. Build the traces
  const traces: any[] = []

  // Main function line
  traces.push({
    x: curveX,
    y: curveY,
    name: 'f(x)',
    type: 'scatter',
    mode: 'lines',
    line: {
      color: '#3b82f6', // Bright Blue
      width: 3,
    },
  })

  // Base area under the curve (continuous)
  const areaX: number[] = []
  const areaY: number[] = []
  const areaPoints = 150
  const areaStep = range / areaPoints
  for (let i = 0; i <= areaPoints; i++) {
    const ax = a + i * areaStep
    areaX.push(ax)
    areaY.push(safeEval(expr, ax))
  }

  traces.push({
    x: [a, ...areaX, b],
    y: [0, ...areaY, 0],
    fill: 'toself',
    fillcolor: 'rgba(59, 130, 246, 0.1)',
    line: { color: 'transparent' },
    name: 'Área Teórica',
    hoverinfo: 'skip',
  })

  // 3. Subdivision shapes (Riemann / Trapezoids / Simpson segments)
  const calcRes = calculateNumericalIntegration(expr, a, b, intervals.value, numericalMethod.value)
  const shapes = calcRes.intervals
  if (shapes.length > 0) {
    const shapesX: (number | null)[] = []
    const shapesY: (number | null)[] = []

    shapes.forEach((shape) => {
      shapesX.push(...shape.x, null)
      shapesY.push(...shape.y, null)
    })

    traces.push({
      x: shapesX,
      y: shapesY,
      fill: 'toself',
      fillcolor: 'rgba(139, 92, 246, 0.25)', // Semi-transparent Purple
      line: {
        color: '#a78bfa', // Purple borders
        width: 1.5,
      },
      name: 'Intervalos (' + numericalMethod.value.replace('_', ' ') + ')',
      type: 'scatter',
      mode: 'lines',
    })
  }

  // 4. Vertical limits a and b
  const maxVal = Math.max(0, ...curveY, ...shapes.flatMap((s) => s.y))
  const minVal = Math.min(0, ...curveY, ...shapes.flatMap((s) => s.y))

  traces.push({
    x: [a, a],
    y: [minVal, maxVal],
    mode: 'lines',
    line: {
      color: '#ef4444', // Red
      width: 1.5,
      dash: 'dash',
    },
    name: `x = a (${a})`,
    showlegend: false,
  })

  traces.push({
    x: [b, b],
    y: [minVal, maxVal],
    mode: 'lines',
    line: {
      color: '#ef4444',
      width: 1.5,
      dash: 'dash',
    },
    name: `x = b (${b})`,
    showlegend: false,
  })

  // 5. Layout config
  const layout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    autosize: true,
    font: {
      color: '#334155',
      family: 'Inter, system-ui, sans-serif',
    },
    xaxis: {
      gridcolor: 'rgba(226, 230, 240, 0.8)',
      zerolinecolor: '#94a3b8',
      title: 'Eje X',
      tickmode: 'auto',
    },
    yaxis: {
      gridcolor: 'rgba(226, 230, 240, 0.8)',
      zerolinecolor: '#94a3b8',
      title: 'f(x)',
      tickmode: 'auto',
    },
    margin: { t: 20, r: 15, b: 35, l: 45 },
    hovermode: 'closest',
    showlegend: true,
    legend: {
      orientation: 'h',
      x: 0,
      y: -0.25,
      font: { size: 11 },
    },
  }

  const config = {
    responsive: true,
    displayModeBar: false,
  }

  Plotly.newPlot(chartRef.value, traces, layout as any, config)
}

// Resize handler
const handleResize = () => {
  if (calcMode.value === 'numerical' && props.resultReady && chartRef.value) {
    Plotly.Plots.resize(chartRef.value)
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)

  // If component mounts and result is already ready, draw the plot
  if (calcMode.value === 'numerical' && props.resultReady) {
    nextTick(() => {
      drawPlotlyChart()
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <main>
    <div class="space-y-8 mt-16 mb-16">
      <div class="text-center max-w-2xl mx-auto">
        <h2 class="text-3xl font-extrabold tracking-tight text-slate-900">
          Resolución de Integrales Matemáticas
        </h2>
        <p class="mt-2 text-sm sm:text-base text-slate-600">
          Ingresa tu función para calcular la integral paso a paso o aproxima el área bajo la curva
          mediante métodos de integración numérica.
        </p>
      </div>

      <!-- Calculator Panels Layout -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Column 1: Inputs (Calculator Panel) -->
        <div
          class="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/25 overflow-hidden"
        >
          <div
            class="px-6 py-4 bg-linear-to-r border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
          >
            <span
              class="font-bold text-slate-700 dark:text-slate-300 text-md tracking-wide uppercase"
              >Parámetros</span
            >

            <!-- Mock Mode Status Indicator -->
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="useMockMode" class="sr-only peer" />
              <div
                class="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"
              ></div>
              <span class="ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400"
                >Simulado</span
              >
            </label>
          </div>

          <div class="p-6 space-y-6">
            <!-- Mode Selection Slider (Analytical vs Numerical) -->
            <div class="bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl flex space-x-1">
              <button
                type="button"
                @click="calcMode = 'analytical'"
                :class="[
                  'w-1/2 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300',
                  calcMode === 'analytical'
                    ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                ]"
              >
                Analítica (Fórmula)
              </button>
              <button
                type="button"
                @click="calcMode = 'numerical'"
                :class="[
                  'w-1/2 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300',
                  calcMode === 'numerical'
                    ? 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200',
                ]"
              >
                Área Bajo la Curva
              </button>
            </div>

            <!-- Main Input Field (Function f(x)) -->
            <div>
              <label
                for="function-expr"
                class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2"
              >
                Función a Integrar f(x)
              </label>
              <div class="relative">
                <span
                  class="absolute left-4 top-3.5 font-serif italic text-slate-400 dark:text-slate-500 text-lg"
                  >f(x) =</span
                >
                <input
                  id="function-expr"
                  ref="inputRef"
                  type="text"
                  v-model="expression"
                  placeholder="x^2 + sin(x)"
                  class="w-full pl-16 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-base text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                />
              </div>
            </div>

            <!-- Live KaTeX Preview of Input -->
            <div
              class="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl overflow-x-auto min-h-[50px] flex items-center justify-center"
            >
              <div
                v-html="renderMath(livePreviewLatex, true)"
                class="text-base sm:text-lg text-slate-700 dark:text-slate-300"
              ></div>
            </div>

            <!-- Mathematical Pad Helper Buttons -->
            <div>
              <span
                class="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2"
                >Teclado de Símbolos</span
              >
              <div class="grid grid-cols-5 gap-1.5">
                <button
                  v-for="sym in [
                    'x',
                    '^2',
                    '^',
                    '+',
                    '-',
                    '*',
                    '/',
                    'pi',
                    'e',
                    'sqrt()',
                    'sin()',
                    'cos()',
                    'tan()',
                    'ln()',
                    'log()',
                  ]"
                  :key="sym"
                  type="button"
                  @click="insertSymbol(sym)"
                  class="py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-900 bg-slate-50 dark:bg-slate-800 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all duration-150 cursor-pointer"
                >
                  {{ sym }}
                </button>
              </div>
            </div>

            <!-- Numerical Integration Bounds (a, b, n, Method) -->
            <div
              v-if="calcMode === 'numerical'"
              class="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-850"
            >
              <span
                class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >Intervalo y Subdivisiones</span
              >

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label
                    for="bound-a"
                    class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Límite Inferior (a)
                  </label>
                  <input
                    id="bound-a"
                    type="number"
                    step="any"
                    v-model.number="lowerBound"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-1.5 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label for="bound-b" class="block text-[11px] font-semibold text-slate-500 mb-1">
                    Límite Superior (b)
                  </label>
                  <input
                    id="bound-b"
                    type="number"
                    step="any"
                    v-model.number="upperBound"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-1.5 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label
                    for="intervals-n"
                    class="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Particiones (n)
                  </label>
                  <input
                    id="intervals-n"
                    type="number"
                    min="2"
                    max="1000"
                    v-model.number="intervals"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-1.5 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label
                    for="numerical-method"
                    class="block text-[11px] font-semibold text-slate-500 mb-1"
                  >
                    Método de Suma
                  </label>
                  <select
                    id="numerical-method"
                    v-model="numericalMethod"
                    class="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold focus:outline-none focus:ring-1.5 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="riemann_left">Riemann Izq.</option>
                    <option value="riemann_right">Riemann Der.</option>
                    <option value="riemann_midpoint">Punto Medio</option>
                    <option value="trapezoidal">Trapecio</option>
                    <option value="simpson">Simpson 1/3</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Solve Button -->
            <button
              type="button"
              :disabled="isLoading"
              class="w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm tracking-wide bg-linear-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 transition-all duration-300 shadow-md hover:shadow-lg shadow-violet-500/20 flex items-center justify-center space-x-2 active:scale-[0.98]"
            >
              <svg
                v-if="isLoading"
                class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{{ isLoading ? 'PROCESANDO...' : 'RESOLVER INTEGRAL' }}</span>
            </button>

            <!-- Connection Status Warnings -->
            <div
              v-if="errorMessage"
              class="p-4 rounded-xl border border-red-200/50 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs font-semibold leading-relaxed"
            >
              <div class="flex items-start space-x-2">
                <span class="text-sm">⚠️</span>
                <span>{{ errorMessage }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Column 2: Results Drawer -->
        <div id="results-section" class="lg:col-span-7 space-y-6">
          <!-- Standard Placeholder when nothing is processed yet -->
          <div
            v-if="!resultReady && !isLoading"
            class="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]"
          >
            <div class="text-5xl mb-4">📐</div>
            <h3 class="font-extrabold text-lg text-slate-800 dark:text-white">
              Esperando Ecuación
            </h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2 leading-relaxed">
              Ingresa una función a la izquierda y presiona "Resolver" para calcular los resultados
              y visualizar la aproximación gráfica.
            </p>
          </div>

          <!-- Loader skeleton -->
          <div
            v-if="isLoading"
            class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-8 space-y-6 min-h-[300px] animate-pulse"
          >
            <div class="h-6 w-1/3 bg-slate-200 dark:bg-slate-850 rounded-lg"></div>
            <div class="h-16 w-full bg-slate-100 dark:bg-slate-850 rounded-xl"></div>
            <div class="h-40 w-full bg-slate-200 dark:bg-slate-850 rounded-2xl"></div>
          </div>

          <!-- Solution Section (Visible when computation completes) -->
          <div v-if="resultReady && !isLoading" class="space-y-6">
            <!-- Card 1: Main Answer -->
            <div
              class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-black/25 overflow-hidden"
            >
              <div
                class="px-6 py-4 bg-primary text-white font-bold text-sm tracking-wide uppercase flex items-center justify-between"
              >
                <span>Resultado de la Integración</span>
                <span class="text-xs bg-white/20 px-2 py-0.5 rounded font-mono">{{
                  calcMode === 'numerical' ? 'Numérico' : 'Analítico'
                }}</span>
              </div>

              <div class="p-6 text-center space-y-4">
                <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Valor Resultante
                </div>

                <!-- Main Result Rendering (KaTeX) -->
                <div class="py-4 overflow-x-auto min-h-[70px] flex items-center justify-center">
                  <div
                    v-html="renderMath(finalResultLatex, true)"
                    class="text-2xl sm:text-3xl font-extrabold text-slate-800"
                  ></div>
                </div>

                <!-- Decimal format badge (for numerical methods) -->
                <div
                  v-if="finalNumericalValue !== null"
                  class="inline-flex items-center space-x-2 bg-slate-100 px-3.5 py-1.5 rounded-xl"
                >
                  <span class="text-xs text-slate-500 font-semibold">Valor Decimal exacto:</span>
                  <span class="text-sm text-primary font-extrabold font-mono">{{
                    finalNumericalValue
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Card 2: Graphical Visualization (ONLY rendered for Numerical / Area Under Curve) -->
            <div
              v-if="calcMode === 'numerical'"
              class="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 p-6 space-y-4"
            >
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3
                  class="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center space-x-2"
                >
                  <span>📊</span>
                  <span>Visualización del Área Bajo la Curva</span>
                </h3>
                <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono"
                  >Plotly.js</span
                >
              </div>

              <!-- Chart mounting container -->
              <div
                ref="chartRef"
                class="w-full h-72 sm:h-80 md:h-96 rounded-xl overflow-hidden bg-slate-50/50"
              ></div>

              <div class="text-[10px] text-slate-400 leading-relaxed text-center">
                Usa el cursor para pasar por encima de la gráfica y ver las coordenadas exactas de
                f(x) e intervalos.
              </div>
            </div>

            <!-- Card 3: Step-by-Step Explanation Accordion -->
            <div
              class="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 p-6 space-y-4"
            >
              <h3
                class="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-3"
              >
                <span>👣</span>
                <span>Resolución Paso a Paso</span>
              </h3>

              <!-- Steps Accordion List -->
              <div class="space-y-3">
                <div
                  v-for="(step, index) in resolutionSteps"
                  :key="index"
                  class="border border-slate-250 rounded-xl overflow-hidden transition-all duration-200"
                >
                  <!-- Header -->
                  <button
                    @click="activeStepIndex = activeStepIndex === index ? null : index"
                    class="w-full px-4 py-3 flex items-center justify-between text-left font-semibold text-sm bg-slate-50 hover:bg-slate-100 text-slate-800 transition-colors focus:outline-none"
                  >
                    <span>{{ step.title }}</span>
                    <span
                      class="text-xs transition-transform duration-200"
                      :class="{ 'rotate-180': activeStepIndex === index }"
                    >
                      ▼
                    </span>
                  </button>

                  <!-- Content -->
                  <div
                    v-show="activeStepIndex === index"
                    class="p-4 bg-white border-t border-slate-100 space-y-4"
                  >
                    <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {{ step.explanation }}
                    </p>
                    <div
                      class="p-3.5 bg-slate-50 rounded-lg flex items-center justify-center overflow-x-auto"
                    >
                      <div v-html="renderMath(step.latex, true)" class="text-sm sm:text-base"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
