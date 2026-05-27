import katex from 'katex'
import axios from 'axios'

export interface Step {
  title: string
  explanation: string
  latex: string
}

export type NumericalMethod =
  | 'riemann_left'
  | 'riemann_right'
  | 'riemann_midpoint'
  | 'trapezoidal'
  | 'simpson'

export function renderMath(latexFormula: string, displayMode = false) {
  try {
    return katex.renderToString(latexFormula, {
      throwOnError: false,
      displayMode: displayMode,
      trust: true,
    })
  } catch (e) {
    return latexFormula
  }
}

/**
 * Safely evaluates a mathematical function expression at a given x value.
 * Supports basic algebraic functions, trigonometric functions, exponents, etc.
 */
export function safeEval(expr: string, x: number): number {
  if (!expr || !expr.trim()) return 0

  let formatted = expr.toLowerCase()

  // Add implicit multiplication between numbers and x, e.g. 2x -> 2*x
  formatted = formatted.replace(/(\d)(x)/g, '$1*$2')

  // Add implicit multiplication between numbers and Math functions, e.g. 2sin(x) -> 2*sin(x)
  formatted = formatted.replace(/(\d)(sin|cos|tan|log|ln|sqrt|exp|pi|e|\()/g, '$1*$2')

  // Add implicit multiplication between x and Math functions, e.g. xsin(x) -> x*sin(x)
  formatted = formatted.replace(/(x)(sin|cos|tan|log|ln|sqrt|exp|pi|e|\()/g, '$1*$2')

  // Add implicit multiplication between closing parenthesis and x or functions, e.g. (x)sin(x) -> (x)*sin(x)
  formatted = formatted.replace(/(\))(x|sin|cos|tan|log|ln|sqrt|exp|pi|e|\()/g, '$1*$2')

  // Replace constants (word boundaries to prevent matching 'e' in 'sin' or 'x' in 'exp')
  formatted = formatted.replace(/\bpi\b/g, String(Math.PI))
  formatted = formatted.replace(/\be\b/g, String(Math.E))

  // Replace standard math functions with Math.* equivalent
  formatted = formatted.replace(/\bsin\b/g, 'Math.sin')
  formatted = formatted.replace(/\bcos\b/g, 'Math.cos')
  formatted = formatted.replace(/\btan\b/g, 'Math.tan')
  formatted = formatted.replace(/\blog\b/g, 'Math.log')
  formatted = formatted.replace(/\bln\b/g, 'Math.log')
  formatted = formatted.replace(/\bsqrt\b/g, 'Math.sqrt')
  formatted = formatted.replace(/\bexp\b/g, 'Math.exp')
  formatted = formatted.replace(/\babs\b/g, 'Math.abs')

  // Replace power operator ^ with JS **
  formatted = formatted.replace(/\^/g, '**')

  try {
    // Create a function that accepts 'x' and returns the evaluated value
    const func = new Function('x', `return ${formatted};`)
    const val = func(x)
    return isNaN(val) || !isFinite(val) ? 0 : val
  } catch (e) {
    return 0
  }
}

/**
 * Formats a typed math expression into standard LaTeX for KaTeX rendering.
 */
export function toLatex(expr: string): string {
  if (!expr || !expr.trim()) return ''

  let latex = expr.trim()

  // Replace standard multiplication sign
  latex = latex.replace(/\*/g, ' \\cdot ')

  // Format division a/b into \frac{a}{b} for simple patterns
  // Pattern: alphanumeric_or_paren / alphanumeric_or_paren
  // We can do a simple replacement for basic divisions:
  latex = latex.replace(/([a-zA-Z0-9_.\(\)]+)\/([a-zA-Z0-9_.\(\)]+)/g, '\\frac{$1}{$2}')

  // Format power x^y to {x}^{y}
  latex = latex.replace(/([a-zA-Z0-9_.\(\)]+)\^([a-zA-Z0-9_.\(\)]+)/g, '{$1}^{$2}')

  // Replace standard functions with LaTeX equivalent
  latex = latex.replace(/\bsin\b/g, '\\sin')
  latex = latex.replace(/\bcos\b/g, '\\cos')
  latex = latex.replace(/\btan\b/g, '\\tan')
  latex = latex.replace(/\bln\b/g, '\\ln')
  latex = latex.replace(/\blog\b/g, '\\log')
  latex = latex.replace(/\bsqrt\b/g, '\\sqrt')
  latex = latex.replace(/\bpi\b/g, '\\pi')

  // Turn parentheses in \sqrt(...) into braces \sqrt{...}
  latex = latex.replace(/\\sqrt\((.*?)\)/g, '\\sqrt{$1}')

  return latex
}

export interface IntervalShape {
  x: number[]
  y: number[]
  type: 'rect' | 'trapezoid' | 'simpson'
}

export interface IntegrationResult {
  value: number
  intervals: IntervalShape[]
}

export function calculateNumericalIntegration(
  expr: string,
  a: number,
  b: number,
  n: number,
  method: 'riemann_left' | 'riemann_right' | 'riemann_midpoint' | 'trapezoidal' | 'simpson',
): IntegrationResult {
  const dx = (b - a) / n
  let sum = 0
  const shapes: IntervalShape[] = []

  // Make sure n is valid
  if (n <= 0) return { value: 0, intervals: [] }

  if (method === 'riemann_left') {
    for (let i = 0; i < n; i++) {
      const xi = a + i * dx
      const xNext = xi + dx
      const height = safeEval(expr, xi)
      sum += height

      shapes.push({
        x: [xi, xi, xNext, xNext, xi],
        y: [0, height, height, 0, 0],
        type: 'rect',
      })
    }
    return { value: sum * dx, intervals: shapes }
  } else if (method === 'riemann_right') {
    for (let i = 0; i < n; i++) {
      const xi = a + i * dx
      const xNext = xi + dx
      const height = safeEval(expr, xNext)
      sum += height

      shapes.push({
        x: [xi, xi, xNext, xNext, xi],
        y: [0, height, height, 0, 0],
        type: 'rect',
      })
    }
    return { value: sum * dx, intervals: shapes }
  } else if (method === 'riemann_midpoint') {
    for (let i = 0; i < n; i++) {
      const xi = a + i * dx
      const xNext = xi + dx
      const mid = xi + dx / 2
      const height = safeEval(expr, mid)
      sum += height

      shapes.push({
        x: [xi, xi, xNext, xNext, xi],
        y: [0, height, height, 0, 0],
        type: 'rect',
      })
    }
    return { value: sum * dx, intervals: shapes }
  } else if (method === 'trapezoidal') {
    // T = dx/2 * (f(a) + f(b) + 2 * sum(f(xi)))
    const fa = safeEval(expr, a)
    const fb = safeEval(expr, b)
    sum = (fa + fb) / 2

    for (let i = 1; i < n; i++) {
      const xi = a + i * dx
      sum += safeEval(expr, xi)
    }

    // Build trapezoid shapes for visual display
    for (let i = 0; i < n; i++) {
      const xi = a + i * dx
      const xNext = xi + dx
      const yi = safeEval(expr, xi)
      const yNext = safeEval(expr, xNext)

      shapes.push({
        x: [xi, xi, xNext, xNext, xi],
        y: [0, yi, yNext, 0, 0],
        type: 'trapezoid',
      })
    }
    return { value: sum * dx, intervals: shapes }
  } else if (method === 'simpson') {
    // Simpson's rule requires an even number of intervals.
    // If n is odd, increment by 1
    const adjustedN = n % 2 === 0 ? n : n + 1
    const adjDx = (b - a) / adjustedN

    const fa = safeEval(expr, a)
    const fb = safeEval(expr, b)
    let simpsonSum = fa + fb

    for (let i = 1; i < adjustedN; i++) {
      const xi = a + i * adjDx
      const coefficient = i % 2 === 0 ? 2 : 4
      simpsonSum += coefficient * safeEval(expr, xi)
    }

    const value = (simpsonSum * adjDx) / 3

    // For visualization of Simpson's rule, we approximate the curved shapes.
    // We can draw a quadratic interpolation for each pair of intervals, or just draw
    // trapezoids with points sampled at multiple sub-steps to look like curves.
    for (let i = 0; i < adjustedN; i += 2) {
      const x0 = a + i * adjDx
      const x1 = x0 + adjDx
      const x2 = x0 + 2 * adjDx

      const y0 = safeEval(expr, x0)
      const y1 = safeEval(expr, x1)
      const y2 = safeEval(expr, x2)

      // Quadratic interpolation: P(x) = A*x^2 + B*x + C
      // We can sample multiple intermediate points between x0 and x2 to plot the curve
      const xSample: number[] = [x0]
      const ySample: number[] = [0] // start at x-axis

      // Sample 10 points to draw the curved top of the Simpson interval
      const steps = 10
      const stepSize = (2 * adjDx) / steps
      for (let s = 0; s <= steps; s++) {
        const xVal = x0 + s * stepSize
        // Lagrange Polynomial interpolation for the quadratic curve:
        const term0 = (y0 * ((xVal - x1) * (xVal - x2))) / ((x0 - x1) * (x0 - x2))
        const term1 = (y1 * ((xVal - x0) * (xVal - x2))) / ((x1 - x0) * (x1 - x2))
        const term2 = (y2 * ((xVal - x0) * (xVal - x1))) / ((x2 - x0) * (x2 - x1))
        const yVal = term0 + term1 + term2

        xSample.push(xVal)
        ySample.push(yVal)
      }

      xSample.push(x2)
      ySample.push(0) // end at x-axis

      xSample.push(x0)
      ySample.push(0) // close shape

      shapes.push({
        x: xSample,
        y: ySample,
        type: 'simpson',
      })
    }

    return { value, intervals: shapes }
  }

  return { value: 0, intervals: [] }
}

// --- Solver Action ---
export const solveIntegral = async (
  expression: string,
  calcMode: string,
  isLoading: boolean,
  errorMessage: string,
  resultReady: boolean,
  finalNumericalValue: number | null,
  finalResultLatex: string | null,
  resolutionSteps: Step[],
  lowerBound: number,
  upperBound: number,
  intervals: number,
  numericalMethod: NumericalMethod,
  useMockMode: boolean,
) => {
  if (!expression.trim()) {
    errorMessage = 'Por favor, ingresa una expresión válida.'
    return
  }

  isLoading = true
  errorMessage = ''
  resultReady = false
  finalNumericalValue = null

  try {
    if (useMockMode) {
      await new Promise((resolve) => setTimeout(resolve, 800))

      if (calcMode === 'numerical') {
        const a = lowerBound
        const b = upperBound
        const n = intervals

        const calcRes = calculateNumericalIntegration(expression, a, b, n, numericalMethod)

        finalNumericalValue = calcRes.value
        finalResultLatex = `\\approx ${calcRes.value.toFixed(6)}`

        const dx = (b - a) / n
        resolutionSteps = [
          {
            title: '1. Configuración de Intervalos',
            explanation: `El intervalo de integración es [a, b] = [${a}, ${b}]. Con n = ${n} subdivisiones, obtenemos un ancho de paso Δx:`,
            latex: `\\Delta x = \\frac{b - a}{n} = \\frac{${b} - ${a}}{${n}} = ${dx.toFixed(6)}`,
          },
          {
            title: '2. Evaluación de Sumatoria',
            explanation: `Aplicando la aproximación mediante el método seleccionado (${numericalMethod.replace('_', ' ')}):`,
            latex: `Area \\approx \\sum \\text{Evaluaciones} \\cdot \\Delta x = ${calcRes.value.toFixed(6)}`,
          },
        ]

        resultReady = true
      } else {
        const normalized = expression.toLowerCase().replace(/\s+/g, '')

        if (normalized.includes('x^2') || normalized.includes('x**2')) {
          finalResultLatex = '\\frac{x^3}{3} + C'
          resolutionSteps = [
            {
              title: 'Identificar forma matemática',
              explanation:
                'Observamos que es una integral inmediata de tipo polinomial de la forma:',
              latex: '\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C',
            },
            {
              title: 'Aplicar regla de potencia',
              explanation:
                'Para nuestro exponente n = 2, aumentamos el exponente en 1 y dividimos la variable por el nuevo término:',
              latex: '\\int x^2 \\, dx = \\frac{x^{2+1}}{2+1} + C = \\frac{x^3}{3} + C',
            },
          ]
        } else if (normalized.includes('sin(x)') || normalized.includes('sen(x)')) {
          finalResultLatex = '-\\cos(x) + C'
          resolutionSteps = [
            {
              title: 'Identificación directa',
              explanation: 'La función f(x) = sen(x) es una integral trigonométrica elemental:',
              latex: '\\int \\sin(x) \\, dx = -\\cos(x) + C',
            },
            {
              title: 'Comprobación de signo',
              explanation:
                'Dado que la derivada de cos(x) es -sen(x), la antiderivada debe ser multiplicada por -1 para recuperar el sen(x) original.',
              latex: '\\frac{d}{dx}(-\\cos(x)) = -(-\\sin(x)) = \\sin(x)',
            },
          ]
        } else if (normalized.includes('cos(x)')) {
          finalResultLatex = '\\sin(x) + C'
          resolutionSteps = [
            {
              title: 'Primitiva inmediata',
              explanation:
                'La integral del coseno de x es directa y corresponde a la función seno:',
              latex: '\\int \\cos(x) \\, dx = \\sin(x) + C',
            },
          ]
        } else if (normalized.includes('exp(x)') || normalized === 'e^x' || normalized === 'e**x') {
          finalResultLatex = 'e^x + C'
          resolutionSteps = [
            {
              title: 'Función autoduplicable',
              explanation: 'La exponencial natural e^x es única porque es su propia antiderivada:',
              latex: '\\int e^x \\, dx = e^x + C',
            },
          ]
        } else if (normalized.includes('ln(x)')) {
          finalResultLatex = 'x \\ln(x) - x + C'
          resolutionSteps = [
            {
              title: 'Integración por partes',
              explanation:
                'Para integrar ln(x), utilizamos el método por partes: ∫ u dv = u v - ∫ v du.',
              latex: 'u = \\ln(x) \\implies du = \\frac{1}{x} dx, \\quad dv = dx \\implies v = x',
            },
            {
              title: 'Aplicar la regla',
              explanation: 'Multiplicamos u*v y restamos la integral del producto v*du:',
              latex: '\\int \\ln(x) \\, dx = x \\cdot \\ln(x) - \\int x \\cdot \\frac{1}{x} \\, dx',
            },
            {
              title: 'Resolver término final',
              explanation: 'Simplificamos la integral restante ∫ 1 dx que da como resultado x:',
              latex: '= x\\ln(x) - \\int 1 \\, dx = x\\ln(x) - x + C',
            },
          ]
        } else {
          const latexExpr = toLatex(expression)
          finalResultLatex = `F(x) = \\int \\left(${latexExpr}\\right) \\, dx \\quad \\text{[Respuesta de prueba]}`
          resolutionSteps = [
            {
              title: 'Reconocimiento de expresión',
              explanation:
                'La expresión ingresada está lista para ser procesada. En Modo Real, el backend calculará el paso a paso exacto:',
              latex: `f(x) = ${latexExpr}`,
            },
            {
              title: 'Procesamiento de Integral',
              explanation: 'Aplicando métodos analíticos avanzados en el servidor...',
              latex: `\\int f(x) \\, dx = F(x) + C`,
            },
          ]
        }
        resultReady = true
      }
    } else {
      const payload = {
        expression: expression,
        type: calcMode,
        lowerBound: calcMode === 'numerical' ? lowerBound : null,
        upperBound: calcMode === 'numerical' ? upperBound : null,
        intervals: calcMode === 'numerical' ? intervals : null,
        numericalMethod: calcMode === 'numerical' ? numericalMethod : null,
      }

      const response = await axios.post('/api/integrals/solve', payload)

      if (response.data && response.data.success) {
        finalResultLatex = response.data.result
        resolutionSteps = response.data.steps || []

        if (calcMode === 'numerical') {
          finalNumericalValue = response.data.numericalResult
        }
        resultReady = true
      } else {
        errorMessage =
          response.data.error || 'Ocurrió un error desconocido al resolver la integral.'
      }
    }

    /*if (resultReady) {
      saveToHistory()
    }*/
  } catch (error: any) {
    errorMessage =
      error.response?.data?.error ||
      error.message ||
      'No se pudo conectar con el servidor. Verifica tu conexión o cambia a Modo Simulado.'
  } finally {
    isLoading = false
  }
}
