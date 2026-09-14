import fs from "node:fs";
const migration = fs.readFileSync(
  "supabase/migrations/202609140001_foundation.sql",
  "utf8",
);
const seed = fs.readFileSync("supabase/seed.sql", "utf8");
const preflight = `-- HẸN: FIRST-TIME SETUP ONLY. Run in Supabase SQL Editor as project administrator.
-- Create the confirmed Founder user in Authentication > Users before running.
-- Does not reset or delete existing tables. Aborts if tables already exist.
-- All changes are transactional; a failure rolls back the setup.
begin;
do $$ begin
 if to_regclass('public.admin_workspaces') is not null then
  raise exception 'HEN_ALREADY_INITIALIZED: use versioned migrations instead of this bootstrap';
 end if;
 if not exists(select 1 from auth.users where lower(email)='cortexedtech@gmail.com' and email_confirmed_at is not null) then
  raise exception 'HEN_FOUNDER_MISSING: create and confirm cortexedtech@gmail.com in Authentication > Users first';
 end if;
end $$;
`;
const founder = `
insert into public.admin_memberships(workspace_id,user_id,display_name,roles,capacity_percent)
select '10000000-0000-4000-8000-000000000001', id, 'Founder / Dev', array['founder'],100
from auth.users where lower(email)='cortexedtech@gmail.com';
insert into public.admin_activity_log(workspace_id,actor_id,action,entity_type,entity_id)
select workspace_id,user_id,'workspace_bootstrapped','workspace',workspace_id
from public.admin_memberships where 'founder'=any(roles)
and workspace_id='10000000-0000-4000-8000-000000000001';
commit;
`;
fs.mkdirSync("supabase/bootstrap", { recursive: true });
fs.writeFileSync(
  "supabase/bootstrap/01_initial_setup.sql",
  preflight + "\n" + migration + "\n" + seed + founder,
);
console.log(
  "Generated supabase/bootstrap/01_initial_setup.sql (not executed).",
);
