import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "./design/tokens";
import { RootNavigator } from "./navigation/RootNavigator";
import { AppStateProvider } from "./state/AppState";

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bgBase,
    card: colors.bgCard,
    border: colors.borderLight,
    text: colors.textPrimary,
    primary: colors.primary500,
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

export function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppStateProvider>
          <NavigationContainer theme={appTheme}>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </AppStateProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
