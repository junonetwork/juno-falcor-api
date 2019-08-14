import { xprod } from 'ramda'
import Router, { StandardRange, PathValue, PathSet } from 'falcor-router'
import { from, Observable } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import searchHandler, { SearchCountRequest, SearchRequest, mergeSearchRequests } from './search'
import resourceHandler, { ResourceRequest, mergeResourceRequests } from './resource'
import { STATIC_RESOURCES, graphTypeList } from './staticResources'
import { logError } from '../utils/rxjs'
import { metrics, MetricEvent, logger, instrument, event } from '../utils/metrics'
import { batch, bufferSynchronous } from '../utils/juno'
import { $ref } from '../utils/falcor'
import { staticResourceRoutes } from '../utils/staticResources'


type IFalcorRouter = {
  search: (req: SearchRequest | SearchCountRequest) => Observable<PathValue | PathValue[]>
  resource: (req: ResourceRequest) => Observable<PathValue | PathValue[]>
}


const BaseRouter = Router.createClass([
  /**
   * Search Routes
   */
  {
    route: 'juno.search[{keys}][{ranges}]["value", "qualifier"]',
    get(this: IFalcorRouter, [_, __, searches, ranges]: [string, string, string[], StandardRange[]]) {
      return from(searches).pipe(
        mergeMap((search) => this.search({ type: 'search', search, ranges })),
        logError(),
        bufferSynchronous()
      )
    },
  },
  {
    route: 'juno.search[{keys}].length',
    get(this: IFalcorRouter, [_, __, searches]: [string, string, string[], string]) {
      return from(searches).pipe(
        mergeMap((search) => this.search({ type: 'search-count', search })),
        logError(),
        bufferSynchronous()
      )
    }
  },
  /**
   * Resource Routes
   */
  {
    route: 'juno.resource[{keys}][{keys}][{keys}][{ranges}]["value", "qualifier"]',
    get(this: IFalcorRouter, [_, __, resourceTypes, ids, fields, ranges]: [string, string, string[], string[], string[], StandardRange[]]) {
      return this.resource({ type: 'resource', resourceTypes, ids, fields, ranges }).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}][{keys}].length',
    get(this: IFalcorRouter, [_, __, resourceTypes, ids, fields]: [string, string, string[], string[], string[]]) {
      return this.resource({ type: 'resource-count', resourceTypes, ids, fields }).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}].label',
    get(this: IFalcorRouter, [_, __, resourceTypes, ids]: [string, string, string[], string[]]) {
      return this.resource({ type: 'resource-label', resourceTypes, ids }).pipe(logError(), bufferSynchronous())
    },
  },
  {
    // route can be auto generated
    route: 'juno.resource[{keys}][{keys}].type',
    get([_, __, resourceTypes, ids]: [string, string, string[], string[]]) {
      return from(xprod(resourceTypes, ids)).pipe(
        map(([type, id]) => ({
          path: ['juno', 'resource', type, id, 'type'],
          value: $ref(['juno', 'resource', 'type', type]),
        }))
      )
    },
  },
  {
    // route can be auto generated
    route: 'juno.resource[{keys}][{keys}].id',
    get([_, __, resourceTypes, ids]: [string, string, string[], string[]]) {
      return from(xprod(resourceTypes, ids)).pipe(
        map(([type, id]) => ({
          path: ['juno', 'resource', type, id, 'id'],
          value: id,
        }))
      )
    },
  },
  /**
   * Static Resource Routes
   */
  ...staticResourceRoutes(STATIC_RESOURCES, 'juno', [logError(), bufferSynchronous()]),
  /**
   * Graph Type Routes
   */
  {
    route: 'juno.types[{keys}]',
    get([_, __, indicesOrLength]: [string, string, ('length' | number)[]]) {
      return graphTypeList(indicesOrLength).pipe(logError(), bufferSynchronous())
    }
  },
])


class FalcorRouter extends BaseRouter implements IFalcorRouter {
  public metrics = metrics<MetricEvent>(logger)
  public search = batch(mergeSearchRequests, searchHandler, () => this.metrics.event(event('searchRequest')))
  public resource = batch(mergeResourceRequests, resourceHandler, () => this.metrics.event(event('resourceRequest')))

  get(pathSets: PathSet[]) {
    return from(super.get(pathSets)).pipe(instrument(this.metrics))
  }
}


export default () => new FalcorRouter()
