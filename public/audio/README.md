# Audio Files

Place MP3 files here. All files are played via the AudioQueue (sequential, no overlap).

## Required files

| File | Trigger |
|---|---|
| `5-minutes.mp3` | 5 minutes remaining in current level |
| `1-minute.mp3` | 1 minute remaining in current level |
| `beep.mp3` | Single beep — played on seconds 5, 4, 3, 2 before level end |
| `beep-final.mp3` | Final beep — played on second 1 before level end |
| `chip-up.mp3` | Level with small_blind=50 / big_blind=100 begins (queued after level announcement) |
| `final-table.mp3` | Active players drop to 3 |
| `timetoeat.mp3` | 2h30m wall-clock time elapsed since tournament started |
| `level-1.mp3` | Level 1 begins (played before timer starts) |
| `level-2.mp3` | Level 2 begins |
| `level-N.mp3` | Level N begins |

## Playback order on level transition

1. `level-N.mp3`
2. `chip-up.mp3` (only if that level is 50/100)
3. ← timer starts counting down only after this queue drains
