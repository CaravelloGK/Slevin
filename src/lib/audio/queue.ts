export class AudioQueue {
  private queue: string[] = []
  private currentAudio: HTMLAudioElement | null = null
  private isPlaying = false
  private onEmptyCallbacks: Array<() => void> = []

  enqueue(fileName: string) {
    this.queue.push(fileName)
    if (!this.isPlaying) {
      void this.playNext()
    }
  }

  /** Resolves when the queue is fully drained and playback stops. */
  whenEmpty(): Promise<void> {
    if (!this.isPlaying && this.queue.length === 0) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      this.onEmptyCallbacks.push(resolve)
    })
  }

  clear() {
    this.queue = []
    this.onEmptyCallbacks = []
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.src = ''
      this.currentAudio = null
    }
    this.isPlaying = false
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false
      const callbacks = this.onEmptyCallbacks.splice(0)
      callbacks.forEach((cb) => cb())
      return
    }

    this.isPlaying = true
    const fileName = this.queue.shift()!
    const audio = new Audio(`/audio/${fileName}.mp3`)
    this.currentAudio = audio

    await new Promise<void>((resolve) => {
      audio.addEventListener('ended', () => resolve(), { once: true })
      audio.addEventListener('error', () => resolve(), { once: true })
      void audio.play().catch(() => resolve())
    })

    this.currentAudio = null
    void this.playNext()
  }
}
