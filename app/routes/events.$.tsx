import type { LoaderArgs } from "@remix-run/node";
import { eventStream } from "remix-utils";

import { emitter } from "~/events";

export const loader = ({ request, params }: LoaderArgs) => {
  const path = `/${params["*"]}`;

  return eventStream(request.signal, (send) => {
    const handler = (message: string) => {
      send({ data: Date.now().toString() });
    };

    emitter.addListener(path, handler);
    return () => {
      emitter.removeListener(path, handler);
    };
  });
};
