import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  
  // Map monster IDs to their image files
  const imageMap: Record<string, string> = {
    'monster_anuran_cauldron.png': 'monster_anuran_cauldron.png',
    'monster_crowned_serpent.png': 'monster_crowned_serpent.png',
    'monster_mega_slime.png': 'monster_mega_slime.png',
  };
  
  const fileName = imageMap[id] || 'monsterBackBlack.png'; // Default fallback
  const imagePath = path.join(process.cwd(), 'public', fileName);
  
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new NextResponse('Image not found', { status: 404 });
  }
}