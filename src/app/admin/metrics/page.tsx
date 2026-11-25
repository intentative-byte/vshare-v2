import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState } from "@/components/ui/states";
import { ColumnChart, RankedBars, StatTile, DataTable } from "@/components/admin/charts";
import { findMetric, rate, describeSeconds, suppressionThreshold } from "@/modules/analytics";
import {
  loadOverview,
  loadBreakdown,
  loadModerationTrends,
  loadFirstWinTiming,
} from "@/modules/analytics/server";

export const metadata = { title: "Measurement" };

type SearchParams = Promise<{ days?: string }>;

const ranges = [7, 30, 90] as const;

function shortDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function limitOf(name: string): string {
  return findMetric(name)?.limit ?? "";
}

function definitionOf(name: string): string {
  return findMetric(name)?.definition ?? "";
}

export default async function MetricsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requested = Number(params.days);
  const days: number = ranges.includes(requested as (typeof ranges)[number]) ? requested : 30;

  const [overview, topics, moderation, timing] = await Promise.all([
    loadOverview(days),
    loadBreakdown("cards_completed", "topic", days),
    loadModerationTrends(days),
    loadFirstWinTiming(),
  ]);

  // Oldest first for the charts; the reads come back newest first.
  const series = [...overview].reverse();

  const totals = overview.reduce(
    (sum, day) => ({
      completions: sum.completions + day.cardsCompleted,
      opens: sum.opens + day.cardsOpened,
      saves: sum.saves + day.cardsSaved,
      firstWins: sum.firstWins + day.firstCompletions,
      sessionsStarted: sum.sessionsStarted + day.sessionsStarted,
      sessionsCompleted: sum.sessionsCompleted + day.sessionsCompleted,
      submitted: sum.submitted + day.resourcesSubmitted,
      guests: sum.guests + day.guestsCreated,
      registered: sum.registered + day.accountsRegistered,
    }),
    {
      completions: 0,
      opens: 0,
      saves: 0,
      firstWins: 0,
      sessionsStarted: 0,
      sessionsCompleted: 0,
      submitted: 0,
      guests: 0,
      registered: 0,
    },
  );

  const sessionCompletionRate = rate(totals.sessionsCompleted, totals.sessionsStarted);
  const savedRate = rate(totals.saves, totals.completions);
  const firstWinRate = rate(totals.firstWins, totals.guests + totals.registered);

  const reviewed = moderation.reduce(
    (sum, row) => ({ approved: sum.approved + row.approved, rejected: sum.rejected + row.rejected }),
    { approved: 0, rejected: 0 },
  );
  const approvalRate = rate(reviewed.approved, reviewed.approved + reviewed.rejected);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Measurement"
        description="Are people gaining something from their time here? Every number says what it counts and what it does not mean."
      />

      <nav aria-label="Period" className="mb-6 flex flex-wrap gap-2">
        {ranges.map((range) => (
          <a
            key={range}
            href={`/admin/metrics?days=${range}`}
            aria-current={range === days ? "page" : undefined}
            className={`rounded-[var(--radius-control)] border px-3 py-2 text-sm font-semibold ${
              range === days
                ? "border-gold bg-raised text-white"
                : "border-border text-silver hover:bg-raised hover:text-white"
            }`}
          >
            Last {range} days
          </a>
        ))}
      </nav>

      {overview.length === 0 ? (
        <EmptyState
          title="No day has been computed yet"
          body="Figures appear once the nightly rollup has run. An empty dashboard means nothing has been computed, not that nothing happened."
          action={{ href: "/admin/queue", label: "Back to the queue" }}
        />
      ) : (
        <>
          <section aria-labelledby="headline">
            <h2 id="headline" className="font-display text-xl text-white">
              Value, in four tiers
            </h2>
            <p className="mt-1 text-sm text-silver">
              Activity, completion, application and outcome are kept apart and never added
              together. Two of them are measured; the other two are empty, because nothing here
              collects them yet.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatTile
                label="First learning wins"
                value={totals.firstWins.toLocaleString("en-GB")}
                definition={definitionOf("first_completions")}
                limit={limitOf("first_completions")}
              />
              <StatTile
                label="Median time to first win"
                value={timing.suppressed ? null : describeSeconds(timing.medianSeconds)}
                definition={
                  timing.suppressed
                    ? `Withheld: fewer than ${suppressionThreshold} people have a recorded timing.`
                    : `Median of ${timing.timings.toLocaleString("en-GB")} timings. Ninetieth percentile ${
                        describeSeconds(timing.p90Seconds) ?? "—"
                      }.`
                }
                limit={limitOf("first_completion_seconds")}
              />
              <StatTile
                label="Cards completed"
                value={totals.completions.toLocaleString("en-GB")}
                definition={definitionOf("cards_completed")}
                limit={limitOf("cards_completed")}
              />
              <StatTile
                label="Session completion rate"
                value={sessionCompletionRate === null ? null : String(sessionCompletionRate)}
                unit="%"
                definition={`${totals.sessionsCompleted.toLocaleString("en-GB")} of ${totals.sessionsStarted.toLocaleString("en-GB")} sessions reached their summary.`}
                limit={limitOf("sessions_completed")}
              />
              <StatTile
                label="Saved-resource rate"
                value={savedRate === null ? null : String(savedRate)}
                unit="%"
                definition={`${totals.saves.toLocaleString("en-GB")} saves against ${totals.completions.toLocaleString("en-GB")} completions.`}
                limit={limitOf("cards_saved")}
              />
              <StatTile
                label="First win per new account"
                value={firstWinRate === null ? null : String(firstWinRate)}
                unit="%"
                definition={`${totals.firstWins.toLocaleString("en-GB")} first completions against ${(totals.guests + totals.registered).toLocaleString("en-GB")} accounts created.`}
                limit="Accounts, not visitors. An account appears on the first action worth keeping, so someone who read and left is in neither figure."
              />
            </div>

            <Card className="mt-4">
              <CardTitle>Application and outcome</CardTitle>
              <CardBody className="mt-2">
                Both are empty. Nothing in VSHARES yet asks whether someone used what they
                learned, and we have no valid evidence of improved capability, so no number is
                shown for either. They are not estimated from activity.
              </CardBody>
              <Disclosure label="Why we will not estimate them">
                Any improvement score built from completions would be a restatement of activity
                wearing a different name. Applied Learning and mastery are specified in the
                roadmap and will be measured from evidence people supply, or not at all.
              </Disclosure>
            </Card>
          </section>

          <section aria-labelledby="completions" className="mt-10">
            <h2 id="completions" className="font-display text-xl text-white">
              Learning completions
            </h2>
            <Card className="mt-3">
              <ColumnChart
                points={series.map((day) => ({ label: shortDay(day.day), value: day.cardsCompleted }))}
                caption={`Cards completed per day over the last ${days} days. ${limitOf("cards_completed")}`}
              />
              <Disclosure label="The same figures as a table">
                <DataTable
                  caption={`Daily figures, newest first. ${overview.length} computed days.`}
                  columns={["Day", "Completed", "Opened", "Saved", "People", "First wins", "Returning"]}
                  rows={overview.map((day) => [
                    day.day,
                    day.cardsCompleted,
                    day.cardsOpened,
                    day.cardsSaved,
                    day.learnersActive,
                    day.firstCompletions,
                    day.returningLearners,
                  ])}
                />
              </Disclosure>
            </Card>
          </section>

          <section aria-labelledby="sessions" className="mt-10">
            <h2 id="sessions" className="font-display text-xl text-white">
              Sessions and repeat learning
            </h2>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <Card>
                <CardTitle>Sessions started</CardTitle>
                <div className="mt-3">
                  <ColumnChart
                    points={series.map((day) => ({
                      label: shortDay(day.day),
                      value: day.sessionsStarted,
                    }))}
                    caption={`Sessions begun per day. ${limitOf("sessions_started")}`}
                  />
                </div>
              </Card>
              <Card>
                <CardTitle>People who came back</CardTitle>
                <div className="mt-3">
                  <ColumnChart
                    points={series.map((day) => ({
                      label: shortDay(day.day),
                      value: day.returningLearners,
                    }))}
                    caption={`Returning learners per day. ${limitOf("returning_learners")}`}
                  />
                </div>
              </Card>
            </div>
          </section>

          <section aria-labelledby="topics" className="mt-10">
            <h2 id="topics" className="font-display text-xl text-white">
              Most completed topics
            </h2>
            <Card className="mt-3">
              <RankedBars
                points={topics.slice(0, 10).map((row) => ({
                  label: row.key,
                  value: row.count,
                  suppressed: row.suppressed,
                }))}
                caption={`Completions by topic over the last ${days} days. A topic with fewer than ${suppressionThreshold} completions on any day is withheld, so a small group cannot be picked out.`}
              />
            </Card>
          </section>

          <section aria-labelledby="contributions" className="mt-10">
            <h2 id="contributions" className="font-display text-xl text-white">
              Contributions and moderation
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatTile
                label="Resources submitted"
                value={totals.submitted.toLocaleString("en-GB")}
                definition={definitionOf("resources_submitted")}
                limit={limitOf("resources_submitted")}
              />
              <StatTile
                label="Approval rate"
                value={approvalRate === null ? null : String(approvalRate)}
                unit="%"
                definition={`${reviewed.approved.toLocaleString("en-GB")} approved, ${reviewed.rejected.toLocaleString("en-GB")} rejected.`}
                limit={limitOf("submissions_reviewed")}
              />
              <StatTile
                label="Guests who registered"
                value={totals.guests === 0 ? null : String(rate(totals.registered, totals.guests))}
                unit="%"
                definition={`${totals.registered.toLocaleString("en-GB")} registrations against ${totals.guests.toLocaleString("en-GB")} guest accounts created in the period.`}
                limit="A ratio of two counts in the same window, not a cohort: someone who arrived as a guest last month and registered today is in one figure and not the other."
              />
            </div>

            {moderation.length > 0 ? (
              <Card className="mt-4">
                <Disclosure label="Review outcomes by day">
                  <DataTable
                    caption="Reviews concluded, by day and by where the card came from."
                    columns={["Day", "Origin", "Approved", "Rejected", "Mean quality"]}
                    rows={moderation.map((row) => [
                      row.day,
                      row.origin,
                      row.approved,
                      row.rejected,
                      row.meanQualityPublished,
                    ])}
                  />
                </Disclosure>
              </Card>
            ) : null}
          </section>

          <Card className="mt-10">
            <CardTitle>How these numbers are produced</CardTitle>
            <CardBody className="mt-2">
              Everything above is recomputed from the product tables rather than counted from
              what a browser reported, so repeating an action or replaying an event cannot move
              it. Each day is computed once, out of band; nothing on this page runs while
              someone is learning.
            </CardBody>
            <Disclosure label="What is not here, and why">
              Identified behavioural events exist only for people who granted consent, and are
              never shown here or readable by staff — individual learning histories do not appear
              in an aggregate dashboard. Breakdowns below {suppressionThreshold} are withheld. A
              day that was never computed is absent rather than shown as a zero.
            </Disclosure>
          </Card>
        </>
      )}
    </>
  );
}
