import { pipe, map, groupBy, values, any, propEq, reduce, uniq, prop, lensProp, concat, over, set, defaultTo } from 'ramda'
import Router, { StandardRange, PathValue } from 'falcor-router'
import { PathSet, DataSource } from 'falcor'
import { from, Observable } from 'rxjs'
import { mergeMap, bufferTime } from 'rxjs/operators'
import searchHandler from './search'
import resourceHandler from './resource'
import { graphTypeList, graphTypeValue, graphFieldValue } from './ontology'
import { logError } from '../utils/rxjs'
import { metrics, MetricHandlers, MetricEvent, logger, instrument, event } from '../metrics'
import { batch } from '../utils/juno'


export type SearchRequest = { type: 'search', searchId: string, ranges: StandardRange[] }
export type SearchCountRequest = { type: 'search-count', searchId: string }
export type ResourceRequest = { type: 'resource', resourceTypes: string[], resources: string[], fields: string[], ranges: StandardRange[] }
export type ResourceCountRequest = { type: 'resource-count', resourceTypes: string[], resources: string[], fields: string[] }
export type MergedSearchRequest = Array<{ searchId: string, ranges: StandardRange[], count: boolean }>
export type ResourceRequestByType = { resources: string[], fields: string[], ranges: StandardRange[], count: boolean}
export type MergedResourceRequest = { [resourceType: string]: ResourceRequestByType }

type IFalcorRouter = {
  search: (req: SearchRequest | SearchCountRequest) => Observable<PathValue>
  resource: (req: ResourceRequest | ResourceCountRequest) => Observable<PathValue>
}


const BaseRouter = Router.createClass([
  {
    route: 'juno.search[{keys}][{ranges}]',
    get(this: IFalcorRouter, [_, __, searches, ranges]: [null, null, string[], StandardRange[]]) {
      return from(searches).pipe(
        mergeMap((searchId) => this.search({ type: 'search', searchId, ranges })),
        logError,
        bufferTime(0)
      )
    },
  },
  {
    route: 'juno.search[{keys}].length',
    get(this: IFalcorRouter, [_, __, searches]: [null, null, string[], string]) {
      return from(searches).pipe(
        mergeMap((searchId) => this.search({ type: 'search-count', searchId })),
        logError,
        bufferTime(0)
      )
    }
  },
  {
    route: 'juno.resource[{keys}][{keys}][{keys}][{ranges}]',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources, fields, ranges]: [null, null, string[], string[], string[], StandardRange[]]) {
      return this.resource({ type: 'resource', resourceTypes, resources, fields, ranges }).pipe(logError, bufferTime(0))
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}][{keys}].length',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources, fields]: [null, null, string[], string[], string[]]) {
      return this.resource({ type: 'resource-count', resourceTypes, resources, fields }).pipe(logError, bufferTime(0))
    },
  },
  {
    route: 'juno.types[{keys}]',
    get([_, __, indicesOrLength]: [null, null, (string | number)[]]) {
      return graphTypeList(indicesOrLength).pipe(logError, bufferTime(0))
    }
  },
  {
    route: 'juno.resource.type[{keys}]["label", "field"][{keys}]',
    get([_, __, ___, ids, fields, indicesOrLength]: [null, null, null, string[], ('label' | 'field')[], (string | number)[]]) {
      return graphTypeValue(ids, fields, indicesOrLength).pipe(logError, bufferTime(0))
    },
  },
  {
    route: 'juno.resource.field[{keys}]["label", "range"][{keys}]',
    get([_, __, ___, ids, fields, indicesOrLength]: [null, null, null, string[], ('label' | 'range')[], (string | number)[]]) {
      return graphFieldValue(ids, fields, indicesOrLength).pipe(logError, bufferTime(0))
    },
  },
])


const mergeSearchRequests: (reqs: Array<SearchRequest | SearchCountRequest>) => MergedSearchRequest = pipe(
  groupBy<SearchRequest | SearchCountRequest>(prop('searchId')),
  values,
  map((reqs) => ({
    searchId: reqs[0].searchId,
    ranges: uniq(
      reqs.reduce<StandardRange[]>((acc, req) => (req.type === 'search' && acc.push(...req.ranges), acc), [])
    ), // TODO - merge ranges, rather than simply concatenating
    count: any(propEq('type', 'search-count'), reqs),
  }))
)

const mergeResourceRequests = reduce<ResourceRequest | ResourceCountRequest, MergedResourceRequest>(
  (grouped, req) => {
    return req.resourceTypes.reduce((grouped, resourceType) => {
      return over(lensProp(resourceType), (requestsByType: ResourceRequestByType | undefined) => {
        return pipe(
          defaultTo({
            resources: [],
            fields: [],
            ranges: [],
            count: false
          }),
          over(lensProp('resources'), (resources) => uniq(concat(req.resources, resources))),
          over(lensProp('fields'), (fields) => uniq(concat(req.fields, fields))),
          (requestsByType) => {
            return req.type === 'resource' ?
              over(lensProp('ranges'), (ranges) => uniq(concat(req.ranges, ranges)), requestsByType) : // TODO - merge ranges, rather than simply concatenating
              set(lensProp('count'), true, requestsByType)
          },
        )(requestsByType)
      }, grouped)
    }, grouped)
  },
  {}
)


class FalcorRouter extends BaseRouter implements IFalcorRouter {
  public metrics: MetricHandlers<MetricEvent>
  public search: (req: SearchRequest | SearchCountRequest) => Observable<PathValue>
  public resource: (req: ResourceRequest | ResourceCountRequest) => Observable<PathValue>

  constructor() {
    super()
    this.metrics = metrics<MetricEvent>(logger)
    this.search = batch(mergeSearchRequests, searchHandler, () => this.metrics.event(event('searchRequestt')))
    this.resource = batch(mergeResourceRequests, resourceHandler, () => this.metrics.event(event('resourceRequest')))
  }

  get(pathSets: PathSet[]) {
    return from(super.get(pathSets)).pipe(instrument(this.metrics))
  }
}

export default () => new FalcorRouter() as any as DataSource
