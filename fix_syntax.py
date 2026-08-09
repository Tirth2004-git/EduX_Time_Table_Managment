import os

path = 'frontend/src/components/TimetableBuilder.jsx'
with open(path, 'r', encoding='utf8') as f:
    code = f.read()

old_code = """  let hash = 0;
  const codeStr = subjectCode || '';"""

new_code = """const getSubjectColorClasses = (subjectCode, isLab) => {
  if (isLab) {
    return { bg: 'bg-slate-800', border: 'border-slate-700', text: 'text-white', badge: 'bg-indigo-500 text-white border-indigo-400' };
  }
  let hash = 0;
  const codeStr = subjectCode || '';"""

code = code.replace(old_code, new_code)

with open(path, 'w', encoding='utf8') as f:
    f.write(code)

print("Fixed syntax")
