import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import { ProtectedRoute } from "../ProtectedRoute";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../context/AuthContext";

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/secret"
          element={
            <ProtectedRoute requires="admin">
              <div>SECRET</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("<ProtectedRoute>", () => {
  it("shows children when user is the right type", () => {
    useAuth.mockReturnValue({ user: { type: "admin", id: 1 }, loading: false });
    renderAt("/secret");
    expect(screen.getByText("SECRET")).toBeInTheDocument();
  });

  it("redirects to /login when no user", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderAt("/secret");
    expect(screen.getByText("LOGIN")).toBeInTheDocument();
  });

  it("renders nothing while loading", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderAt("/secret");
    expect(screen.queryByText("SECRET")).not.toBeInTheDocument();
    expect(screen.queryByText("LOGIN")).not.toBeInTheDocument();
  });
});
