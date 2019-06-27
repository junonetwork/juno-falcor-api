import { PathValue, Atom, Ref } from 'falcor-router'
import { of, Observable } from 'rxjs'
import { resourceFieldLengthPath, resourceFieldValuePath, resourceFieldPath, resourcePath, resourceLabelPath } from '../utils/juno'
import { xprod } from 'ramda'


export type MemoryStore = {
  [id: string]: {
    [field: string]: (string | number | boolean | Atom | Ref)[]
  }
}

export const resourceFieldValueFromMemory = (
  store: MemoryStore, graph: string, type: string, ids: string[], fields: string[], indices: number[]
): Observable<PathValue | PathValue[]> => of(ids.reduce<PathValue[]>((pathValues, id) => {
  if (store[id] === undefined) {
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: null,
    })

    return pathValues
  }

  xprod(fields, indices).map(([field, index]) => {
    if (store[id][field] === undefined) {
      pathValues.push({
        path: resourceFieldPath(graph, type, id, field),
        value: null,
      })
    } else if (store[id][field][index] === undefined) {
      pathValues.push({
        path: resourceFieldValuePath(graph, type, id, field, index),
        value: null,
      })
    } else {
      pathValues.push({
        path: resourceFieldValuePath(graph, type, id, field, index),
        value: store[id][field][index],
      })
    }
  })

  return pathValues
}, []))

export const resourceFieldLengthFromMemory = (
  store: MemoryStore, graph: string, type: string, ids: string[], fields: string[]
): Observable<PathValue | PathValue[]> => of(ids.reduce<PathValue[]>((pathValues, id) => {
  if (store[id] === undefined) {
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: null,
    })

    return pathValues
  }

  fields.forEach((field) => {
    if (store[id][field] === undefined) {
      pathValues.push({
        path: resourceFieldLengthPath(graph, type, id, field),
        value: null
      })
    } else {
      pathValues.push({
        path: resourceFieldLengthPath(graph, type, id, field),
        value: store[id][field].length
      })
    }
  })

  return pathValues
}, []))

export const resourceLabelFromMemory = (
  store: MemoryStore, graph: string, type: string, ids: string[]
): Observable<PathValue | PathValue[]> => of(ids.map((id) => {
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
  if (typeof label === 'object' && label.$type === 'ref') {
    return {
      path: resourceLabelPath(graph, type, id),
      value: null
    }
  }

  return {
    path: resourceLabelPath(graph, type, id),
    value: label
  }
}, []))
