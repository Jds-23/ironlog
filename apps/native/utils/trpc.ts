import type { AppRouter } from "@ironlog/api/routers/index";

import { env } from "@ironlog/env/native";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { Platform } from "react-native";

import { authClient } from "@/lib/auth-client";

export const queryClient = new QueryClient();

export function getAuthHeaders(): Record<string, string> {
  if (Platform.OS === "web") {
    return {};
  }
  const cookies = authClient.getCookie();
  if (cookies) {
    return { Cookie: cookies };
  }
  return {};
}

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.EXPO_PUBLIC_SERVER_URL}/trpc`,
      fetch:
        Platform.OS !== "web"
          ? undefined
          : function (url, options) {
              return fetch(url, {
                ...options,
                credentials: "include",
              });
            },
      headers: getAuthHeaders,
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
