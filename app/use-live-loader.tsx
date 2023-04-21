import { useLoaderData, useLocation, useRevalidator } from "@remix-run/react";
import { useEffect } from "react";
import { useEventSource } from "remix-utils";

export function useLiveLoader<T>() {
  const eventName = useLocation().pathname;
  const data = useEventSource(`/events${eventName}`);

  const { revalidate } = useRevalidator();

  useEffect(() => {
    revalidate();
  }, [data, revalidate]);

  return useLoaderData<T>();
}
