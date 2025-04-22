import * as PImage from "pureimage";
import * as fs from "fs";
import axios from "axios";
import sharp from "sharp";

// Increased resolution
const WIDTH = 1600;
const HEIGHT = 800;

export class Quote {
  private quote: string;
  private author: string;
  private pfpUrl: string;

  constructor(quote: string, author: string, pfpUrl: string) {
    this.quote = quote;
    this.author = author;
    this.pfpUrl = pfpUrl;
  }

  async genQuote() {
    const imgPath = `outs/out${Date.now()}.png`;

    // Create a high-resolution canvas
    const canvas = PImage.make(WIDTH, HEIGHT);
    const ctx = canvas.getContext("2d");

    // Fill the background with black
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Download and decode the profile picture
    const pfpPath = `outs/pfp${Date.now()}.png`;
    await downloadImage(this.pfpUrl, pfpPath);
    console.log("Image downloaded");

    const img = await PImage.decodePNGFromStream(fs.createReadStream(pfpPath));
    console.log("Image loaded");

    // --- Positioning the Profile Picture ---
    // Scale the image to fill the left half, preserving its aspect ratio.
    const maxImgWidth = WIDTH / 2;
    const maxImgHeight = HEIGHT;
    const scaleFactor = Math.min(
      maxImgWidth / img.width,
      maxImgHeight / img.height
    );
    const drawWidth = img.width * scaleFactor;
    const drawHeight = img.height * scaleFactor;

    // Draw the image flush to the left, vertically centered.
    const drawX = 0;
    const drawY = (HEIGHT - drawHeight) / 2;
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );

    // --- Extended Fade-Out Effect ---
    // Apply a fade effect over 30% of the image's width
    const fadeWidth = drawWidth * 0.5;
    for (let i = 0; i < fadeWidth; i++) {
      const alpha = i / fadeWidth;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(drawX + drawWidth - fadeWidth + i, drawY, 1, drawHeight);
    }

    // Delete the temporary profile picture file
    fs.unlinkSync(pfpPath);

    // --- Draw Quote and Author Text ---
    // Ensure the font is available (Times New Roman) by registering it
    const font = PImage.registerFont("Times New Roman.ttf", "Times New Roman");
    font.loadSync();

    // Use larger font sizes to match the high resolution
    const quoteFontSize = 48;
    const authorFontSize = 36;
    ctx.fillStyle = "white";
    ctx.font = `${quoteFontSize}pt 'Times New Roman'`;

    // Define the text area on the right half of the canvas
    const textX = WIDTH / 2 + 20;
    const maxTextWidth = WIDTH / 2 - 40;
    const textStartY = 100;

    // Wrap text function: it draws text while breaking lines as needed.
    function wrapText(
      context: any,
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      lineHeight: number
    ) {
      const words = text.split(" ");
      let line = "";
      let currentY = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + " ";
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          context.fillText(line, x, currentY);
          line = words[n] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      context.fillText(line, x, currentY);
      return currentY;
    }

    // Draw the quote text
    const lastY = wrapText(
      ctx,
      `"${this.quote}"`,
      textX,
      textStartY,
      maxTextWidth,
      quoteFontSize + 12
    );

    // Draw the author text below the quote
    ctx.font = `${authorFontSize}pt 'Times New Roman'`;
    ctx.fillText(`- ${this.author}`, textX, lastY + authorFontSize);

    // Save the final image
    await PImage.encodePNGToStream(canvas, fs.createWriteStream(imgPath));
    console.log("Quote image generated at", imgPath);

    return imgPath;
  }

  /**
   * Deletes the generated PNG file.
   * @param imgPath - Path of the image file to delete.
   */
  deleteFile(imgPath: string) {
    fs.unlinkSync(imgPath);
  }
}

async function downloadImage(url: string, path: string) {
  const response = await axios({
    url,
    responseType: "arraybuffer",
  });

  // Convert the image to PNG using sharp and apply a grayscale conversion
  await sharp(response.data).png().grayscale(true).toFile(path);

  console.log("Image downloaded and converted to PNG successfully");
}

export default Quote;
