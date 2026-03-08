interface Props {
  params: Promise<{ id: string }>
}

export default async function LivePage({ params }: Props) {
  const { id } = await params
  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">Трансляция</h1>
      <p className="text-muted-foreground text-sm">Турнир: {id} — режим наблюдателя (в разработке).</p>
    </main>
  )
}
