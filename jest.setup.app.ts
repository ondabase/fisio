/*
 * Setup for the app Jest project.
 * - Reanimated's test helpers, so animations run on Jest's clock.
 * - Clerk as a signed-in test user. Tests that need another auth state mock
 *   @clerk/expo themselves.
 */
import { setUpTests } from "react-native-reanimated"

setUpTests()

jest.mock("@clerk/expo", () => ({
  ...jest.requireActual<object>("@clerk/expo"),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: "user_test",
    getToken: async () => "test-token",
  }),
}))
