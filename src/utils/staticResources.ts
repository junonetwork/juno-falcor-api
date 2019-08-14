import { PathValue, Atom, Ref, Route } from 'falcor-router'
import { Observable, of, OperatorFunction } from 'rxjs'
import { $ref } from './falcor'
import { resourcePath, resourceFieldPath, resourceFieldValuePath, resourceFieldLengthPath, resourceLabelPath, resourceFilterPath, resourceFilterLengthPath } from './juno'
import { xprod, any } from 'ramda'


/**
 * TODO
 * - redesign as StaticResourcesByType
 * - consider if a more prescriptive type for StaticResources would be easier to implement.  e.g.
 * type StaticTypes = {
 *   label: string[],
 *   field: Ref[]  
 * }
 * type StaticFields = {
 *   label: string[],
 *   range: Atom<LiteralType>[]
 * }
 * type StaticDomainResources = {
 *   label: string[]
 * }
 * - predicates need a searchable or indexed boolean field
 */
export type StaticResources = {
  [id: string]: {
    [field: string]: (string | number | boolean | Atom | Ref)[] | undefined
  }
}

export type StaticResourcesByType = {
  [type: string]: StaticResources
}


export const staticResourceFieldValue = (
  staticResources: StaticResources, graph: string, type: string, ids: string[], fields: string[], indices: number[]
): Observable<PathValue[]> => of(ids.reduce<PathValue[]>((pathValues, id) => {
  if (staticResources[id] === undefined) {
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: null,
    })

    return pathValues
  }

  xprod(fields, indices).map(([field, index]) => {
    if (staticResources[id][field] === undefined) {
      pathValues.push({
        path: resourceFieldPath(graph, type, id, field),
        value: null,
      })
    } else if (staticResources[id][field]![index] === undefined) {
      pathValues.push({
        path: resourceFieldValuePath(graph, type, id, field, index),
        value: null,
      })
    } else {
      pathValues.push({
        path: resourceFieldValuePath(graph, type, id, field, index),
        value: staticResources[id][field]![index],
      })
    }
  })

  return pathValues
}, []))

export const staticResourceFieldLength = (
  staticResources: StaticResources, graph: string, type: string, ids: string[], fields: string[]
): Observable<PathValue[]> => of(ids.reduce<PathValue[]>((pathValues, id) => {
  if (staticResources[id] === undefined) {
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: null,
    })

    return pathValues
  }

  fields.forEach((field) => {
    if (staticResources[id][field] === undefined) {
      pathValues.push({
        path: resourceFieldLengthPath(graph, type, id, field),
        value: null
      })
    } else {
      pathValues.push({
        path: resourceFieldLengthPath(graph, type, id, field),
        value: staticResources[id][field]!.length
      })
    }
  })

  return pathValues
}, []))

export const staticResourceLabel = (
  staticResources: StaticResources, graph: string, type: string, ids: string[]
): Observable<PathValue[]> => of(ids.map((id) => {
  if (staticResources[id] === undefined) {
    return {
      path: resourcePath(graph, type, id),
      value: null,
    }
  } else if (staticResources[id].label === undefined || staticResources[id].label!.length === 0) {
    return {
      path: resourceLabelPath(graph, type, id),
      value: null
    }
  }

  const label = staticResources[id].label![0]
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

export const staticResourceFilter = (
  staticResources: StaticResources, graph: string, type: string, filters: string[], indices: number[]
): Observable<PathValue[]> => {
  const indicesSet = new Set(indices)

  return of(filters.reduce<PathValue[]>((pathValues, filter) => {
    const regexp = new RegExp(filter.split('').join('.*'), 'i')
    pathValues.push(...Object.keys(staticResources)
      .filter((staticResourceId) => any(
        (label) => regexp.test(typeof label === 'object' ? label.value: label.toString()),
        staticResources[staticResourceId].label || []
      ))
      .filter((_, idx) => indicesSet.has(idx))
      .map((staticResourceId, idx) => ({
        path: resourceFilterPath(graph, type, filter, idx),
        value: $ref(resourcePath(graph, type, staticResourceId))
      })))

    return pathValues
  }, []))
}

export const staticResourceFilterLength = (
  staticResources: StaticResources, graph: string, type: string, filters: string[],
): Observable<PathValue[]> => {
  return of(filters.map((filter) => {
    const regexp = new RegExp(filter.split('').join('.*'), 'i')
    
    return {
      path: resourceFilterLengthPath(graph, type, filter),
      value: Object.keys(staticResources)
        .filter((staticResourceId) => any(
          (label) => regexp.test(typeof label === 'object' ? label.value: label.toString()),
          staticResources[staticResourceId].label || []
        ))
        .length
    }
  }))
}

export const staticResourceRoutes = (
  statics: StaticResourcesByType, graph: string, postRequestOperators: OperatorFunction<PathValue | PathValue[], PathValue | PathValue[]>[] = []
) => Object.keys(statics)
  .reduce<Route[]>((routes, type) => {
    routes.push({
      route: `${graph}.resource.${type}[{keys}][{keys}][{integers}].value`,
      get([_, __, ___, ids, fields, indices]: [string, string, string, string[], string[], number[]]) {
        return staticResourceFieldValue(statics[type], graph, type, ids, fields, indices).pipe(...postRequestOperators as [])
      },
    }, {
      route: `${graph}.resource.${type}[{keys}][{keys}].length`,
      get([_, __, ___, ids, fields]: [string, string, string, string[], string[]]) {
        return staticResourceFieldLength(statics[type], graph, type, ids, fields).pipe(...postRequestOperators as [])
      },
    }, {
      route: `${graph}.resource.${type}[{keys}].label`,
      get([_, __, ___, ids]: [string, string, string, string[]]) {
        return staticResourceLabel(statics[type], graph, type, ids).pipe(...postRequestOperators as [])
      },
    }, {
      route: `${graph}.filter.${type}[{keys}][{integers}]`,
      get([_, __, ___, filters, indices]: [string, string, string, string[], number[]]) {
        return staticResourceFilter(statics[type], graph, type, filters, indices).pipe(...postRequestOperators as [])
      },
    },
    {
      route: `${graph}.filter.${type}[{keys}].length`,
      get([_, __, ___, filters]: [string, string, string, string[]]) {
        return staticResourceFilterLength(statics[type], graph, type, filters).pipe(...postRequestOperators as [])
      },
    })

    return routes
  }, [])
