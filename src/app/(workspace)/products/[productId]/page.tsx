import { ProductDetail } from "@/components/modules/products";
export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <ProductDetail id={productId} />;
}
