import { from, Observable, merge } from "rxjs";
import { delay, mergeMap } from "rxjs/operators";
import { MergedResourceRequest } from "./index";
import { ranges2List, $atom, $ref } from "../utils/falcor";
import { PathValue } from "falcor-router";
import { xprod, groupBy } from "ramda";


const COUNTRIES = {
  gbr: {
    name: ['United Kingdom']
  }
}

export default (request: MergedResourceRequest): Observable<PathValue> => {
  console.log('side effect resource api call', request)

  /**
   * map resource type to backing service
   */
  const { countriesService = [], entitiesService = [] } = groupBy(
    (type) => {
      if (type === 'country') {
        return 'countriesService'
      } else {
        return 'entitiesService'
      }
    },
    Object.keys(request)
  )

  return merge(
    from(entitiesService).pipe(
      mergeMap((type) => xprod(request[type].resources, request[type].fields)
        .reduce<PathValue[]>((acc, [resource, field]) => {
          const resourceResult: PathValue[] = field === 'birthDate' ?
            ranges2List(request[type].ranges).map((index) => ({
              path: ['juno', 'resource', type, resource, 'birthDate', index],
              value: $atom(`1980-10-10`, { dataType: 'date' }),
            })) :
          field === 'shareholderOf' ?
            ranges2List(request[type].ranges).map((index) => ({
              path: ['juno', 'resource', type, resource, 'shareholderOf', index],
              value: $ref(['juno', 'resource', 'company', `_${index}:shareholder`]),
            })) :
          field === 'nationality' ?
            ranges2List(request[type].ranges).map((index) => ({
              path: ['juno', 'resource', type, resource, field, index],
              value: $ref(['juno', 'resource', 'country', 'gbr']),
            })) :
            ranges2List(request[type].ranges).map((index) => ({
              path: ['juno', 'resource', type, resource, field, index],
              value: $atom(`${field} value ${index}`),
            }))

          acc.push(...resourceResult)
          if (request[type].count) {
            acc.push({
              path: ['juno', 'resource', type, resource, field, 'length'],
              value: 5,
            })
          }

          return acc
        }, []))
    ),
    from(countriesService).pipe(
      mergeMap(() => xprod(request.country.resources, request.country.fields)
        .reduce<PathValue[]>((acc, [resource, field]) => {
          if (COUNTRIES[resource] === undefined) {
            acc.push({
              path: ['juno', 'resource', 'country', resource],
              value: null
            })
            return acc
          } else if (field !== 'name') {
            acc.push({
              path: ['juno', 'resource', 'country', resource, field],
              value: null
            })
            return acc
          }

          const resourceResults = ranges2List(request.country.ranges).map((index) => ({
            path: ['juno', 'resource', 'country', resource, 'name', 0],
            value: COUNTRIES[resource].name[index] === undefined ? null : $atom(COUNTRIES[resource].name[index]),
          }))

          acc.push(...resourceResults)
          if (request.country.count) {
            acc.push({
              path: ['juno', 'resource', 'country', resource, 'name', 'length'],
              value: COUNTRIES[resource].name.length,
            })
          }

          return acc
        }, []))
    )
  ).pipe(delay(100))
}
