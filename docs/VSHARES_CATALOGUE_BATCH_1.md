# VSHARES — Value cards, batch 1 (for editorial review)

- Date: 2026-11-14 · Status: **draft, awaiting your review.** Nothing is published.
- Seeded by `supabase/seed/020_cards_batch_1.sql`.

## Read this first

**The source links have not been checked.** This environment has no outbound
network access: every request to every external host is refused at DNS. I ran
the link checker against all ten and it reported ten failures, which reflects
this machine, not the sources.

That gap is structural rather than a footnote. The database refuses to publish
a card whose link has not been checked, and only a privileged client may
record a check, so **no card in this batch can go live until the checker runs
somewhere with network access**:

```bash
DATABASE_URL=postgres://... npm run check:links
```

Because I could not open the pages, each summary describes what the resource
is for, at a level I am confident of. They deliberately avoid asserting
specific contents of a page I could not read. **Please check each one against
the live page as you review it** — that is the main thing I need from you here,
alongside the house style.

## What a card is for

Each one answers: *what will someone know, understand or be able to do
afterwards?* The structure is title, summary, one to three takeaways, a
practical next step, the source, and the classification.

No motivational filler, no clickbait, no exaggerated claims, and no card whose
takeaway is "this is interesting".

## Coverage

| | |
|---|---|
| Cards | 10 |
| Categories | 7 of 8 (none yet in Productivity) |
| High impact (second reviewer required) | 3 — two Personal Finance, one Health |
| AI-assisted | 0. Every summary here was written directly, so none carries the AI label |
| Levels | 8 beginner, 2 intermediate |
| Reading time | 7 to 35 minutes |

---

## 1. A structured first course in machine learning

- **Topic** Technology and AI → AI foundations · **Level** beginner · **25 min** · course
- **Source** Google — `https://developers.google.com/machine-learning/crash-course`

A free, self-paced course that introduces how machine learning models are
trained and evaluated, with short videos and exercises rather than mathematics
for its own sake. It is aimed at people who write software or work alongside
those who do.

- Training a model means adjusting it until its predictions match known answers closely enough.
- Most of the work in practice is preparing data, not choosing an algorithm.

**Next step** Work through the first module and write down one term you had not met before.

## 2. The handful of security steps that matter most

- **Topic** Technology and AI → Security basics · **Level** beginner · **10 min** · article
- **Source** National Cyber Security Centre — `https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online`

The UK National Cyber Security Centre's short guidance on protecting everyday
accounts. It is deliberately a small number of steps, chosen because they
prevent the majority of ordinary attacks, rather than an exhaustive list nobody
follows.

- Protecting the email account that can reset every other password matters most.
- A password manager removes the need to remember or reuse passwords.
- Two-factor authentication blocks most attacks that start with a stolen password.

**Next step** Turn on two-factor authentication for your main email account today.

## 3. How to ask an organisation what it knows about you

- **Topic** Technology and AI → Data and privacy · **Level** beginner · **8 min** · article
- **Source** Information Commissioner's Office — `https://ico.org.uk/for-the-public/your-right-to-get-copies-of-your-data/`

The UK data protection regulator's explanation of the right of access: what you
can ask for, how to ask, and what an organisation has to do in response. Useful
whether you are exercising the right yourself or building a product that has to
honour it.

- You can ask any organisation for a copy of the personal data it holds about you.
- A request does not have to use any particular wording or form.

**Next step** Pick one service you use and find its route for making a data request.

## 4. A budget planner that does the arithmetic for you · HIGH IMPACT

- **Topic** Personal Finance → Budgeting · **Level** beginner · **20 min** · tool
- **Source** MoneyHelper — `https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner`

A free budgeting tool from the UK government-backed money guidance service. It
walks through income, fixed costs and spending, then shows what is left and
where it goes. It is general information rather than advice about your own
circumstances.

- Writing fixed costs down is what makes them negotiable.
- A budget is a plan for money you have, not a prediction of money you might get.

**Next step** List every fixed monthly cost you have before the end of this week.

## 5. The pause that stops most financial scams · HIGH IMPACT

- **Topic** Personal Finance → Avoiding scams · **Level** beginner · **8 min** · article
- **Source** Take Five to Stop Fraud — `https://www.takefive-stopfraud.org.uk/`

A UK campaign backed by banks and the government built around one idea: stop,
challenge, protect. Most scams depend on urgency, so the advice is about
creating a moment to think rather than memorising every variety of fraud.

- Urgency is the common thread in almost every scam.
- No legitimate organisation asks you to move money to a "safe account".

**Next step** Agree a rule with one family member: no money moves without a phone call first.

## 6. What actually helps when you cannot sleep · HIGH IMPACT

- **Topic** Health and Wellbeing → Sleep · **Level** beginner · **7 min** · article
- **Source** NHS — `https://www.nhs.uk/live-well/sleep-and-tiredness/how-to-get-to-sleep/`

NHS guidance on sleep: regular timing, winding down, and when poor sleep is
worth seeing a doctor about. It is short, free of supplements and gadgets, and
clear about the point at which self-help is not the answer. General
information, not medical advice.

- A consistent wake time does more for sleep than a consistent bedtime.
- Persistent sleep problems are worth raising with a doctor rather than managing alone.

**Next step** Set one alarm for the same wake time every day this week, including the weekend.

## 7. Writing that people understand the first time

- **Topic** Communication → Clear writing · **Level** beginner · **12 min** · article
- **Source** Government Digital Service — `https://www.gov.uk/guidance/content-design/writing-for-gov-uk`

The style guidance behind GOV.UK, written for people producing information the
public has to act on. It covers plain words, short sentences and structure, and
is unusually direct about the cost of jargon.

- Write for the person with the least time and the most to lose.
- Shorter sentences are not simpler ideas, only clearer ones.

**Next step** Rewrite one paragraph you sent this week, cutting it by a third.

## 8. Preparing for an interview without guessing

- **Topic** Career Development → Interviews · **Level** beginner · **12 min** · article
- **Source** National Careers Service — `https://nationalcareers.service.gov.uk/careers-advice/interview-advice`

Free UK careers service guidance on preparing for interviews: what to research,
how to structure answers about your experience, and what to ask at the end. It
is practical and free of the confidence-as-a-substitute-for-preparation advice
common elsewhere.

- A structured answer about a real situation beats a general claim about yourself.
- The questions you ask are part of what is being assessed.

**Next step** Write out one example of your work using situation, task, action and result.

## 9. Why reviewing at increasing intervals works

- **Topic** Learning How to Learn → Spaced repetition · **Level** intermediate · **35 min** · article
- **Source** Michael Nielsen — `https://augmentingcognition.com/ltm.html`

A long essay on using spaced repetition seriously: how review schedules affect
what is retained, what makes a good prompt, and where the method stops helping.
It is considerably more thoughtful than the usual flashcard advice, and honest
about the effort involved.

- Reviewing just before you would have forgotten is what strengthens memory.
- A prompt that can be answered without understanding teaches you nothing.

**Next step** Write five prompts for something you learned this month and review them tomorrow.

## 10. The actual steps to set up a business in the UK

- **Topic** Entrepreneurship → Running a small business · **Level** beginner · **15 min** · article
- **Source** GOV.UK — `https://www.gov.uk/set-up-business`

The official starting point for setting up in the UK: choosing a structure,
registering, and the records you have to keep. It answers the administrative
questions that are easy to get wrong and expensive to fix later.

- The legal structure you choose changes your tax and your personal liability.
- Registration deadlines start from when you begin trading, not when you incorporate.

**Next step** Decide whether you would be a sole trader or a limited company, and write down why.

---

## What I need from you

1. **Check each source link and summary against the live page.** Tell me about anything that misdescribes what is there.
2. **House style**: are the summaries the right length, and do the takeaways carry their weight? Corrections now shape the remaining ninety.
3. **Classification**: are the levels and reading times about right?
4. **Next steps**: are they genuinely doable, or do any read as filler?
5. **Coverage**: Productivity has no card yet. Any topics you want represented in the next batch?

Nothing is published until you say so, and even then only after the link
checker has run with network access.
