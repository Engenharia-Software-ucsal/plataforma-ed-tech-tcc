import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { LoginScreen } from "@/features/login/LoginScreen";

describe("LoginScreen", () => {
  it("renders the app name and the Google CTA", async () => {
    await render(<LoginScreen />);
    expect(screen.getByText("Compasso UCSAL")).toBeTruthy();
    expect(screen.getByText("Entrar com conta UCSAL (Google)")).toBeTruthy();
  });

  it("shows an error message after a failed sign-in", async () => {
    await render(<LoginScreen authenticate={() => Promise.reject(new Error("x"))} />);
    await act(async () => {
      fireEvent.press(screen.getByText("Entrar com conta UCSAL (Google)"));
    });
    expect(await screen.findByText(/Não foi possível entrar/)).toBeTruthy();
  });
});
