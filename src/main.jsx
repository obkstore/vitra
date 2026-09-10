import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { UserProfileProvider } from "./context/UserProfileContext";
import { AuthProvider } from "./context/AuthContext";
import { PlanProvider } from "./context/PlanContext";
import { StepperProvider } from "./context/StepperContext";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 1 },
  },
});

// StrictMode is intentionally disabled to avoid duplicate API calls from double-rendering in development.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.Fragment>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <UserProfileProvider>
            <PlanProvider>
              <StepperProvider>
                <App />
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      borderRadius: "12px",
                      fontFamily: "Plus Jakarta Sans, Cairo, sans-serif",
                      fontSize: "14px",
                    },
                    success: {
                      iconTheme: { primary: "#10b981", secondary: "#fff" },
                    },
                    error: {
                      iconTheme: { primary: "#ef4444", secondary: "#fff" },
                    },
                  }}
                />
              </StepperProvider>
            </PlanProvider>
          </UserProfileProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.Fragment>,
);
