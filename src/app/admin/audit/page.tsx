import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, EmptyState } from "@/components/ui/states";
import { isDatabaseConfigured } from "@/platform/env";
import { listAuditLog } from "@/modules/content/server";

export const metadata = { title: "Audit log" };

function when(value: string): string {
  return new Date(value).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC";
}

export default async function AuditPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Audit log" />
        <ErrorState title="Unavailable" body="No service is configured." />
      </>
    );
  }

  // The audit_log policy is admin-only, so a moderator without admin sees an
  // empty list rather than an error: the page exists, the rows do not.
  const entries = await listAuditLog(200);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Audit log"
        description="Every privileged action, newest first. An action with no actor was taken by the system, or its actor was erased."
      />

      {entries.length === 0 ? (
        <EmptyState
          title="No entries to show"
          body="Either nothing has been recorded, or your account is a moderator without the admin role the audit log requires."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {["When", "Action", "Target", "Actor"].map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="border-b border-border py-2 text-left text-xs font-semibold tracking-wide text-silver-dim uppercase"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="border-b border-border py-2 text-silver-dim tabular-nums">
                    {when(entry.createdAt)}
                  </td>
                  <td className="border-b border-border py-2 font-semibold text-silver">
                    {entry.action}
                  </td>
                  <td className="border-b border-border py-2 text-silver">{entry.targetType}</td>
                  <td className="border-b border-border py-2 text-silver-dim">
                    {entry.hasActor ? "recorded" : "none"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
