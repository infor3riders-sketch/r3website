"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormFeedback, SubmitButton, type FormStateLike } from "@/components/ui/form-bits";
import type { Row } from "@/lib/supabase/types";
import { saveDiscountCode, saveProduct, saveVariant, updateOrderStatus, uploadProductImage } from "@/server/shop-admin-actions";

const initial: FormStateLike = {};
const inv = (s: FormStateLike, k: string) => ({ "aria-invalid": Boolean(s.fieldErrors?.[k]), "aria-describedby": s.fieldErrors?.[k] ? `${k}-msg` : undefined }) as const;

export function ProductForm({ product }: { product?: Row<"products"> }) {
  const [state, action] = useActionState(saveProduct, initial);
  const v = state.values;
  const val = (k: keyof Row<"products">) => v?.[k] ?? (product?.[k] == null ? "" : String(product[k]));
  return (
    <form action={action} noValidate className="space-y-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={state.fieldErrors?.name} required>
          <Input id="name" name="name" defaultValue={val("name")} required {...inv(state, "name")} />
        </Field>
        <Field label="URL name" htmlFor="slug" error={state.fieldErrors?.slug} hint="Auto-generated from the name if empty">
          <Input id="slug" name="slug" defaultValue={val("slug")} {...inv(state, "slug")} />
        </Field>
        <Field label="Category" htmlFor="category" hint="e.g. Apparel, Accessories">
          <Input id="category" name="category" defaultValue={val("category")} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={4} defaultValue={val("description")} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={v ? v.is_active === "on" : Boolean(product?.is_active)} className="h-5 w-5 accent-[#f2a81d]" />
        Visible in the public shop
      </label>
      <FormFeedback state={state} />
      <SubmitButton size="lg">{product ? "Save product" : "Create product"}</SubmitButton>
    </form>
  );
}

export function VariantForm({ productId, variant }: { productId: string; variant?: Row<"product_variants"> }) {
  const [state, action] = useActionState(saveVariant, initial);
  const v = state.values;
  const val = (k: keyof Row<"product_variants">) => v?.[k] ?? (variant?.[k] == null ? "" : String(variant[k]));
  const p = variant ? `v-${variant.id}-` : "v-new-";
  return (
    <form action={action} noValidate className="space-y-3">
      <input type="hidden" name="product_id" value={productId} />
      {variant ? <input type="hidden" name="id" value={variant.id} /> : null}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Field label="Label" htmlFor={`${p}label`} error={state.fieldErrors?.label} required className="lg:col-span-2">
          <Input id={`${p}label`} name="label" defaultValue={val("label")} placeholder="Black / M" required {...inv(state, "label")} />
        </Field>
        <Field label="Size" htmlFor={`${p}size`}>
          <Input id={`${p}size`} name="size" defaultValue={val("size")} />
        </Field>
        <Field label="Color" htmlFor={`${p}color`}>
          <Input id={`${p}color`} name="color" defaultValue={val("color")} />
        </Field>
        <Field label="Price (PHP)" htmlFor={`${p}price`} error={state.fieldErrors?.price_php} required>
          <Input id={`${p}price`} name="price_php" type="number" step="0.01" min={0} inputMode="decimal" defaultValue={val("price_php")} required {...inv(state, "price_php")} />
        </Field>
        <Field label="Stock" htmlFor={`${p}stock`} error={state.fieldErrors?.stock} required hint={variant ? `${variant.reserved} reserved` : undefined}>
          <Input id={`${p}stock`} name="stock" type="number" min={0} inputMode="numeric" defaultValue={val("stock") || "0"} required {...inv(state, "stock")} />
        </Field>
        <Field label="SKU" htmlFor={`${p}sku`} error={state.fieldErrors?.sku}>
          <Input id={`${p}sku`} name="sku" defaultValue={val("sku")} {...inv(state, "sku")} />
        </Field>
        <label className="flex min-h-11 items-center gap-2 self-end text-sm">
          <input type="checkbox" name="is_active" defaultChecked={v ? v.is_active === "on" : variant ? variant.is_active : true} className="h-5 w-5 accent-[#f2a81d]" />
          Active
        </label>
      </div>
      <FormFeedback state={state} />
      <SubmitButton variant="outline" size="sm">{variant ? "Save variant" : "Add variant"}</SubmitButton>
    </form>
  );
}

export function ImageUploadForm({ productId }: { productId: string }) {
  const [state, action] = useActionState(uploadProductImage, initial);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="product_id" value={productId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Image" htmlFor="image" hint="JPG, PNG or WebP up to 5 MB">
          <input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required className="block w-full text-sm text-muted file:mr-3 file:min-h-11 file:rounded-md file:border file:border-line file:bg-panel-raised file:px-4 file:text-sm file:font-medium file:text-white" />
        </Field>
        <Field label="Alt text" htmlFor="alt" hint="Describe the photo for screen readers">
          <Input id="alt" name="alt" />
        </Field>
      </div>
      <FormFeedback state={state} />
      <SubmitButton variant="outline" pendingText="Uploading…">Upload image</SubmitButton>
    </form>
  );
}

export function DiscountForm() {
  const [state, action] = useActionState(saveDiscountCode, initial);
  const v = state.values ?? {};
  return (
    <form action={action} noValidate className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <Field label="Code" htmlFor="code" error={state.fieldErrors?.code} required>
        <Input id="code" name="code" defaultValue={v.code} autoCapitalize="characters" required {...inv(state, "code")} />
      </Field>
      <Field label="Type" htmlFor="kind">
        <Select id="kind" name="kind" defaultValue={v.kind ?? "percent"}>
          <option value="percent">Percent off</option>
          <option value="fixed">Fixed amount (PHP)</option>
        </Select>
      </Field>
      <Field label="Value" htmlFor="value" error={state.fieldErrors?.value} required>
        <Input id="value" name="value" type="number" step="0.01" min={0} defaultValue={v.value} required {...inv(state, "value")} />
      </Field>
      <Field label="Min. order (PHP)" htmlFor="min_subtotal">
        <Input id="min_subtotal" name="min_subtotal" type="number" step="0.01" min={0} defaultValue={v.min_subtotal} />
      </Field>
      <Field label="Max uses" htmlFor="max_uses" hint="Empty = unlimited">
        <Input id="max_uses" name="max_uses" type="number" min={1} defaultValue={v.max_uses} />
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="is_active" defaultChecked className="h-5 w-5 accent-[#f2a81d]" /> Active
      </label>
      <div className="space-y-3 sm:col-span-3">
        <FormFeedback state={state} />
        <SubmitButton>Create code</SubmitButton>
      </div>
    </form>
  );
}

export function OrderStatusForm({ id, current }: { id: string; current: string }) {
  const [state, action] = useActionState(updateOrderStatus, initial);
  const options = current === "paid" ? ["processing", "shipped", "completed"] : current === "processing" ? ["shipped", "completed"] : current === "shipped" ? ["completed"] : [];
  if (options.length === 0) return null;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Move order to" htmlFor="status">
        <Select id="status" name="status" defaultValue={options[0]}>
          {options.map((o) => (
            <option key={o} value={o}>
              {o[0].toUpperCase() + o.slice(1)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Note to customer (courier, tracking no.)" htmlFor="tracking_note">
        <Textarea id="tracking_note" name="tracking_note" rows={2} />
      </Field>
      <FormFeedback state={state} />
      <SubmitButton variant="blue">Update and notify</SubmitButton>
    </form>
  );
}
