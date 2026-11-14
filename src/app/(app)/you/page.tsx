import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { FoundationNotice } from "@/components/ui/foundation-notice";
import { Disclosure } from "@/components/ui/disclosure";
import { ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { ProfileEditor } from "@/components/account/profile-editor";
import { SignOutButtons } from "@/components/account/sign-out-buttons";
import { isDatabaseConfigured } from "@/platform/env";
import { readMyProfile } from "@/modules/profiles";
import { readMyPreferences } from "@/modules/personalisation";

export const metadata = { title: "You" };

export default async function YouPage() {
  if (!isDatabaseConfigured()) {
    return (
      <>
        <PageHeader eyebrow="You" title="Your account" />
        <ErrorState
          title="Accounts are unavailable here"
          body="This instance has no account service configured, so there is nothing to show."
        />
        <Disclosure label="What this tab holds">
          Your profile, your preferences, everything VSHARES has learned about what you want to
          learn, and the controls to export or delete all of it.
        </Disclosure>
      </>
    );
  }

  const [profile, preferences] = await Promise.all([readMyProfile(), readMyPreferences()]);

  if (!profile) {
    return (
      <>
        <PageHeader
          eyebrow="You"
          title="Your account"
          description="Sign in to keep what you learn, across any device."
        />
        <Card emphasis>
          <CardTitle>Nothing is saved yet</CardTitle>
          <CardBody className="mt-2">
            You can use VSHARES without an account. Sign in and everything you do is kept.
          </CardBody>
          <div className="mt-5">
            <ButtonLink href="/sign-in">Sign in</ButtonLink>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="You"
        title={profile.displayName ?? `@${profile.handle}`}
        description={
          profile.isGuest
            ? "You are using VSHARES as a guest. Your work is saved on this device's session."
            : "Your account, your preferences and what VSHARES knows about you."
        }
      />

      {profile.isGuest ? (
        <Card emphasis className="mb-6">
          <CardTitle>Keep your progress</CardTitle>
          <CardBody className="mt-2">
            Add an email address and this same account becomes yours properly. Nothing is moved or
            copied, so nothing can be lost.
          </CardBody>
          <div className="mt-5">
            <ButtonLink href="/sign-in?next=%2Fyou">Keep my progress</ButtonLink>
          </div>
        </Card>
      ) : null}

      <ProfileEditor profile={profile} />

      <Card className="mt-6">
        <CardTitle>Preferences</CardTitle>
        <CardBody className="mt-2">
          Personalisation is {preferences?.personalisationEnabled ? "on" : "off"}. A learning
          session is {preferences?.sessionMinutes ?? 10} minutes.
        </CardBody>
        <Disclosure label="What personalisation does">
          When it is on, your feed is ranked using the topics you choose and what you have
          finished, saved or skipped. With it off, you get the same catalogue ranked only by
          quality and freshness. Either way you can see why something was recommended.
        </Disclosure>
        <FoundationNotice
          className="mt-4"
          milestone="Milestone 4"
          summary="Changing these, choosing topics and seeing everything VSHARES has learned about you arrive with the feed."
        />
      </Card>

      <Card className="mt-6">
        <CardTitle>Your data</CardTitle>
        <CardBody className="mt-2">
          Export everything held about you, or delete your account and its data.
        </CardBody>
        <FoundationNotice
          className="mt-4"
          milestone="Milestone 6"
          summary="Self-service export and deletion are built once there is learning data to export."
        />
      </Card>

      <Card className="mt-6">
        <CardTitle>Session</CardTitle>
        <CardBody className="mt-2">
          Signing out everywhere ends every session on every device.
        </CardBody>
        <SignOutButtons />
      </Card>

      <Card className="mt-6" emphasis>
        <CardTitle>Three kinds of progress, kept apart</CardTitle>
        <CardBody className="mt-2">
          Finishing something, proving you understood it, and actually using it are different
          things, so VSHARES will never add them into one number.
        </CardBody>
        <Disclosure label="Why that matters">
          Someone who watches a hundred videos is not more capable than someone who finishes ten
          things and applies them. Activity, understanding and applied work are measured
          separately, and anything you tell us yourself is labelled as self-reported.
        </Disclosure>
      </Card>
    </>
  );
}
