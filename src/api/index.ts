import { StandardRange, PathValue } from 'falcor-router'
import { Observable, pipe } from 'rxjs'
import { map, groupBy, values, any, propEq, reduce, uniq, prop, lensProp, concat, over, set, defaultTo } from 'ramda';
import searchHandler from './search'
import resourceHandler from './resource'
import { batch } from '../utils/juno';


export type SearchRequest = { type: 'search', searchId: string, ranges: StandardRange[] }
export type SearchCountRequest = { type: 'search-count', searchId: string }
export type ResourceRequest = { type: 'resource', resourceTypes: string[], resources: string[], fields: string[], ranges: StandardRange[] }
export type ResourceCountRequest = { type: 'resource-count', resourceTypes: string[], resources: string[], fields: string[] }
export type MergedSearchRequest = Array<{ searchId: string, ranges: StandardRange[], count: boolean }>
export type ResourceRequestByType = { resources: string[], fields: string[], ranges: StandardRange[], count: boolean}
export type MergedResourceRequest = { [resourceType: string]: ResourceRequestByType }

export type ApiHandlers = {
  search: (req: SearchRequest | SearchCountRequest, metricEventHandler: () => void) => Observable<PathValue>
  resource: (req: ResourceRequest | ResourceCountRequest, metricEventHandler: () => void) => Observable<PathValue>
}


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


export default (): ApiHandlers => ({
  search: batch(mergeSearchRequests, searchHandler),
  resource: batch(mergeResourceRequests, resourceHandler),
})
