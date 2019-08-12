import { xprod } from 'ramda'
import Router, { StandardRange, PathValue, PathSet } from 'falcor-router'
import { from, Observable } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import searchHandler, { SearchCountRequest, SearchRequest, mergeSearchRequests } from './search'
import resourceHandler, { ResourceRequest, mergeResourceRequests } from './resource'
import { TYPES, FIELDS, graphTypeList } from './ontology'
import { logError } from '../utils/rxjs'
import { metrics, MetricEvent, logger, instrument, event } from '../utils/metrics'
import { batch, bufferSynchronous } from '../utils/juno'
import { COUNTRIES } from './countries'
import { resourceFieldValueFromMemory, resourceFieldLengthFromMemory, resourceLabelFromMemory } from '../utils/memoryStore'
import { $ref } from '../utils/falcor'


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
    get(this: IFalcorRouter, [_, __, searches, ranges]: [null, null, string[], StandardRange[]]) {
      return from(searches).pipe(
        mergeMap((search) => this.search({ type: 'search', search, ranges })),
        logError(),
        bufferSynchronous()
      )
    },
  },
  {
    route: 'juno.search[{keys}].length',
    get(this: IFalcorRouter, [_, __, searches]: [null, null, string[], string]) {
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
    get(this: IFalcorRouter, [_, __, resourceTypes, resources, fields, ranges]: [null, null, string[], string[], string[], StandardRange[]]) {
      return this.resource({ type: 'resource', resourceTypes, resources, fields, ranges }).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}][{keys}].length',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources, fields]: [null, null, string[], string[], string[]]) {
      return this.resource({ type: 'resource-count', resourceTypes, resources, fields }).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}].label',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources]: [null, null, string[], string[]]) {
      return this.resource({ type: 'resource-label', resourceTypes, resources }).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}].id',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources]: [null, null, string[], string[]]) {
      return from(xprod(resourceTypes, resources)).pipe(
        map(([type, id]) => ({
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
        map(([type, id]) => ({
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
      return resourceFieldValueFromMemory(COUNTRIES, 'juno', 'country', ids, fields, indices).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource.country[{keys}][{keys}].length',
    get([_, __, ___, ids, fields]: [null, null, null, string[], string[]]) {
      return resourceFieldLengthFromMemory(COUNTRIES, 'juno', 'country', ids, fields).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource.country[{keys}].label',
    get([_, __, ___, ids]: [null, null, null, string[]]) {
      return resourceLabelFromMemory(COUNTRIES, 'juno', 'country', ids).pipe(logError(), bufferSynchronous())
    },
  },
  /**
   * Type Resource Routes
   */
  {
    route: 'juno.resource.type[{keys}]["label", "field"][{integers}].value',
    get([_, __, ___, ids, fields, indices]: [null, null, null, string[], string[], number[]]) {
      return resourceFieldValueFromMemory(TYPES, 'juno', 'type', ids, fields, indices).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource.type[{keys}]["label", "field"].length',
    get([_, __, ___, ids, fields]: [null, null, null, string[], string[]]) {
      return resourceFieldLengthFromMemory(TYPES, 'juno', 'type', ids, fields).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource.type[{keys}].label',
    get([_, __, ___, ids]: [null, null, null, string[]]) {
      return resourceLabelFromMemory(TYPES, 'juno', 'type', ids).pipe(logError(), bufferSynchronous())
    },
  },
  /**
   * Field Resource Routes
   */
  {
    route: 'juno.resource.field[{keys}]["label", "range"][{integers}].value',
    get([_, __, ___, ids, fields, indices]: [null, null, null, string[], string[], number[]]) {
      return resourceFieldValueFromMemory(FIELDS, 'juno', 'field', ids, fields, indices).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource.field[{keys}]["label", "range"].length',
    get([_, __, ___, ids, fields]: [null, null, null, string[], string[]]) {
      return resourceFieldLengthFromMemory(FIELDS, 'juno', 'field', ids, fields).pipe(logError(), bufferSynchronous())
    },
  },
  {
    route: 'juno.resource.field[{keys}].label',
    get([_, __, ___, ids]: [null, null, null, string[]]) {
      return resourceLabelFromMemory(FIELDS, 'juno', 'field', ids).pipe(logError(), bufferSynchronous())
    },
  },
  /**
   * Graph Type Routes
   */
  {
    route: 'juno.types[{keys}]',
    get([_, __, indicesOrLength]: [null, null, ('length' | number)[]]) {
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
