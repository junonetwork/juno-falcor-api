import { pipe, map, groupBy, values, any, propEq, reduce, uniq, prop, lensProp, concat, over, set, defaultTo, xprod } from 'ramda'
import Router, { StandardRange, PathValue, PathSet } from 'falcor-router'
import { from, Observable } from 'rxjs'
import { map as mapRx, mergeMap } from 'rxjs/operators'
import searchHandler from './search'
import resourceHandler from './resource'
import { TYPES, FIELDS, graphTypeList } from './ontology'
import { logError } from '../utils/rxjs'
import { metrics, MetricEvent, logger, instrument, event } from '../utils/metrics'
import { batch, bufferSynchronousEmits } from '../utils/juno'
import { COUNTRIES } from './countries'
import { resourceFieldValueFromMemory, resourceFieldLengthFromMemory, resourceLabelFromMemory } from '../utils/memoryStore'
import { $ref } from '../utils/falcor';


export type SearchRequest = { type: 'search', search: string, ranges: StandardRange[] }
export type SearchCountRequest = { type: 'search-count', search: string }
export type ResourceValueRequest = { type: 'resource', resourceTypes: string[], resources: string[], fields: string[], ranges: StandardRange[] }
export type ResourceCountRequest = { type: 'resource-count', resourceTypes: string[], resources: string[], fields: string[] }
export type ResourceLabelRequest = { type: 'resource-label', resourceTypes: string[], resources: string[] }
export type ResourceRequest = ResourceValueRequest | ResourceCountRequest | ResourceLabelRequest
export type MergedSearchRequest = Array<{ search: string, ranges: StandardRange[], count: boolean }>
export type ResourceRequestByType = { resources: string[], fields: string[], ranges: StandardRange[], count: boolean, label: boolean }
export type MergedResourceRequest = { [resourceType: string]: ResourceRequestByType }

type IFalcorRouter = {
  search: (req: SearchRequest | SearchCountRequest) => Observable<PathValue>
  resource: (req: ResourceRequest) => Observable<PathValue>
}


const BaseRouter = Router.createClass([
  /**
   * Search Routes
   */
  {
    route: 'juno.search[{keys}][{ranges}]["value", "qualifier"]',
    get(this: IFalcorRouter, [_, __, searches, ranges]: [null, null, string[], StandardRange[]]) {
      return from(searches).pipe(
        mergeMap((search) => this.search({ type: 'search', search, ranges })),
        logError,
        bufferSynchronousEmits()
      )
    },
  },
  {
    route: 'juno.search[{keys}].length',
    get(this: IFalcorRouter, [_, __, searches]: [null, null, string[], string]) {
      return from(searches).pipe(
        mergeMap((search) => this.search({ type: 'search-count', search })),
        logError,
        bufferSynchronousEmits()
      )
    }
  },
  /**
   * Resource Routes
   */
  {
    route: 'juno.resource[{keys}][{keys}][{keys}][{ranges}]["value", "qualifier"]',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources, fields, ranges]: [null, null, string[], string[], string[], StandardRange[]]) {
      return this.resource({ type: 'resource', resourceTypes, resources, fields, ranges }).pipe(logError, bufferSynchronousEmits())
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}][{keys}].length',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources, fields]: [null, null, string[], string[], string[]]) {
      return this.resource({ type: 'resource-count', resourceTypes, resources, fields }).pipe(logError, bufferSynchronousEmits())
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}].label',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources]: [null, null, string[], string[]]) {
      return this.resource({ type: 'resource-label', resourceTypes, resources }).pipe(logError, bufferSynchronousEmits())
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}].id',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources]: [null, null, string[], string[]]) {
      return from(xprod(resourceTypes, resources)).pipe(
        mapRx(([type, id]) => ({
          path: ['juno', 'resource', type, id, 'id'],
          value: id,
        }))
      )
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}].type',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources]: [null, null, string[], string[]]) {
      return from(xprod(resourceTypes, resources)).pipe(
        mapRx(([type, id]) => ({
          path: ['juno', 'resource', type, id, 'type'],
          value: $ref(['juno', 'resource', 'type', type]),
        }))
      )
    },
  },
  /**
   * Country Resource Routes
   */
  {
    route: 'juno.resource.country[{keys}][{keys}][{integers}].value',
    get([_, __, ___, ids, fields, indices]: [null, null, null, string[], string[], number[]]) {
      return resourceFieldValueFromMemory(COUNTRIES, 'juno', 'country', ids, fields, indices).pipe(logError, bufferSynchronousEmits())
    },
  },
  {
    route: 'juno.resource.country[{keys}][{keys}].length',
    get([_, __, ___, ids, fields]: [null, null, null, string[], string[]]) {
      return resourceFieldLengthFromMemory(COUNTRIES, 'juno', 'country', ids, fields).pipe(logError, bufferSynchronousEmits())
    },
  },
  {
    route: 'juno.resource.country[{keys}].label',
    get([_, __, ___, ids]: [null, null, null, string[]]) {
      return resourceLabelFromMemory(COUNTRIES, 'juno', 'country', ids).pipe(logError, bufferSynchronousEmits())
    },
  },
  /**
   * Type Resource Routes
   */
  {
    route: 'juno.resource.type[{keys}]["label", "field"][{integers}].value',
    get([_, __, ___, ids, fields, indices]: [null, null, null, string[], string[], number[]]) {
      return resourceFieldValueFromMemory(TYPES, 'juno', 'type', ids, fields, indices).pipe(logError, bufferSynchronousEmits())
    },
  },
  {
    route: 'juno.resource.type[{keys}]["label", "field"].length',
    get([_, __, ___, ids, fields]: [null, null, null, string[], string[]]) {
      return resourceFieldLengthFromMemory(TYPES, 'juno', 'type', ids, fields).pipe(logError, bufferSynchronousEmits())
    },
  },
  {
    route: 'juno.resource.type[{keys}].label',
    get([_, __, ___, ids]: [null, null, null, string[]]) {
      return resourceLabelFromMemory(TYPES, 'juno', 'type', ids).pipe(logError, bufferSynchronousEmits())
    },
  },
  /**
   * Field Resource Routes
   */
  {
    route: 'juno.resource.field[{keys}]["label", "range"][{integers}].value',
    get([_, __, ___, ids, fields, indices]: [null, null, null, string[], string[], number[]]) {
      return resourceFieldValueFromMemory(FIELDS, 'juno', 'field', ids, fields, indices).pipe(logError, bufferSynchronousEmits())
    },
  },
  {
    route: 'juno.resource.field[{keys}]["label", "range"].length',
    get([_, __, ___, ids, fields]: [null, null, null, string[], string[]]) {
      return resourceFieldLengthFromMemory(FIELDS, 'juno', 'field', ids, fields).pipe(logError, bufferSynchronousEmits())
    },
  },
  {
    route: 'juno.resource.field[{keys}].label',
    get([_, __, ___, ids]: [null, null, null, string[]]) {
      return resourceLabelFromMemory(FIELDS, 'juno', 'field', ids).pipe(logError, bufferSynchronousEmits())
    },
  },
  /**
   * Graph Type Routes
   */
  {
    route: 'juno.types[{keys}]',
    get([_, __, indicesOrLength]: [null, null, ('length' | number)[]]) {
      return graphTypeList(indicesOrLength).pipe(logError, bufferSynchronousEmits())
    }
  },
])


const mergeSearchRequests: (reqs: Array<SearchRequest | SearchCountRequest>) => MergedSearchRequest = pipe(
  groupBy<SearchRequest | SearchCountRequest>(prop('search')),
  values,
  map((reqs) => ({
    search: reqs[0].search,
    ranges: uniq(
      reqs.reduce<StandardRange[]>((acc, req) => (req.type === 'search' && acc.push(...req.ranges), acc), [])
    ), // TODO - merge ranges, rather than simply concatenating
    count: any(propEq('type', 'search-count'), reqs),
  }))
)

const mergeResourceRequests = reduce<ResourceRequest, MergedResourceRequest>(
  (grouped, req) => {
    return req.resourceTypes.reduce((grouped, resourceType) => {
      return over(lensProp(resourceType), (requestsByType: ResourceRequestByType | undefined) => {
        return pipe(
          defaultTo({
            resources: [],
            fields: [],
            ranges: [],
            count: false,
            label: false,
          }),
          over(lensProp('resources'), (resources) => uniq(concat(req.resources, resources))),
          over(lensProp('fields'), (fields) => req.type !== 'resource-label' ? uniq(concat(req.fields, fields)) : fields),
          (requestsByType) => {
            if (req.type === 'resource') {
              return over(lensProp('ranges'), (ranges) => uniq(concat(req.ranges, ranges)), requestsByType) // TODO - merge ranges, rather than simply concatenating
            } else if (req.type === 'resource-count') {
              return set(lensProp('count'), true, requestsByType)
            } else if (req.type === 'resource-label') {
              return set(lensProp('label'), true, requestsByType)
            }

            return requestsByType as never
          },
        )(requestsByType)
      }, grouped)
    }, grouped)
  },
  {}
)


class FalcorRouter extends BaseRouter implements IFalcorRouter {
  public metrics = metrics<MetricEvent>(logger)
  public search = batch(mergeSearchRequests, searchHandler, () => this.metrics.event(event('searchRequest')))
  public resource = batch(mergeResourceRequests, resourceHandler, () => this.metrics.event(event('resourceRequest')))

  get(pathSets: PathSet[]) {
    return from(super.get(pathSets)).pipe(instrument(this.metrics))
  }
}

export default () => new FalcorRouter()
