-- Account provisioning snippets. Run in the Supabase SQL editor (runs as an admin, bypassing RLS).
-- Every change to role / mentor / status / cohort / candidate ID is written to audit_logs by trigger.

-- 1) First Tech Champion: create the user in Dashboard → Authentication → Users → "Invite user"
--    (or "Add user"), then promote them:
update public.profiles set role = 'mentor', candidate_identifier = null
 where email = 'tech.champion@example.org';

-- 2) Candidates: normally invited by a Tech Champion from the app (Candidates → Invite candidate),
--    which assigns them automatically. To assign or move one manually:
update public.profiles
   set mentor_id = (select id from public.profiles where email = 'tech.champion@example.org' and role = 'mentor'),
       candidate_identifier = 'CAP-2026-0001',
       cohort = 'Software Development · Aug 2026'
 where email = 'candidate@example.org';

-- 3) Deactivate an account (keeps history; blocks check-in/WFH and signs them out on next load):
update public.profiles set status = 'inactive' where email = 'leaver@example.org';

-- 4) Who belongs to whom:
select c.full_name, c.candidate_identifier, c.cohort, m.full_name as tech_champion, c.status
  from public.profiles c left join public.profiles m on m.id = c.mentor_id
 where c.role = 'candidate' order by m.full_name, c.full_name;

-- 5) Sensitive-change audit trail:
select created_at, action, entity_id, details from public.audit_logs order by created_at desc limit 50;
