import { z } from 'zod';

export const AssetKindSchema = z.enum(['LOGO', 'ACCESSORY', 'OTHER']);

export const InitiateUploadReqSchema = z.object({
  files: z.array(z.object({
    name: z.string().min(1).max(255),
    mimeType: z.string().refine(
      (mimeType) => [
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/svg+xml',
        'application/pdf'
      ].includes(mimeType),
      { message: 'Unsupported file type' }
    ),
    sizeBytes: z.number().min(1).max(20 * 1024 * 1024), // 20MB max
    kind: AssetKindSchema
  })).min(1).max(5) // 1-5 files max
});

export const CommitUploadReqSchema = z.object({
  files: z.array(z.object({
    path: z.string().min(1),
    mimeType: z.string(),
    sizeBytes: z.number().min(1),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    kind: AssetKindSchema,
    position: z.string().optional()
  }))
});

export const UpdateInstructionReqSchema = z.object({
  additionalInstruction: z.string().max(500).optional() // 500 char limit
});

export const OrderAssetDTOSchema = z.object({
  id: z.string(),
  kind: AssetKindSchema,
  position: z.string().optional().nullable(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  uploadedAt: z.date(),
  signedUrl: z.string().optional()
});

// Type exports
export type AssetKind = z.infer<typeof AssetKindSchema>;
export type InitiateUploadReq = z.infer<typeof InitiateUploadReqSchema>;
export type CommitUploadReq = z.infer<typeof CommitUploadReqSchema>;
export type UpdateInstructionReq = z.infer<typeof UpdateInstructionReqSchema>;
export type OrderAssetDTO = z.infer<typeof OrderAssetDTOSchema>;

export type InitiateUploadRes = {
  uploads: { tempId: string; path: string; signedUrl: string }[];
};