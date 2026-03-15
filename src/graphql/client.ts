import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

export function createApolloClient(
  endpoint: string,
  headers?: Record<string, string>,
): ApolloClient<unknown> {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: endpoint,
      headers,
      fetch,
    }),
    defaultOptions: {
      query: {
        fetchPolicy: "cache-first",
      },
    },
  });
}
