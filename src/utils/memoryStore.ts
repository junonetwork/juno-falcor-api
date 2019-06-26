import { PathValue, Atom, Ref } from 'falcor-router'
import { of, Observable, from } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import { resourceFieldLengthPath, resourceFieldValuePath, resourceFieldPath, resourcePath, resourceLabelPath } from '../utils/juno'
import { xprod } from 'ramda'


export type MemoryStore = {
  [id: string]: {
    [field: string]: (string | Atom | Ref)[]
  }
}

export const resourceFieldValueFromMemory = (
  store: MemoryStore, graph: string, type: string, ids: string[], fields: string[], indices: number[]
): Observable<PathValue> => from(ids).pipe(
  mergeMap((id) => {
    if (store[id] === undefined) {
      return of({
        path: resourcePath(graph, type, id),
        value: null,
      })
    }

    return from(xprod(fields, indices)).pipe(
      map(([field, index]) => {
        if (store[id][field] === undefined) {
          return {
            path: resourceFieldPath(graph, type, id, field),
            value: null,
          }
        } else if (store[id][field][index] === undefined) {
          return {
            path: resourceFieldValuePath(graph, type, id, field, index),
            value: null,
          }
        }

        return {
          path: resourceFieldValuePath(graph, type, id, field, index),
          value: store[id][field][index],
        }
      })
    )
  })
)

export const resourceFieldLengthFromMemory = (
  store: MemoryStore, graph: string, type: string, ids: string[], fields: string[]
): Observable<PathValue> => from(ids).pipe(
  mergeMap((id) => {
    if (store[id] === undefined) {
      return of({
        path: resourcePath(graph, type, id),
        value: null,
      })
    }

    return from(fields).pipe(
      map((field) => {
        if (store[id][field] === undefined) {
          return {
            path: resourceFieldLengthPath(graph, type, id, field),
            value: null
          }
        }

        return {
          path: resourceFieldLengthPath(graph, type, id, field),
          value: store[id][field].length
        }
      })
    )
  })
)

export const resourceLabelFromMemory = (
  store: MemoryStore, graph: string, type: string, ids: string[]
): Observable<PathValue> => from(ids).pipe(
  map((id) => {
    if (store[id] === undefined) {
      return {
        path: resourcePath(graph, type, id),
        value: null,
      }
    } else if (store[id].label === undefined || store[id].label.length === 0) {
      return {
        path: resourceLabelPath(graph, type, id),
        value: null
      }
    }

    const label = store[id].label[0]
    if (typeof label !== 'string' && label.$type === 'ref') {
      return {
        path: resourceLabelPath(graph, type, id),
        value: null
      }
    }

    return {
      path: resourceLabelPath(graph, type, id),
      value: label
    }
  })
)
