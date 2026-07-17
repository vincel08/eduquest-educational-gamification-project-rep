import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { PDFParse } from 'pdf-parse';
import AppError from '../utils/AppError.js';

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.pptx', '.ppt', '.txt']);
const MIN_TEXT_LENGTH = 40;

function normalizeText(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function assertReadableText(text, sourceLabel) {
  const cleaned = normalizeText(text);
  if (!cleaned || cleaned.length < MIN_TEXT_LENGTH) {
    throw new AppError(
      `Could not extract enough readable text from ${sourceLabel}. The document may be empty, image-only, or unsupported.`,
      400
    );
  }
  return cleaned;
}

async function extractPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result?.text || '';
  } finally {
    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }
  }
}

async function extractDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result?.value || '';
}

async function extractPptx(filePath) {
  const buffer = await fs.readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const slideNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = Number(a.match(/slide(\d+)/i)?.[1] || 0);
      const numB = Number(b.match(/slide(\d+)/i)?.[1] || 0);
      return numA - numB;
    });

  if (!slideNames.length) {
    throw new AppError('No slides found in the PowerPoint file', 400);
  }

  const parts = [];
  for (const slideName of slideNames) {
    const xml = await zip.files[slideName].async('string');
    const matches = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)];
    const slideText = matches
      .map((match) => match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'"))
      .join(' ')
      .trim();
    if (slideText) parts.push(slideText);
  }

  return parts.join('\n\n');
}

async function extractTxt(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function extractLegacyPpt(filePath) {
  // Binary .ppt is not reliably parseable without native tools.
  // Attempt a crude string scrape; fail clearly if unusable.
  const buffer = await fs.readFile(filePath);
  const asLatin1 = buffer.toString('latin1');
  const chunks = asLatin1.match(/[\x20-\x7E]{4,}/g) || [];
  const text = chunks.join(' ');
  if (normalizeText(text).length < MIN_TEXT_LENGTH) {
    throw new AppError(
      'Legacy .ppt files are limited. Please convert the presentation to .pptx and upload again.',
      400
    );
  }
  return text;
}

const DocumentExtractService = {
  getSupportedExtensions() {
    return [...SUPPORTED_EXTENSIONS];
  },

  isSupportedExtension(filename) {
    const ext = path.extname(filename || '').toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
  },

  async extractFromFile(file) {
    if (!file?.path) {
      throw new AppError('No file uploaded', 400);
    }

    const originalName = file.originalname || path.basename(file.path);
    const ext = path.extname(originalName).toLowerCase();

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      throw new AppError(
        `Unsupported file type "${ext}". Allowed: PDF, DOCX, PPTX, PPT, TXT.`,
        400
      );
    }

    let rawText = '';
    try {
      if (ext === '.pdf') {
        rawText = await extractPdf(file.path);
      } else if (ext === '.docx') {
        rawText = await extractDocx(file.path);
      } else if (ext === '.pptx') {
        rawText = await extractPptx(file.path);
      } else if (ext === '.ppt') {
        rawText = await extractLegacyPpt(file.path);
      } else if (ext === '.txt') {
        rawText = await extractTxt(file.path);
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        `Failed to extract text from ${originalName}: ${error.message}`,
        400
      );
    }

    const extractedText = assertReadableText(rawText, originalName);

    return {
      originalFileName: originalName,
      uploadedFilePath: file.path,
      mimeType: file.mimetype || null,
      size: file.size || null,
      extractedText,
      characterCount: extractedText.length,
    };
  },
};

export default DocumentExtractService;
