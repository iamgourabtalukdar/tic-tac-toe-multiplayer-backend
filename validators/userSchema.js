import { z } from "zod/v4";
import { objectIdSchema } from "./utils.js";
import { sanitizeInput } from "./sanitizer.js";

export const userNameSchema = z
  .string("Please enter a valid name")
  .min(3, "Name must be at least 3 characters long")
  .max(30, "Name must be at most 30 characters long")
  .transform(sanitizeInput);

const fileNameSchema = z
  .string("Please enter a valid name string")
  .trim()
  .min(1, "Folder Name must be at least 1 characters long")
  .max(50, "Folder Name must be at most 50 characters long")
  .transform(sanitizeInput);

export const serveFileSchema = z.object({
  params: z.object({
    fileId: objectIdSchema,
  }),
});

// export const createFolderSchema = z.object({
//   body: z.object({
//     name: fileNameSchema,
//     parentFolderId: objectIdSchema.optional(),
//   }),
// });

export const renameFileSchema = z.object({
  body: z.object({
    name: fileNameSchema,
  }),
  params: z.object({
    fileId: objectIdSchema,
  }),
});

export const moveFileToTrashSchema = z.object({
  params: z.object({
    fileId: objectIdSchema,
  }),
});

export const changeStarOfFileSchema = z.object({
  body: z.object({
    isStarred: z.boolean({
      required_error: "isStarred is required.",
      invalid_type_error: "isStarred must be a boolean (true or false).",
    }),
  }),
  params: z.object({
    fileId: objectIdSchema,
  }),
});
