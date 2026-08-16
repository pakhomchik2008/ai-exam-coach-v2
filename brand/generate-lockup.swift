// Rasterise the horizontal Examik lockup for OG / Twitter cards.
// Web crawlers want PNG. The SVG lockup is the source of truth for the site.

import AppKit

let width = 1200.0
let height = 630.0
let markHeight = 140.0
let glyphWidth = 26.0
let glyphHeight = 46.0
let cell = 6.0
let markWidth = markHeight * (glyphWidth / glyphHeight)
let gap = markHeight * (cell / glyphHeight)

let paper = NSColor(srgbRed: 247 / 255, green: 245 / 255, blue: 240 / 255, alpha: 1)
let purple = NSColor(srgbRed: 137 / 255, green: 33 / 255, blue: 245 / 255, alpha: 1)
let ink = NSColor(srgbRed: 20 / 255, green: 24 / 255, blue: 34 / 255, alpha: 1)

let font = NSFont(name: "IowanOldStyle-Bold", size: 110)
  ?? NSFont(name: "Palatino-Bold", size: 110)
  ?? NSFont(name: "Georgia-Bold", size: 110)
  ?? NSFont.systemFont(ofSize: 110, weight: .semibold)

let word = NSAttributedString(string: "Examik", attributes: [
  .font: font,
  .foregroundColor: ink,
  .kern: -3.3,
])
let wordSize = word.size()
let lockupWidth = markWidth + gap + wordSize.width
let originX = (width - lockupWidth) / 2
let originY = (height - markHeight) / 2

let image = NSImage(size: NSSize(width: width, height: height))
image.lockFocus()
paper.setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)).fill()

let cells = [
  (0, 0), (1, 0), (2, 0),
  (0, 1),
  (0, 2), (1, 2), (2, 2),
  (0, 3),
  (0, 4), (1, 4), (2, 4),
]
let scale = markHeight / glyphHeight
for (col, row) in cells {
  let x = originX + Double(col) * (10.0 * scale)
  let ySvg = Double(row) * (10.0 * scale)
  let side = cell * scale
  let y = height - originY - ySvg - side
  purple.setFill()
  NSBezierPath(rect: NSRect(x: x, y: y, width: side, height: side)).fill()
}

let textX = originX + markWidth + gap
let textY = height - originY - (markHeight + wordSize.height) / 2
word.draw(at: NSPoint(x: textX, y: textY))
image.unlockFocus()

guard
  let tiff = image.tiffRepresentation,
  let rep = NSBitmapImageRep(data: tiff),
  let png = rep.representation(using: .png, properties: [:])
else {
  fputs("lockup: failed to encode PNG\n", stderr)
  exit(1)
}

let out = CommandLine.arguments.count > 1
  ? CommandLine.arguments[1]
  : "public/brand/lockup-og.png"
try png.write(to: URL(fileURLWithPath: out))
print("wrote \(out)")
