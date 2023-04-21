# Remix Live Loader Demo

This example is based on the [Linear Style Realtime App](https://github.com/remix-run/examples/tree/main/_official-realtime-app), but uses a technique I call Live Loaders.

## The Problem

When a client triggers an action, it will automatically refetch all of the route loaders for the current page to make sure the data is up-to-date. But other clients looking at those same pages won't see the changes unless they navigate or refresh.

## The Solution

Use realtime technologies to notify any connected clients whenever a relevant change happens to one of the routes they are viewing.

## Running the Demo

```
npm install
npm run dev
```

---

Realtime of any kind involves 3 parts: An pub/sub handler, a transport mechanism, and client-side handling. Live Loaders simplifies these using just a few lines of code to make any route realtime.

## pub/sub

This example uses the built in EventEmitter package in Node.js, which is an in-memory event emitter. You can find the implementation in the `/app/events.ts` file. The events themselves are defined by functions which call the event emitter, which makes it so you can trigger multiple events at the same time.

```ts
export const EVENTS = {
  ISSUE_CHANGED: (issueId: string) => {
    emitter.emit("/");
    emitter.emit(`/issues/${issueId}`);
  },
};
```

Note that the events themselves correspond to routes in the app where the data that changed is used.

This won't work if you're using serverless functions, even if they support streaming and Server-sent Events. For those, you'll need a separate pub/sub system, like Redis, Postgres, MQTT, or a SaaS. You should be using those in production anyway, to support horizontal scaling and making sure you don't drop any messages.

## Transport

This app uses Server-sent Events to send data to the client, but you could use Websockets as well.

The Server-sent Events loader uses a splat route to collect any paths in the URL, which it uses subscribe to pub/sub events for that route. Whenever that event is triggered, we'll send a message with the current timestamp to the connected clients, letting them know that the data has changed.

```ts
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
```

## Client Handling

Once the realtime message makes it to the client, the client needs to decide what to do with it. Options include:

- Refetching data from the server
- Using the realtime message to update some client-side cache
- Showing an ephemeral notification to the user

This project uses the first option with Remix's `useRevalidator` hook. The `useLiveLoader` hook gets the event name from the URL and connects to the Server-sent Events loader. Any time it notices the event data change, it revalidates the data, which fetches all of the route loaders.

```ts
export function useLiveLoader<T>() {
  const eventName = useLocation().pathname;
  const data = useEventSource(`/events${eventName}`);

  const { revalidate } = useRevalidator();

  useEffect(() => {
    revalidate();
  }, [data, revalidate]);

  return useLoaderData<T>();
}
```

Notice how it uses `useLoaderData` at the end? This makes it so you can drop it in anywhere you have `useLoaderData` to instantly make that data refresh whenever it changes.

```tsx
export default function Index() {
  const issues = useLiveLoader<typeof loader>();

  return (
    <div>
      <Header />
      {issues.map((issue) => (
        <IssueLine key={issue.id} issue={issue} />
      ))}
    </div>
  );
}
```

## Other Considerations

This is not an ideal setup for many reasons. If you have lots of connected clients at the same time, you'll want to have some kind of server-side cache so a bunch of revalidation requests don't destroy your server.

You also need to make sure you're using HTTP2 so you aren't blocked the 6 SSE connection limit that browsers impose. Also, the route based event scheme works great for simple situations, but currently doesn't support URL search params (though it probably could be added).

The main purpose here is to show that adding simple realtime to your app to keep your clients' data fresh doesn't require a ton of effort, and might be worth it.
