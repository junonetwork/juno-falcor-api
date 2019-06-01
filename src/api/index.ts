import { StandardRange, PathValue } from 'falcor-router'
import { from, Observable, pipe, Subject, ReplaySubject } from 'rxjs'
import {
  mergeMap,
  map as mapRx,
  toArray,
  multicast,
  refCount,
} from 'rxjs/operators'
import { map, groupBy, values, any, propEq, reduce, uniq, prop, lensProp, concat, over, set, defaultTo } from 'ramda';


export type SearchRequest = { type: 'search', searchId: string, ranges: StandardRange[] }
export type SearchCountRequest = { type: 'search-count', searchId: string }
export type ResourceRequest = { type: 'resource', resourceTypes: string[], resources: string[], fields: string[], ranges: StandardRange[] }
export type ResourceCountRequest = { type: 'resource-count', resourceTypes: string[], resources: string[], fields: string[] }
export type MergedSearchRequest = { searchId: string, ranges: StandardRange[], count: boolean }
export type ResourceRequestByType = { resources: string[], fields: string[], ranges: StandardRange[], count: boolean}
export type MergedResourceRequest = { [resourceType: string]: ResourceRequestByType }

export type ApiHandlers = {
  search: (req: SearchRequest | SearchCountRequest) => Observable<PathValue>
  resource: (req: ResourceRequest | ResourceCountRequest) => Observable<PathValue>
}

const mergeSearchRequests: (reqs: Array<SearchRequest | SearchCountRequest>) => MergedSearchRequest[] = pipe(
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

// const mergeResourceRequests = reduce<ResourceRequest | ResourceCountRequest, MergedResourceRequest>(
//   (grouped, req) => {
//     req.resourceTypes.forEach((resourceType) => {
//       if (grouped[resourceType] === undefined) {
//         grouped[resourceType] = {
//           resources: [],
//           fields: [],
//           ranges: [],
//           count: false
//         }
//       }

//       if (req.type === 'resource') {
//         // TODO - should these be Sets?
//         grouped[resourceType].resources = uniq(grouped[resourceType].resources.concat(...req.resources))
//         grouped[resourceType].fields = uniq(grouped[resourceType].fields.concat(...req.fields))
//         // TODO - merge ranges, rather than simply concatenating
//         grouped[resourceType].ranges = uniq(grouped[resourceType].ranges.concat(...req.ranges))
//       } else if (req.type === 'resource-count') {
//         grouped[resourceType].count = true
//       }
//     })
//     return grouped
//   },
//   {}
// )

export default ({
  searchHandler,
  resourceHandler,
}: {
  searchHandler: (req: MergedSearchRequest) => Observable<PathValue>,
  resourceHandler: (req: MergedResourceRequest) => Observable<PathValue>,
}): ApiHandlers => {
  let searchRequest$: Subject<SearchRequest | SearchCountRequest> | undefined
  let searchResponse$: Observable<PathValue> | undefined

  let resourceRequest$: Subject<ResourceRequest | ResourceCountRequest> | undefined
  let resourceResponse$: Observable<PathValue> | undefined

  return {
    search: (req: SearchRequest | SearchCountRequest) => {
      if (searchRequest$ === undefined) {
        searchRequest$ = new ReplaySubject<SearchRequest | SearchCountRequest>()
        searchResponse$ = searchRequest$.pipe(
          toArray(),
          mergeMap((reqs) => from(mergeSearchRequests(reqs))),
          mergeMap(searchHandler),
          multicast(new Subject()),
          refCount(),
        )
  
        setTimeout(() => {
          searchRequest$!.complete()
          searchRequest$ = undefined
          searchResponse$ = undefined
        }, 0)
      }
  
      searchRequest$.next(req)
      return searchResponse$!
    },
    resource: (req: ResourceRequest | ResourceCountRequest) => {
      if (resourceRequest$ === undefined) {
        resourceRequest$ = new ReplaySubject<ResourceRequest | ResourceCountRequest>()
        resourceResponse$ = resourceRequest$.pipe(
          toArray(),
          mapRx(mergeResourceRequests),
          mergeMap(resourceHandler),
          multicast(new Subject()),
          refCount(),
        )
  
        setTimeout(() => {
          resourceRequest$!.complete()
          resourceRequest$ = undefined
          resourceResponse$ = undefined
        }, 0)
      }
  
      resourceRequest$.next(req)
      return resourceResponse$!
    }
  }
}
