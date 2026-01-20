// Migration script: Run this in browser console on localhost:5175
// Copy everything below and paste into the console

(async function migrateToSupabase() {
  const SUPABASE_URL = 'https://pkhossmmicxpjczqsmpf.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBraG9zc21taWN4cGpjenFzbXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MjkwMDYsImV4cCI6MjA4NDUwNTAwNn0.q1c3HIbe9qL79LPfnUspL8RT0DIA6-5Yt1-WlZC3_8Y';

  // Helper to make Supabase REST API calls
  async function supabaseInsert(table, data) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to insert into ${table}: ${err}`);
    }
    return true;
  }

  // Open IndexedDB
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('weekly-routines-db', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Read all from a store
  function readAll(db, storeName) {
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
      } catch (e) {
        // Store might not exist
        resolve([]);
      }
    });
  }

  // Convert camelCase to snake_case
  function toSnake(obj) {
    const result = {};
    for (const key in obj) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      result[snakeKey] = obj[key];
    }
    return result;
  }

  console.log('Starting migration...');

  try {
    const db = await openDB();
    console.log('Opened IndexedDB');

    // Migrate each table
    const tables = [
      { idb: 'routines', supabase: 'routines' },
      { idb: 'completions', supabase: 'completions' },
      { idb: 'todos', supabase: 'todos' },
      { idb: 'sections', supabase: 'sections' },
      { idb: 'lifeGoals', supabase: 'life_goals' },
      { idb: 'yearlyGoals', supabase: 'yearly_goals' },
      { idb: 'quarterlyGoals', supabase: 'quarterly_goals' },
      { idb: 'journalEntries', supabase: 'journal_entries' },
      { idb: 'readingNotes', supabase: 'reading_notes' },
      { idb: 'friends', supabase: 'friends' },
      { idb: 'friendConnections', supabase: 'friend_connections' },
      { idb: 'cookieJar', supabase: 'cookie_jar' }
    ];

    for (const { idb, supabase } of tables) {
      const data = await readAll(db, idb);
      if (data.length > 0) {
        console.log(`Migrating ${data.length} items from ${idb}...`);
        for (const item of data) {
          const snakeItem = toSnake(item);
          await supabaseInsert(supabase, snakeItem);
        }
        console.log(`✓ Migrated ${idb}`);
      } else {
        console.log(`- No data in ${idb}`);
      }
    }

    console.log('\n✅ Migration complete! Your data is now in Supabase.');
    console.log('You can close this tab and use your Vercel deployment.');

  } catch (error) {
    console.error('Migration failed:', error);
  }
})();
