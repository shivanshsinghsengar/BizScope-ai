with open('backend/server.js', 'r', encoding='utf-8') as f:
    code = f.read()

fixes = 0

# ══════════════════════════════════════════════════════════════
# FIX 1: SSE route — deep analysis mode
# TomTom nearbySearch + 2 batches + OSM all run in parallel
# Then a second OSM pass with wider radius for more data
# ══════════════════════════════════════════════════════════════

OLD1 = """    // Step 2: Fetch businesses — TomTom fast (8s), OSM slower (15s), run in parallel
    send('fetch', 'Scanning businesses nearby...', 'Fetching from TomTom + OpenStreetMap', 30);
    const [tomtomBusinesses, osmBusinesses, manualBusinesses] = await Promise.all([
      fetchTomTomBusinesses(latitude, longitude, 5000),
      fetchRealBusinesses(latitude, longitude, 5000), // uses default 28s timeout
      ManualBusiness.findAll().then(all => all.filter(b =>
        b.latitude && b.longitude &&
        Math.sqrt(Math.pow(b.latitude - latitude, 2) + Math.pow(b.longitude - longitude, 2)) < 0.08
      )),
    ]);"""

NEW1 = """    // Step 2: Fetch businesses — TomTom + OSM + Manual all in parallel
    send('fetch', 'Scanning businesses nearby...', 'Fetching from TomTom + OpenStreetMap', 30);
    const [tomtomBusinesses, osmBusinesses, manualBusinesses] = await Promise.all([
      fetchTomTomBusinesses(latitude, longitude, 5000),
      fetchRealBusinesses(latitude, longitude, 5000),
      ManualBusiness.findAll().then(all => all.filter(b =>
        b.latitude && b.longitude &&
        Math.sqrt(Math.pow(b.latitude - latitude, 2) + Math.pow(b.longitude - longitude, 2)) < 0.08
      )),
    ]);

    send('fetch', `Found ${tomtomBusinesses.length + osmBusinesses.length} raw businesses, scanning deeper...`, 'Running deep area scan', 45);

    // Second OSM pass — wider radius to catch businesses on the edges
    const osmWider = await fetchRealBusinesses(latitude, longitude, 8000).catch(() => []);"""

if OLD1 in code:
    code = code.replace(OLD1, NEW1, 1)
    fixes += 1
    print("✅ Fix1: SSE second OSM pass added")
else:
    print("❌ Fix1 not found")

# ══════════════════════════════════════════════════════════════
# FIX 2: SSE — merge osmWider into businesses array
# ══════════════════════════════════════════════════════════════
OLD2 = """    // Track raw source counts BEFORE dedup — OSM gets deduped out by TomTom otherwise
    const rawSourceCounts = {};
    if (tomtomBusinesses.length) rawSourceCounts.tomtom = tomtomBusinesses.length;
    if (osmBusinesses.length)    rawSourceCounts.osm    = osmBusinesses.length;
    if (manualBusinesses.length) rawSourceCounts.manual = manualBusinesses.length;

    const seen = new Set();
    let businesses = [...tomtomBusinesses, ...osmBusinesses,
      ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
    ].filter(b => {
      // Dedup by name+position — NOT category+position (that drops legit businesses at same location)
      const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
      const posKey = `${Math.round(b.latitude * 2000)}_${Math.round(b.longitude * 2000)}`;
      const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${b.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Retry with wider radius if empty
    if (businesses.length === 0) {
      send('fetch', 'Expanding search radius...', 'Trying 5km radius', 40);
      const wider = await fetchRealBusinesses(latitude, longitude, 5000);
      const seen2 = new Set();
      businesses = [...wider,
        ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
      ].filter(b => {
        const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
        const posKey = `${Math.round(b.latitude * 2000)}_${Math.round(b.longitude * 2000)}`;
        const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${b.category}`;
        if (seen2.has(key)) return false;"""

NEW2 = """    // Track raw source counts BEFORE dedup
    const rawSourceCounts = {};
    if (tomtomBusinesses.length) rawSourceCounts.tomtom = tomtomBusinesses.length;
    if (osmBusinesses.length + osmWider.length) rawSourceCounts.osm = osmBusinesses.length + osmWider.length;
    if (manualBusinesses.length) rawSourceCounts.manual = manualBusinesses.length;

    const seen = new Set();
    let businesses = [...tomtomBusinesses, ...osmBusinesses, ...osmWider,
      ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
    ].filter(b => {
      // Dedup by name+position — NOT category+position
      const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
      const posKey = `${Math.round(b.latitude * 2000)}_${Math.round(b.longitude * 2000)}`;
      const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${b.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Retry with wider radius if still empty
    if (businesses.length === 0) {
      send('fetch', 'Expanding search radius...', 'Trying wider area', 40);
      const wider = await fetchRealBusinesses(latitude, longitude, 8000);
      const seen2 = new Set();
      businesses = [...wider,
        ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),
      ].filter(b => {
        const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
        const posKey = `${Math.round(b.latitude * 2000)}_${Math.round(b.longitude * 2000)}`;
        const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${b.category}`;
        if (seen2.has(key)) return false;"""

if OLD2 in code:
    code = code.replace(OLD2, NEW2, 1)
    fixes += 1
    print("✅ Fix2: SSE osmWider merged into businesses")
else:
    print("❌ Fix2 not found")

# ══════════════════════════════════════════════════════════════
# FIX 3: Better SSE progress messages — show real counts
# ══════════════════════════════════════════════════════════════
OLD3 = """    const usingEstimated = businesses.some(b => b.isMock);
    send('count', `Found ${businesses.length} businesses nearby`, usingEstimated ? 'Using estimated data — live sources unavailable' : 'Analyzing shops, restaurants & more', 55);
    // Step 3: Category stats
    send('score', 'Calculating market scores...', 'Running competition analysis', 65);"""

NEW3 = """    const usingEstimated = businesses.some(b => b.isMock);
    const osmTotal = (rawSourceCounts.osm || 0);
    const ttTotal = (rawSourceCounts.tomtom || 0);
    send('count', `Found ${businesses.length} businesses nearby`,
      usingEstimated
        ? 'Using estimated data — live sources unavailable'
        : `TomTom: ${ttTotal} · OSM: ${osmTotal} · Unique after dedup: ${businesses.length}`,
      55);
    // Step 3: Category stats
    send('score', 'Calculating market scores...', 'Running competition analysis', 65);"""

if OLD3 in code:
    code = code.replace(OLD3, NEW3, 1)
    fixes += 1
    print("✅ Fix3: Better progress messages with source counts")
else:
    print("❌ Fix3 not found")

# ══════════════════════════════════════════════════════════════
# FIX 4: Frontend — increase SSE timeout from 30s to 90s
# "take your time" — user is ok waiting for best results
# ══════════════════════════════════════════════════════════════
with open('frontend/hooks/useAnalysis.js', 'r', encoding='utf-8') as f:
    hook = f.read()

OLD4 = 'const timeout = setTimeout(() => { evtSource.close(); resolve(null); }, 30000);'
NEW4 = 'const timeout = setTimeout(() => { evtSource.close(); resolve(null); }, 90000);'
if OLD4 in hook:
    hook = hook.replace(OLD4, NEW4, 1)
    with open('frontend/hooks/useAnalysis.js', 'w', encoding='utf-8') as f:
        f.write(hook)
    fixes += 1
    print("✅ Fix4: useAnalysis SSE timeout 30s→90s")

# ══════════════════════════════════════════════════════════════
# FIX 5: Frontend index.js — increase SSE timeout from 30s to 90s
# ══════════════════════════════════════════════════════════════
with open('frontend/pages/index.js', 'r', encoding='utf-8') as f:
    idx_code = f.read()

# Find the EventSource timeout in handleAnalyze
if 'evtSource.onerror = () => {' in idx_code:
    # Add a timeout to the SSE in index.js if not present
    OLD5 = """      await new Promise((resolve, reject) => {
        evtSource.onmessage = (e) => {"""
    NEW5 = """      // 90s timeout — deep analysis takes time
      const sseTimeout = setTimeout(() => {
        evtSource.close();
        reject(new Error('Analysis timed out. Please try again.'));
      }, 90000);

      await new Promise((resolve, reject) => {
        evtSource.onmessage = (e) => {"""
    if OLD5 in idx_code and 'sseTimeout' not in idx_code:
        idx_code = idx_code.replace(OLD5, NEW5, 1)
        # Also clear timeout on success
        OLD5b = """              evtSource.close();
              const data = payload.data;
              if (data.error) { reject(new Error(data.error)); return; }"""
        NEW5b = """              evtSource.close();
              clearTimeout(sseTimeout);
              const data = payload.data;
              if (data.error) { reject(new Error(data.error)); return; }"""
        idx_code = idx_code.replace(OLD5b, NEW5b, 1)
        with open('frontend/pages/index.js', 'w', encoding='utf-8') as f:
            f.write(idx_code)
        fixes += 1
        print("✅ Fix5: index.js SSE timeout 90s")

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(code)

print(f"\nTotal: {fixes} fixes applied")
print("\n=== EXPECTED RESULTS ===")
print("Analysis time:    15-25s (deep scan)")
print("Business count:   400-800 unique")
print("Categories:       12-18")
print("Sources shown:    TomTom X · OSM Y · Unique Z")
