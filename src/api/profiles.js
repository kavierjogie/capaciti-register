import { db, run } from './client.js'

export const getProfile = (id) => run(db().from('profiles').select('*').eq('id', id).single())

// Column-level grants mean only these two fields are writable by the user anyway.
export const updateMyProfile = (id, { full_name, phone }) =>
  run(db().from('profiles').update({ full_name: full_name.trim(), phone: phone?.trim() || null }).eq('id', id).select().single())

export const getMentor = (mentorId) =>
  mentorId ? run(db().from('profiles').select('id, full_name, email').eq('id', mentorId).maybeSingle()) : null

/** RLS limits this to the calling mentor's assigned candidates. */
export const listMyCandidates = () =>
  run(db().from('profiles').select('*').eq('role', 'candidate').order('full_name'))

