import type { ActionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import invariant from "tiny-invariant";

import { updateIssue } from "~/data";
import { EVENTS } from "~/events";

export const action = async ({ params, request }: ActionArgs) => {
  const updates = Object.fromEntries(await request.formData());
  invariant(params.id, "Missing issue id");
  const result = await updateIssue(params.id, updates);

  EVENTS.ISSUE_CHANGED(params.id);

  return json(result);
};
