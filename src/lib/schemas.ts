import { z } from "zod";
export const OptionsS = z.record(z.string(), z.union([z.array(z.string()), z.record(z.string(), z.number()), z.string()]));
export const CartLineS = z.object({ productId: z.string(), variantId: z.string().nullish(), qty: z.number().int().min(1).max(99), options: OptionsS.optional(), note: z.string().max(200).optional() });
