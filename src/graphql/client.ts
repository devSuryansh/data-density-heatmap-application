import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

export function createApolloClient(
  endpointUrl: string,
  headers?: Record<string, string>,
): ApolloClient<unknown> {
  return new ApolloClient({
    ssrMode: typeof window === "undefined",
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: endpointUrl,
      headers,
      fetch,
    }),
    defaultOptions: {
      query: {
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      },
    },
  });
}
