import {
  range,
} from 'ramda'
import { StandardRange, Atom, Ref, ErrorSentinel } from 'falcor-router'


/**
 * Convert falcor range to an array of equivalent indices
 */
export const range2List = ({ from, to }: StandardRange): number[] => range(from, to + 1)

export const ranges2List = (ranges: StandardRange[]): number[] => ranges.reduce<number[]>(
  (indices, range) => {
    indices.push(...range2List(range))
    return indices
  },
  []
)

export const $atom = (value: any, { dataType, language }: { dataType?: string, language?: string } = {}): Atom => {
  const atom: Atom = { $type: 'atom', value }

  if (dataType && dataType !== 'string') {
    atom.$dataType = dataType
  }

  if (language) {
    atom.$language = language
  }

  return atom
}
export const $ref = (value: Array<string | number>): Ref => ({ $type: 'ref', value })
export const $error = (code, message): ErrorSentinel => ({ $type: 'error', value: { code, message } })
