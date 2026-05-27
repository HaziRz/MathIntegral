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
