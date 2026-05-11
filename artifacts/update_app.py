import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add import
text = re.sub(r"import MetadataModal from '\./components/Modals/MetadataModal';\n", "import MetadataModal from './components/Modals/MetadataModal';\nimport DiscoveryConsole from './components/Discovery/DiscoveryConsole';\n", text)

# 2. Remove states
text = re.sub(r'  const \[activeTab, setActiveTab\] = useState\([^)]*\);\n', '', text)
text = re.sub(r'  const \[extraSubTab, setExtraSubTab\] = useState\([^)]*\);\n', '', text)
text = re.sub(r'  const \[sortKey, setSortKey\] = useState\([^)]*\);\n', '', text)
text = re.sub(r'  const \[sortDir, setSortDir\] = useState\([^)]*\);[^\n]*\n', '', text)
text = re.sub(r'  const \[searchQuery, setSearchQuery\] = useState\([^)]*\);\n', '', text)

# 3. Remove useEffect for activeTab
useEffect_pattern = r'  useEffect\(\(\) => \{\n    if \(activeTab === \'extras\'\) \{\n      setExtraSubTab\(\'video\'\);\n    \}\n    setSortKey\(null\);\n    setSortDir\(\'asc\'\);\n    setSearchQuery\(\'\'\);\n  \}, \[activeTab\]\);\n'
text = re.sub(useEffect_pattern, '', text)

# 4. Remove activeTab logic from fetchDiscovery
fetch_logic_pattern = r'      // Auto-switch to first non-empty tab if manual is empty\n      if \(data\.manual\.length === 0\) \{\n        if \(data\.movies\.length > 0\) setActiveTab\(\'movies\'\);\n        else if \(data\.series\.length > 0\) setActiveTab\(\'series\'\);\n      \}\n'
text = re.sub(fetch_logic_pattern, '', text)

# 5. Replace view === 'discovery' div block with component
def replacer(match):
    return """{view === 'discovery' && (
          <DiscoveryConsole 
            items={items}
            loading={loading}
            handleScan={handleScan}
            fetchFullMetadata={fetchFullMetadata}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
          />
        )}"""

text = re.sub(r"\{view === 'discovery' && \(\n          <div className=\"discovery-view\">.*?            </div>\n          </div>\n        \)\}", replacer, text, flags=re.DOTALL)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done modifying App.jsx')
