"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { deleteAccount, exportMyAccountData } from "@/modules/profiles";

/**
 * Export and deletion.
 *
 * The export is assembled by the database and scoped to the caller. The
 * deletion asks for a typed confirmation, and the database additionally
 * requires a recent sign-in before it destroys anything.
 */
export function DataRights() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  async function download() {
    setExporting(true);
    setExportError(null);

    const result = await exportMyAccountData({});

    if (!result.ok) {
      setExportError(result.error.message);
      setExporting(false);
      return;
    }

    const blob = new Blob([JSON.stringify(result.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `vshares-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    setExporting(false);
  }

  async function remove() {
    setDeleting(true);
    setDeleteError(null);

    const result = await deleteAccount({ confirm: "DELETE" });

    if (!result.ok) {
      setDeleteError(result.error.message);
      setDeleting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardTitle>Take a copy</CardTitle>
        <CardBody className="mt-2">
          One file with everything we hold about you: your profile, preferences, what you have
          learned and saved, your submissions and reports, the recommendations you were shown, and
          your consent history.
        </CardBody>
        <Disclosure label="What is in the file, and what is not">
          The format is JSON, documented in the repository as `vshares.export.v1`. It contains
          nothing about anyone else and no internal moderation notes, which are records of our
          decisions rather than data about you.
        </Disclosure>
        <div className="mt-5">
          <Button disabled={exporting} onClick={() => void download()}>
            {exporting ? "Preparing…" : "Download my data"}
          </Button>
        </div>
        <div role="alert">
          {exportError ? (
            <p className="mt-3 text-sm font-semibold text-danger">{exportError}</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardTitle>Delete your account</CardTitle>
        <CardBody className="mt-2">
          This removes your account and everything personal to it: your profile, preferences,
          learning history, saved library, sessions and submissions that were never published.
          It cannot be undone.
        </CardBody>

        <Disclosure label="What stays, and why">
          Resources of yours that were published stay in the catalogue with your name removed, so
          other people do not lose them. Our moderation and audit records keep the fact that a
          decision was made, with no reference to you. Nothing kept can identify you.
        </Disclosure>

        {!showDelete ? (
          <div className="mt-5">
            <Button variant="danger" onClick={() => setShowDelete(true)}>
              I want to delete my account
            </Button>
          </div>
        ) : (
          <form
            className="mt-5 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();

              if (confirm === "DELETE") {
                void remove();
              }
            }}
          >
            <TextField
              id="confirm-delete"
              label="Type DELETE to confirm"
              hint="This is permanent."
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="danger" disabled={deleting || confirm !== "DELETE"}>
                {deleting ? "Deleting…" : "Delete my account permanently"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowDelete(false)}>
                Keep my account
              </Button>
            </div>
            <div role="alert">
              {deleteError ? (
                <p className="text-sm font-semibold text-danger">{deleteError}</p>
              ) : null}
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
