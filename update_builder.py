import os
import re

path = 'frontend/src/components/TimetableBuilder.jsx'
with open(path, 'r', encoding='utf8') as f:
    code = f.read()

# 1. Remove import
code = code.replace("import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';\n", "")

# 2. Remove DraggableCard
code = re.sub(r'function DraggableCard\(.*?\{.*?\n  \}\n', '', code, flags=re.DOTALL)

# 3. Remove DroppableCell
code = re.sub(r'function DroppableCell\(.*?\{.*?\n  \}\n', '', code, flags=re.DOTALL)

# 4. Remove handleDragEnd
code = re.sub(r'  const handleDragEnd = async \(event\) => \{.*?\n  \};\n', '', code, flags=re.DOTALL)

# 5. Remove DndContext wrapper
code = code.replace("<DndContext onDragEnd={handleDragEnd}>", "")
code = code.replace("</DndContext>", "")

# 6. Replace <DroppableCell and </DroppableCell>
old_droppable_start = """                                      <DroppableCell
                                        key={cellId}
                                        id={cellId}
                                        rowSpan={rowSpan}
                                        isHolidayDay={isHolidayDay}
                                        onClick={() => handleSlotClick(day, time)}
                                        className={`border-l border-slate-100 p-2 cursor-pointer transition-all duration-150 relative ${
                                          entry ? 'bg-[#F8FAFC]' : 'hover:bg-slate-50/50'
                                        }`}
                                      >"""
new_droppable_start = """                                      <td
                                        key={cellId}
                                        id={cellId}
                                        rowSpan={rowSpan}
                                        onClick={() => handleSlotClick(day, time)}
                                        className={`border-l border-slate-100 p-2 cursor-pointer transition-all duration-150 relative ${
                                          entry ? 'bg-[#F8FAFC]' : 'hover:bg-slate-50/50'
                                        }`}
                                      >"""
code = code.replace(old_droppable_start, new_droppable_start)
code = code.replace("</DroppableCell>", "</td>")

# 7. Replace <DraggableCard and </DraggableCard>
old_draggable_start = """                                            <DraggableCard id={entry._id} entry={entry}>"""
new_draggable_start = """                                            <div className="select-none">"""
code = code.replace(old_draggable_start, new_draggable_start)
code = code.replace("</DraggableCard>", "</div>")

with open(path, 'w', encoding='utf8') as f:
    f.write(code)

print("Removed drag and drop")
