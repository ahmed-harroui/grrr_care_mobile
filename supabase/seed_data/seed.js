#!/usr/bin/env node

/**
 * GRRR Care Knowledge Base Seeder
 *
 * Usage:
 *   node seed.js
 *
 * Make sure to set environment variables first:
 *   SUPABASE_URL=your_url
 *   SUPABASE_SERVICE_ROLE_KEY=your_key
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function loadJSON(filename) {
  const filePath = path.join(__dirname, `${filename}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function seed() {
  try {
    console.log('🌱 Starting GRRR Care Knowledge Base seed...\n');

    // 1. Load sources
    console.log('📚 Loading sources...');
    const sources = await loadJSON('sources');
    const { error: sourcesError, data: sourcesData } = await supabase
      .from('knowledge_sources')
      .insert(sources);

    if (sourcesError) {
      throw new Error(`Sources error: ${sourcesError.message}`);
    }
    console.log(`✅ Loaded ${sources.length} sources\n`);

    // 2. Load documents
    console.log('📖 Loading documents...');
    const documents = await loadJSON('documents');
    const { error: docsError, data: docsData } = await supabase
      .from('knowledge_documents')
      .insert(documents);

    if (docsError) {
      throw new Error(`Documents error: ${docsError.message}`);
    }
    console.log(`✅ Loaded ${documents.length} documents\n`);

    // 3. Load chunks
    console.log('🧩 Loading chunks...');
    const chunks = await loadJSON('chunks');
    const { error: chunksError, data: chunksData } = await supabase
      .from('knowledge_chunks')
      .insert(chunks);

    if (chunksError) {
      throw new Error(`Chunks error: ${chunksError.message}`);
    }
    console.log(`✅ Loaded ${chunks.length} chunks\n`);

    // 4. Load emergency guides
    console.log('🚨 Loading emergency guides...');
    const emergencyGuides = await loadJSON('emergency_guides');
    const { error: emergencyError, data: emergencyData } = await supabase
      .from('emergency_guides')
      .insert(emergencyGuides);

    if (emergencyError) {
      throw new Error(`Emergency guides error: ${emergencyError.message}`);
    }
    console.log(`✅ Loaded ${emergencyGuides.length} emergency guides\n`);

    // 5. Verify data
    console.log('🔍 Verifying data...');
    const sourcesCount = await supabase
      .from('knowledge_sources')
      .select('id', { count: 'exact' });

    const docsCount = await supabase
      .from('knowledge_documents')
      .select('id', { count: 'exact' });

    const chunksCount = await supabase
      .from('knowledge_chunks')
      .select('id', { count: 'exact' });

    const emergencyCount = await supabase
      .from('emergency_guides')
      .select('id', { count: 'exact' });

    console.log(`
📊 Knowledge Base Summary:
   • Sources: ${sourcesCount.count}
   • Documents: ${docsCount.count}
   • Chunks: ${chunksCount.count}
   • Emergency Guides: ${emergencyCount.count}
    `);

    console.log('🎉 Seeding complete!\n');
    console.log('🚀 Ready to test:');
    console.log('   1. Start the app');
    console.log('   2. Select one of your pets (Luna, Oscar, Twitter, Bagera, Spirit)');
    console.log('   3. Go to Chat');
    console.log('   4. Ask about nutrition, health, or emergencies');
    console.log('   5. Chat will now answer from the Knowledge Base! 🐾\n');

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
