// Mock trpc since it's supposed to be implemented by a parallel agent
export const trpc = {
  auth: {
    loginWithGoogle: {
      mutate: async () => ({ sessionId: 'mock-session-id' }),
      useMutation: () => ({ mutateAsync: async () => ({ sessionId: 'mock-session-id' }) })
    }
  }
} as any;
