import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { decideWfh } from '../api/wfh.js'
import { friendlyError } from '../lib/errors.js'
import { validateRejection } from '../lib/validation.js'
import { useToast } from './Toast.jsx'
import Button from './ui/Button.jsx'
import { Alert } from './ui/Feedback.jsx'
import { Textarea } from './ui/Field.jsx'
import Modal from './ui/Modal.jsx'
import { WfhDetails } from './Wfh.jsx'

/** Render with key={request?.id} so form state resets per request.
 * Tech Champion review: approve, or reject with a required comment. The RPC enforces both rules again. */
export default function ReviewModal({ request, onClose, onDecided }) {
  const toast = useToast()
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null) // 'approved' | 'rejected'

  async function decide(decision) {
    if (decision === 'rejected') {
      const msg = validateRejection(comment)
      setCommentError(msg)
      if (msg) return
    }
    setBusy(decision)
    setError(null)
    try {
      const updated = await decideWfh(request.id, decision, comment.trim())
      toast('success', `Request ${decision}`, `${request.full_name} has been notified.`)
      onDecided?.(updated)
      onClose()
    } catch (err) {
      setError(friendlyError(err))
      // Someone else decided first: refresh the list behind the modal so it shows the real status.
      if (/already been decided/.test(err.message)) onDecided?.()
    } finally {
      setBusy(null)
    }
  }

  const pending = request?.status === 'pending'
  return (
    <Modal open={Boolean(request)} onClose={onClose} size="lg" title={pending ? 'Review WFH request' : 'WFH request'}
      description={request && `${request.full_name}${request.candidate_identifier ? ` · ${request.candidate_identifier}` : ''}`}
      footer={pending ? (
        <>
          <Button variant="danger" icon={X} loading={busy === 'rejected'} disabled={Boolean(busy)} onClick={() => decide('rejected')}>Reject</Button>
          <Button icon={Check} loading={busy === 'approved'} disabled={Boolean(busy)} onClick={() => decide('approved')}>Approve</Button>
        </>
      ) : <Button variant="secondary" onClick={onClose}>Close</Button>}>
      {request && (
        <div className="flex flex-col gap-5">
          {error && <Alert type="error" title={error} />}
          <WfhDetails req={request} showCandidate />
          {pending && (
            <Textarea label="Comment" hint="Required when rejecting. The candidate will see this." value={comment} maxLength={1000}
              error={commentError} onChange={(e) => { setComment(e.target.value); setCommentError(null) }} rows={3} />
          )}
        </div>
      )}
    </Modal>
  )
}
