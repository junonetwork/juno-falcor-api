import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";
import { PathValue } from "falcor-router";
import { xprod as ramda_xprod } from 'ramda'
import { resourcePath, xprod, resourceFieldPath, resourceFieldValuePath, resourceFieldLengthPath } from "../utils/juno";
import { $atom } from "../utils/falcor";


const COUNTRIES = {
  gbr: {
    name: [$atom('United Kingdom')]
  }
}

export const countriesValue = (ids: string[], fields: string[], indices: number[]): Observable<PathValue> => from(xprod(ids, fields, indices)).pipe(
  map(([id, field, index]) => {
    if (COUNTRIES[id] === undefined) {
      return {
        path: resourcePath('juno', 'country', id),
        value: null,
      }
    } else if (field !== 'name') {
      return {
        path: resourceFieldPath('juno', 'country', id, field),
        value: null
      }
    }

    return {
      path: resourceFieldValuePath('juno', 'country', id, field, index),
      value: COUNTRIES[id][field][index]
    }
  })
)

export const countriesValueLength = (ids: string[], fields: string[]): Observable<PathValue> => from(ramda_xprod(ids, fields)).pipe(
  map(([id, field]) => {
    if (COUNTRIES[id] === undefined) {
      return {
        path: resourcePath('juno', 'country', id),
        value: null,
      }
    } else if (field !== 'name') {
      return {
        path: resourceFieldPath('juno', 'country', id, field),
        value: null
      }
    }

    return {
      path: resourceFieldLengthPath('juno', 'country', id, field),
      value: COUNTRIES[id][field].length
    }
  })
)
