#!/usr/bin/env node
/**
 * Apple Creator MCP — Full Apple Creator Studio control for Claude agents.
 *
 * Apps: Keynote, Pages, Numbers, Final Cut Pro, Logic Pro, Motion, Compressor
 * Plus: ffmpeg video/audio, sips image processing, say text-to-speech
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir, homedir } from "os";

const WORK_DIR = join(homedir(), ".apple-creator-mcp", "output");
if (!existsSync(WORK_DIR)) mkdirSync(WORK_DIR, { recursive: true });

// App names — Creator Studio variants
const APP = {
  keynote: "Keynote Creator Studio",
  pages: "Pages Creator Studio",
  numbers: "Numbers Creator Studio",
  fcp: "Final Cut Pro Creator Studio",
  logic: "Logic Pro Creator Studio",
  motion: "Motion Creator Studio",
  compressor: "Compressor Creator Studio",
};

function osa(script) {
  const tmpFile = join(WORK_DIR, `_osa_${Date.now()}_${Math.random().toString(36).slice(2)}.scpt`);
  writeFileSync(tmpFile, script);
  try {
    return execSync(`osascript "${tmpFile}"`, {
      encoding: "utf-8",
      timeout: 30000,
    }).trim();
  } finally {
    try { execSync(`rm -f "${tmpFile}"`); } catch {}
  }
}

function escAS(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Keynote uses 16-bit color (0-65535), convert from 8-bit RGB string "{R, G, B}"
function c16(colorStr) {
  return colorStr.replace(/\d+/g, n => Math.round(parseInt(n) * 257));
}

// ═══ PRO PRESETS ═══

const PRESETS = {
  "darpa": {
    bg: "{0, 8, 20}",
    title: { color: "{255, 255, 255}", font: "Helvetica Neue Bold", size: 44 },
    subtitle: { color: "{100, 180, 255}", font: "Helvetica Neue Light", size: 24 },
    body: { color: "{200, 210, 225}", font: "Helvetica Neue", size: 20 },
    accent: "{0, 120, 255}",
    accentAlt: "{255, 60, 60}",
    transition: "dissolve",
  },
  "nsi": {
    bg: "{10, 12, 30}",
    title: { color: "{255, 255, 255}", font: "Helvetica Neue Bold", size: 44 },
    subtitle: { color: "{138, 92, 246}", font: "Helvetica Neue Light", size: 24 },
    body: { color: "{190, 195, 220}", font: "Helvetica Neue", size: 20 },
    accent: "{138, 92, 246}",
    accentAlt: "{0, 210, 180}",
    transition: "magic move",
  },
  "intel": {
    bg: "{15, 15, 15}",
    title: { color: "{255, 255, 255}", font: "Helvetica Neue Bold", size: 44 },
    subtitle: { color: "{0, 200, 150}", font: "Helvetica Neue Medium", size: 24 },
    body: { color: "{180, 185, 195}", font: "Helvetica Neue", size: 20 },
    accent: "{0, 200, 150}",
    accentAlt: "{255, 180, 0}",
    transition: "push",
  },
  "executive": {
    bg: "{25, 30, 45}",
    title: { color: "{255, 255, 255}", font: "Georgia Bold", size: 42 },
    subtitle: { color: "{200, 175, 120}", font: "Georgia", size: 22 },
    body: { color: "{200, 205, 215}", font: "Helvetica Neue", size: 20 },
    accent: "{200, 175, 120}",
    accentAlt: "{100, 130, 200}",
    transition: "fade through color",
  },
  "military": {
    bg: "{20, 25, 15}",
    title: { color: "{255, 255, 255}", font: "Helvetica Neue Bold", size: 44 },
    subtitle: { color: "{140, 180, 80}", font: "Helvetica Neue Medium", size: 24 },
    body: { color: "{190, 200, 180}", font: "Helvetica Neue", size: 20 },
    accent: "{140, 180, 80}",
    accentAlt: "{220, 180, 60}",
    transition: "push",
  },
};

// ═══ TOOL DEFINITIONS ═══

const tools = [
  // ── KEYNOTE ──
  {
    name: "keynote_build_deck",
    description: "Create a complete professional presentation in one call. Builds a fully styled deck with dark backgrounds, colored text, transitions, and consistent branding. Use this instead of creating slides one at a time. ALWAYS use this for presentations — it produces CIA/NSA briefing quality output.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { type: "string", enum: ["darpa", "nsi", "intel", "executive", "military"], description: "Visual preset. darpa=blue/red on black, nsi=purple/cyan on deep navy, intel=green/gold on black, executive=gold/blue on dark navy, military=olive/yellow on dark green" },
        slides: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              subtitle: { type: "string" },
              bullets: { type: "array", items: { type: "string" }, description: "Bullet points" },
              body: { type: "string", description: "Paragraph text (use bullets OR body, not both)" },
              image: { type: "string", description: "Full path to image file" },
              layout: { type: "string", enum: ["title", "section", "content", "two-column", "image-full", "quote"], description: "Slide layout type (default: content)" },
            },
            required: ["title"],
          },
          description: "Array of slide objects",
        },
        savePath: { type: "string", description: "Path to save .key file (optional)" },
      },
      required: ["preset", "slides"],
    },
  },
  {
    name: "keynote_create",
    description: "Create a new blank Keynote presentation. For professional presentations, use keynote_build_deck instead.",
    inputSchema: {
      type: "object",
      properties: {
        theme: { type: "string", description: "Theme name (e.g. 'White', 'Black', 'Gradient'). Default: Black" },
        title: { type: "string", description: "Title text for the first slide" },
      },
    },
  },
  {
    name: "keynote_open",
    description: "Open an existing Keynote file.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Full path to .key file" } },
      required: ["path"],
    },
  },
  {
    name: "keynote_add_slide",
    description: "Add a styled slide to the current presentation. ALWAYS set colors and fonts — never leave defaults. Use dark backgrounds with light text for professional look.",
    inputSchema: {
      type: "object",
      properties: {
        layout: { type: "string", description: "Slide layout name (e.g. 'Blank', 'Title - Center')" },
        title: { type: "string", description: "Title text" },
        body: { type: "string", description: "Body text" },
        transition: { type: "string", enum: ["dissolve", "push", "magic move", "fade through color", "wipe", "swap", "move in", "reveal"], description: "Transition effect (default dissolve)" },
      },
    },
  },
  {
    name: "keynote_add_image",
    description: "Add an image to the current slide in Keynote.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Full path to image file" },
        x: { type: "number", description: "X position in points" },
        y: { type: "number", description: "Y position in points" },
        width: { type: "number", description: "Width in points" },
        height: { type: "number", description: "Height in points" },
      },
      required: ["path"],
    },
  },
  {
    name: "keynote_add_text",
    description: "Add a styled text box to the current slide. ALWAYS specify font, fontSize, and color for professional output.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text content" },
        x: { type: "number", description: "X position in points (default 100)" },
        y: { type: "number", description: "Y position in points (default 100)" },
        width: { type: "number", description: "Width in points (default 600)" },
        height: { type: "number", description: "Height in points (default 200)" },
        fontSize: { type: "number", description: "Font size (default 24)" },
        font: { type: "string", description: "Font name (e.g. 'Helvetica Neue Bold', 'Georgia')" },
        color: { type: "string", description: "RGB color as {R, G, B} (e.g. '{255, 255, 255}' for white)" },
      },
      required: ["text"],
    },
  },
  {
    name: "keynote_add_shape",
    description: "Add a colored shape to the current slide. Use for accent bars, dividers, backgrounds, and visual elements.",
    inputSchema: {
      type: "object",
      properties: {
        shape: { type: "string", enum: ["rectangle", "rounded rectangle", "circle", "triangle", "diamond", "arrow", "star", "line"], description: "Shape type" },
        x: { type: "number", description: "X position" },
        y: { type: "number", description: "Y position" },
        width: { type: "number", description: "Width" },
        height: { type: "number", description: "Height" },
        fillColor: { type: "string", description: "RGB fill color as {R, G, B}" },
        opacity: { type: "number", description: "Opacity 0-100 (default 100)" },
        rotation: { type: "number", description: "Rotation in degrees" },
        text: { type: "string", description: "Text inside the shape" },
        textColor: { type: "string", description: "Text color as {R, G, B}" },
        textSize: { type: "number", description: "Text size in points" },
      },
      required: ["shape", "x", "y", "width", "height"],
    },
  },
  {
    name: "keynote_set_slide_transition",
    description: "Set the transition effect for a specific slide.",
    inputSchema: {
      type: "object",
      properties: {
        slideNumber: { type: "number", description: "Slide number" },
        effect: { type: "string", enum: ["dissolve", "push", "magic move", "fade through color", "wipe", "swap", "move in", "reveal", "cube", "flip", "mosaic", "confetti", "sparkle", "swing"], description: "Transition effect" },
        duration: { type: "number", description: "Duration in seconds (default 1.0)" },
      },
      required: ["slideNumber", "effect"],
    },
  },
  {
    name: "keynote_set_presenter_notes",
    description: "Set presenter notes for a slide. Essential for professional briefings.",
    inputSchema: {
      type: "object",
      properties: {
        slideNumber: { type: "number", description: "Slide number" },
        notes: { type: "string", description: "Presenter notes text" },
      },
      required: ["slideNumber", "notes"],
    },
  },
  {
    name: "keynote_export",
    description: "Export Keynote presentation to PDF, PNG images, movie, or PowerPoint.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Output file path" },
        format: { type: "string", enum: ["PDF", "slide images", "Microsoft PowerPoint", "movie"], description: "Export format" },
      },
      required: ["path", "format"],
    },
  },
  {
    name: "keynote_play",
    description: "Start playing the Keynote slideshow.",
    inputSchema: {
      type: "object",
      properties: {
        fromSlide: { type: "number", description: "Slide number to start from (default 1)" },
      },
    },
  },
  {
    name: "keynote_stop",
    description: "Stop the Keynote slideshow.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "keynote_get_info",
    description: "Get info about the current Keynote presentation.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "keynote_list_presets",
    description: "List available professional presentation presets with their color schemes.",
    inputSchema: { type: "object", properties: {} },
  },

  // ── PAGES ──
  {
    name: "pages_build_document",
    description: "Create a complete professional document in one call. Produces executive-quality output suitable for DARPA, DoD, or corporate briefings. Use this instead of building documents piece by piece.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Document title" },
        subtitle: { type: "string", description: "Subtitle or classification (e.g. 'UNCLASSIFIED', 'NSI Corp Confidential')" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string", description: "Section heading" },
              body: { type: "string", description: "Section body text. Use \\n for paragraphs." },
              bullets: { type: "array", items: { type: "string" }, description: "Bullet points" },
            },
            required: ["heading"],
          },
          description: "Document sections",
        },
        savePath: { type: "string", description: "Path to save file" },
        exportPDF: { type: "string", description: "Path to also export as PDF" },
      },
      required: ["title", "sections"],
    },
  },
  {
    name: "pages_create",
    description: "Create a new Pages document. For professional documents, use pages_build_document instead.",
    inputSchema: {
      type: "object",
      properties: {
        template: { type: "string", description: "Template name (e.g. 'Blank', 'Report')" },
      },
    },
  },
  {
    name: "pages_open",
    description: "Open an existing Pages document.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Full path to .pages file" } },
      required: ["path"],
    },
  },
  {
    name: "pages_add_text",
    description: "Add formatted text to the current Pages document. ALWAYS specify font and size for professional output.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to add" },
        fontSize: { type: "number", description: "Font size (default 12)" },
        font: { type: "string", description: "Font name (e.g. 'Helvetica Neue', 'Georgia', 'Times New Roman')" },
        bold: { type: "boolean", description: "Bold text" },
      },
      required: ["text"],
    },
  },
  {
    name: "pages_add_image",
    description: "Add an image to the current Pages document.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Full path to image file" },
      },
      required: ["path"],
    },
  },
  {
    name: "pages_export",
    description: "Export Pages document to PDF, Word, ePub, or plain text.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Output file path" },
        format: { type: "string", enum: ["PDF", "Microsoft Word", "ePub", "unformatted text"], description: "Export format" },
      },
      required: ["path", "format"],
    },
  },
  {
    name: "pages_get_text",
    description: "Get all text content from the current Pages document.",
    inputSchema: {
      type: "object",
      properties: {
        maxLength: { type: "number", description: "Max characters to return (default 10000)" },
      },
    },
  },

  // ── NUMBERS ──
  {
    name: "numbers_create",
    description: "Create a new Numbers spreadsheet.",
    inputSchema: {
      type: "object",
      properties: {
        template: { type: "string", description: "Template name (default Blank)" },
      },
    },
  },
  {
    name: "numbers_open",
    description: "Open an existing Numbers spreadsheet.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Full path to .numbers file" } },
      required: ["path"],
    },
  },
  {
    name: "numbers_set_cell",
    description: "Set a cell value in Numbers.",
    inputSchema: {
      type: "object",
      properties: {
        cell: { type: "string", description: "Cell reference like A1, B3, etc." },
        value: { type: "string", description: "Value to set" },
        sheet: { type: "number", description: "Sheet number (default 1)" },
        table: { type: "number", description: "Table number (default 1)" },
      },
      required: ["cell", "value"],
    },
  },
  {
    name: "numbers_get_cell",
    description: "Get a cell value from Numbers.",
    inputSchema: {
      type: "object",
      properties: {
        cell: { type: "string", description: "Cell reference like A1, B3" },
        sheet: { type: "number", description: "Sheet number (default 1)" },
        table: { type: "number", description: "Table number (default 1)" },
      },
      required: ["cell"],
    },
  },
  {
    name: "numbers_set_range",
    description: "Set multiple cell values in Numbers from a 2D array.",
    inputSchema: {
      type: "object",
      properties: {
        startCell: { type: "string", description: "Starting cell (e.g. A1)" },
        data: { type: "array", items: { type: "array", items: { type: "string" } }, description: "2D array of values [[row1col1, row1col2], [row2col1, ...]]" },
        sheet: { type: "number", description: "Sheet number (default 1)" },
        table: { type: "number", description: "Table number (default 1)" },
      },
      required: ["startCell", "data"],
    },
  },
  {
    name: "numbers_add_chart",
    description: "Add a chart to the current Numbers sheet.",
    inputSchema: {
      type: "object",
      properties: {
        dataRange: { type: "string", description: "Cell range for chart data (e.g. A1:D10)" },
        type: { type: "string", enum: ["bar", "line", "pie", "area", "scatter"], description: "Chart type" },
      },
      required: ["dataRange", "type"],
    },
  },
  {
    name: "numbers_export",
    description: "Export Numbers spreadsheet to PDF, Excel, or CSV.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Output file path" },
        format: { type: "string", enum: ["PDF", "Microsoft Excel", "CSV"], description: "Export format" },
      },
      required: ["path", "format"],
    },
  },

  // ── FINAL CUT PRO ──
  {
    name: "fcp_open",
    description: "Open a Final Cut Pro library.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Path to .fcpbundle library" } },
      required: ["path"],
    },
  },
  {
    name: "fcp_get_libraries",
    description: "List all open Final Cut Pro libraries and their events/projects.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "fcp_export",
    description: "Export the current Final Cut Pro project using Compressor or Share.",
    inputSchema: {
      type: "object",
      properties: {
        preset: { type: "string", description: "Export preset (e.g. 'Apple Devices 1080p')" },
        path: { type: "string", description: "Output directory path" },
      },
      required: ["path"],
    },
  },

  // ── LOGIC PRO ──
  {
    name: "logic_open",
    description: "Open a Logic Pro project file.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Path to .logicx project" } },
      required: ["path"],
    },
  },
  {
    name: "logic_get_info",
    description: "Get info about the current Logic Pro project.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "logic_export",
    description: "Export/bounce the current Logic Pro project to audio.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Output file path" },
        format: { type: "string", enum: ["aiff", "wav", "mp3", "aac"], description: "Audio format (default wav)" },
      },
      required: ["path"],
    },
  },

  // ── MEDIA TOOLS (ffmpeg + sips + say) ──
  {
    name: "video_convert",
    description: "Convert video between formats using ffmpeg. Supports mp4, mov, avi, mkv, webm, gif.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        output: { type: "string", description: "Output file path" },
        resolution: { type: "string", description: "Resolution like 1920x1080, 1280x720, 3840x2160" },
        fps: { type: "number", description: "Frame rate" },
        codec: { type: "string", description: "Video codec (h264, h265, vp9, prores)" },
        quality: { type: "number", description: "Quality 1-51 (lower=better, default 23)" },
      },
      required: ["input", "output"],
    },
  },
  {
    name: "video_trim",
    description: "Trim a video to a specific time range.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        output: { type: "string", description: "Output file path" },
        start: { type: "string", description: "Start time (HH:MM:SS or seconds)" },
        end: { type: "string", description: "End time (HH:MM:SS or seconds)" },
        duration: { type: "string", description: "Duration (alternative to end)" },
      },
      required: ["input", "output", "start"],
    },
  },
  {
    name: "video_concat",
    description: "Concatenate multiple video files into one.",
    inputSchema: {
      type: "object",
      properties: {
        inputs: { type: "array", items: { type: "string" }, description: "Array of input file paths" },
        output: { type: "string", description: "Output file path" },
      },
      required: ["inputs", "output"],
    },
  },
  {
    name: "video_add_audio",
    description: "Add or replace audio track in a video.",
    inputSchema: {
      type: "object",
      properties: {
        video: { type: "string", description: "Video file path" },
        audio: { type: "string", description: "Audio file path" },
        output: { type: "string", description: "Output file path" },
        replace: { type: "boolean", description: "Replace existing audio (default true)" },
      },
      required: ["video", "audio", "output"],
    },
  },
  {
    name: "video_info",
    description: "Get detailed info about a video file — duration, resolution, codecs, bitrate.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Video file path" },
      },
      required: ["path"],
    },
  },
  {
    name: "video_extract_frames",
    description: "Extract frames from a video as images.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Video file path" },
        outputDir: { type: "string", description: "Output directory" },
        fps: { type: "number", description: "Frames per second to extract (default 1)" },
        format: { type: "string", enum: ["png", "jpg"], description: "Image format (default png)" },
      },
      required: ["input", "outputDir"],
    },
  },
  {
    name: "audio_convert",
    description: "Convert audio between formats. Supports mp3, wav, aac, aiff, flac, ogg.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        output: { type: "string", description: "Output file path" },
        bitrate: { type: "string", description: "Audio bitrate (e.g. 320k, 192k)" },
        sampleRate: { type: "number", description: "Sample rate in Hz (e.g. 44100, 48000)" },
      },
      required: ["input", "output"],
    },
  },
  {
    name: "audio_trim",
    description: "Trim audio to a specific time range.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path" },
        output: { type: "string", description: "Output file path" },
        start: { type: "string", description: "Start time" },
        end: { type: "string", description: "End time" },
      },
      required: ["input", "output", "start"],
    },
  },
  {
    name: "text_to_speech",
    description: "Convert text to spoken audio using macOS voices.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to speak" },
        output: { type: "string", description: "Output audio file path (.aiff)" },
        voice: { type: "string", description: "Voice name (e.g. 'Samantha', 'Alex', 'Daniel')" },
        rate: { type: "number", description: "Speech rate in words per minute (default 175)" },
      },
      required: ["text", "output"],
    },
  },
  {
    name: "list_voices",
    description: "List all available macOS text-to-speech voices.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "image_convert",
    description: "Convert image between formats and resize. Supports png, jpg, tiff, gif, bmp, heic.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input image path" },
        output: { type: "string", description: "Output image path" },
        width: { type: "number", description: "Target width in pixels" },
        height: { type: "number", description: "Target height in pixels" },
        quality: { type: "number", description: "JPEG quality 0-100 (default 85)" },
      },
      required: ["input", "output"],
    },
  },
  {
    name: "image_info",
    description: "Get image dimensions, format, color space, and file size.",
    inputSchema: {
      type: "object",
      properties: { path: { type: "string", description: "Image file path" } },
      required: ["path"],
    },
  },
  {
    name: "image_crop",
    description: "Crop an image to a specific region.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input image path" },
        output: { type: "string", description: "Output image path" },
        x: { type: "number", description: "Left offset" },
        y: { type: "number", description: "Top offset" },
        width: { type: "number", description: "Crop width" },
        height: { type: "number", description: "Crop height" },
      },
      required: ["input", "output", "x", "y", "width", "height"],
    },
  },
  {
    name: "image_rotate",
    description: "Rotate an image by degrees.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input image path" },
        output: { type: "string", description: "Output image path" },
        degrees: { type: "number", description: "Rotation in degrees (90, 180, 270)" },
      },
      required: ["input", "output", "degrees"],
    },
  },
  {
    name: "create_thumbnail",
    description: "Generate a thumbnail from any file using Quick Look.",
    inputSchema: {
      type: "object",
      properties: {
        input: { type: "string", description: "Input file path (any type)" },
        output: { type: "string", description: "Output image path" },
        size: { type: "number", description: "Thumbnail size in pixels (default 512)" },
      },
      required: ["input", "output"],
    },
  },
];

// ═══ MCP SERVER ═══

const server = new Server(
  { name: "apple-creator-mcp", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {

      // ═══ KEYNOTE ═══

      case "keynote_build_deck": {
        const preset = PRESETS[args.preset] || PRESETS.darpa;

        // Create presentation with Black theme (dark base)
        osa(`tell application "${APP.keynote}"
          activate
          set newDoc to make new document with properties {document theme:theme "Black"}
        end tell`);

        // Build each slide
        for (let i = 0; i < args.slides.length; i++) {
          const slide = args.slides[i];
          const layout = slide.layout || "content";
          const isFirst = i === 0;

          if (!isFirst) {
            osa(`tell application "${APP.keynote}"
tell front document
  make new slide at end with properties {base layout:slide layout "Blank"}
end tell
end tell`);
          } else {
            try {
              osa(`tell application "${APP.keynote}"
tell front document
  set base layout of slide 1 to slide layout "Blank"
end tell
end tell`);
            } catch {}
          }

          const slideRef = isFirst ? "slide 1" : "last slide";

          // Accent bar at top
          if (layout !== "image-full") {
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set bar to make new shape with properties {position:{0, 0}, width:1024, height:4}
                  set object text of bar to ""
                end tell
              end tell
            end tell`);
          }

          // Title
          if (slide.title) {
            const titlePreset = preset.title;
            const titleY = layout === "title" ? 220 : (layout === "section" ? 250 : 60);
            const titleSize = layout === "title" ? 56 : (layout === "section" ? 48 : titlePreset.size);
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set t to make new text item with properties {object text:"${escAS(slide.title)}", position:{80, ${titleY}}, width:864, height:80}
                  set font of object text of t to "${titlePreset.font}"
                  set size of object text of t to ${titleSize}
                end tell
              end tell
            end tell`);
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set color of object text of last text item to {${c16(titlePreset.color).slice(1,-1)}}
                end tell
              end tell
            end tell`);
          }

          // Subtitle
          if (slide.subtitle) {
            const subPreset = preset.subtitle;
            const subY = layout === "title" ? 300 : (layout === "section" ? 320 : 140);
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set s to make new text item with properties {object text:"${escAS(slide.subtitle)}", position:{80, ${subY}}, width:864, height:50}
                  set font of object text of s to "${subPreset.font}"
                  set size of object text of s to ${subPreset.size}
                end tell
              end tell
            end tell`);
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set color of object text of last text item to {${c16(subPreset.color).slice(1,-1)}}
                end tell
              end tell
            end tell`);
          }

          // Bullets
          if (slide.bullets && slide.bullets.length > 0) {
            const bodyPreset = preset.body;
            const bulletText = slide.bullets.map(b => "  ▸  " + b).join("\\n");
            const bulletY = slide.subtitle ? 200 : 160;
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set b to make new text item with properties {object text:"${escAS(bulletText)}", position:{80, ${bulletY}}, width:864, height:${Math.min(slide.bullets.length * 45 + 30, 480)}}
                  set font of object text of b to "${bodyPreset.font}"
                  set size of object text of b to ${bodyPreset.size}
                end tell
              end tell
            end tell`);
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set color of object text of last text item to {${c16(bodyPreset.color).slice(1,-1)}}
                end tell
              end tell
            end tell`);
          }

          // Body text
          if (slide.body) {
            const bodyPreset = preset.body;
            const bodyY = slide.subtitle ? 200 : 160;
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set bt to make new text item with properties {object text:"${escAS(slide.body)}", position:{80, ${bodyY}}, width:864, height:400}
                  set font of object text of bt to "${bodyPreset.font}"
                  set size of object text of bt to ${bodyPreset.size}
                end tell
              end tell
            end tell`);
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set color of object text of last text item to {${c16(bodyPreset.color).slice(1,-1)}}
                end tell
              end tell
            end tell`);
          }

          // Image
          if (slide.image) {
            const imgX = layout === "image-full" ? 0 : (layout === "two-column" ? 520 : 600);
            const imgY = layout === "image-full" ? 0 : 160;
            const imgW = layout === "image-full" ? 1024 : (layout === "two-column" ? 440 : 350);
            const imgH = layout === "image-full" ? 768 : 350;
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set img to make new image with properties {file:POSIX file "${escAS(slide.image)}", position:{${imgX}, ${imgY}}, width:${imgW}, height:${imgH}}
                end tell
              end tell
            end tell`);
          }

          // Transition
          try {
            osa(`tell application "${APP.keynote}"
              tell front document
                set transition properties of ${slideRef} to {transition effect:${preset.transition}, transition duration:1.0}
              end tell
            end tell`);
          } catch {}

          // Slide number in bottom right (except title slides)
          if (layout !== "title" && layout !== "image-full") {
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set sn to make new text item with properties {object text:"${i + 1}", position:{940, 710}, width:60, height:30}
                  set font of object text of sn to "${preset.body.font}"
                  set size of object text of sn to 12
                end tell
              end tell
            end tell`);
            osa(`tell application "${APP.keynote}"
              tell front document
                tell ${slideRef}
                  set color of object text of last text item to {${c16(preset.subtitle.color).slice(1,-1)}}
                end tell
              end tell
            end tell`);
          }
        }

        // Save if path provided
        if (args.savePath) {
          osa(`tell application "${APP.keynote}"
            save front document in POSIX file "${escAS(args.savePath)}"
          end tell`);
        }

        return ok(`Built ${args.slides.length}-slide ${args.preset} presentation`);
      }

      case "keynote_create": {
        const theme = args.theme || "Black";
        osa(`tell application "${APP.keynote}"
          activate
          set newDoc to make new document with properties {document theme:theme "${theme}"}
        end tell`);
        if (args.title) {
          osa(`tell application "${APP.keynote}"
            tell front document
              tell slide 1
                set object text of default title item to "${escAS(args.title)}"
              end tell
            end tell
          end tell`);
        }
        return ok(`Created Keynote presentation${args.title ? `: "${args.title}"` : ""}`);
      }

      case "keynote_open": {
        osa(`tell application "${APP.keynote}"
          activate
          open POSIX file "${escAS(args.path)}"
        end tell`);
        return ok(`Opened ${args.path}`);
      }

      case "keynote_add_slide": {
        let layoutPart = "";
        if (args.layout) {
          layoutPart = ` with properties {base layout:slide layout "${escAS(args.layout)}" of document theme of front document}`;
        }
        osa(`tell application "${APP.keynote}"
          tell front document
            set newSlide to make new slide at end${layoutPart}
          end tell
        end tell`);
        if (args.title) {
          osa(`tell application "${APP.keynote}"
            tell front document
              tell last slide
                try
                  set object text of default title item to "${escAS(args.title)}"
                end try
              end tell
            end tell
          end tell`);
        }
        if (args.body) {
          osa(`tell application "${APP.keynote}"
            tell front document
              tell last slide
                try
                  set object text of default body item to "${escAS(args.body)}"
                end try
              end tell
            end tell
          end tell`);
        }
        // Set transition
        if (args.transition) {
          try {
            osa(`tell application "${APP.keynote}"
              tell front document
                set transition properties of last slide to {transition effect:${args.transition}, transition duration:1.0}
              end tell
            end tell`);
          } catch {}
        }
        return ok(`Added slide${args.title ? `: "${args.title}"` : ""}`);
      }

      case "keynote_add_image": {
        const x = args.x || 100;
        const y = args.y || 100;
        const w = args.width || 400;
        const h = args.height || 300;
        osa(`tell application "${APP.keynote}"
          tell front document
            tell current slide
              set img to make new image with properties {file:POSIX file "${escAS(args.path)}", position:{${x}, ${y}}, width:${w}, height:${h}}
            end tell
          end tell
        end tell`);
        return ok(`Added image to current slide`);
      }

      case "keynote_add_text": {
        const x = args.x || 100;
        const y = args.y || 100;
        const w = args.width || 600;
        const h = args.height || 200;
        const sz = args.fontSize || 24;
        const font = args.font || "Helvetica Neue";
        const color = args.color || "{255, 255, 255}";
        osa(`tell application "${APP.keynote}"
          tell front document
            tell current slide
              set txt to make new text item with properties {object text:"${escAS(args.text)}", position:{${x}, ${y}}, width:${w}, height:${h}}
              set font of object text of txt to "${escAS(font)}"
              set size of object text of txt to ${sz}
            end tell
          end tell
        end tell`);
        osa(`tell application "${APP.keynote}"
          tell front document
            tell current slide
              set color of object text of last text item to {${c16(color).replace(/[{}]/g, "")}}
            end tell
          end tell
        end tell`);
        return ok(`Added styled text to current slide`);
      }

      case "keynote_add_shape": {
        const fillColor = args.fillColor || "{100, 100, 100}";
        const opacity = args.opacity || 100;
        osa(`tell application "${APP.keynote}"
          tell front document
            tell current slide
              set shp to make new shape with properties {position:{${args.x}, ${args.y}}, width:${args.width}, height:${args.height}}
              set opacity of shp to ${opacity}
            end tell
          end tell
        end tell`);
        if (args.text) {
          const textColor = args.textColor || "{255, 255, 255}";
          const textSize = args.textSize || 18;
          osa(`tell application "${APP.keynote}"
            tell front document
              tell current slide
                tell last shape
                  set object text to "${escAS(args.text)}"
                  tell object text
                    set color to {${c16(textColor).replace(/[{}]/g, "")}}
                    set size to ${textSize}
                  end tell
                end tell
              end tell
            end tell
          end tell`);
        }
        if (args.rotation) {
          osa(`tell application "${APP.keynote}"
            tell front document
              tell current slide
                set rotation of last shape to ${args.rotation}
              end tell
            end tell
          end tell`);
        }
        return ok(`Added ${args.shape} shape`);
      }

      case "keynote_set_slide_transition": {
        const dur = args.duration || 1.0;
        osa(`tell application "${APP.keynote}"
          tell front document
            set transition properties of slide ${args.slideNumber} to {transition effect:${args.effect}, transition duration:${dur}}
          end tell
        end tell`);
        return ok(`Set ${args.effect} transition on slide ${args.slideNumber}`);
      }

      case "keynote_set_presenter_notes": {
        osa(`tell application "${APP.keynote}"
          tell front document
            set presenter notes of slide ${args.slideNumber} to "${escAS(args.notes)}"
          end tell
        end tell`);
        return ok(`Set presenter notes on slide ${args.slideNumber}`);
      }

      case "keynote_export": {
        osa(`tell application "${APP.keynote}"
          export front document to POSIX file "${escAS(args.path)}" as ${args.format}
        end tell`);
        return ok(`Exported to ${args.path} as ${args.format}`);
      }

      case "keynote_play": {
        const from = args.fromSlide || 1;
        if (from === 1) {
          osa(`tell application "${APP.keynote}" to start front document`);
        } else {
          osa(`tell application "${APP.keynote}"
            tell front document
              start from slide ${from}
            end tell
          end tell`);
        }
        return ok(`Playing slideshow from slide ${from}`);
      }

      case "keynote_stop": {
        osa(`tell application "${APP.keynote}" to stop front document`);
        return ok("Slideshow stopped");
      }

      case "keynote_get_info": {
        const info = osa(`tell application "${APP.keynote}"
          set d to front document
          set n to name of d
          set sc to count of slides of d
          set cs to slide number of current slide of d
          return n & "|" & sc & "|" & cs
        end tell`);
        const [docName, slideCount, currentSlide] = info.split("|");
        return ok(JSON.stringify({ name: docName, slides: parseInt(slideCount), currentSlide: parseInt(currentSlide) }));
      }

      case "keynote_list_presets": {
        const list = Object.entries(PRESETS).map(([name, p]) => ({
          name,
          background: p.bg,
          titleColor: p.title.color,
          accentColor: p.accent,
          transition: p.transition,
        }));
        return ok(JSON.stringify(list, null, 2));
      }

      // ═══ PAGES ═══

      case "pages_build_document": {
        osa(`tell application "${APP.pages}"
          activate
          make new document
        end tell`);

        let fullText = "";

        // Title
        fullText += args.title + "\\n";
        if (args.subtitle) {
          fullText += args.subtitle + "\\n";
        }
        fullText += "\\n";

        // Sections
        for (const section of args.sections) {
          fullText += section.heading + "\\n\\n";
          if (section.body) {
            fullText += section.body + "\\n\\n";
          }
          if (section.bullets && section.bullets.length > 0) {
            for (const bullet of section.bullets) {
              fullText += "  •  " + bullet + "\\n";
            }
            fullText += "\\n";
          }
        }

        osa(`tell application "${APP.pages}"
          tell front document
            set body text to "${escAS(fullText)}"
          end tell
        end tell`);

        // Style the title
        osa(`tell application "${APP.pages}"
          tell front document
            tell body text
              set font of paragraph 1 to "Helvetica Neue Bold"
              set size of paragraph 1 to 28
            end tell
          end tell
        end tell`);

        // Style subtitle if present
        if (args.subtitle) {
          osa(`tell application "${APP.pages}"
            tell front document
              tell body text
                set font of paragraph 2 to "Helvetica Neue Light"
                set size of paragraph 2 to 16
                set color of paragraph 2 to {30840, 30840, 35980}
              end tell
            end tell
          end tell`);
        }

        if (args.savePath) {
          osa(`tell application "${APP.pages}"
            save front document in POSIX file "${escAS(args.savePath)}"
          end tell`);
        }
        if (args.exportPDF) {
          osa(`tell application "${APP.pages}"
            export front document to POSIX file "${escAS(args.exportPDF)}" as PDF
          end tell`);
        }

        return ok(`Built ${args.sections.length}-section document: "${args.title}"`);
      }

      case "pages_create": {
        osa(`tell application "${APP.pages}"
          activate
          make new document
        end tell`);
        return ok("Created new Pages document");
      }

      case "pages_open": {
        osa(`tell application "${APP.pages}"
          activate
          open POSIX file "${escAS(args.path)}"
        end tell`);
        return ok(`Opened ${args.path}`);
      }

      case "pages_add_text": {
        const font = args.font || "Helvetica";
        const size = args.fontSize || 12;
        osa(`tell application "${APP.pages}"
          tell front document
            set body text to body text & "${escAS(args.text)}" & return
          end tell
        end tell`);
        return ok(`Added text to Pages document`);
      }

      case "pages_add_image": {
        osa(`tell application "${APP.pages}"
          tell front document
            make new image with properties {file:POSIX file "${escAS(args.path)}"}
          end tell
        end tell`);
        return ok(`Added image to Pages document`);
      }

      case "pages_export": {
        osa(`tell application "${APP.pages}"
          export front document to POSIX file "${escAS(args.path)}" as ${args.format}
        end tell`);
        return ok(`Exported to ${args.path} as ${args.format}`);
      }

      case "pages_get_text": {
        const maxLen = args.maxLength || 10000;
        const text = osa(`tell application "${APP.pages}"
          tell front document
            return body text
          end tell
        end tell`);
        return ok(text.substring(0, maxLen));
      }

      // ═══ NUMBERS ═══

      case "numbers_create": {
        osa(`tell application "${APP.numbers}"
          activate
          make new document
        end tell`);
        return ok("Created new Numbers spreadsheet");
      }

      case "numbers_open": {
        osa(`tell application "${APP.numbers}"
          activate
          open POSIX file "${escAS(args.path)}"
        end tell`);
        return ok(`Opened ${args.path}`);
      }

      case "numbers_set_cell": {
        const sheet = args.sheet || 1;
        const table = args.table || 1;
        osa(`tell application "${APP.numbers}"
          tell front document
            tell sheet ${sheet}
              tell table ${table}
                set value of cell "${escAS(args.cell)}" to "${escAS(args.value)}"
              end tell
            end tell
          end tell
        end tell`);
        return ok(`Set ${args.cell} = "${args.value}"`);
      }

      case "numbers_get_cell": {
        const sheet = args.sheet || 1;
        const table = args.table || 1;
        const val = osa(`tell application "${APP.numbers}"
          tell front document
            tell sheet ${sheet}
              tell table ${table}
                return value of cell "${escAS(args.cell)}"
              end tell
            end tell
          end tell
        end tell`);
        return ok(val);
      }

      case "numbers_set_range": {
        const sheet = args.sheet || 1;
        const table = args.table || 1;
        const col = args.startCell.replace(/[0-9]/g, "");
        const row = parseInt(args.startCell.replace(/[^0-9]/g, ""));
        for (let r = 0; r < args.data.length; r++) {
          for (let c = 0; c < args.data[r].length; c++) {
            const cellCol = String.fromCharCode(col.charCodeAt(0) + c);
            const cellRef = `${cellCol}${row + r}`;
            osa(`tell application "${APP.numbers}"
              tell front document
                tell sheet ${sheet}
                  tell table ${table}
                    set value of cell "${cellRef}" to "${escAS(args.data[r][c])}"
                  end tell
                end tell
              end tell
            end tell`);
          }
        }
        return ok(`Set ${args.data.length * args.data[0].length} cells starting at ${args.startCell}`);
      }

      case "numbers_add_chart": {
        osa(`tell application "${APP.numbers}"
          tell front document
            tell active sheet
              add chart row names range "${escAS(args.dataRange)}" type "${args.type}"
            end tell
          end tell
        end tell`);
        return ok(`Added ${args.type} chart`);
      }

      case "numbers_export": {
        osa(`tell application "${APP.numbers}"
          export front document to POSIX file "${escAS(args.path)}" as ${args.format}
        end tell`);
        return ok(`Exported to ${args.path} as ${args.format}`);
      }

      // ═══ FINAL CUT PRO ═══

      case "fcp_open": {
        osa(`tell application "${APP.fcp}"
          activate
          open POSIX file "${escAS(args.path)}"
        end tell`);
        return ok(`Opened FCP library: ${args.path}`);
      }

      case "fcp_get_libraries": {
        const info = osa(`tell application "${APP.fcp}"
          set output to ""
          repeat with lib in libraries
            set output to output & name of lib & return
            repeat with ev in events of lib
              set output to output & "  Event: " & name of ev & return
              repeat with proj in projects of ev
                set output to output & "    Project: " & name of proj & return
              end repeat
            end repeat
          end repeat
          return output
        end tell`);
        return ok(info);
      }

      case "fcp_export": {
        // FCP export is best done via keyboard shortcut + Compressor
        osa(`tell application "${APP.fcp}" to activate`);
        osa(`tell application "System Events"
          keystroke "e" using {command down}
        end tell`);
        return ok(`Triggered FCP export dialog. Select preset and destination in the Share window.`);
      }

      // ═══ LOGIC PRO ═══

      case "logic_open": {
        osa(`tell application "${APP.logic}"
          activate
          open POSIX file "${escAS(args.path)}"
        end tell`);
        return ok(`Opened Logic project: ${args.path}`);
      }

      case "logic_get_info": {
        const info = osa(`tell application "${APP.logic}"
          set d to front document
          return name of d & "|" & path of d
        end tell`);
        const [docName, docPath] = info.split("|");
        return ok(JSON.stringify({ name: docName, path: docPath }));
      }

      case "logic_export": {
        // Logic bounce via keyboard shortcut
        osa(`tell application "${APP.logic}" to activate`);
        osa(`tell application "System Events"
          keystroke "b" using {command down}
        end tell`);
        return ok(`Triggered Logic Pro bounce dialog. Configure format and destination.`);
      }

      // ═══ VIDEO (ffmpeg) ═══

      case "video_convert": {
        let cmd = `ffmpeg -y -i "${args.input}"`;
        if (args.resolution) cmd += ` -s ${args.resolution}`;
        if (args.fps) cmd += ` -r ${args.fps}`;
        if (args.codec) {
          const codecs = { h264: "libx264", h265: "libx265", vp9: "libvpx-vp9", prores: "prores_ks" };
          cmd += ` -c:v ${codecs[args.codec] || args.codec}`;
        }
        if (args.quality) cmd += ` -crf ${args.quality}`;
        cmd += ` "${args.output}"`;
        execSync(cmd, { timeout: 300000 });
        return ok(`Converted: ${args.output}`);
      }

      case "video_trim": {
        let cmd = `ffmpeg -y -i "${args.input}" -ss ${args.start}`;
        if (args.end) cmd += ` -to ${args.end}`;
        if (args.duration) cmd += ` -t ${args.duration}`;
        cmd += ` -c copy "${args.output}"`;
        execSync(cmd, { timeout: 120000 });
        return ok(`Trimmed: ${args.output}`);
      }

      case "video_concat": {
        const listFile = join(WORK_DIR, `concat_${Date.now()}.txt`);
        const listContent = args.inputs.map(f => `file '${f}'`).join("\n");
        writeFileSync(listFile, listContent);
        execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${args.output}"`, { timeout: 300000 });
        return ok(`Concatenated ${args.inputs.length} files: ${args.output}`);
      }

      case "video_add_audio": {
        const replace = args.replace !== false;
        const mapFlag = replace ? "-map 0:v -map 1:a" : "-map 0 -map 1:a";
        execSync(`ffmpeg -y -i "${args.video}" -i "${args.audio}" ${mapFlag} -c:v copy -shortest "${args.output}"`, { timeout: 300000 });
        return ok(`Added audio to video: ${args.output}`);
      }

      case "video_info": {
        const output = execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${args.path}"`, {
          encoding: "utf-8",
          timeout: 10000,
        });
        const info = JSON.parse(output);
        const video = info.streams.find(s => s.codec_type === "video");
        const audio = info.streams.find(s => s.codec_type === "audio");
        return ok(JSON.stringify({
          duration: parseFloat(info.format.duration),
          size: parseInt(info.format.size),
          bitrate: parseInt(info.format.bit_rate),
          video: video ? {
            codec: video.codec_name,
            width: video.width,
            height: video.height,
            fps: video.r_frame_rate.includes("/") ? parseInt(video.r_frame_rate.split("/")[0]) / parseInt(video.r_frame_rate.split("/")[1]) : parseFloat(video.r_frame_rate),
          } : null,
          audio: audio ? {
            codec: audio.codec_name,
            sampleRate: parseInt(audio.sample_rate),
            channels: audio.channels,
          } : null,
        }, null, 2));
      }

      case "video_extract_frames": {
        mkdirSync(args.outputDir, { recursive: true });
        const fps = args.fps || 1;
        const fmt = args.format || "png";
        execSync(`ffmpeg -y -i "${args.input}" -vf fps=${fps} "${args.outputDir}/frame_%04d.${fmt}"`, { timeout: 300000 });
        const count = execSync(`ls "${args.outputDir}"/frame_*.${fmt} | wc -l`, { encoding: "utf-8" }).trim();
        return ok(`Extracted ${count} frames to ${args.outputDir}`);
      }

      // ═══ AUDIO ═══

      case "audio_convert": {
        let cmd = `ffmpeg -y -i "${args.input}"`;
        if (args.bitrate) cmd += ` -b:a ${args.bitrate}`;
        if (args.sampleRate) cmd += ` -ar ${args.sampleRate}`;
        cmd += ` "${args.output}"`;
        execSync(cmd, { timeout: 120000 });
        return ok(`Converted: ${args.output}`);
      }

      case "audio_trim": {
        let cmd = `ffmpeg -y -i "${args.input}" -ss ${args.start}`;
        if (args.end) cmd += ` -to ${args.end}`;
        cmd += ` -c copy "${args.output}"`;
        execSync(cmd, { timeout: 60000 });
        return ok(`Trimmed: ${args.output}`);
      }

      case "text_to_speech": {
        const voice = args.voice ? `-v "${args.voice}"` : "";
        const rate = args.rate ? `-r ${args.rate}` : "";
        execSync(`say ${voice} ${rate} -o "${args.output}" "${escAS(args.text)}"`, { timeout: 60000 });
        return ok(`Generated speech: ${args.output}`);
      }

      case "list_voices": {
        const output = execSync("say -v '?'", { encoding: "utf-8", timeout: 5000 });
        const voices = output.split("\n").filter(Boolean).map(line => {
          const match = line.match(/^(\S+)\s+(\S+)/);
          return match ? { name: match[1], language: match[2] } : null;
        }).filter(Boolean);
        return ok(JSON.stringify(voices, null, 2));
      }

      // ═══ IMAGE (sips) ═══

      case "image_convert": {
        let cmd = `sips -s format ${args.output.split(".").pop()}`;
        if (args.width && args.height) {
          cmd += ` -z ${args.height} ${args.width}`;
        } else if (args.width) {
          cmd += ` --resampleWidth ${args.width}`;
        } else if (args.height) {
          cmd += ` --resampleHeight ${args.height}`;
        }
        if (args.quality) cmd += ` -s formatOptions ${args.quality}`;
        cmd += ` "${args.input}" --out "${args.output}"`;
        execSync(cmd, { timeout: 30000 });
        return ok(`Converted: ${args.output}`);
      }

      case "image_info": {
        const output = execSync(`sips -g all "${args.path}"`, { encoding: "utf-8", timeout: 5000 });
        const props = {};
        output.split("\n").forEach(line => {
          const m = line.match(/^\s+(\S+):\s+(.+)/);
          if (m) props[m[1]] = m[2];
        });
        return ok(JSON.stringify(props, null, 2));
      }

      case "image_crop": {
        execSync(`sips -c ${args.height} ${args.width} --cropOffset ${args.y} ${args.x} "${args.input}" --out "${args.output}"`, { timeout: 10000 });
        return ok(`Cropped: ${args.output}`);
      }

      case "image_rotate": {
        execSync(`sips -r ${args.degrees} "${args.input}" --out "${args.output}"`, { timeout: 10000 });
        return ok(`Rotated ${args.degrees}°: ${args.output}`);
      }

      case "create_thumbnail": {
        const size = args.size || 512;
        execSync(`qlmanage -t -s ${size} -o "$(dirname "${args.output}")" "${args.input}" 2>/dev/null && mv "${args.input}.png" "${args.output}" 2>/dev/null || true`, { timeout: 10000 });
        return ok(`Thumbnail: ${args.output}`);
      }

      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e) {
    return err(`${name} failed: ${e.message}`);
  }
});

function ok(text) {
  return { content: [{ type: "text", text }] };
}

function err(text) {
  return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}

// ═══ START ═══

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[apple-creator-mcp] Server running");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
