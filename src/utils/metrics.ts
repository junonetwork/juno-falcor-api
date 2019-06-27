import { Observable } from 'rxjs'
import { finalize } from 'rxjs/operators'


export type MetricEvent = { type: 'start', t: number } |
  { type: 'event', name: string, meta: any }

export type MetricHandlers<T> = {
  event: (event: T) => void
  complete: () => void
}

export const start = () => ({ type: 'start' as 'start', t: Date.now() })

export const event = (name: string, meta?: any) => ({ type: 'event' as 'event', name, meta })

export const logger = (events: MetricEvent[]) => {
  const start = events.find((event): event is { type: 'start', t: number } => event.type === 'start')

  if (start === undefined) {
    return
  }

  const grouped = events.reduce<{ [event: string]: number }>((grouped, event) => {
    if (event.type === 'event') {
      if (grouped[event.name] === undefined) {
        grouped[event.name] = 1
      } else {
        grouped[event.name] += 1
      }
    }
    return grouped
  }, {})

  const totalRequests = Object.keys(grouped).reduce((acc, eventName) => acc + grouped[eventName], 0)

  console.log(`Request Metrics: ${Object.keys(grouped).map((eventName) => `${eventName}: ${grouped[eventName]} `).join('')}totalRequests ${totalRequests} - elapsed time ${Date.now() - start.t}ms`)
}

export const instrument = <T>(handler: MetricHandlers<MetricEvent>) => (stream$: Observable<T>): Observable<T> => {
  handler.event(start())
  return stream$.pipe(finalize(handler.complete))
}

export const metrics = <T>(complete: (events: T[]) => void): MetricHandlers<T> => {
  const events: T[] = []
  return {
    event: (event: T) => { events.push(event) },
    complete: () => complete(events)
  }
}

// export const metric = Symbol('metric')
// export const measurement = Symbol('measurement')

// type Metric = {
//   [metric]: true
//   type: 'start' | 'end'
//   id: string
//   annotation: string
//   t: number
// }

// type Measurement = {
//   [measurement]: true
//   type: 'measurement'
//   id: string
//   annotation: string
//   total: number
// }


// export const start = (id: string, annotation: string): Metric => ({ [metric]: true, type: 'start', id, annotation, t: Date.now() })

// export const end = (id: string, annotation: string): Metric => ({ [metric]: true, type: 'end', id, annotation, t: Date.now() })

// export const isMetric = (data: any): data is Metric => data[metric]

// export const interceptMetrics = <T>(stream$: Observable<T | Metric>): { data$: Observable<T>, metric$: Observable<Metric | Measurement> } => {
//   const [metrics, data] = partition(stream$, (data) => isMetric(data))

//   return {
//     data$: data as Observable<T>,
//     metric$: (metrics as Observable<Metric>).pipe(
//       groupBy((metric) => metric.id),
//       mergeMap((group$) => {
//         return merge(
//           group$,
//           group$.pipe(toArray(), map<Metric[], Measurement>((metrics) => {
//             const start = metrics[0]
//             const end = metrics[metrics.length - 1]
//             return {
//               [measurement]: true,
//               type: 'measurement',
//               id: start.id,
//               annotation: start.annotation,
//               total: end.t - start.t
//             }
//           })),
//         )
//       })
//     )
//   }
// }

// export const instrument = <T>(id: string, annotation: string) => (stream$: Observable<T>): Observable<T | Metric> => {
//   return concat(
//     of(null).pipe(map(() => start(id, annotation))),
//     stream$,
//     // TODO - handle errors
//     of(null).pipe(map(() => end(id, annotation))),
//   ).pipe(multicast(new Subject()), refCount())
// }

// export const instrumentLogger = <T>(id: string, annotation: string) => (stream$: Observable<T>): Observable<T> => {
//   return instrument(id, annotation)(stream$).pipe(
//     multicast(new Subject()),
//     refCount(),
//     (stream$) => {
//       const { data$, metric$ } = interceptMetrics(stream$)

//       metric$.subscribe(
//         (metric) => {
//           if (metric.type === 'start') {
//             console.log(`${metric.id} [${metric.annotation}] start request`)
//           } else if (metric.type === 'measurement') {
//             console.log(`${metric.id} [${metric.annotation}] end request - elapsed time ${metric.total}ms`)
//           }
//         }
//       )
//       return data$
//     }
//   )
// }
