import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  
  // Map hero IDs to their image files
  const imageMap: Record<string, string> = {
    'bard_greedy_cheeks.png': 'bard_greedy_cheeks.png',
    'bard_dogy_dealer.png': 'bard_dogy_dealer.png',
    'bard_mellow_dee.png': 'bard_mellow_dee.png',
    'bard_tipsy_tootie.png': 'bard_tipsy_tootie.png',
    'wizard_buttons.png': 'wizard_buttons.png',
    'wizard_fluffy.png': 'wizard_fluffy.png',
    'wizard_hopper.png': 'wizard_hopper.png',
    'wizard_snowball.png': 'wizard_snowball.png',
    'wizard_spooky.png': 'wizard_spooky.png',
    'wizard_whiskers.png': 'wizard_whiskers.png',
  };
  
  const fileName = imageMap[id] || 'heroBack.png'; // Default fallback
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