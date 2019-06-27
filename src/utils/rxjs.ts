import { Subject, throwError, Observable } from 'rxjs'
import { catchError } from 'rxjs/operators'

export const fromHandler = <T>(): { handler: (data: T) => void, stream: Subject<T> } => {
  const stream = new Subject<T>()
  return {
    stream, handler: (data: T) => stream.next(data)
  }
}

export const logError = <T>() => catchError<T, Observable<never>>((err) => {
  console.error(err)
  return throwError(new Error('500'))
})
