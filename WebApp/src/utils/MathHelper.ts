import katex from 'katex'

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
