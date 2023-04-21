import { EventEmitter } from "events";

export const emitter = new EventEmitter();

export const EVENTS = {
  ISSUE_CHANGED: (issueId: string) => {
    emitter.emit("/");
    emitter.emit(`/issues/${issueId}`);
  },
};
