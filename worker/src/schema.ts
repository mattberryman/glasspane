import { z } from "zod";

export const UploadSchema = z.object({
	content: z
		.string()
		.min(1, "Script content cannot be empty")
		.max(100_000, "Script exceeds 100 KB limit"),
});
