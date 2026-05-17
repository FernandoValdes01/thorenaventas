export const authService = {
  login: async (email: string) => ({ email, token: 'todo-better-auth-session' }),
  logout: async () => ({ loggedOut: true }),
  session: async () => ({ authenticated: false }),
};
