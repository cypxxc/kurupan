type AssetDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const { id } = await params;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Asset Detail</h1>
      <p>Viewing asset ID: {id}</p>
    </main>
  );
}
