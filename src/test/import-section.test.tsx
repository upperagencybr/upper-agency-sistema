import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImportSection } from "@/components/app/ImportSection";

const { insert, read } = vi.hoisted(() => ({ insert: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/data", () => ({
  useProfile: () => ({ data: { id: "owner" } }),
  useRows: (table: string) => ({ data: table === "companies" ? [{ id: 1, name: "Destino", user_id: "owner" }] : [] }),
  useTableMutations: () => ({ insert: { mutateAsync: insert } }),
}));
vi.mock("@/lib/import-data", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/import-data")>(), readImportFile: read }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("confirmação da importação", () => {
  it("grava apenas novos clientes após conferir destino e não repete o lote", async () => {
    read.mockResolvedValue([{ name: "Planilha", headers: ["Nome", "E-mail", "user_id"], rows: [{ Nome: "Cliente do arquivo", "E-mail": "arquivo@example.test", user_id: "outro" }] }]);
    insert.mockResolvedValue(undefined);
    const { container } = render(<ImportSection />);
    const input = container.querySelector('input[type="file"]');
    if (!input) throw new Error("Input missing");
    fireEvent.change(input, { target: { files: [new File(["arquivo"], "clientes.xlsx")] } });
    await screen.findByText("1 prontos para importar");
    const submit = screen.getByRole("button", { name: "Importar registros" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Empresa"), { target: { value: "Destino" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(submit);
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(insert.mock.calls[0]?.[0]).toEqual([expect.objectContaining({ name: "Cliente do arquivo", company: "Destino", created_by: "owner", status: "ativo" })]);
    expect(insert.mock.calls[0]?.[0]?.[0]).not.toHaveProperty("user_id");
    await screen.findByText("1 registros salvos");
    fireEvent.click(screen.getByRole("checkbox"));
    expect(submit).toBeDisabled();
    expect(insert).toHaveBeenCalledTimes(1);
  });
});