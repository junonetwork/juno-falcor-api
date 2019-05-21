import {
  range, unnest, xprod,
} from 'ramda'
import { Path } from 'falcor'
import { StandardRange, Atom, Ref, ErrorSentinel, Sentinel } from 'falcor-router'
import { Literal } from '../types';


/**
 * Convert falcor range to an array of equivalent indices
 */
export const range2List = ({ from, to }: StandardRange): number[] => range(from, to + 1)

export const ranges2List = (ranges: StandardRange[]): number[] => unnest(ranges.map(range2List))

export const expandTriples = (
  subjects: string[], predicates: string[], ranges: StandardRange[]
): Array<{ subject: string, predicate: string, index: number }> => {
  return xprod(subjects, predicates)
    .reduce<Array<{ subject: string, predicate: string, index: number }>>((acc, [subject, predicate]) => {
      ranges2List(ranges).forEach((index) => acc.push({ subject, predicate, index }))
      return acc
    }, [])
}

export const $atom = (value: any, dataType?: string, language?: string): Atom => {
  const atom: Atom = { $type: 'atom', value }

  if (dataType && dataType !== 'xsd:string') {
    atom.$dataType = dataType
  }

  if (language) {
    atom.$lang = language
  }

  return atom
}
export const $ref = (value: Array<string | number>): Ref => ({ $type: 'ref', value })
export const $error = (code, message): ErrorSentinel => ({ $type: 'error', value: { code, message } })

export const isSentinel = (value: Literal | Sentinel): value is Sentinel => {
  // TODO - typescript safe/ideomatic way to handle hasKey()
  if (value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || Array.isArray(value)) {
    return false
  }
  
  return value.$type === 'atom' || value.$type === 'ref' || value.$type === 'error';
}
