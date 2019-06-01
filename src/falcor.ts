import Router, { StandardRange } from 'falcor-router'
import { from } from 'rxjs'
import { mergeMap, bufferTime } from 'rxjs/operators'
import Api, { ApiHandlers } from './api/index'
import searchHandler from './api/search'
import resourceHandler from './api/resource'
import { graphTypeList, graphTypeValue, graphFieldValue } from './api/ontology'
import { logError } from './utils/rxjs';


const BaseRouter = Router.createClass([
  {
    route: 'juno.search[{keys}][{ranges}]',
    get(this: IFalcorRouter, [_, __, searches, ranges]: [null, null, string[], StandardRange[]]) {
      return from(searches).pipe(
        mergeMap((searchId) => this.api.search({ type: 'search', searchId, ranges })),
        logError,
        bufferTime(0)
      )
    },
  },
  {
    route: 'juno.search[{keys}].length',
    get(this: IFalcorRouter, [_, __, searches]: [null, null, string[], string]) {
      return from(searches).pipe(
        mergeMap((searchId) => this.api.search(({ type: 'search-count', searchId }))),
        logError,
        bufferTime(0)
      )
    }
  },
  {
    route: 'juno.resource[{keys}][{keys}][{keys}][{ranges}]',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources, fields, ranges]: [null, null, string[], string[], string[], StandardRange[]]) {
      return this.api.resource({ type: 'resource', resourceTypes, resources, fields, ranges }).pipe(logError, bufferTime(0))
    },
  },
  {
    route: 'juno.resource[{keys}][{keys}][{keys}].length',
    get(this: IFalcorRouter, [_, __, resourceTypes, resources, fields]: [null, null, string[], string[], string[]]) {
      return this.api.resource({ type: 'resource-count', resourceTypes, resources, fields }).pipe(logError, bufferTime(0))
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

type IFalcorRouter = {
  api: ApiHandlers
}

class FalcorRouter extends BaseRouter implements IFalcorRouter {
  public api: ApiHandlers

  constructor() {
    super()
    this.api = Api({
      searchHandler,
      resourceHandler,
    })
  }
}

export default () => new FalcorRouter()
