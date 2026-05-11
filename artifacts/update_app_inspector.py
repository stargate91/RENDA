import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add import
text = re.sub(r"import DiscoveryConsole from '\./components/Discovery/DiscoveryConsole';\n", "import DiscoveryConsole from './components/Discovery/DiscoveryConsole';\nimport InspectorPanel from './components/Discovery/InspectorPanel';\n", text)

# Remove imageIndex state
text = re.sub(r'  const \[imageIndex, setImageIndex\] = useState\(0\);\n', '', text)

# Remove useEffect for imageIndex
useEffect_pattern = r'  useEffect\(\(\) => \{\n    setImageIndex\(0\);\n  \}, \[selectedItem\]\);\n\n'
text = re.sub(useEffect_pattern, '', text)

# Replace Inspector panel block
start_marker = "{view === 'discovery' && (\n        <div className=\"inspector-panel\">\n"
end_marker = "        </div>\n      )}\n\n      {showWelcomeModal && ("

def replacer(match):
    return """{view === 'discovery' && (
        <div className="inspector-panel">
          <InspectorPanel selectedItem={selectedItem} fetchFullMetadata={fetchFullMetadata} T={T} />
        </div>
      )}

      {showWelcomeModal && ("""

text = re.sub(r"\{view === 'discovery' && \(\n        <div className=\"inspector-panel\">.*?        </div>\n      \)\}\n\n      \{showWelcomeModal && \(", replacer, text, flags=re.DOTALL)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated App.jsx successfully.")
