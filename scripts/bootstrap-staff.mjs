// Grants a role (moderator or admin) to an existing account, by email.
//
// Run this once, against the project's direct Postgres connection, to make
// the first staff account. After that, roles are granted in-app by an admin
// through the audited grant_role function.
//
// Usage:
//   DATABASE_URL=postgres://postgres:...@db.<ref>.supabase.co:5432/postgres \
//     node scripts/bootstrap-staff.mjs you@example.com admin
//
// The account must already exist — sign in once with a magic link first, so
// the auth service creates it, then run this.
import { execFileSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
const [email, role = "admin"] = process.argv.slice(2);

if (!databaseUrl || !email) {
  console.error("Usage: DATABASE_URL=... node scripts/bootstrap-staff.mjs <email> [moderator|admin]");
  process.exit(2);
}

if (role !== "admin" && role !== "moderator") {
  console.error("Role must be 'admin' or 'moderator'.");
  process.exit(2);
}

// The email comes from the command line and is embedded in SQL, so it is
// validated to a conservative shape first: no quotes, no backslashes, nothing
// that could break out of the literal. An address that does not match is
// refused rather than escaped.
if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
  console.error(`"${email}" is not a plain email address.`);
  process.exit(2);
}

// The SQL is read from stdin so psql's \set variable interpolation works
// reliably (it does not, with -c). The role is a fixed literal checked above.
// The email is validated to a quote-free shape above, so it is embedded as a
// literal directly; psql does not interpolate :'var' inside dollar-quoted
// blocks, and the fixed role is checked against a whitelist.
const addr = `'${email}'`;
const sql = `
do $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = ${addr};
  if v_id is null then
    raise exception 'No account with email %. Sign in once first, then re-run.', ${addr};
  end if;
  insert into public.user_roles (user_id, role)
  values (v_id, '${role}'::public.app_role)
  on conflict (user_id, role) do nothing;
end $$;
select ${addr} || ' now holds: ' ||
  coalesce((select string_agg(role::text, ', ' order by role)
            from public.user_roles
            where user_id = (select id from auth.users where email = ${addr})), 'no roles');
`;

try {
  const out = execFileSync("psql", ["-X", "-q", "-tAq", "-v", "ON_ERROR_STOP=1", databaseUrl], {
    input: sql,
    encoding: "utf8",
  });
  console.log(out.trim());
} catch (error) {
  console.error((error.stderr ?? error.stdout ?? error.message).toString().trim());
  process.exit(1);
}
