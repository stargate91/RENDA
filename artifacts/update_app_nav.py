import re

with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Add imports
text = re.sub(r"import InspectorPanel from '\./components/Discovery/InspectorPanel';\n", "import InspectorPanel from './components/Discovery/InspectorPanel';\nimport Sidebar from './components/Navigation/Sidebar';\nimport GlobalProgress from './components/Navigation/GlobalProgress';\n", text)

# Remove getWeightedPercent
text = re.sub(r'  const getWeightedPercent = \(\) => \{\n.*?    \}\n  \};\n', '', text, flags=re.DOTALL)

# Remove calculateETA
text = re.sub(r'  const calculateETA = \(\) => \{\n.*?    return mins > 0 \? `\$\{mins\}m \$\{secs\}s left` : `\$\{secs\}s left`;\n  \};\n', '', text, flags=re.DOTALL)

# Remove const percent = ...
text = re.sub(r'  const percent = getWeightedPercent\(\);\n\n', '', text)

# Replace Sidebar div
sidebar_pattern = r'      <div className="sidebar">\n.*?      </div>\n'
text = re.sub(sidebar_pattern, '      <Sidebar view={view} setView={setView} T={T} />\n', text, flags=re.DOTALL)

# Replace Global Activity Bar div
global_progress_pattern = r'        \{progress && progress\.active && \(\n          <div className="global-activity-bar">\n.*?          </div>\n        \)\}\n'
text = re.sub(global_progress_pattern, '        <GlobalProgress progress={progress} T={T} />\n', text, flags=re.DOTALL)

with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done modifying App.jsx')
