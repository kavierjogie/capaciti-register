import { useCallback, useEffect, useRef, useState } from 'react'

/** Run an async loader when deps change; ignores stale responses. */
export function useAsync(load, deps) {
  const [state, setState] = useState({ data: undefined, error: null, loading: true })
  const seq = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)

  const reload = useCallback(() => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null }))
    run().then(
      (data) => id === seq.current && setState({ data, error: null, loading: false }),
      (error) => id === seq.current && setState((s) => ({ ...s, error, loading: false })),
    )
  }, [run])

  useEffect(reload, [reload])
  return { ...state, reload }
}
