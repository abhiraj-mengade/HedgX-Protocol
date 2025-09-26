export default async function MarketInfo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  console.log("Market ID:", id);
  return (
    <div>
      <h1>Market ID: {id}</h1>
    </div>
  );
}
