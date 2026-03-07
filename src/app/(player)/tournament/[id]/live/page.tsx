interface Props {
  params: Promise<{ id: string }>
}

export default async function LivePage({ params }: Props) {
  const { id } = await params
  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">Live View</h1>
      <p className="text-muted-foreground text-sm">Tournament: {id} — spectator view stub.</p>
    </main>
  )
}
