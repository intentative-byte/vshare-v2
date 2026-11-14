# VSHARES — Editorial checklist

Every card passes this before it is published. An automated link check is
one line of it, not a substitute for the rest: a page can be perfectly
reachable and still be wrong, promotional, or not worth anyone's time.

Who signs off: a card in Personal Finance or Health and Wellbeing needs a
reviewer who did not write it up. The database enforces that; the rest of
this list is a person's judgement.

## 1. Source availability

- [ ] The link resolves and the page loads without an account or a paywall.
- [ ] The automated check has recorded a success (`npm run check:links`).
- [ ] The page is not a redirect to something materially different.
- [ ] It is the canonical address, not a tracking or syndicated copy.
- [ ] It is likely to still be there in a year. Prefer a stable publisher over a personal post that may vanish.

## 2. Source credibility

- [ ] Who published it is clear, and they are a reasonable authority on it.
- [ ] Where there is an author, they are named.
- [ ] It is not disguised marketing for a product or a course.
- [ ] For claims about evidence, the page cites something, or we do not repeat the claim.
- [ ] For finance or health, the publisher is an institution rather than an individual with an opinion.

## 3. Factual accuracy

- [ ] Every sentence in our summary matches what the page actually says.
- [ ] We have not sharpened a hedged claim into a confident one.
- [ ] Figures, dates and names are checked against the page.
- [ ] Anything UK-specific is correct for the UK.
- [ ] Nothing in our write-up is true only because it is vague.

## 4. Originality

- [ ] The summary is our own words, not the page's opening paragraph reworded.
- [ ] The takeaways are what a reader gains, not a table of contents.
- [ ] No passage long enough to substitute for reading the original.
- [ ] No image, table or figure copied from the source.
- [ ] If AI assisted the draft, the card is flagged and a person has checked every line.

## 5. Practical usefulness

- [ ] It answers: what will someone know, understand or be able to do afterwards?
- [ ] The next step is concrete, specific, and doable this week.
- [ ] The next step follows from the resource rather than being generic advice.
- [ ] A reader who only read our card, and never clicked through, would still have gained something true.
- [ ] It is not motivational filler, a listicle, or an opinion piece pretending to teach.

## 6. Correct attribution

- [ ] Publisher name is exactly as the publisher writes it.
- [ ] Author recorded where the page names one.
- [ ] The source link is displayed, not hidden behind our own wording.
- [ ] The card makes clear that the original is someone else's work.
- [ ] Nothing in the card implies endorsement by the source.

## 7. Classification

- [ ] The topic is the one a reader would look under.
- [ ] The level is right: beginner means no assumed background.
- [ ] The reading time is honest; check it against the page rather than guessing.
- [ ] The format matches what the page actually is.
- [ ] High-impact categories carry the "educational, not advice" notice, which the interface adds automatically.

## 8. Editorial approval

- [ ] A named person has read the source and the card together.
- [ ] For high-impact content, that person is not the one who wrote the card up.
- [ ] The quality score reflects a judgement, not a default.
- [ ] Approval is recorded through the admin queue, so it reaches the audit log.

## What the system enforces for you

These cannot be skipped, whatever anyone intends:

| Rule | Where |
|---|---|
| A card cannot be published without a recorded successful link check | Database constraint and `moderate_content` |
| A card cannot be published without a review | Database constraint |
| High-impact content cannot be approved by its submitter | `moderate_content` |
| A submission arrives pending, whatever the client asks for | `submit_resource` |
| The high-impact flag follows the category | `create_card` and `submit_resource` |
| Every approval, rejection and edit is audited | `app.audit` |

Everything else on this list is judgement, and no amount of tooling replaces
reading the thing.
