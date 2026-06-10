import { screenResume } from "../lib/screening";

import { cases } from "./cases";

/**
 * Runs each eval case through the real screener and checks the result against
 * its expected bucket/range. Exits non-zero if any case fails, so it can gate
 * prompt changes. Run with: npm run eval
 */
async function main() {
  console.log(`Running ${cases.length} screening evals...\n`);
  let passed = 0;

  for (const c of cases) {
    let line: string;
    try {
      const result = await screenResume({
        jobTitle: c.jobTitle,
        jobDescription: c.jobDescription,
        requirements: c.requirements,
        resumeText: c.resumeText,
      });

      const failures: string[] = [];
      const { recommendationIn, minScore, maxScore } = c.expect;
      if (recommendationIn && !recommendationIn.includes(result.recommendation)) {
        failures.push(
          `recommendation ${result.recommendation} not in [${recommendationIn.join(", ")}]`,
        );
      }
      if (minScore != null && result.score < minScore) {
        failures.push(`score ${result.score} < ${minScore}`);
      }
      if (maxScore != null && result.score > maxScore) {
        failures.push(`score ${result.score} > ${maxScore}`);
      }

      const ok = failures.length === 0;
      if (ok) passed++;
      line = `${ok ? "PASS" : "FAIL"}  ${c.name}  (score ${result.score}, ${result.recommendation})`;
      if (!ok) line += `\n        ${failures.join("; ")}`;
    } catch (err) {
      line = `ERROR ${c.name}: ${err instanceof Error ? err.message : String(err)}`;
    }
    console.log(line);
  }

  console.log(`\n${passed}/${cases.length} passed`);
  process.exit(passed === cases.length ? 0 : 1);
}

main();
