import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UploadFiles from "./UploadFiles";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("../lib/api.js", () => ({
  listOriginals: jest.fn(),
  getDetail: jest.fn(),
  uploadFile: jest.fn(),
  deleteById: jest.fn(),
}));

import { listOriginals, uploadFile, deleteById } from "../lib/api";

describe("UploadFiles component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders "No images yet." when no files exist', async () => {
    listOriginals.mockResolvedValueOnce([]);

    render(<UploadFiles />);

    expect(await screen.findByText(/No images yet/i)).toBeInTheDocument();
    expect(await screen.findByText(/No files yet/i)).toBeInTheDocument();
  });

  test("shows images when listOriginals returns image files", async () => {
    listOriginals.mockResolvedValueOnce([
      {
        id: "1",
        fileName: "image.jpg",
        mimeType: "image/jpeg",
        url: "/image.jpg",
      },
    ]);

    render(<UploadFiles />);

    expect(await screen.findByText("image.jpg")).toBeInTheDocument();
  });

  test("calls uploadFile when file is chosen", async () => {
    listOriginals.mockResolvedValueOnce([]); // start empty
    uploadFile.mockResolvedValueOnce();

    render(<UploadFiles />);
    const fileInput = screen.getByRole("button", { name: /Choose File/i });
    const user = userEvent.setup();

    // Simulate clicking the "Choose File" button to open the file input
    await user.click(fileInput);

    // simulate selecting a file
    const fakeFile = new File(['dummy'], 'test.png', { type: 'image/png' });
    const input = screen.getByTestId('file-input');
    await user.upload(input, fakeFile);

    await waitFor(() => expect(uploadFile).toHaveBeenCalledWith(fakeFile));
  });

  test('calls deleteById when Delete is confirmed', async () => {
    listOriginals.mockResolvedValueOnce([
        { id: '1', fileName: 'file.pdf', mimeType: 'application/pdf', url: '/file.pdf' },
    ]);
    deleteById.mockResolvedValueOnce();
    window.confirm = jest.fn(() => true);

    render(<UploadFiles />);
    const deleteButton = await screen.findByRole('button', { name: /delete/i });
    await userEvent.click(deleteButton);

    await waitFor(() => expect(deleteById).toHaveBeenCalledWith('1'));
  });
});
