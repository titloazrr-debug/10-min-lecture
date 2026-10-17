import { useCallback, useEffect, useRef, useState } from "react"

export function useStopwatch() {
  const accumulated = useRef(0)
  const anchor = useRef<number | null>(null)
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(0)

  const read = useCallback(() => {
    const live = anchor.current == null ? 0 : (Date.now() - anchor.current) / 1000
    return accumulated.current + live
  }, [])

  useEffect(() => {
    if (!running) return
    anchor.current = Date.now()
    const id = window.setInterval(() => {
      setSeconds(read())
    }, 200)
    return () => {
      if (anchor.current != null) {
        accumulated.current += (Date.now() - anchor.current) / 1000
        anchor.current = null
      }
      window.clearInterval(id)
      setSeconds(accumulated.current)
    }
  }, [read, running])

  const start = useCallback(() => setRunning(true), [])
  const pause = useCallback(() => setRunning(false), [])

  return { running, seconds, read, start, pause }
}
