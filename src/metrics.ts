import { Observable, of, partition, concat } from 'rxjs'
import {
  map as mapRx, groupBy, mergeMap, toArray, map,
} from 'rxjs/operators'


export const metric = Symbol('metric')
export const measurement = Symbol('measurement')

type Metric = {
  [metric]: true
  type: 'start' | 'end'
  id: number
  annotation: string
  t: number
}

type Measurement = {
  [measurement]: true
  type: 'measurement'
  id: number
  annotation: string
  total: number
}

const increment = (() => {
  let i = 0
  return () => i++
})()

export const start = (id: number, annotation: string): Metric => ({ [metric]: true, type: 'start', id, annotation, t: Date.now() })

export const end = (id: number, annotation: string): Metric => ({ [metric]: true, type: 'end', id, annotation, t: Date.now() })

export const isMetric = (data: any): data is Metric => data[metric]

export const interceptMetrics = <T>(stream$: Observable<T | Metric>): { data$: Observable<T>, metric$: Observable<Metric | Measurement> } => {
  const [metrics, data] = partition(stream$, (data) => isMetric(data))

  return {
    data$: data as Observable<T>,
    metric$: (metrics as Observable<Metric>).pipe(
      groupBy((metric) => metric.id),
      mergeMap((group$) => {
        return concat(
          group$,
          group$.pipe(toArray(), map<Metric[], Measurement>(([a, b]) => ({
            [measurement]: true,
            type: 'measurement',
            id: a.id,
            annotation: a.annotation,
            total: b.t - a.t
          })))
        )
      })
    )
  }
}

export const instrument = <T>(annotation: string, stream: Observable<T>): Observable<T | Metric> => {
  const id = increment()
  return concat(
    of(null).pipe(mapRx(() => start(id, annotation))),
    stream,
    // TODO - handle errors
    of(null).pipe(mapRx(() => end(id, annotation))),
  )
}

export const instrumentLogger = <T>(annotation: string, stream: Observable<T>): Observable<T> => {
  const id = increment()
  return concat(
    of(null).pipe(mapRx(() => start(id, annotation))),
    stream,
    // TODO - handle errors
    of(null).pipe(mapRx(() => end(id, annotation))),
  ).pipe(
    (stream$) => {
      const { data$, metric$ } = interceptMetrics(stream$)
      metric$.subscribe(
        (metric) => {
          if (metric.type === 'start') {
            console.log(`${metric.id} [${metric.annotation}] start request`)
          } else if (metric.type === 'measurement') {
            console.log(`${metric.id} [${metric.annotation}] end request - elapsed time ${metric.total}ms`)
          }
        }
      )
      return data$
    }
  )
}
