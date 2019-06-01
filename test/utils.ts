import tape from 'tape'
import {
  map,
} from 'rxjs/operators'
import { fromHandler } from '../src/utils/rxjs'
import { xprod } from '../src/utils/juno'


tape('[Utils] fromHandler', (assert) => {
  assert.plan(3)
  
  const { handler, stream } = fromHandler<{ id: string }>()

  stream.pipe(
    map(({ id }, idx) => ({ id, idx }))
  ).subscribe({
    next: (data) => assert.deepEquals(data, { id: ['a', 'b', 'c'][data.idx], idx: data.idx }),
    error: (err) => assert.fail(err),
    complete: () => assert.end(),
  })

  handler({ id: 'a' })
  handler({ id: 'b' })
  handler({ id: 'c' })
})

tape('[Utils] xprod', (assert) => {
  assert.plan(4)

  const a = [1, 2]
  const b = ['a', 'b']
  const c = ['x', 'y']

  assert.deepEquals(xprod(a, b, c), [
    [1, 'a', 'x'], [1, 'a', 'y'], [1, 'b', 'x'], [1, 'b', 'y'], [2, 'a', 'x'], [2, 'a', 'y'], [2, 'b', 'x'], [2, 'b', 'y']
  ])
  assert.deepEqual(a, [1, 2])
  assert.deepEqual(b, ['a', 'b'])
  assert.deepEqual(c, ['x', 'y'])
})
