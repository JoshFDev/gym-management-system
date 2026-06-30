import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PlansPage from "../pages/PlansPage";

describe("PlansPage", () => {
    it("renderiza el título Planes", () => {
        render(
            <MemoryRouter>
                <PlansPage />
            </MemoryRouter>
        );
        expect(screen.getByText("Planes")).toBeInTheDocument();
    });
});
