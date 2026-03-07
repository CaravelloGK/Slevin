interface Props {
  params: Promise<{ id: string }>
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params
  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">Tournament Report</h1>
      <p className="text-muted-foreground text-sm">Tournament: {id} — report stub.</p>
    </main>
  )
}
