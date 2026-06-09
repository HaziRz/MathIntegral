import { ref } from 'vue'

export interface HistoryItem {
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
export function syncHistory(_calculationHistory: HistoryItem[]) {
  calculationHistory.value = _calculationHistory
}

export function saveToHistory(
  _expression: string,
  _calcMode: 'analytical' | 'numerical',
  _lowerBound: number,
  _upperBound: number,
  _intervals: number,
  _numericalMethod: string,
  _finalResultLatex: string,
  _finalNumericalValue: number | null,
) {
  const newItem: HistoryItem = {
    id: Date.now().toString(),
    expression: _expression,
    calcMode: _calcMode,
    lowerBound: _calcMode === 'numerical' ? _lowerBound : undefined,
    upperBound: _calcMode === 'numerical' ? _upperBound : undefined,
    intervals: _calcMode === 'numerical' ? _intervals : undefined,
    numericalMethod: _calcMode === 'numerical' ? _numericalMethod : undefined,
    timestamp:
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' ' +
      new Date().toLocaleDateString(),
    result: _finalResultLatex,
    numericalResult: _finalNumericalValue,
  }

  if (
    calculationHistory.value.length === 0 ||
    calculationHistory.value[0]?.expression !== newItem.expression ||
    calculationHistory.value[0].calcMode !== newItem.calcMode
  ) {
    calculationHistory.value.unshift(newItem)
    if (calculationHistory.value.length > 15) {
      calculationHistory.value.pop()
    }
    localStorage.setItem('math_integral_history', JSON.stringify(calculationHistory.value))
  }
}

export function clearHistory() {
  calculationHistory.value = []
  localStorage.removeItem('math_integral_history')
}
