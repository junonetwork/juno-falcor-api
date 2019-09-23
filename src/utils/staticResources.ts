import { PathValue, Atom, Ref, Route } from 'falcor-router'
import { Observable, of, OperatorFunction } from 'rxjs'
import { $ref } from './falcor'
import { resourcePath, resourceFieldPath, resourceFieldValuePath, resourceFieldLengthPath, resourceLabelPath, resourceFilterPath, resourceFilterLengthPath } from './juno'
import { xprod, any, append } from 'ramda'


export type StaticResource = {
  [field: string]: (string | number | boolean | Atom | Ref)[] | undefined
} | Ref

export type ResolvedStaticResource = {
  [field: string]: (string | number | boolean | Atom | Ref)[] | undefined
}

export type StaticResources = {
  [id: string]: StaticResource | undefined
}

export type StaticResourcesByType = {
  [type: string]: StaticResources | undefined
}


export const isRef = (ref: any): ref is Ref => {
  return ref !== undefined && ref.$type === 'ref' && ref.value instanceof Array
}

const resolveStaticRef = (
  statics: StaticResourcesByType,
  graph: string,
  id: string,
  type: string,
  resource?: StaticResource,
): { id: string, type: string, resource: ResolvedStaticResource } | undefined => {
  if (resource === undefined ) {
    return undefined
  } else if (isRef(resource)) {
    let depth = 0
    let refPath = resource.value

    while (depth < 10) {
      const [refGraph, _, refType, refId] = refPath
      if (refGraph !== graph || statics[refType as string] === undefined || statics[refType as string]![refId as string] === undefined) {
        console.warn(`Resource reference not found for ${type}`)
        return undefined
      }

      const referencedResource = statics[refType as string]![refId as string]!
      if (isRef(referencedResource)) {
        refPath = referencedResource.value
        depth += 1
      } else {
        return { id: refId as string, resource: referencedResource, type: refType as string }
      }
    }

    console.warn(`Possible circular reference detected for ${type}`)
    return undefined
  }

  return { id, resource, type }
}


export const staticResourceFieldValue = (
  statics: StaticResourcesByType, graph: string, type: string, ids: string[], fields: string[], indices: number[]
): Observable<PathValue[]> => of(ids.reduce<PathValue[]>((pathValues, id) => {
  const resource = statics[type] !== undefined ? statics[type]![id] : undefined
  const resolved = resolveStaticRef(statics, graph, id, type, resource)

  if (resolved === undefined) {
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: null,
    })

    return pathValues
  }
  
  if (isRef(resource)) {
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: $ref(resourcePath(graph, resolved.type, resolved.id))
    })
  }

  xprod(fields, indices).map(([field, index]) => {
    if (resolved.resource[field] === undefined) {
      pathValues.push({
        path: resourceFieldPath(graph, resolved.type, resolved.id, field),
        value: null,
      })
    } else if (resolved.resource[field]![index] === undefined) {
      pathValues.push({
        path: resourceFieldValuePath(graph, resolved.type, resolved.id, field, index),
        value: null,
      })
    } else {
      pathValues.push({
        path: resourceFieldValuePath(graph, resolved.type, resolved.id, field, index),
        value: resolved.resource[field]![index],
      })
    }
  })

  return pathValues
}, []))

export const staticResourceFieldLength = (
  statics: StaticResourcesByType, graph: string, type: string, ids: string[], fields: string[]
): Observable<PathValue[]> => of(ids.reduce<PathValue[]>((pathValues, id) => {
  const resource = statics[type] !== undefined ? statics[type]![id] : undefined
  const resolved = resolveStaticRef(statics, graph, id, type, resource)

  if (resolved === undefined) {
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: null,
    })

    return pathValues
  }
  
  if (isRef(resource)) {
    /**
     * TODO - every isRef clause needs to actually resolve the data
     */
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: $ref(resourcePath(graph, resolved.type, resolved.id))
    })
  }

  fields.forEach((field) => {
    if (resolved.resource[field] === undefined) {
      pathValues.push({
        path: resourceFieldLengthPath(graph, resolved.type, resolved.id, field),
        value: null
      })
    } else {
      pathValues.push({
        path: resourceFieldLengthPath(graph, resolved.type, resolved.id, field),
        value: resolved.resource[field]!.length
      })
    }
  })

  return pathValues
}, []))

export const staticResourceLabel = (
  statics: StaticResourcesByType, graph: string, type: string, ids: string[]
): Observable<PathValue[]> => of(ids.reduce<PathValue[]>((pathValues, id) => {
  const resource = statics[type] !== undefined ? statics[type]![id] : undefined
  const resolved = resolveStaticRef(statics, graph, id, type, resource)

  if (resolved === undefined) {
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: null,
    })
    return pathValues
  } 
  
  if (isRef(resource)) {
    pathValues.push({
      path: resourcePath(graph, type, id),
      value: $ref(resourcePath(graph, resolved.type, resolved.id)),
    })
  } 
  
  if (resolved.resource.label === undefined || resolved.resource.label!.length === 0) {
    pathValues.push({
      path: resourceLabelPath(graph, resolved.type, resolved.id),
      value: null
    })
  } else {
    const label = resolved.resource.label![0]
    if (typeof label === 'object' && label.$type === 'ref') {
      pathValues.push({
        path: resourceLabelPath(graph, resolved.type, resolved.id),
        value: null
      })
    } else {
      pathValues.push({
        path: resourceLabelPath(graph, resolved.type, resolved.id),
        value: label
      })
    }
  }

  return pathValues
}, []))

export const staticResourceFilter = (
  statics: StaticResourcesByType, graph: string, type: string, filters: string[], indices: number[]
): Observable<PathValue[]> => {
  const staticResources = statics[type] || {}
  const indicesSet = new Set(indices)

  return of(filters.reduce<PathValue[]>((pathValues, filter) => {
    const regexp = new RegExp(filter.split('').join('.*'), 'i')
    pathValues.push(...Object.keys(staticResources)
      .reduce<{ id: string, type: string, resource: ResolvedStaticResource }[]>((resolvedResources, id) => {
        const resolved = resolveStaticRef(statics, graph, id, type, staticResources[id])
        return resolved !== undefined ?
          append({ id: resolved.id, type: resolved.type, resource: resolved.resource }, resolvedResources) :
          resolvedResources
      }, [])
      .filter(({ resource }) => (resource.label === undefined || resource.label.length === 0 ?
        false :
        any((label) => regexp.test(typeof label === 'object' ? label.value : label.toString()), resource.label)
      ))
      .map<[string, string, number]>(({ id, type }, idx) => [id, type, idx])
      .filter(([_, __, idx]) => indicesSet.has(idx))
      .map(([id, refType, idx]) => ({
        path: resourceFilterPath(graph, type, filter, idx),
        value: $ref(resourcePath(graph, refType, id))
      })))

    return pathValues
  }, []))
}

export const staticResourceFilterLength = (
  statics: StaticResourcesByType, graph: string, type: string, filters: string[],
): Observable<PathValue[]> => {
  const staticResources = statics[type] || {}

  return of(filters.map((filter) => {
    const regexp = new RegExp(filter.split('').join('.*'), 'i')

    return {
      path: resourceFilterLengthPath(graph, type, filter),
      value: Object.keys(staticResources)
        .reduce<{ id: string, type: string, resource: ResolvedStaticResource }[]>((resolvedResources, id) => {
          const resolved = resolveStaticRef(statics, graph, id, type, staticResources[id])
          return resolved !== undefined ?
            append({ id: resolved.id, type: resolved.type, resource: resolved.resource }, resolvedResources) :
            resolvedResources
        }, [])
        .filter(({ resource }) => (resource.label === undefined || resource.label.length === 0 ?
          false :
          any((label) => regexp.test(typeof label === 'object' ? label.value : label.toString()), resource.label)
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
      route: `${graph}.resource.${type}[{keys}].id`,
      get([_, __, ___, ids]: [string, string, string, string[]]) {
        return ids.reduce<PathValue[]>((pathValues, id) => {
          const resource = statics[type] !== undefined ? statics[type]![id] : undefined
          const resolved = resolveStaticRef(statics, graph, id, type, resource)
          
          if (resolved === undefined) {
            pathValues.push({
              path: resourcePath(graph, type, id),
              value: null
            })
            return pathValues
          }

          if (isRef(resource)) {
            pathValues.push({
              path: resourcePath(graph, type, id),
              value: $ref(resourcePath(graph, resolved.type, resolved.id)),
            })
          }

          pathValues.push({
            path: [graph, 'resource', resolved.type, resolved.id, 'id'],
            value: resolved.id
          })
          return pathValues
        }, [])
      },
    }, {
      route: `${graph}.resource.${type}[{keys}].type`,
      get([_, __, ___, ids]: [string, string, string[], string[]]) {
        return ids.reduce<PathValue[]>((pathValues, id) => {
          const resource = statics[type] !== undefined ? statics[type]![id] : undefined
          const resolved = resolveStaticRef(statics, graph, id, type, resource)

          if (resolved === undefined) {
            pathValues.push({
              path: resourcePath(graph, type, id),
              value: null
            })
            return pathValues
          }

          if (isRef(resource)) {
            pathValues.push({
              path: resourcePath(graph, type, id),
              value: $ref(resourcePath(graph, resolved.type, resolved.id))
            })
          }

          pathValues.push({
            path: [graph, 'resource', resolved.type, resolved.id, 'type'],
            value: resolved.type
          })
          return pathValues
        }, [])
      },
    }, {
      route: `${graph}.resource.${type}[{keys}][{keys}][{integers}].value`,
      get([_, __, ___, ids, fields, indices]: [string, string, string, string[], string[], number[]]) {
        return staticResourceFieldValue(statics, graph, type, ids, fields, indices).pipe(...postRequestOperators as [])
      },
    }, {
      route: `${graph}.resource.${type}[{keys}][{keys}].length`,
      get([_, __, ___, ids, fields]: [string, string, string, string[], string[]]) {
        return staticResourceFieldLength(statics, graph, type, ids, fields).pipe(...postRequestOperators as [])
      },
    }, {
      route: `${graph}.resource.${type}[{keys}].label`,
      get([_, __, ___, ids]: [string, string, string, string[]]) {
        return staticResourceLabel(statics, graph, type, ids).pipe(...postRequestOperators as [])
      },
    }, {
      route: `${graph}.filter.${type}[{keys}][{integers}]`,
      get([_, __, ___, filters, indices]: [string, string, string, string[], number[]]) {
        return staticResourceFilter(statics, graph, type, filters, indices).pipe(...postRequestOperators as [])
      },
    }, {
      route: `${graph}.filter.${type}[{keys}].length`,
      get([_, __, ___, filters]: [string, string, string, string[]]) {
        return staticResourceFilterLength(statics, graph, type, filters).pipe(...postRequestOperators as [])
      },
    })

    return routes
  }, [])
