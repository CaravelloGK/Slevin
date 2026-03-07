interface Props {
  params: Promise<{ id: string }>
}

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params
  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">Player Profile</h1>
      <p className="text-muted-foreground text-sm">Player: {id} — profile stub.</p>
    </main>
  )
}
