import {useCallback, useEffect, useRef, useState} from 'react'
import {api} from '../api/simulationApi.js'
import {createReviewCache} from '../api/reviewCache.js'

const reviews = createReviewCache((sessionId, cycle) => api('teammates/ai-explain', {sessionId, cycle}))

export function usePipelineReview(state, autoReview) {
  const sessionId = state?.sessionId
  const cycle = state?.cycle
  const completed = state?.status === 'completed'
  const key = JSON.stringify([sessionId, cycle])
  const currentKey = useRef(key)
  currentKey.current = key
  const mounted = useRef(false)
  const [review, setReview] = useState(null)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const analyze = useCallback(async () => {
    if (!sessionId) return
    setReview({key, status: 'loading'})
    try {
      const data = await reviews.load(sessionId, cycle)
      if (mounted.current && currentKey.current === key) setReview({key, status: 'success', data})
    } catch (error) {
      if (mounted.current && currentKey.current === key) setReview({key, status: 'error', error: error.message})
    }
  }, [key, sessionId, cycle])

  useEffect(() => {
    const data = reviews.peek(sessionId, cycle)
    setReview(data ? {key, status: 'success', data} : {key, status: 'idle'})
    if (autoReview && completed) analyze()
  }, [key, sessionId, cycle, autoReview, completed, analyze])

  // Never label an earlier session/cycle's response as the current review.
  return {...(review?.key === key ? review : {status: 'idle'}), analyze}
}
