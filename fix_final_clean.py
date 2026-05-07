with open('backend/server.js', 'r', encoding='utf-8') as f:
    code = f.read()

print(f"File: {code.count(chr(10))} lines")

# ══════════════════════════════════════════════════════════════
# STEP 1: Verify current state — what's already in the file
# ══════════════════════════════════════════════════════════════
print("\n=== CURRENT STATE ===")
print("mergeSmarter exists:", 'const mergeSmarter' in code)
print("batch1/batch2 exists:", 'batch1' in code)
print("topCats exists:", 'topCats' in code)
print("Promise.race for OSM:", 'Promise.race' in code)
print("osmWider exists:", 'osmWider' in code)
print("rawSourceCounts exists:", 'rawSourceCounts' in code)

# ══════════════════════════════════════════════════════════════
# STEP 2: Add mergeSmarter function (if not present)
# ══════════════════════════════════════════════════════════════
if 'const mergeSmarter' not in code:
    MERGE_FN = '''
// ── Smart merge: compare TomTom vs OSM per-category, best source wins ──
const mergeSmarter = (tomtomList = [], osmList = []) => {
  const dedupList = (list) => {
    const seen = new Set();
    return list.filter(b => {
      if (!b.latitude || !b.longitude) return false;
      const nameKey = (b.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
      const posKey = `${Math.round(b.latitude * 2000)}_${Math.round(b.longitude * 2000)}`;
      const key = nameKey.length > 2 ? `${nameKey}_${posKey}` : `${posKey}_${b.category}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const ttUnique = dedupList(tomtomList);
  const osmUnique = dedupList(osmList);

  // Count per category
  const ttCats = ttUnique.reduce((a, b) => { a[b.category] = (a[b.category]||0)+1; return a; }, {});
  const osmCats = osmUnique.reduce((a, b) => { a[b.category] = (a[b.category]||0)+1; return a; }, {});
  const allCats = new Set([...Object.keys(ttCats), ...Object.keys(osmCats)]);

  const merged = [];
  allCats.forEach(cat => {
    if ((ttCats[cat]||0) >= (osmCats[cat]||0)) {
      merged.push(...ttUnique.filter(b => b.category === cat));
    } else {
      merged.push(...osmUnique.filter(b => b.category === cat));
    }
  });

  const final = dedupList(merged);
  console.log(`[merge] TomTom:${ttUnique.length} OSM:${osmUnique.length} → Merged:${final.length} (${allCats.size} categories)`);
  return final;
};

'''
    code = code.replace('const fetchRealBusinesses', MERGE_FN + 'const fetchRealBusinesses', 1)
    print("\n✅ mergeSmarter added")

# ══════════════════════════════════════════════════════════════
# STEP 3: Find and replace SSE dedup block with mergeSmarter
# ══════════════════════════════════════════════════════════════
lines = code.split('\n')
sse_start = None
post_start = None

for i, l in enumerate(lines):
    if 'const seen = new Set();' in l and i > 2400:
        if sse_start is None:
            sse_start = i
        elif post_start is None:
            post_start = i
            break

print(f"\nSSE dedup at line: {sse_start+1 if sse_start else 'NOT FOUND'}")
print(f"POST dedup at line: {post_start+1 if post_start else 'NOT FOUND'}")

# Find end of each dedup block (the closing });)
def find_block_end(lines, start):
    for i in range(start, min(start+20, len(lines))):
        if lines[i].strip() == '});':
            return i
    return start + 12

if sse_start:
    sse_end = find_block_end(lines, sse_start)
    print(f"SSE block: lines {sse_start+1} to {sse_end+1}")
    
    # Check if osmWider is available at this point
    has_osm_wider = any('osmWider' in lines[j] for j in range(max(0,sse_start-20), sse_start))
    
    new_sse = [
        '    // Smart merge: per-category, best source wins',
        '    const allOsmData = [...(osmBusinesses||[]), ...(osmWider||[])];',
        '    let businesses = [',
        '      ...mergeSmarter(tomtomBusinesses, allOsmData),',
        '      ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),',
        '    ];',
    ]
    lines[sse_start:sse_end+1] = new_sse
    print("✅ SSE dedup replaced with mergeSmarter")

# Recalculate post_start after SSE replacement
code = '\n'.join(lines)
lines = code.split('\n')

post_start = None
for i, l in enumerate(lines):
    if 'const seen = new Set();' in l and i > 2400:
        post_start = i
        break

if post_start:
    post_end = find_block_end(lines, post_start)
    print(f"POST block: lines {post_start+1} to {post_end+1}")
    
    new_post = [
        '    // Smart merge: per-category, best source wins',
        '    let businesses = [',
        '      ...mergeSmarter(tomtomBusinesses, osmBusinesses||[]),',
        '      ...manualBusinesses.map(b => ({ name: b.name, category: b.category, rating: 4.0, reviewCount: 50, address: b.address, phone: b.phone, website: b.website, latitude: b.latitude, longitude: b.longitude, isManual: true })),',
        '    ];',
    ]
    lines[post_start:post_end+1] = new_post
    print("✅ POST dedup replaced with mergeSmarter")

code = '\n'.join(lines)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(code)

# ══════════════════════════════════════════════════════════════
# FINAL VERIFICATION — start server and check for syntax
# ══════════════════════════════════════════════════════════════
with open('backend/server.js', 'r', encoding='utf-8') as f:
    v = f.read()

print("\n=== FINAL VERIFICATION ===")
print("mergeSmarter defined:", 'const mergeSmarter' in v)
print("SSE uses mergeSmarter:", 'mergeSmarter(tomtomBusinesses, allOsmData)' in v)
print("POST uses mergeSmarter:", 'mergeSmarter(tomtomBusinesses, osmBusinesses' in v)
print("No broken seen blocks:", v.count('const seen = new Set();') == 0)
print(f"Total lines: {v.count(chr(10))}")
print("\n✅ Done!")
