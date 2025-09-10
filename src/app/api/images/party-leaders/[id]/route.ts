import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  // Map party leader IDs to their image files
  const imageMap: Record<string, string> = {
    'partyleader_figher.png': 'partyleader_figher.png',
    'partyleader_bard.png': 'partyleader_bard.png',
    'partyleader_ranger.png': 'partyleader_ranger.png',
    'partyleader_thief.png': 'partyleader_thief.png',
  };
  
  const fileName = imageMap[id] || 'partyleader_figher.png'; // Default fallback
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