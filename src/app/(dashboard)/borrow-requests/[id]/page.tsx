type BorrowRequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BorrowRequestDetailPage({
  params,
}: BorrowRequestDetailPageProps) {
  const { id } = await params;

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Borrow Request Detail</h1>
      <p>Viewing borrow request ID: {id}</p>
    </main>
  );
}
