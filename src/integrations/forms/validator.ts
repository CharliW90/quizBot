import type { forms_v1 } from "googleapis";
import type { Result } from "../../utils/result.js";
import { ok, err } from "../../utils/result.js";

export function validateFormStructure(form: forms_v1.Schema$Form): Result<true> {
  const items = form.items ?? [];

  if (items.length === 0) {
    return err("Form has no items");
  }

  const firstQuestion = items[0]?.questionItem?.question;
  if (!firstQuestion?.questionId) {
    return err("Cannot identify team name: first item is not a question");
  }

  let scoredCount = 0;
  for (let i = 1; i < items.length; i++) {
    const question = items[i].questionItem?.question;
    if (!question) continue;

    if (isFeedback(items[i])) continue;

    const pointValue = question.grading?.pointValue;
    if (pointValue != null && pointValue > 0) {
      scoredCount++;
    }
  }

  if (scoredCount === 0) {
    return err("Form has no scored questions");
  }

  return ok(true);
}

function isFeedback(item: forms_v1.Schema$Item): boolean {
  const question = item.questionItem?.question;
  const isParagraph = question?.textQuestion?.paragraph === true;
  const titleContainsFeedback = (item.title ?? "").toLowerCase().includes("feedback");
  return isParagraph && titleContainsFeedback;
}
