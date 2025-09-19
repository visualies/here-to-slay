import path from 'path';
import { promises as fs } from 'fs';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCard } from '@/../servers/room-server/lib/card-service';
import { heroRegistry } from '@/../src/game/heroes';
import { monsterRegistry } from '@/../src/game/monsters';
import { modifierRegistry } from '@/../src/game/modifiers';
import { partyLeaderRegistry } from '@/../src/game/party-leaders';

const ASSET_ROOT = path.join(process.cwd(), 'servers', 'room-server', 'assets', 'card-images');

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await context.params;
  const decodedId = decodeURIComponent(rawId);
  
  // Get card data from database first
  let card = await getCard(decodedId);
  
  // If not found in database, check TypeScript registries
  if (!card) {
    const allRegistries = [
      ...heroRegistry,
      ...monsterRegistry,
      ...modifierRegistry,
      ...partyLeaderRegistry,
    ];
    card = allRegistries.find(c => c.id === decodedId) || null;
  }
  
  if (!card || !card.imagePath || card.imagePath.trim() === '') {
    // Return a default background color as SVG
    const defaultSvg = `<svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="300" fill="#F3F1E4"/>
    </svg>`;
    
    return new NextResponse(defaultSvg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const relativePath = card.imagePath;

  const filePath = path.join(ASSET_ROOT, relativePath);
  const extension = path.extname(relativePath).toLowerCase();
  const contentType = MIME_TYPES[extension] ?? 'application/octet-stream';

  try {
    const fileBuffer = await fs.readFile(filePath);
    const fileBytes = new Uint8Array(fileBuffer);

    return new NextResponse(fileBytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return NextResponse.json({ error: 'Card image not found' }, { status: 404 });
    }

    console.error('Failed to serve card image', { filePath, error });
    return NextResponse.json({ error: 'Failed to load card image' }, { status: 500 });
  }
}
