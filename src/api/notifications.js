import { db, run } from './client.js'

export const listNotifications = () =>
  run(db().from('notifications').select('*').order('created_at', { ascending: false }).limit(20))

export const markAllRead = () =>
  run(db().from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null))
