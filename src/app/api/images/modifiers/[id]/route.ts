import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  
  // Map modifier IDs to their image files
  const imageMap: Record<string, string> = {
    'modifier-001.png': 'modifier.png',
    'modifier-plus-3.png': 'modifier_plus_3.png',
    'modifier-minus-3.png': 'modifier_minus_3.png',
    'modifier-plus-4.png': 'modifier_plus_4.png',
  };
  
  const fileName = imageMap[id] || 'modifier.png'; // Default fallback
  const imagePath = path.join(process.cwd(), 'public', fileName);
  
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Image not found', { status: 404 });
  }
}