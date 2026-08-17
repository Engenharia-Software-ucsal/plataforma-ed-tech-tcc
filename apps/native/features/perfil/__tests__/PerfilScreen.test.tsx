import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PerfilScreen } from "@/features/perfil/PerfilScreen";

function renderScreen(onSignOut?: () => void) {
  return render(
    <SafeAreaProvider>
      <PerfilScreen onSignOut={onSignOut} />
    </SafeAreaProvider>,
  );
}

describe("PerfilScreen", () => {
  it("renders the user name and the Classroom connection", async () => {
    await renderScreen();
    expect(screen.getByText("João Silva")).toBeTruthy();
    expect(screen.getByText("Google Classroom")).toBeTruthy();
  });

  it("calls onSignOut when the sign-out button is pressed", async () => {
    const onSignOut = jest.fn();
    await renderScreen(onSignOut);
    fireEvent.press(screen.getByText("Sair da conta"));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
