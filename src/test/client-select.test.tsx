import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientSelect } from "@/components/app/ClientSelect";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/data", () => ({
  useRows: () => ({ data: [] }),
  useCreateClient: () => ({ mutateAsync: create, isPending: false }),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("cadastro rápido de cliente", () => {
  it("seleciona automaticamente o cliente criado", async () => {
    create.mockResolvedValue({ id: 42, name: "Cliente novo" });
    const onChange = vi.fn();
    render(<ClientSelect value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo cliente" }));
    fireEvent.change(screen.getByLabelText("Nome do cliente"), { target: { value: "Cliente novo" } });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar cliente" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(42));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: "Cliente novo" }));
  });
  it("não cadastra cliente sem nome", () => {
    render(<ClientSelect value={null} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Novo cliente" }));
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar cliente" }));
    expect(create).not.toHaveBeenCalled();
  });
});