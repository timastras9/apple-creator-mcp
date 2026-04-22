# Apple Creator MCP

Full Apple Creator Studio control for Claude agents. Create presentations, documents, spreadsheets, edit video, process audio, manipulate images — all through the Model Context Protocol.

**43 tools** across Keynote, Pages, Numbers, Final Cut Pro, Logic Pro + ffmpeg, sips, and macOS text-to-speech.

## One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/timastras9/apple-creator-mcp/Main/install.sh | bash
```

## Requirements

- macOS with Apple Creator Studio apps (Keynote, Pages, Numbers, Final Cut Pro, Logic Pro)
- Node.js 18+
- ffmpeg (for video/audio tools): `brew install ffmpeg`
- Claude Desktop

## Tools

### Keynote (9)

| Tool | Description |
|------|-------------|
| `keynote_create` | Create presentation with theme |
| `keynote_open` | Open .key file |
| `keynote_add_slide` | Add slide with layout, title, body |
| `keynote_add_image` | Add image to current slide |
| `keynote_add_text` | Add text box to current slide |
| `keynote_export` | Export to PDF, PNG, PowerPoint, movie |
| `keynote_play` | Start slideshow |
| `keynote_stop` | Stop slideshow |
| `keynote_get_info` | Get slide count, current slide, name |

### Pages (6)

| Tool | Description |
|------|-------------|
| `pages_create` | Create new document |
| `pages_open` | Open .pages file |
| `pages_add_text` | Add text content |
| `pages_add_image` | Add image |
| `pages_export` | Export to PDF, Word, ePub, text |
| `pages_get_text` | Read document text |

### Numbers (7)

| Tool | Description |
|------|-------------|
| `numbers_create` | Create spreadsheet |
| `numbers_open` | Open .numbers file |
| `numbers_set_cell` | Set cell value |
| `numbers_get_cell` | Read cell value |
| `numbers_set_range` | Bulk set cells from 2D array |
| `numbers_add_chart` | Add bar/line/pie/area/scatter chart |
| `numbers_export` | Export to PDF, Excel, CSV |

### Final Cut Pro (3)

| Tool | Description |
|------|-------------|
| `fcp_open` | Open FCP library |
| `fcp_get_libraries` | List libraries, events, projects |
| `fcp_export` | Trigger export dialog |

### Logic Pro (3)

| Tool | Description |
|------|-------------|
| `logic_open` | Open .logicx project |
| `logic_get_info` | Get project info |
| `logic_export` | Trigger bounce dialog |

### Video — ffmpeg (6)

| Tool | Description |
|------|-------------|
| `video_convert` | Convert formats, resize, change codec |
| `video_trim` | Trim to time range |
| `video_concat` | Join multiple videos |
| `video_add_audio` | Add/replace audio track |
| `video_info` | Get duration, resolution, codecs |
| `video_extract_frames` | Extract frames as images |

### Audio (4)

| Tool | Description |
|------|-------------|
| `audio_convert` | Convert formats, change bitrate |
| `audio_trim` | Trim to time range |
| `text_to_speech` | Generate speech from text (184 voices) |
| `list_voices` | List available voices |

### Image — sips (5)

| Tool | Description |
|------|-------------|
| `image_convert` | Convert format and resize |
| `image_info` | Get dimensions, format, metadata |
| `image_crop` | Crop to region |
| `image_rotate` | Rotate by degrees |
| `create_thumbnail` | Quick Look thumbnail from any file |

## Manual Install

```bash
git clone https://github.com/timastras9/apple-creator-mcp.git ~/.apple-creator-mcp
cd ~/.apple-creator-mcp
npm install
```

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apple-creator": {
      "command": "node",
      "args": ["/Users/YOU/.apple-creator-mcp/server.js"]
    }
  }
}
```

## Accessibility

Keynote, Pages, Numbers, FCP, and Logic control requires macOS Accessibility permissions for `/usr/bin/osascript` and `node`. The installer walks you through this automatically.

## Uninstall

```bash
rm -rf ~/.apple-creator-mcp
```

Remove `"apple-creator"` from Claude Desktop config.

## License

MIT — NSI Corp
