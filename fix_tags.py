import os
import re

path = 'frontend/src/components/TimetableBuilder.jsx'
with open(path, 'r', encoding='utf8') as f:
    code = f.read()

# Replace <DraggableCard id={entry._id} entry={entry}> with <div className="select-none">
code = re.sub(r'<DraggableCard[^>]*>', '<div className="select-none">', code)

# Replace <DroppableCell ...> with <td ...>
# We need to preserve key, id, rowSpan, onClick, className
code = re.sub(r'<DroppableCell([^>]*)>', r'<td\1>', code)

# Note: The closing tags were already replaced with </div> and </td> by the previous script

with open(path, 'w', encoding='utf8') as f:
    f.write(code)

print("Fixed tags")
